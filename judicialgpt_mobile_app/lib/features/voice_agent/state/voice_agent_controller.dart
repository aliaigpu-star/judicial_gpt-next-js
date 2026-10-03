import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/audio/audio_playback.dart';
import '../../../core/audio/voice_recorder.dart';
import '../../chat/data/chat_repository.dart';
import '../../speech/data/speech_repository.dart';

enum VoiceStatus { idle, listening, processing, speaking }

typedef VoiceTurn = ({String question, String answer});

class VoiceAgentState {
  const VoiceAgentState({
    this.status = VoiceStatus.idle,
    this.voice = TtsVoice.jenny,
    this.turns = const [],
    this.progress,
    this.error,
  });

  final VoiceStatus status;
  final TtsVoice voice;
  final List<VoiceTurn> turns;

  /// What the agent is doing right now, e.g. "Transcribing...".
  final String? progress;
  final String? error;

  VoiceAgentState copyWith({
    VoiceStatus? status,
    TtsVoice? voice,
    List<VoiceTurn>? turns,
    String? Function()? progress,
    String? Function()? error,
  }) => VoiceAgentState(
    status: status ?? this.status,
    voice: voice ?? this.voice,
    turns: turns ?? this.turns,
    progress: progress == null ? this.progress : progress(),
    error: error == null ? this.error : error(),
  );
}

final voiceAgentControllerProvider = NotifierProvider.autoDispose<VoiceAgentController, VoiceAgentState>(
  VoiceAgentController.new,
);

/// Voice-to-voice conversation: record → transcribe → answer → speak,
/// mirroring the website's Voice Agent.
class VoiceAgentController extends Notifier<VoiceAgentState> {
  static const _contextTurns = 4;
  static const _maxSpokenChars = 4900; // the TTS endpoint caps input at 5000

  final _recorder = VoiceRecorder();
  final _player = AudioPlayback();

  @override
  VoiceAgentState build() {
    ref.onDispose(() {
      _recorder.dispose();
      _player.dispose();
    });
    return const VoiceAgentState();
  }

  void selectVoice(TtsVoice voice) => state = state.copyWith(voice: voice);

  /// The main button: start listening, or stop and send what was said.
  Future<void> toggleListening() async {
    switch (state.status) {
      case VoiceStatus.idle:
        await _startListening();
      case VoiceStatus.listening:
        await _finishListening();
      case VoiceStatus.processing:
        break;
      case VoiceStatus.speaking:
        await stopSpeaking();
    }
  }

  Future<void> stopSpeaking() async {
    await _player.stop();
    if (ref.mounted) state = state.copyWith(status: VoiceStatus.idle, progress: () => null);
  }

  Future<void> _startListening() async {
    if (!await _recorder.hasPermission()) {
      state = state.copyWith(error: () => 'Microphone permission is required for the Voice Agent.');
      return;
    }
    await _recorder.start();
    state = state.copyWith(status: VoiceStatus.listening, error: () => null, progress: () => 'Listening...');
  }

  Future<void> _finishListening() async {
    final audio = await _recorder.stop();
    if (audio == null) {
      state = state.copyWith(
        status: VoiceStatus.idle,
        progress: () => null,
        error: () => 'No speech detected. Try again.',
      );
      return;
    }

    state = state.copyWith(status: VoiceStatus.processing, progress: () => 'Transcribing...');
    try {
      final question = await ref
          .read(speechRepositoryProvider)
          .transcribe(audio, filename: VoiceRecorder.filename, contentType: VoiceRecorder.contentType);
      if (question.isEmpty) throw const FormatException('No speech detected. Try again.');

      _setProgress('Thinking...');
      final answer = await ref.read(chatRepositoryProvider).reply([..._history(), (role: 'user', content: question)]);
      if (!ref.mounted) return;
      state = state.copyWith(turns: [...state.turns, (question: question, answer: answer)]);

      _setProgress('Preparing voice...');
      final speech = await ref.read(speechRepositoryProvider).synthesize(_speakable(answer), voice: state.voice);
      if (!ref.mounted) return;

      state = state.copyWith(status: VoiceStatus.speaking, progress: () => 'Speaking...');
      await _player.play(speech);
      if (ref.mounted && state.status == VoiceStatus.speaking) {
        state = state.copyWith(status: VoiceStatus.idle, progress: () => null);
      }
    } catch (e) {
      if (!ref.mounted) return;
      final message = e is FormatException ? e.message : e.toString();
      state = state.copyWith(status: VoiceStatus.idle, progress: () => null, error: () => message);
    }
  }

  void _setProgress(String text) {
    if (ref.mounted) state = state.copyWith(progress: () => text);
  }

  List<ChatTurn> _history() {
    final recent = state.turns.length > _contextTurns
        ? state.turns.sublist(state.turns.length - _contextTurns)
        : state.turns;
    return [
      for (final t in recent) ...[(role: 'user', content: t.question), (role: 'assistant', content: t.answer)],
    ];
  }

  /// Strips markdown so the voice doesn't read out symbols.
  static String _speakable(String markdown) {
    final plain = markdown
        .replaceAllMapped(RegExp(r'\[([^\]]+)\]\([^)]*\)'), (m) => m[1]!)
        .replaceAll(RegExp(r'[*_`#>|]+'), '')
        .replaceAll(RegExp(r'^\s*[-+]\s+', multiLine: true), '')
        .replaceAll(RegExp(r'\n{2,}'), '\n')
        .trim();
    return plain.length > _maxSpokenChars ? plain.substring(0, _maxSpokenChars) : plain;
  }
}

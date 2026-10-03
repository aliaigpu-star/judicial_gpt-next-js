import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/audio/voice_recorder.dart';
import '../../../core/widgets/feedback.dart';
import '../data/speech_repository.dart';

/// Microphone button for dictation: tap to record, tap again to transcribe.
/// The text is handed to [onText] so the user can review it before sending.
class DictationButton extends ConsumerStatefulWidget {
  const DictationButton({super.key, required this.onText, this.enabled = true});

  final ValueChanged<String> onText;
  final bool enabled;

  @override
  ConsumerState<DictationButton> createState() => _DictationButtonState();
}

enum _DictationState { idle, recording, transcribing }

class _DictationButtonState extends ConsumerState<DictationButton> {
  final _recorder = VoiceRecorder();
  _DictationState _state = _DictationState.idle;

  @override
  void dispose() {
    _recorder.cancel().whenComplete(_recorder.dispose);
    super.dispose();
  }

  Future<void> _toggle() async {
    switch (_state) {
      case _DictationState.idle:
        if (!await _recorder.hasPermission()) {
          if (mounted) showAppSnack(context, 'Microphone permission is required for voice input', error: true);
          return;
        }
        await _recorder.start();
        setState(() => _state = _DictationState.recording);
      case _DictationState.recording:
        await _transcribe();
      case _DictationState.transcribing:
        break;
    }
  }

  Future<void> _transcribe() async {
    setState(() => _state = _DictationState.transcribing);
    try {
      final audio = await _recorder.stop();
      if (audio == null) throw const FormatException('No speech detected. Try again.');
      final text = await ref
          .read(speechRepositoryProvider)
          .transcribe(audio, filename: VoiceRecorder.filename, contentType: VoiceRecorder.contentType);
      if (text.isEmpty) throw const FormatException('No speech detected. Try again.');
      widget.onText(text);
    } catch (e) {
      if (mounted) showAppSnack(context, e is FormatException ? e.message : 'Transcription failed: $e', error: true);
    } finally {
      if (mounted) setState(() => _state = _DictationState.idle);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return switch (_state) {
      _DictationState.idle => IconButton(
        tooltip: 'Voice input',
        onPressed: widget.enabled ? _toggle : null,
        icon: const Icon(Icons.mic_none_rounded),
      ),
      _DictationState.recording => IconButton(
        tooltip: 'Stop recording',
        onPressed: _toggle,
        color: theme.colorScheme.error,
        icon: const Icon(Icons.stop_circle_outlined),
      ),
      _DictationState.transcribing => const Padding(
        padding: EdgeInsets.all(12),
        child: SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2)),
      ),
    };
  }
}

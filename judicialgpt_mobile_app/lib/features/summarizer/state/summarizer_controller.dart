import 'dart:async';
import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../conversations/data/conversation_repository.dart';
import '../../conversations/domain/chat_message.dart';
import '../../conversations/state/conversations_controller.dart';
import '../data/summarizer_repository.dart';

enum SummarizerPhase { idle, uploading, processing, done, failed }

class QaItem {
  const QaItem({required this.id, required this.question, required this.answer, required this.timestamp});

  final String id;
  final String question;
  final String answer;
  final DateTime timestamp;
}

class SummarizerState {
  const SummarizerState({
    this.phase = SummarizerPhase.idle,
    this.filename = '',
    this.progress = '',
    this.summary = '',
    this.error,
    this.elapsed = Duration.zero,
    this.qaItems = const [],
    this.isAsking = false,
  });

  final SummarizerPhase phase;
  final String filename;
  final String progress;
  final String summary;
  final String? error;
  final Duration elapsed;
  final List<QaItem> qaItems;
  final bool isAsking;

  bool get isWorking => phase == SummarizerPhase.uploading || phase == SummarizerPhase.processing;

  SummarizerState copyWith({
    SummarizerPhase? phase,
    String? filename,
    String? progress,
    String? summary,
    String? error,
    Duration? elapsed,
    List<QaItem>? qaItems,
    bool? isAsking,
  }) => SummarizerState(
    phase: phase ?? this.phase,
    filename: filename ?? this.filename,
    progress: progress ?? this.progress,
    summary: summary ?? this.summary,
    error: error ?? this.error,
    elapsed: elapsed ?? this.elapsed,
    qaItems: qaItems ?? this.qaItems,
    isAsking: isAsking ?? this.isAsking,
  );
}

final summarizerControllerProvider = NotifierProvider.autoDispose<SummarizerController, SummarizerState>(
  SummarizerController.new,
);

/// Upload → poll → summary, then follow-up Q&A on the same job.
/// Every step is saved to a `Summary: <file>` conversation, like the website.
class SummarizerController extends Notifier<SummarizerState> {
  static const _progressSteps = [
    'Loading document...',
    'Splitting into chunks...',
    'Building vector embeddings...',
    'Extracting legal facts...',
    'Processing document chunks...',
    'Analyzing legal content...',
    'Synthesizing final summary...',
    'Generating comprehensive summary...',
  ];

  Timer? _pollTimer;
  Timer? _progressTimer;
  Timer? _clock;
  String? _jobId;
  String? _conversationId;
  DateTime? _startedAt;

  SummarizerRepository get _repo => ref.read(summarizerRepositoryProvider);
  ConversationRepository get _conversations => ref.read(conversationRepositoryProvider);

  @override
  SummarizerState build() {
    ref.onDispose(_stopTimers);
    return const SummarizerState();
  }

  Future<void> summarize(String filename, Uint8List bytes) async {
    reset();
    _startedAt = DateTime.now();
    _clock = Timer.periodic(const Duration(seconds: 1), (_) {
      state = state.copyWith(elapsed: DateTime.now().difference(_startedAt!));
    });
    state = SummarizerState(phase: SummarizerPhase.uploading, filename: filename, progress: 'Uploading document...');

    try {
      final conversation = await _conversations.create('Summary: $filename');
      _conversationId = conversation.id;
      ref.read(conversationsControllerProvider.notifier).add(conversation);
      await _conversations.addMessage(
        conversation.id,
        MessageRole.user,
        'Uploaded document for summarization: $filename',
      );

      _jobId = await _repo.upload(filename, bytes);
      if (!ref.mounted) return;
      state = state.copyWith(phase: SummarizerPhase.processing, progress: 'Document uploaded. Starting analysis...');
      _startPolling();
    } catch (e) {
      _fail(e.toString());
    }
  }

  void _startPolling() {
    var step = 0;
    state = state.copyWith(progress: _progressSteps.first);
    _progressTimer = Timer.periodic(const Duration(seconds: 8), (_) {
      step = (step + 1).clamp(0, _progressSteps.length - 1);
      state = state.copyWith(progress: _progressSteps[step]);
    });
    _pollTimer = Timer.periodic(const Duration(seconds: 3), (_) => _poll());
  }

  Future<void> _poll() async {
    final jobId = _jobId;
    if (jobId == null) return;
    try {
      final job = await _repo.status(jobId);
      if (!ref.mounted || _jobId != jobId) return;
      switch (job.status) {
        case SummaryJobStatus.done:
          _stopTimers();
          final summary = job.summary ?? '';
          state = state.copyWith(phase: SummarizerPhase.done, summary: summary, progress: '');
          await _save(MessageRole.assistant, summary, responseTime: state.elapsed.inMilliseconds);
        case SummaryJobStatus.failed:
          _fail(job.error ?? 'Summarization failed');
        case SummaryJobStatus.pending || SummaryJobStatus.processing:
          break;
      }
    } catch (_) {
      // Transient polling errors are retried on the next tick.
    }
  }

  Future<void> ask(String question) async {
    final text = question.trim();
    final jobId = _jobId;
    if (text.isEmpty || jobId == null || state.isAsking) return;

    state = state.copyWith(isAsking: true);
    await _save(MessageRole.user, text);

    final started = DateTime.now();
    String answer;
    try {
      answer = await _repo.ask(jobId, text);
      await _save(MessageRole.assistant, answer, responseTime: DateTime.now().difference(started).inMilliseconds);
    } catch (e) {
      answer = 'Error: $e';
    }
    if (!ref.mounted) return;

    state = state.copyWith(
      isAsking: false,
      qaItems: [
        ...state.qaItems,
        QaItem(id: 'qa_${started.microsecondsSinceEpoch}', question: text, answer: answer, timestamp: DateTime.now()),
      ],
    );
  }

  void reset() {
    _stopTimers();
    _jobId = null;
    _conversationId = null;
    state = const SummarizerState();
  }

  void _fail(String message) {
    _stopTimers();
    if (ref.mounted) state = state.copyWith(phase: SummarizerPhase.failed, error: message, progress: '');
  }

  void _stopTimers() {
    _pollTimer?.cancel();
    _progressTimer?.cancel();
    _clock?.cancel();
    _pollTimer = _progressTimer = _clock = null;
  }

  /// Persisting history is best-effort; a failure must not break the flow.
  Future<void> _save(MessageRole role, String content, {int? responseTime}) async {
    final id = _conversationId;
    if (id == null) return;
    try {
      await _conversations.addMessage(id, role, content, responseTime: responseTime);
    } catch (_) {}
  }
}

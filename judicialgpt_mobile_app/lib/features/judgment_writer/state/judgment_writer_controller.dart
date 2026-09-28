import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../conversations/data/conversation_recorder.dart';
import '../data/judgment_writer_repository.dart';
import '../domain/writer_kind.dart';

class DraftItem {
  const DraftItem({
    required this.id,
    required this.query,
    required this.timestamp,
    this.response = '',
    this.document,
    this.isStreaming = false,
  });

  final String id;
  final String query;
  final DateTime timestamp;
  final String response;
  final WriterDocument? document;
  final bool isStreaming;

  DraftItem copyWith({String? response, WriterDocument? document, bool? isStreaming}) => DraftItem(
    id: id,
    query: query,
    timestamp: timestamp,
    response: response ?? this.response,
    document: document ?? this.document,
    isStreaming: isStreaming ?? this.isStreaming,
  );
}

class WriterState {
  const WriterState({this.items = const [], this.isBusy = false, this.error});

  final List<DraftItem> items;
  final bool isBusy;
  final String? error;

  WriterState copyWith({List<DraftItem>? items, bool? isBusy, String? error, bool clearError = false}) => WriterState(
    items: items ?? this.items,
    isBusy: isBusy ?? this.isBusy,
    error: clearError ? null : (error ?? this.error),
  );
}

final judgmentWriterControllerProvider = NotifierProvider.autoDispose
    .family<JudgmentWriterController, WriterState, WriterKind>(JudgmentWriterController.new);

class JudgmentWriterController extends Notifier<WriterState> {
  JudgmentWriterController(this.kind);

  final WriterKind kind;
  late final ConversationRecorder _recorder = ConversationRecorder(ref, titlePrefix: '');
  bool _stopRequested = false;

  JudgmentWriterRepository get _repo => ref.read(judgmentWriterRepositoryProvider);

  @override
  WriterState build() => const WriterState();

  void stop() => _stopRequested = true;

  void clearError() => state = state.copyWith(clearError: true);

  Future<void> draft(String query) async {
    final text = query.trim();
    if (text.isEmpty || state.isBusy) return;

    _stopRequested = false;
    final item = DraftItem(
      id: 'draft_${DateTime.now().microsecondsSinceEpoch}',
      query: text,
      timestamp: DateTime.now(),
      isStreaming: true,
    );
    state = state.copyWith(items: [...state.items, item], isBusy: true, clearError: true);

    final buffer = StringBuffer();
    try {
      await for (final event in _repo.draft(kind, text)) {
        if (_stopRequested || !ref.mounted) break;
        switch (event) {
          case WriterText(:final text):
            buffer.write(text);
            _update(item.id, (i) => i.copyWith(response: buffer.toString()));
          case WriterDocument():
            _update(item.id, (i) => i.copyWith(document: event));
        }
      }
      if (buffer.isNotEmpty) {
        await _recorder.record(query: text, answer: buffer.toString());
      }
    } catch (e) {
      if (ref.mounted) state = state.copyWith(error: e.toString());
    } finally {
      if (ref.mounted) {
        _update(item.id, (i) => i.copyWith(isStreaming: false));
        state = state.copyWith(isBusy: false);
      }
    }
  }

  void _update(String id, DraftItem Function(DraftItem) change) {
    state = state.copyWith(items: [for (final i in state.items) i.id == id ? change(i) : i]);
  }
}

import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../conversations/data/conversation_recorder.dart';
import '../../conversations/data/conversation_repository.dart';
import '../../conversations/domain/chat_message.dart';
import '../data/judgment_search_repository.dart';
import '../domain/judgment_search_result.dart';

class SearchItem {
  const SearchItem({
    required this.id,
    required this.query,
    required this.result,
    required this.timestamp,
    this.userMessageId,
    this.assistantMessageId,
    this.feedback,
  });

  final String id;
  final String query;
  final JudgmentSearchResult result;
  final DateTime timestamp;
  final String? userMessageId;
  final String? assistantMessageId;
  final MessageFeedback? feedback;

  SearchItem copyWith({
    String? query,
    JudgmentSearchResult? result,
    String? userMessageId,
    String? assistantMessageId,
    MessageFeedback? feedback,
    bool clearFeedback = false,
  }) => SearchItem(
    id: id,
    query: query ?? this.query,
    result: result ?? this.result,
    timestamp: timestamp,
    userMessageId: userMessageId ?? this.userMessageId,
    assistantMessageId: assistantMessageId ?? this.assistantMessageId,
    feedback: clearFeedback ? null : (feedback ?? this.feedback),
  );
}

class JudgmentSearchState {
  const JudgmentSearchState({
    this.items = const [],
    this.isSearching = false,
    this.busyItemId,
    this.progress = '',
    this.error,
  });

  final List<SearchItem> items;
  final bool isSearching;

  /// Item currently being regenerated or re-run after an edit.
  final String? busyItemId;
  final String progress;
  final String? error;

  bool get isBusy => isSearching || busyItemId != null;

  JudgmentSearchState copyWith({
    List<SearchItem>? items,
    bool? isSearching,
    String? busyItemId,
    bool clearBusy = false,
    String? progress,
    String? error,
    bool clearError = false,
  }) => JudgmentSearchState(
    items: items ?? this.items,
    isSearching: isSearching ?? this.isSearching,
    busyItemId: clearBusy ? null : (busyItemId ?? this.busyItemId),
    progress: progress ?? this.progress,
    error: clearError ? null : (error ?? this.error),
  );
}

final judgmentSearchControllerProvider = NotifierProvider.autoDispose<JudgmentSearchController, JudgmentSearchState>(
  JudgmentSearchController.new,
);

class JudgmentSearchController extends Notifier<JudgmentSearchState> {
  static const _progressSteps = [
    'Searching Pakistani legal portals...',
    'Querying Supreme Court, High Courts...',
    'Searching law libraries & statute portals...',
    'Analyzing retrieved content with AI...',
    'Building legal analysis...',
  ];

  late final ConversationRecorder _recorder = ConversationRecorder(ref, titlePrefix: '');
  Timer? _progressTimer;

  JudgmentSearchRepository get _repo => ref.read(judgmentSearchRepositoryProvider);
  ConversationRepository get _conversations => ref.read(conversationRepositoryProvider);

  String? get conversationId => _recorder.conversationId;

  @override
  JudgmentSearchState build() {
    ref.onDispose(() => _progressTimer?.cancel());
    return const JudgmentSearchState();
  }

  Future<void> search(String query) async {
    final text = query.trim();
    if (text.isEmpty || state.isBusy) return;
    state = state.copyWith(isSearching: true, clearError: true);
    _startProgress();

    try {
      final result = await _repo.search(text);
      final item = SearchItem(
        id: 'search_${DateTime.now().microsecondsSinceEpoch}',
        query: text,
        result: result,
        timestamp: DateTime.now(),
      );
      state = state.copyWith(items: [...state.items, item]);

      // Persist the sources too, so they survive reopening the conversation.
      final saved = await _recorder.record(
        query: text,
        answer: result.explanation,
        metadata: result.summary.toMetadata(),
      );
      _updateItem(
        item.id,
        (i) => i.copyWith(userMessageId: saved.userMessageId, assistantMessageId: saved.assistantMessageId),
      );
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      _stopProgress();
      if (ref.mounted) state = state.copyWith(isSearching: false);
    }
  }

  /// Re-runs the same query and replaces the result in place.
  Future<void> regenerate(String itemId) => _rerun(itemId, null);

  /// Edits the query and re-runs the search with it.
  Future<void> editQuery(String itemId, String newQuery) => _rerun(itemId, newQuery.trim());

  Future<void> setFeedback(String itemId, MessageFeedback feedback) async {
    final item = state.items.firstWhere((i) => i.id == itemId);
    final messageId = item.assistantMessageId;
    if (messageId == null) return;
    final next = item.feedback == feedback ? null : feedback;
    _updateItem(itemId, (i) => i.copyWith(feedback: next, clearFeedback: next == null));
    try {
      await _conversations.setFeedback(messageId, next);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<String?> createShareLink() async {
    final id = conversationId;
    return id == null ? null : _conversations.createShareLink(id);
  }

  void clearError() => state = state.copyWith(clearError: true);

  Future<void> _rerun(String itemId, String? newQuery) async {
    if (state.isBusy) return;
    final item = state.items.firstWhere((i) => i.id == itemId);
    final query = (newQuery == null || newQuery.isEmpty) ? item.query : newQuery;
    state = state.copyWith(busyItemId: itemId, clearError: true);
    _startProgress();

    try {
      final result = await _repo.search(query);
      _updateItem(itemId, (i) => i.copyWith(query: query, result: result));
      if (newQuery != null && item.userMessageId != null) {
        await _conversations.updateMessage(item.userMessageId!, query);
      }
      if (item.assistantMessageId != null) {
        await _conversations.updateMessage(item.assistantMessageId!, result.explanation);
      }
    } catch (e) {
      state = state.copyWith(error: e.toString());
    } finally {
      _stopProgress();
      if (ref.mounted) state = state.copyWith(clearBusy: true);
    }
  }

  void _updateItem(String id, SearchItem Function(SearchItem) update) {
    if (!ref.mounted) return;
    state = state.copyWith(items: [for (final i in state.items) i.id == id ? update(i) : i]);
  }

  void _startProgress() {
    var step = 0;
    state = state.copyWith(progress: _progressSteps.first);
    _progressTimer?.cancel();
    _progressTimer = Timer.periodic(const Duration(seconds: 3), (_) {
      if (step < _progressSteps.length - 1) {
        step++;
        state = state.copyWith(progress: _progressSteps[step]);
      }
    });
  }

  void _stopProgress() {
    _progressTimer?.cancel();
    if (ref.mounted) state = state.copyWith(progress: '');
  }
}

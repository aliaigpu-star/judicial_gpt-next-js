import 'dart:async';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../conversations/data/conversation_repository.dart';
import '../../conversations/domain/chat_message.dart';
import '../../conversations/state/conversations_controller.dart';
import '../data/chat_repository.dart';
import 'chat_state.dart';

/// Keyed by conversation id; `null` is a fresh "New Chat".
final chatControllerProvider = NotifierProvider.autoDispose.family<ChatController, ChatState, String?>(
  ChatController.new,
);

class ChatController extends Notifier<ChatState> {
  ChatController(this._initialConversationId);

  final String? _initialConversationId;

  /// How many previous messages are sent to the model as context.
  static const _contextWindow = 10;

  bool _stopRequested = false;

  ConversationRepository get _conversations => ref.read(conversationRepositoryProvider);
  ChatRepository get _chat => ref.read(chatRepositoryProvider);

  @override
  ChatState build() {
    final id = _initialConversationId;
    if (id == null) return const ChatState();
    Future.microtask(() => _load(id));
    return ChatState(conversationId: id, isLoading: true);
  }

  Future<void> _load(String id) async {
    try {
      final detail = await _conversations.get(id);
      if (!ref.mounted) return;
      state = state.copyWith(title: detail.conversation.title, messages: detail.messages, isLoading: false);
    } catch (e) {
      if (ref.mounted) state = state.copyWith(isLoading: false, error: e.toString());
    }
  }

  void toggleWebSearch() => state = state.copyWith(webSearch: !state.webSearch);

  void stop() => _stopRequested = true;

  // ── Sending ─────────────────────────────────────────────────────────────

  Future<void> send(String text) async {
    final content = text.trim();
    if (content.isEmpty || state.isResponding) return;

    final history = [..._turns(state.messages), (role: 'user', content: content)];
    final localUser = ChatMessage(id: _localId(), role: MessageRole.user, content: content);
    state = state.copyWith(messages: [...state.messages, localUser], isResponding: true, clearError: true);

    try {
      final conversationId = state.conversationId ?? await _startConversation(content);
      final savedUser = await _conversations.addMessage(conversationId, MessageRole.user, content);
      _replaceMessage(localUser.id, (_) => savedUser);

      final localReply = ChatMessage(id: _localId(), role: MessageRole.assistant, content: '', isStreaming: true);
      state = state.copyWith(messages: [...state.messages, localReply]);

      final reply = state.webSearch
          ? await _answerWithWebSearch(localReply.id, content)
          : await _streamInto(localReply.id, history);
      if (reply.content.isEmpty) {
        _removeMessage(localReply.id);
        return;
      }

      final savedReply = await _conversations.addMessage(
        conversationId,
        MessageRole.assistant,
        reply.content,
        responseTime: reply.responseTimeMs,
      );
      _replaceMessage(localReply.id, (_) => savedReply);
    } catch (e) {
      if (ref.mounted) state = state.copyWith(error: e.toString());
    } finally {
      if (ref.mounted) state = state.copyWith(isResponding: false);
    }
  }

  /// Streams a fresh answer into an existing assistant message and saves it
  /// as a new version.
  Future<void> regenerate(String messageId) async {
    final index = state.messages.indexWhere((m) => m.id == messageId);
    if (index < 0 || state.messages[index].isUser || state.isResponding) return;

    final history = _turns(state.messages.sublist(0, index));
    state = state.copyWith(isResponding: true, clearError: true);
    _replaceMessage(messageId, (m) => m.copyWith(content: '', isStreaming: true));

    try {
      final reply = await _streamInto(messageId, history);
      final versions = await _conversations.updateMessage(messageId, reply.content);
      _replaceMessage(
        messageId,
        (m) => m.copyWith(
          currentVersion: versions.currentVersion,
          totalVersions: versions.totalVersions,
          responseTime: reply.responseTimeMs,
        ),
      );
    } catch (e) {
      if (ref.mounted) state = state.copyWith(error: e.toString());
    } finally {
      if (ref.mounted) state = state.copyWith(isResponding: false);
    }
  }

  /// Edits a user message, then regenerates the reply that follows it.
  Future<void> editMessage(String messageId, String newContent) async {
    final content = newContent.trim();
    final index = state.messages.indexWhere((m) => m.id == messageId);
    if (index < 0 || content.isEmpty || state.isResponding) return;

    try {
      await _conversations.updateMessage(messageId, content);
      _replaceMessage(messageId, (m) => m.copyWith(content: content));
      final next = index + 1 < state.messages.length ? state.messages[index + 1] : null;
      if (next != null && !next.isUser) await regenerate(next.id);
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  // ── Message actions ─────────────────────────────────────────────────────

  Future<void> setFeedback(String messageId, MessageFeedback feedback) async {
    final message = state.messages.firstWhere((m) => m.id == messageId);
    final previous = message.feedback;
    final next = previous == feedback ? null : feedback;

    _replaceMessage(messageId, (m) => m.copyWith(feedback: next, clearFeedback: next == null));
    try {
      await _conversations.setFeedback(messageId, next);
    } catch (e) {
      _replaceMessage(messageId, (m) => m.copyWith(feedback: previous, clearFeedback: previous == null));
      state = state.copyWith(error: e.toString());
    }
  }

  Future<void> switchVersion(String messageId, int step) async {
    final message = state.messages.firstWhere((m) => m.id == messageId);
    final target = message.currentVersion + step;
    if (target < 1 || target > message.totalVersions) return;

    try {
      final content = await _conversations.switchVersion(messageId, target);
      _replaceMessage(messageId, (m) => m.copyWith(content: content, currentVersion: target));
    } catch (e) {
      state = state.copyWith(error: e.toString());
    }
  }

  Future<String?> createShareLink() async {
    final id = state.conversationId;
    if (id == null) return null;
    return _conversations.createShareLink(id);
  }

  void clearError() => state = state.copyWith(clearError: true);

  // ── Internals ───────────────────────────────────────────────────────────

  Future<String> _startConversation(String firstMessage) async {
    final title = firstMessage.length > 30 ? '${firstMessage.substring(0, 30)}...' : firstMessage;
    final conversation = await _conversations.create(title);
    ref.read(conversationsControllerProvider.notifier).add(conversation);
    state = state.copyWith(conversationId: conversation.id, title: conversation.title);
    unawaited(_applySmartTitle(conversation.id, firstMessage, title));
    return conversation.id;
  }

  /// Replaces the placeholder title with an AI-generated one, as the web does.
  Future<void> _applySmartTitle(String conversationId, String message, String placeholder) async {
    final title = await _chat.generateTitle(message);
    if (title == null || title.isEmpty || title == placeholder) return;
    try {
      await ref.read(conversationsControllerProvider.notifier).rename(conversationId, title);
      if (ref.mounted) state = state.copyWith(title: title);
    } catch (_) {
      // Keep the placeholder title.
    }
  }

  Future<({String content, int? responseTimeMs})> _streamInto(String messageId, List<ChatTurn> history) async {
    _stopRequested = false;
    final buffer = StringBuffer();
    int? responseTime;

    try {
      await for (final event in _chat.streamReply(history)) {
        if (_stopRequested || !ref.mounted) break;
        switch (event) {
          case ChatDelta(:final text):
            buffer.write(text);
            _replaceMessage(messageId, (m) => m.copyWith(content: buffer.toString()));
          case ChatDone(:final responseTimeMs):
            responseTime = responseTimeMs;
        }
      }
    } finally {
      if (ref.mounted) {
        _replaceMessage(messageId, (m) => m.copyWith(isStreaming: false, responseTime: responseTime));
      }
    }
    return (content: buffer.toString(), responseTimeMs: responseTime);
  }

  Future<({String content, int? responseTimeMs})> _answerWithWebSearch(String messageId, String query) async {
    try {
      final result = await _chat.webSearch(query);
      _replaceMessage(
        messageId,
        (m) => m.copyWith(content: result.answer, isStreaming: false, responseTime: result.responseTimeMs),
      );
      return (content: result.answer, responseTimeMs: result.responseTimeMs);
    } catch (_) {
      _removeMessage(messageId);
      rethrow;
    }
  }

  List<ChatTurn> _turns(List<ChatMessage> messages) {
    final saved = messages.where((m) => !m.isStreaming && m.content.isNotEmpty).toList();
    final window = saved.length > _contextWindow ? saved.sublist(saved.length - _contextWindow) : saved;
    return [for (final m in window) (role: m.role.name, content: m.content)];
  }

  void _replaceMessage(String id, ChatMessage Function(ChatMessage) update) {
    state = state.copyWith(messages: [for (final m in state.messages) m.id == id ? update(m) : m]);
  }

  void _removeMessage(String id) => state = state.copyWith(messages: state.messages.where((m) => m.id != id).toList());

  static String _localId() => 'local_${DateTime.now().microsecondsSinceEpoch}';
}

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/chat_message.dart';
import '../domain/conversation.dart';

final conversationRepositoryProvider = Provider<ConversationRepository>(
  (ref) => ConversationRepository(ref.watch(apiClientProvider)),
);

/// Server-side chat history: conversations, their messages, and sharing.
class ConversationRepository {
  ConversationRepository(this._api);

  final ApiClient _api;

  // ── Conversations ───────────────────────────────────────────────────────

  Future<List<Conversation>> list({bool includeArchived = false}) async {
    final data = await _api.get('/api/conversations${includeArchived ? '?archived=true' : ''}');
    return [for (final c in (data['conversations'] as List? ?? const [])) Conversation.fromJson(c as Json)];
  }

  Future<ConversationDetail> get(String id) async {
    final data = await _api.get('/api/conversations/$id');
    return ConversationDetail.fromJson(data['conversation'] as Json);
  }

  Future<Conversation> create(String title) async {
    final data = await _api.post('/api/conversations', body: {'title': title});
    return Conversation.fromJson(data['conversation'] as Json);
  }

  Future<void> rename(String id, String title) => _api.patch('/api/conversations/$id/rename', body: {'title': title});

  Future<void> togglePin(String id) => _api.patch('/api/conversations/$id/pin');

  Future<void> toggleArchive(String id) => _api.patch('/api/conversations/$id/archive');

  Future<void> delete(String id) => _api.delete('/api/conversations/$id');

  Future<void> deleteAll() => _api.delete('/api/conversations');

  // ── Messages ────────────────────────────────────────────────────────────

  Future<ChatMessage> addMessage(
    String conversationId,
    MessageRole role,
    String content, {
    int? responseTime,
    Map<String, dynamic>? metadata,
  }) async {
    final data = await _api.post(
      '/api/messages',
      body: {
        'conversationId': conversationId,
        'role': role.name,
        'content': content,
        'responseTime': ?responseTime,
        'metadata': ?metadata,
      },
    );
    return ChatMessage.fromJson(data['message'] as Json);
  }

  /// Saves [content] as a new version of the message.
  Future<({int currentVersion, int totalVersions})> updateMessage(String id, String content) async {
    final data = await _api.put('/api/messages/$id', body: {'content': content});
    final message = data['message'] as Json? ?? data;
    return (
      currentVersion: (message['currentVersion'] as num?)?.toInt() ?? 1,
      totalVersions: (message['totalVersions'] as num?)?.toInt() ?? 1,
    );
  }

  /// Switches to a stored version and returns that version's content.
  Future<String> switchVersion(String id, int version) async {
    final data = await _api.patch('/api/messages/$id/versions/$version');
    return (data['message'] as Json)['content'] as String? ?? '';
  }

  Future<void> setFeedback(String id, MessageFeedback? feedback) =>
      _api.post('/api/messages/$id/feedback', body: {'feedback': feedback?.name});

  // ── Sharing ─────────────────────────────────────────────────────────────

  Future<String> createShareLink(String conversationId) async {
    final data = await _api.post('/api/share/$conversationId');
    return data['shareUrl'] as String;
  }
}

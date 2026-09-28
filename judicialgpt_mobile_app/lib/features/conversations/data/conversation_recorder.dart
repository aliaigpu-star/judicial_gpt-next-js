import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../domain/chat_message.dart';
import '../state/conversations_controller.dart';
import 'conversation_repository.dart';

/// Saves a specialist agent's exchanges into the user's chat history, so they
/// appear in the sidebar exactly as on the website.
///
/// One recorder per agent session: the first exchange creates the
/// conversation and later ones append to it. Saving never blocks the UI -
/// failures are swallowed, as the website does.
class ConversationRecorder {
  ConversationRecorder(this._ref, {required this.titlePrefix});

  final Ref _ref;
  final String titlePrefix;
  String? _conversationId;

  String? get conversationId => _conversationId;

  /// Returns the saved message ids, or nulls if saving failed.
  Future<({String? userMessageId, String? assistantMessageId})> record({
    required String query,
    required String answer,
    Map<String, dynamic>? metadata,
  }) async {
    final repo = _ref.read(conversationRepositoryProvider);
    try {
      var id = _conversationId;
      if (id == null) {
        final short = query.length > 40 ? '${query.substring(0, 40)}...' : query;
        final conversation = await repo.create(titlePrefix.isEmpty ? short : '$titlePrefix: $short');
        id = _conversationId = conversation.id;
        _ref.read(conversationsControllerProvider.notifier).add(conversation);
      }
      final user = await repo.addMessage(id, MessageRole.user, query);
      final assistant = await repo.addMessage(id, MessageRole.assistant, answer, metadata: metadata);
      return (userMessageId: user.id, assistantMessageId: assistant.id);
    } catch (_) {
      return (userMessageId: null, assistantMessageId: null);
    }
  }
}

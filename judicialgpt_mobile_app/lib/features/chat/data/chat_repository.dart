import 'dart:convert';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';

final chatRepositoryProvider = Provider<ChatRepository>((ref) => ChatRepository(ref.watch(apiClientProvider)));

/// One chunk of a streamed reply.
sealed class ChatStreamEvent {
  const ChatStreamEvent();
}

class ChatDelta extends ChatStreamEvent {
  const ChatDelta(this.text);
  final String text;
}

class ChatDone extends ChatStreamEvent {
  const ChatDone(this.responseTimeMs);
  final int? responseTimeMs;
}

typedef ChatTurn = ({String role, String content});

class ChatRepository {
  ChatRepository(this._api);

  final ApiClient _api;

  /// Streams the assistant's reply to [history] from `/api/ai/chat`.
  Stream<ChatStreamEvent> streamReply(List<ChatTurn> history) async* {
    final events = _api.streamEvents(
      '/api/ai/chat',
      body: {
        'stream': true,
        'messages': [
          for (final t in history) {'role': t.role, 'content': t.content},
        ],
      },
    );

    await for (final payload in events) {
      final Object? data;
      try {
        data = jsonDecode(payload);
      } catch (_) {
        continue;
      }
      if (data is! Json) continue;
      final content = data['content'];
      if (content is String && content.isNotEmpty) yield ChatDelta(content);
      if (data['done'] == true) {
        yield ChatDone((data['responseTime'] as num?)?.toInt());
        return;
      }
    }
  }

  Future<({String answer, int? responseTimeMs})> webSearch(String query) async {
    final data = await _api.post('/api/ai/web-search', body: {'query': query});
    return (answer: data['answer'] as String? ?? '', responseTimeMs: (data['responseTime'] as num?)?.toInt());
  }

  Future<String?> generateTitle(String message) async {
    try {
      final data = await _api.post('/api/ai/generate-title', body: {'message': message});
      return data['title'] as String?;
    } catch (_) {
      return null;
    }
  }
}

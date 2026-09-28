import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/law_agent_kind.dart';

final lawAgentRepositoryProvider = Provider<LawAgentRepository>(
  (ref) => LawAgentRepository(ref.watch(apiClientProvider)),
);

class StatuteSource {
  const StatuteSource({required this.file, this.page, this.snippet});

  factory StatuteSource.fromJson(Json json) => StatuteSource(
    file: json['file'] as String? ?? 'Statute',
    page: json['page']?.toString(),
    snippet: json['snippet'] as String?,
  );

  final String file;
  final String? page;
  final String? snippet;
}

class LawAnswer {
  const LawAnswer({required this.answer, required this.sources, this.sessionId});

  final String answer;
  final List<StatuteSource> sources;

  /// Keeps follow-up questions in the same agent conversation.
  final String? sessionId;
}

class LawAgentRepository {
  LawAgentRepository(this._api);

  final ApiClient _api;

  Future<LawAnswer> ask(LawAgentKind kind, String query, {String? sessionId}) async {
    final data = switch (kind.transport) {
      LawAgentTransport.proxiedForm => await _api.postForm(kind.endpoint, {'query': query, 'session_id': ?sessionId}),
      LawAgentTransport.directJson => await _api.post(kind.endpoint, body: {'query': query, 'session_id': ?sessionId}),
    };

    return LawAnswer(
      answer: data['answer'] as String? ?? '',
      sessionId: data['session_id'] as String?,
      sources: [
        for (final s in (data['sources'] as List? ?? const []))
          StatuteSource.fromJson((s as Map).cast<String, dynamic>()),
      ],
    );
  }
}

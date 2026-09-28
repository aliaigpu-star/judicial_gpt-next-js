import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/judgment_search_result.dart';

final judgmentSearchRepositoryProvider = Provider<JudgmentSearchRepository>(
  (ref) => JudgmentSearchRepository(ref.watch(apiClientProvider)),
);

class JudgmentSearchRepository {
  JudgmentSearchRepository(this._api);

  final ApiClient _api;

  /// Searches Pakistani legal portals via the backend's agent proxy.
  Future<JudgmentSearchResult> search(String query) async {
    final data = await _api.post('/api/ai/agent/judgment-search/search', body: {'query': query, 'max_results': 8});
    return JudgmentSearchResult.fromJson(data);
  }
}

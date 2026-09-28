class SearchSource {
  const SearchSource({required this.name, required this.domain, required this.url, required this.status, this.preview});

  factory SearchSource.fromJson(Map<String, dynamic> json) => SearchSource(
    name: json['source_name'] as String? ?? 'Source',
    domain: json['domain'] as String? ?? '',
    url: json['url'] as String? ?? '',
    status: json['status'] as String? ?? 'unknown',
    preview: json['content_preview'] as String?,
  );

  final String name;
  final String domain;
  final String url;

  /// `success`, `blocked` or `error`.
  final String status;
  final String? preview;

  Map<String, dynamic> toJson() => {
    'source_name': name,
    'domain': domain,
    'url': url,
    'status': status,
    'content_preview': ?preview,
  };
}

/// Which portals were searched and how many answered.
class SourcesSummary {
  const SourcesSummary({required this.successful, required this.blocked, required this.sources});

  /// Reads the `judgmentSearch` block the website stores in message
  /// metadata, so saved searches keep their sources after a reload.
  static SourcesSummary? fromMetadata(Map<String, dynamic> metadata) {
    final block = metadata['judgmentSearch'];
    if (block is! Map) return null;
    return SourcesSummary(
      successful: (block['successfulSources'] as num?)?.toInt() ?? 0,
      blocked: [for (final b in (block['blockedSources'] as List? ?? const [])) b.toString()],
      sources: [
        for (final s in (block['sourcesSearched'] as List? ?? const []))
          SearchSource.fromJson((s as Map).cast<String, dynamic>()),
      ],
    );
  }

  final int successful;
  final List<String> blocked;
  final List<SearchSource> sources;

  Map<String, dynamic> toMetadata() => {
    'judgmentSearch': {
      'successfulSources': successful,
      'blockedSources': blocked,
      'sourcesSearched': [for (final s in sources) s.toJson()],
    },
  };
}

class JudgmentSearchResult {
  const JudgmentSearchResult({required this.explanation, required this.summary});

  factory JudgmentSearchResult.fromJson(Map<String, dynamic> json) => JudgmentSearchResult(
    explanation: json['explanation'] as String? ?? '',
    summary: SourcesSummary(
      successful: (json['successful_sources'] as num?)?.toInt() ?? 0,
      blocked: [for (final b in (json['blocked_sources'] as List? ?? const [])) b.toString()],
      sources: [
        for (final s in (json['sources_searched'] as List? ?? const []))
          SearchSource.fromJson((s as Map).cast<String, dynamic>()),
      ],
    ),
  );

  final String explanation;
  final SourcesSummary summary;
}

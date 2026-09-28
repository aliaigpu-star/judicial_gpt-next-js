/// Helpers for the plain-text legal documents produced by the Judgment
/// Writing agents (mirrors the website's `isJudgmentDocument` handling).
abstract final class JudgmentText {
  /// Judgment documents are whitespace-aligned plain text rather than
  /// markdown; rendering them as markdown collapses their layout.
  static bool isJudgmentDocument(String text) => text.contains('IN THE COURT OF') || text.contains('─────');

  /// A line made only of dashes is a section divider.
  static bool isDivider(String line) => RegExp(r'^[─\-]{5,}$').hasMatch(line.trim());

  /// Drops stray lone-underscore lines the model sometimes emits around
  /// dividers.
  static String clean(String text) =>
      text.split('\n').where((line) => !RegExp(r'^\s*_+\s*$').hasMatch(line)).join('\n');
}

/// Extracts the text from one SSE `data:` payload sent by the agents.
///
/// Agents send `{"text": "..."}`; older agent builds send the raw token, and
/// some LangChain versions leak a stringified content-block list such as
/// `[{'type': 'text', 'text': '...', 'index': 0}]`. All three are handled so
/// the user never sees transport artefacts.
abstract final class AgentTokens {
  static final _blockText = RegExp(r"""'text':\s*(['"])((?:(?!\1)[^\\]|\\.)*)\1""");

  static String fromRaw(String payload) {
    if (!payload.trimLeft().startsWith("[{'type'")) return payload;
    final parts = _blockText.allMatches(payload).map((m) => _unescape(m.group(2)!));
    return parts.join();
  }

  static String _unescape(String s) => s
      .replaceAll(r'\n', '\n')
      .replaceAll(r'\t', '\t')
      .replaceAll(r"\'", "'")
      .replaceAll(r'\"', '"')
      .replaceAll(r'\\', r'\');
}

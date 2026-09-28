import 'package:flutter/material.dart';
import 'package:flutter_markdown_plus/flutter_markdown_plus.dart';
import 'package:url_launcher/url_launcher.dart';

import '../utils/judgment_text.dart';

/// Renders an assistant reply: judgment documents keep their plain-text
/// layout, everything else is rendered as markdown.
class MessageContent extends StatelessWidget {
  const MessageContent({super.key, required this.text, this.forceDocument = false});

  final String text;

  /// Judgment Writer replies are always documents, even mid-stream before the
  /// "IN THE COURT OF" marker has arrived.
  final bool forceDocument;

  @override
  Widget build(BuildContext context) {
    if (forceDocument || JudgmentText.isJudgmentDocument(text)) {
      return JudgmentDocumentView(text: text);
    }
    return MarkdownMessage(text: text);
  }
}

class MarkdownMessage extends StatelessWidget {
  const MarkdownMessage({super.key, required this.text});

  final String text;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final base = theme.textTheme.bodyLarge?.copyWith(height: 1.6);
    return MarkdownBody(
      data: text,
      selectable: true,
      onTapLink: (_, href, _) {
        final uri = href == null ? null : Uri.tryParse(href);
        if (uri != null) launchUrl(uri, mode: LaunchMode.externalApplication);
      },
      styleSheet: MarkdownStyleSheet.fromTheme(theme).copyWith(
        p: base,
        listBullet: base,
        h1: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
        h2: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700),
        h3: theme.textTheme.titleSmall?.copyWith(fontWeight: FontWeight.w700),
        a: TextStyle(color: theme.colorScheme.primary, decoration: TextDecoration.underline),
        code: TextStyle(fontFamily: 'monospace', backgroundColor: theme.colorScheme.surfaceContainerHighest),
        codeblockDecoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(8),
        ),
        blockquoteDecoration: BoxDecoration(
          border: Border(left: BorderSide(color: theme.colorScheme.primary, width: 3)),
        ),
      ),
    );
  }
}

/// Plain-text legal document view. Keeps line breaks and alignment spacing,
/// draws dividers as rules, and applies the model's occasional inline
/// `**bold**` / `*italic*` / `#` heading markup without reflowing the text.
class JudgmentDocumentView extends StatelessWidget {
  const JudgmentDocumentView({super.key, required this.text});

  final String text;

  static final _inline = RegExp(r'(\*\*\*.+?\*\*\*|\*\*.+?\*\*|\*.+?\*)');
  static final _heading = RegExp(r'^(#{1,6})\s+(.*)$');

  @override
  Widget build(BuildContext context) {
    final base = Theme.of(context).textTheme.bodyLarge?.copyWith(fontFamily: 'serif', height: 1.55);
    final lines = JudgmentText.clean(text).split('\n');

    return SelectionArea(
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          for (final line in lines)
            if (JudgmentText.isDivider(line))
              const Padding(padding: EdgeInsets.symmetric(vertical: 8), child: Divider())
            else
              _line(line, base),
        ],
      ),
    );
  }

  Widget _line(String line, TextStyle? base) {
    final heading = _heading.firstMatch(line.trim());
    if (heading != null) {
      final level = heading.group(1)!.length;
      return Padding(
        padding: EdgeInsets.only(top: level <= 2 ? 12 : 8, bottom: 2),
        child: Text.rich(
          TextSpan(children: _spans(heading.group(2)!)),
          style: base?.copyWith(fontWeight: FontWeight.w700, fontSize: (base.fontSize ?? 16) + (level <= 2 ? 2 : 0)),
        ),
      );
    }
    return Text.rich(TextSpan(children: _spans(line)), style: base);
  }

  List<InlineSpan> _spans(String text) {
    final spans = <InlineSpan>[];
    var pos = 0;
    for (final match in _inline.allMatches(text)) {
      if (match.start > pos) spans.add(TextSpan(text: text.substring(pos, match.start)));
      final token = match.group(0)!;
      if (token.startsWith('***')) {
        spans.add(
          TextSpan(
            text: token.substring(3, token.length - 3),
            style: const TextStyle(fontWeight: FontWeight.w700, fontStyle: FontStyle.italic),
          ),
        );
      } else if (token.startsWith('**')) {
        spans.add(
          TextSpan(
            text: token.substring(2, token.length - 2),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        );
      } else {
        spans.add(
          TextSpan(
            text: token.substring(1, token.length - 1),
            style: const TextStyle(fontStyle: FontStyle.italic),
          ),
        );
      }
      pos = match.end;
    }
    if (pos < text.length) spans.add(TextSpan(text: text.substring(pos)));
    return spans;
  }
}

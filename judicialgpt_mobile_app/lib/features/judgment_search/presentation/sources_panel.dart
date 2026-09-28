import 'package:flutter/material.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../domain/judgment_search_result.dart';

const _blockedColor = Color(0xFFF59E0B);

/// "N sources found" / "M blocked" badges shown above a search answer.
List<Widget> sourcesBadges(SourcesSummary summary) => [
  InfoBadge(
    label: '${summary.successful} sources found',
    color: AppColors.judgmentSearch,
    icon: Icons.check_circle_outline,
  ),
  if (summary.blocked.isNotEmpty)
    InfoBadge(label: '${summary.blocked.length} blocked', color: _blockedColor, icon: Icons.shield_outlined),
];

/// Collapsible "View N sources searched" list.
class SourcesPanel extends StatelessWidget {
  const SourcesPanel({super.key, required this.summary});

  final SourcesSummary summary;

  @override
  Widget build(BuildContext context) {
    if (summary.sources.isEmpty) return const SizedBox.shrink();
    final theme = Theme.of(context);

    return Theme(
      data: theme.copyWith(dividerColor: Colors.transparent),
      child: ExpansionTile(
        tilePadding: EdgeInsets.zero,
        childrenPadding: EdgeInsets.zero,
        dense: true,
        title: Text(
          'View ${summary.sources.length} sources searched',
          style: theme.textTheme.bodyMedium?.copyWith(
            fontWeight: FontWeight.w600,
            color: theme.colorScheme.onSurfaceVariant,
          ),
        ),
        children: [for (final source in summary.sources) _SourceTile(source: source)],
      ),
    );
  }
}

class _SourceTile extends StatelessWidget {
  const _SourceTile({required this.source});

  final SearchSource source;

  (IconData, Color) get _status => switch (source.status) {
    'success' => (Icons.check_circle, AppColors.judgmentSearch),
    'blocked' => (Icons.shield, _blockedColor),
    'error' => (Icons.cancel, Colors.red),
    _ => (Icons.warning_amber, Colors.grey),
  };

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (icon, color) = _status;
    final url = Uri.tryParse(source.url);

    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Icon(icon, size: 16, color: color),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Wrap(
                  spacing: 6,
                  crossAxisAlignment: WrapCrossAlignment.center,
                  children: [
                    Text(source.name, style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600)),
                    InfoBadge(label: source.status, color: color),
                  ],
                ),
                if (source.domain.isNotEmpty)
                  Text(
                    source.domain,
                    style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                if (source.status == 'success' && (source.preview?.isNotEmpty ?? false))
                  Padding(
                    padding: const EdgeInsets.only(top: 4),
                    child: Text(
                      source.preview!,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: theme.textTheme.bodySmall,
                    ),
                  ),
              ],
            ),
          ),
          if (url != null && url.hasScheme)
            IconButton(
              icon: const Icon(Icons.open_in_new, size: 16),
              tooltip: 'Open source',
              visualDensity: VisualDensity.compact,
              onPressed: () => launchUrl(url, mode: LaunchMode.externalApplication),
            ),
        ],
      ),
    );
  }
}

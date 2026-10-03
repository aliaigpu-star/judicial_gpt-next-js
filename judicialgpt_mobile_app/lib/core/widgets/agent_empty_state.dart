import 'package:flutter/material.dart';

import '../theme/app_colors.dart';
import '../theme/app_theme.dart';
import 'chat_bubbles.dart';

/// Landing view of an agent: a serif greeting, a short description and
/// tappable suggested prompts.
class AgentEmptyState extends StatelessWidget {
  const AgentEmptyState({
    super.key,
    required this.icon,
    required this.title,
    required this.description,
    required this.accent,
    required this.suggestions,
    required this.onSuggestion,
  });

  final IconData icon;
  final String title;
  final String description;
  final Color accent;
  final List<String> suggestions;
  final ValueChanged<String> onSuggestion;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final columns = MediaQuery.sizeOf(context).width >= 640 ? 2 : 1;

    return LayoutBuilder(
      builder: (context, viewport) => SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 24, 20, 16),
        child: ConstrainedBox(
          constraints: BoxConstraints(minHeight: viewport.maxHeight - 40),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              AgentMark(icon: icon, accent: accent, size: 48),
              const SizedBox(height: 18),
              Text(title, textAlign: TextAlign.center, style: AppTheme.display(context, size: 28)),
              const SizedBox(height: 10),
              ConstrainedBox(
                constraints: const BoxConstraints(maxWidth: 460),
                child: Text(
                  description,
                  textAlign: TextAlign.center,
                  style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant, height: 1.5),
                ),
              ),
              const SizedBox(height: 28),
              LayoutBuilder(
                builder: (context, constraints) {
                  const gap = 10.0;
                  final itemWidth = (constraints.maxWidth - gap * (columns - 1)) / columns;
                  return Wrap(
                    spacing: gap,
                    runSpacing: gap,
                    children: [
                      for (final suggestion in suggestions)
                        SizedBox(
                          width: itemWidth,
                          child: _SuggestionCard(text: suggestion, onTap: () => onSuggestion(suggestion)),
                        ),
                    ],
                  );
                },
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({required this.text, required this.onTap});

  final String text;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;
    return Material(
      color: context.palette.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: theme.colorScheme.outline),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 10, 12),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodyMedium?.copyWith(height: 1.35),
                ),
              ),
              const SizedBox(width: 8),
              Icon(Icons.north_east_rounded, size: 16, color: muted),
            ],
          ),
        ),
      ),
    );
  }
}

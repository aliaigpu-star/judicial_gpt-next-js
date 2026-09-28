import 'package:flutter/material.dart';

/// Landing view of an agent: icon, title, description and tappable
/// suggested prompts - the same layout every agent page uses on the website.
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
    final columns = MediaQuery.sizeOf(context).width >= 600 ? 2 : 1;

    return SingleChildScrollView(
      padding: const EdgeInsets.fromLTRB(20, 32, 20, 16),
      child: Column(
        children: [
          CircleAvatar(
            radius: 26,
            backgroundColor: accent.withValues(alpha: 0.12),
            child: Icon(icon, color: accent, size: 26),
          ),
          const SizedBox(height: 16),
          Text(
            title,
            textAlign: TextAlign.center,
            style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700, fontFamily: 'serif'),
          ),
          const SizedBox(height: 8),
          Text(
            description,
            textAlign: TextAlign.center,
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
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
                      child: _SuggestionCard(text: suggestion, accent: accent, onTap: () => onSuggestion(suggestion)),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({required this.text, required this.accent, required this.onTap});

  final String text;
  final Color accent;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: Colors.transparent,
      child: InkWell(
        onTap: onTap,
        borderRadius: BorderRadius.circular(12),
        child: Ink(
          padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(12),
            border: Border.all(color: theme.colorScheme.outline),
          ),
          child: Row(
            children: [
              Container(
                width: 6,
                height: 6,
                decoration: BoxDecoration(color: accent.withValues(alpha: 0.65), shape: BoxShape.circle),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  text,
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

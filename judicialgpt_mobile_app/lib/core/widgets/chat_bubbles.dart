import 'package:flutter/material.dart';

/// The user's own message: a right-aligned rounded bubble.
class UserBubble extends StatelessWidget {
  const UserBubble({super.key, required this.text, this.actions = const []});

  final String text;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final maxWidth = MediaQuery.sizeOf(context).width * 0.8;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          ConstrainedBox(
            constraints: BoxConstraints(maxWidth: maxWidth),
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
              decoration: BoxDecoration(
                color: theme.colorScheme.surfaceContainerHighest,
                borderRadius: BorderRadius.circular(20),
              ),
              child: SelectableText(text, style: theme.textTheme.bodyLarge),
            ),
          ),
          if (actions.isNotEmpty) Row(mainAxisSize: MainAxisSize.min, children: actions),
        ],
      ),
    );
  }
}

/// An assistant reply: accent avatar, optional badges, the body, and an
/// action row underneath.
class AssistantMessage extends StatelessWidget {
  const AssistantMessage({
    super.key,
    required this.icon,
    required this.accent,
    required this.child,
    this.badges = const [],
    this.actions = const [],
    this.footer,
    this.boxed = false,
  });

  final IconData icon;
  final Color accent;
  final Widget child;
  final List<Widget> badges;
  final List<Widget> actions;
  final Widget? footer;

  /// Judgment documents sit in a bordered card, like on the website.
  final bool boxed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final body = boxed
        ? Container(
            width: double.infinity,
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: theme.brightness == Brightness.dark ? const Color(0xFF171717) : const Color(0xFFF9F9F9),
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            child: child,
          )
        : child;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 28,
            height: 28,
            margin: const EdgeInsets.only(top: 2),
            decoration: BoxDecoration(color: accent, borderRadius: BorderRadius.circular(6)),
            child: Icon(icon, size: 16, color: Colors.white),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                if (badges.isNotEmpty) ...[
                  Wrap(spacing: 6, runSpacing: 6, children: badges),
                  const SizedBox(height: 10),
                ],
                body,
                if (actions.isNotEmpty) ...[
                  const SizedBox(height: 4),
                  Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: actions),
                ],
                ?footer,
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Small rounded label, e.g. "4 sources found" or "Cr.P.C. Compliant".
class InfoBadge extends StatelessWidget {
  const InfoBadge({super.key, required this.label, required this.color, this.icon});

  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: color.withValues(alpha: 0.1),
      border: Border.all(color: color.withValues(alpha: 0.25)),
      borderRadius: BorderRadius.circular(20),
    ),
    child: Row(
      mainAxisSize: MainAxisSize.min,
      children: [
        if (icon != null) ...[Icon(icon, size: 13, color: color), const SizedBox(width: 5)],
        Text(
          label,
          style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
        ),
      ],
    ),
  );
}

/// Compact icon button for message actions (copy, like, regenerate, ...).
class MessageAction extends StatelessWidget {
  const MessageAction({super.key, required this.icon, required this.tooltip, required this.onPressed, this.color});

  final IconData icon;
  final String tooltip;
  final VoidCallback? onPressed;
  final Color? color;

  @override
  Widget build(BuildContext context) => IconButton(
    icon: Icon(icon, size: 18),
    tooltip: tooltip,
    onPressed: onPressed,
    color: color ?? Theme.of(context).colorScheme.onSurfaceVariant,
    visualDensity: VisualDensity.compact,
  );
}

/// "Thinking..." row shown while an agent is working.
class ThinkingIndicator extends StatelessWidget {
  const ThinkingIndicator({super.key, required this.label, required this.accent});

  final String label;
  final Color accent;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(
      children: [
        SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: accent)),
        const SizedBox(width: 12),
        Flexible(
          child: Text(label, style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant)),
        ),
      ],
    ),
  );
}

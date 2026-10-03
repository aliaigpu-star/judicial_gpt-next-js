import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// The user's own message: a soft, right-aligned bubble.
class UserBubble extends StatelessWidget {
  const UserBubble({super.key, required this.text, this.actions = const []});

  final String text;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.only(top: 16, bottom: 4),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          FractionallySizedBox(
            widthFactor: 0.85,
            alignment: Alignment.centerRight,
            child: Align(
              alignment: Alignment.centerRight,
              child: Container(
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 11),
                decoration: BoxDecoration(color: context.palette.userBubble, borderRadius: BorderRadius.circular(18)),
                child: SelectableText(text, style: theme.textTheme.bodyLarge?.copyWith(height: 1.45)),
              ),
            ),
          ),
          if (actions.isNotEmpty) Row(mainAxisSize: MainAxisSize.min, children: actions),
        ],
      ),
    );
  }
}

/// An assistant reply: a small agent mark with optional badges, the full-width
/// body, and a quiet action row underneath.
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

  /// Judgment documents sit on a paper-like card.
  final bool boxed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final body = boxed
        ? Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: context.palette.card,
              borderRadius: BorderRadius.circular(16),
              border: Border.all(color: theme.colorScheme.outline),
            ),
            child: child,
          )
        : child;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 10),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              AgentMark(icon: icon, accent: accent),
              if (badges.isNotEmpty) ...[
                const SizedBox(width: 10),
                Expanded(child: Wrap(spacing: 6, runSpacing: 6, children: badges)),
              ],
            ],
          ),
          const SizedBox(height: 10),
          body,
          if (actions.isNotEmpty) ...[
            const SizedBox(height: 2),
            Wrap(crossAxisAlignment: WrapCrossAlignment.center, children: actions),
          ],
          ?footer,
        ],
      ),
    );
  }
}

/// Rounded-square agent icon used beside replies and in empty states.
class AgentMark extends StatelessWidget {
  const AgentMark({super.key, required this.icon, required this.accent, this.size = 26});

  final IconData icon;
  final Color accent;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(size * 0.3)),
    child: Icon(icon, size: size * 0.58, color: accent),
  );
}

/// Small neutral pill, e.g. "4 sources found" or "Cr.P.C. Compliant".
class InfoBadge extends StatelessWidget {
  const InfoBadge({super.key, required this.label, required this.color, this.icon});

  final String label;
  final Color color;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Container(
      height: 26,
      padding: const EdgeInsets.symmetric(horizontal: 10),
      decoration: BoxDecoration(
        color: context.palette.card,
        border: Border.all(color: theme.colorScheme.outline),
        borderRadius: BorderRadius.circular(13),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (icon != null) ...[Icon(icon, size: 13, color: color), const SizedBox(width: 5)],
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.labelSmall?.copyWith(
                color: theme.colorScheme.onSurfaceVariant,
                fontWeight: FontWeight.w600,
              ),
            ),
          ),
        ],
      ),
    );
  }
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
    icon: Icon(icon, size: 17),
    tooltip: tooltip,
    onPressed: onPressed,
    color: color ?? Theme.of(context).colorScheme.onSurfaceVariant,
    visualDensity: VisualDensity.compact,
    style: IconButton.styleFrom(shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8))),
  );
}

/// Animated "working" row shown while an agent is thinking.
class ThinkingIndicator extends StatefulWidget {
  const ThinkingIndicator({super.key, required this.label, required this.accent});

  final String label;
  final Color accent;

  @override
  State<ThinkingIndicator> createState() => _ThinkingIndicatorState();
}

class _ThinkingIndicatorState extends State<ThinkingIndicator> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1200))
    ..repeat();

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.symmetric(vertical: 12),
    child: Row(
      children: [
        AnimatedBuilder(
          animation: _pulse,
          builder: (_, _) => Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              for (var i = 0; i < 3; i++)
                Container(
                  width: 7,
                  height: 7,
                  margin: const EdgeInsets.only(right: 4),
                  decoration: BoxDecoration(
                    shape: BoxShape.circle,
                    color: widget.accent.withValues(alpha: _dotOpacity(i)),
                  ),
                ),
            ],
          ),
        ),
        const SizedBox(width: 8),
        Flexible(
          child: Text(
            widget.label,
            style: Theme.of(
              context,
            ).textTheme.bodyMedium?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
          ),
        ),
      ],
    ),
  );

  /// Each dot peaks a third of a cycle after the previous one.
  double _dotOpacity(int index) {
    final phase = (_pulse.value - index / 3) % 1.0;
    return 0.25 + 0.75 * (phase < 0.5 ? phase * 2 : (1 - phase) * 2);
  }
}

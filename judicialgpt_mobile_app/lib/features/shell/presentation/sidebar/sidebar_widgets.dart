import 'package:flutter/material.dart';
import '../../../../core/widgets/brand_mark.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/widgets/user_avatar.dart';
import '../../../auth/state/auth_controller.dart';

/// Logo, product name and tagline at the top of the sidebar.
class SidebarBrand extends StatelessWidget {
  const SidebarBrand({super.key});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 14, 16, 12),
      child: Row(
        children: [
          const BrandMark(size: 38),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                // Same lockup as the website header: "Judicial" + green "GPT".
                Text.rich(
                  const TextSpan(
                    text: 'Judicial',
                    children: [
                      TextSpan(
                        text: 'GPT',
                        style: TextStyle(color: BrandMark.color),
                      ),
                    ],
                  ),
                  style: theme.textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w800, letterSpacing: -0.3),
                ),
                Text(
                  'AI Legal Assistant',
                  style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

/// Full-width accent button that starts a new chat.
class NewChatButton extends StatelessWidget {
  const NewChatButton({super.key, required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final darker = Color.lerp(accent, Colors.black, 0.18)!;
    return DecoratedBox(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(14),
        gradient: LinearGradient(colors: [accent, darker]),
        boxShadow: [BoxShadow(color: accent.withValues(alpha: 0.3), blurRadius: 14, offset: const Offset(0, 5))],
      ),
      child: Material(
        type: MaterialType.transparency,
        child: InkWell(
          borderRadius: BorderRadius.circular(14),
          onTap: onTap,
          child: const Padding(
            padding: EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                Icon(Icons.edit_square, color: Colors.white, size: 20),
                SizedBox(width: 10),
                Text(
                  'New chat',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: 15),
                ),
                Spacer(),
                Icon(Icons.add_rounded, color: Colors.white70, size: 20),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Square shortcut with a coloured icon and a label underneath.
class ToolTile extends StatelessWidget {
  const ToolTile({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: active ? color.withValues(alpha: 0.12) : context.palette.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(14),
        side: BorderSide(color: active ? color.withValues(alpha: 0.5) : theme.colorScheme.outline),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 4),
          child: Column(
            children: [
              IconTile(icon: icon, color: color, size: 34),
              const SizedBox(height: 8),
              Text(
                label,
                maxLines: 1,
                overflow: TextOverflow.ellipsis,
                style: theme.textTheme.labelSmall?.copyWith(fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Rounded square tinted with [color], holding an icon in that colour.
class IconTile extends StatelessWidget {
  const IconTile({super.key, required this.icon, required this.color, this.size = 30});

  final IconData icon;
  final Color color;
  final double size;

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(color: color.withValues(alpha: 0.14), borderRadius: BorderRadius.circular(size * 0.3)),
    child: Icon(icon, size: size * 0.56, color: color),
  );
}

/// Uppercase section heading.
class SidebarSectionLabel extends StatelessWidget {
  const SidebarSectionLabel(this.text, {super.key, this.trailing});

  final String text;
  final Widget? trailing;

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(8, 20, 4, 6),
    child: Row(
      children: [
        Expanded(
          child: Text(
            text.toUpperCase(),
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Theme.of(context).colorScheme.onSurfaceVariant,
              fontWeight: FontWeight.w700,
              letterSpacing: 0.8,
            ),
          ),
        ),
        ?trailing,
      ],
    ),
  );
}

/// Navigation row with a coloured icon tile; the active row gets a tinted
/// background and an accent bar.
class SidebarNavItem extends StatelessWidget {
  const SidebarNavItem({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.onTap,
    this.active = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;
  final bool active;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: Material(
        color: active ? color.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(12),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Row(
            children: [
              AnimatedContainer(
                duration: const Duration(milliseconds: 200),
                width: 3,
                height: 24,
                decoration: BoxDecoration(
                  color: active ? color : Colors.transparent,
                  borderRadius: const BorderRadius.horizontal(right: Radius.circular(3)),
                ),
              ),
              const SizedBox(width: 7),
              Padding(
                padding: const EdgeInsets.symmetric(vertical: 7),
                child: IconTile(icon: icon, color: color),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  label,
                  style: theme.textTheme.bodyMedium?.copyWith(fontWeight: active ? FontWeight.w700 : FontWeight.w500),
                ),
              ),
              if (active) Icon(Icons.chevron_right_rounded, size: 18, color: color),
              const SizedBox(width: 6),
            ],
          ),
        ),
      ),
    );
  }
}

/// Pill-shaped chat search field.
class SidebarSearchField extends StatelessWidget {
  const SidebarSearchField({super.key, required this.controller, required this.onChanged});

  final TextEditingController controller;
  final VoidCallback onChanged;

  @override
  Widget build(BuildContext context) {
    final border = OutlineInputBorder(borderRadius: BorderRadius.circular(22), borderSide: BorderSide.none);
    return SizedBox(
      height: 40,
      child: TextField(
        controller: controller,
        onChanged: (_) => onChanged(),
        style: Theme.of(context).textTheme.bodyMedium,
        decoration: InputDecoration(
          hintText: 'Search chats',
          isDense: true,
          contentPadding: EdgeInsets.zero,
          prefixIcon: const Icon(Icons.search_rounded, size: 18),
          suffixIcon: controller.text.isEmpty
              ? null
              : IconButton(
                  icon: const Icon(Icons.close_rounded, size: 16),
                  onPressed: () {
                    controller.clear();
                    onChanged();
                  },
                ),
          border: border,
          enabledBorder: border,
          focusedBorder: border,
          fillColor: Theme.of(context).colorScheme.onSurface.withValues(alpha: 0.06),
        ),
      ),
    );
  }
}

/// The signed-in user with a shortcut to Settings.
class SidebarUserCard extends ConsumerWidget {
  const SidebarUserCard({super.key, required this.onOpenMenu, required this.onOpenSettings});

  final VoidCallback onOpenMenu;
  final VoidCallback onOpenSettings;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    if (user == null) return const SizedBox.shrink();
    final theme = Theme.of(context);

    return Padding(
      padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
      child: Material(
        color: context.palette.card,
        shape: RoundedRectangleBorder(
          borderRadius: BorderRadius.circular(16),
          side: BorderSide(color: theme.colorScheme.outline),
        ),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onOpenMenu,
          child: Padding(
            padding: const EdgeInsets.fromLTRB(10, 8, 4, 8),
            child: Row(
              children: [
                UserAvatar(user: user, radius: 18),
                const SizedBox(width: 10),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        user.displayName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                      Text(
                        user.email,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
                IconButton(
                  tooltip: 'Settings',
                  onPressed: onOpenSettings,
                  icon: const Icon(Icons.settings_outlined, size: 20),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

/// Collapsible group of agents (e.g. "Law Agents"). Starts expanded when it
/// contains the current page.
class SidebarNavGroup extends StatefulWidget {
  const SidebarNavGroup({
    super.key,
    required this.icon,
    required this.label,
    required this.color,
    required this.children,
    this.containsActive = false,
  });

  final IconData icon;
  final String label;
  final Color color;
  final List<Widget> children;
  final bool containsActive;

  @override
  State<SidebarNavGroup> createState() => _SidebarNavGroupState();
}

class _SidebarNavGroupState extends State<SidebarNavGroup> {
  late bool _expanded = widget.containsActive;

  @override
  void didUpdateWidget(SidebarNavGroup oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (widget.containsActive && !oldWidget.containsActive) _expanded = true;
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsets.symmetric(vertical: 2),
          child: Material(
            color: _expanded ? theme.colorScheme.onSurface.withValues(alpha: 0.04) : Colors.transparent,
            borderRadius: BorderRadius.circular(12),
            clipBehavior: Clip.antiAlias,
            child: InkWell(
              onTap: () => setState(() => _expanded = !_expanded),
              child: Padding(
                padding: const EdgeInsets.fromLTRB(10, 7, 8, 7),
                child: Row(
                  children: [
                    IconTile(icon: widget.icon, color: widget.color),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        widget.label,
                        style: theme.textTheme.bodyMedium?.copyWith(fontWeight: FontWeight.w600),
                      ),
                    ),
                    if (widget.containsActive && !_expanded)
                      Container(
                        width: 7,
                        height: 7,
                        margin: const EdgeInsets.only(right: 8),
                        decoration: BoxDecoration(color: widget.color, shape: BoxShape.circle),
                      ),
                    AnimatedRotation(
                      turns: _expanded ? 0.5 : 0,
                      duration: const Duration(milliseconds: 200),
                      child: Icon(Icons.expand_more_rounded, size: 20, color: muted),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
        AnimatedSize(
          duration: const Duration(milliseconds: 220),
          curve: Curves.easeOutCubic,
          alignment: Alignment.topCenter,
          child: _expanded
              ? Container(
                  margin: const EdgeInsets.only(left: 24, top: 2, bottom: 4),
                  padding: const EdgeInsets.only(left: 6),
                  decoration: BoxDecoration(
                    border: Border(left: BorderSide(color: theme.colorScheme.outline, width: 1.5)),
                  ),
                  child: Column(crossAxisAlignment: CrossAxisAlignment.stretch, children: widget.children),
                )
              : const SizedBox(width: double.infinity),
        ),
      ],
    );
  }
}

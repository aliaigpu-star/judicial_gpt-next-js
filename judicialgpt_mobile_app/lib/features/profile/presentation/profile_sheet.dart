import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/sheet_widgets.dart';
import '../../../core/widgets/user_avatar.dart';
import '../../auth/domain/app_user.dart';
import '../../auth/state/auth_controller.dart';
import '../../settings/domain/settings_section.dart';

/// The sidebar's account menu: the same entries as the website's user menu.
Future<void> showAccountMenu(BuildContext context) {
  // Captured up front: the sheet's own context is gone once it closes.
  final router = GoRouter.of(context);
  final scaffold = Scaffold.maybeOf(context);
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    builder: (_) => _AccountMenu(
      onOpen: (route) {
        if (scaffold?.isDrawerOpen ?? false) scaffold!.closeDrawer();
        router.go(route);
      },
    ),
  );
}

class _AccountMenu extends ConsumerWidget {
  const _AccountMenu({required this.onOpen});

  final ValueChanged<String> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    if (user == null) return const SizedBox.shrink();

    void open(String route) {
      Navigator.pop(context);
      onOpen(route);
    }

    String section(SettingsSection s) => Routes.settingsSection(s.name);

    return SafeArea(
      child: SingleChildScrollView(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            _ProfileHeader(user: user),
            const SizedBox(height: 20),
            SheetActionGroup(
              children: [
                SheetActionRow(
                  icon: Icons.auto_awesome_rounded,
                  title: 'Personalization',
                  subtitle: 'Custom instructions for the AI',
                  color: AppColors.voiceAgent,
                  onTap: () => open(section(SettingsSection.personalization)),
                ),
                SheetActionRow(
                  icon: Icons.settings_rounded,
                  title: 'Settings',
                  subtitle: 'Appearance, notifications, security',
                  onTap: () => open(Routes.settings),
                ),
                SheetActionRow(
                  icon: Icons.person_rounded,
                  title: 'Account',
                  subtitle: 'Photo, name and email',
                  color: AppColors.civilWriter,
                  onTap: () => open(section(SettingsSection.account)),
                ),
                SheetActionRow(
                  icon: Icons.storage_rounded,
                  title: 'Data controls',
                  subtitle: 'Archive or delete your chats',
                  color: AppColors.criminalLaw,
                  onTap: () => open(section(SettingsSection.dataControls)),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SheetActionGroup(
              children: [
                SheetActionRow(
                  icon: Icons.logout_rounded,
                  title: 'Log out',
                  destructive: true,
                  onTap: () {
                    Navigator.pop(context);
                    ref.read(authControllerProvider.notifier).logout();
                  },
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

/// Avatar in an accent ring, name, email and role badge.
class _ProfileHeader extends StatelessWidget {
  const _ProfileHeader({required this.user});

  final AppUser user;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;

    return Column(
      children: [
        Container(
          padding: const EdgeInsets.all(3),
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            gradient: LinearGradient(colors: [accent, accent.withValues(alpha: 0.3)]),
          ),
          child: Container(
            padding: const EdgeInsets.all(3),
            decoration: BoxDecoration(color: theme.scaffoldBackgroundColor, shape: BoxShape.circle),
            child: UserAvatar(user: user, radius: 34),
          ),
        ),
        const SizedBox(height: 12),
        Text(user.displayName, textAlign: TextAlign.center, style: AppTheme.display(context, size: 22)),
        const SizedBox(height: 2),
        Text(
          user.email,
          textAlign: TextAlign.center,
          style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
        ),
        const SizedBox(height: 10),
        Container(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
          decoration: BoxDecoration(color: accent.withValues(alpha: 0.12), borderRadius: BorderRadius.circular(20)),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(user.isAdmin ? Icons.verified_rounded : Icons.workspace_premium_outlined, size: 14, color: accent),
              const SizedBox(width: 5),
              Text(
                user.isAdmin ? 'Administrator' : 'Member',
                style: theme.textTheme.labelSmall?.copyWith(color: accent, fontWeight: FontWeight.w700),
              ),
            ],
          ),
        ),
      ],
    );
  }
}

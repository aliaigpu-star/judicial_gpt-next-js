import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/responsive.dart';
import '../../../core/widgets/user_avatar.dart';
import '../../auth/state/auth_controller.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../domain/settings_section.dart';
import 'sections/account_section.dart';
import 'sections/data_controls_section.dart';
import 'sections/general_section.dart';
import 'sections/personalization_section.dart';
import 'sections/security_section.dart';

/// Settings, with every tab the website offers, inside the app's standard
/// frame (sidebar + app bar).
///
/// When there is room the section list and the selected section sit side by
/// side; otherwise the list opens each section on its own page.
class SettingsScreen extends StatelessWidget {
  const SettingsScreen({super.key, this.section});

  final SettingsSection? section;

  /// Content width needed to show the list and a section side by side.
  static const _splitWidth = 760.0;

  @override
  Widget build(BuildContext context) => LayoutBuilder(
    builder: (context, constraints) {
      final split = constraints.maxWidth >= _splitWidth;
      final current = section ?? (split ? SettingsSection.general : null);
      void open(SettingsSection s) => context.go(Routes.settingsSection(s.name));

      if (split) {
        return AppScaffold(
          title: 'Settings',
          body: Row(
            children: [
              SizedBox(
                width: 280,
                child: _SectionList(selected: current, onOpen: open),
              ),
              VerticalDivider(width: 1, color: Theme.of(context).colorScheme.outline),
              Expanded(child: _SectionBody(section: current!)),
            ],
          ),
        );
      }

      return AppScaffold(
        title: current?.label ?? 'Settings',
        leading: current == null
            ? null
            : IconButton(
                tooltip: 'All settings',
                icon: const Icon(Icons.arrow_back_rounded),
                onPressed: () => context.go(Routes.settings),
              ),
        body: current == null ? _SectionList(onOpen: open) : _SectionBody(section: current),
      );
    },
  );
}

class _SectionList extends ConsumerWidget {
  const _SectionList({required this.onOpen, this.selected});

  final SettingsSection? selected;
  final ValueChanged<SettingsSection> onOpen;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final theme = Theme.of(context);
    final user = ref.watch(authControllerProvider).value;

    return ListView(
      padding: const EdgeInsets.all(16),
      children: [
        if (user != null)
          Padding(
            padding: const EdgeInsets.fromLTRB(4, 0, 4, 20),
            child: Row(
              children: [
                UserAvatar(user: user, radius: 24),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(user.displayName, style: theme.textTheme.titleMedium, overflow: TextOverflow.ellipsis),
                      Text(
                        user.email,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        Material(
          color: context.palette.card,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
            side: BorderSide(color: theme.colorScheme.outline),
          ),
          clipBehavior: Clip.antiAlias,
          child: Column(
            children: [
              for (final s in SettingsSection.values)
                ListTile(
                  leading: Icon(s.icon),
                  title: Text(s.label),
                  subtitle: Text(s.description),
                  selected: s == selected,
                  selectedTileColor: theme.colorScheme.onSurface.withValues(alpha: 0.06),
                  trailing: const Icon(Icons.chevron_right_rounded),
                  shape: const RoundedRectangleBorder(),
                  onTap: () => onOpen(s),
                ),
            ],
          ),
        ),
      ],
    );
  }
}

class _SectionBody extends StatelessWidget {
  const _SectionBody({required this.section});

  final SettingsSection section;

  @override
  Widget build(BuildContext context) => SingleChildScrollView(
    padding: const EdgeInsets.fromLTRB(16, 16, 16, 32),
    child: ContentWidth(
      maxWidth: 640,
      child: switch (section) {
        SettingsSection.general => const GeneralSection(),
        SettingsSection.notifications => const NotificationsSection(),
        SettingsSection.personalization => const PersonalizationSection(),
        SettingsSection.dataControls => const DataControlsSection(),
        SettingsSection.security => const SecuritySection(),
        SettingsSection.account => const AccountSection(),
      },
    ),
  );
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../state/app_preferences.dart';
import '../widgets/settings_widgets.dart';

class GeneralSection extends ConsumerWidget {
  const GeneralSection({super.key});

  static const _themeLabels = {ThemeMode.system: 'System', ThemeMode.dark: 'Dark', ThemeMode.light: 'Light'};

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(appPreferencesProvider);
    final controller = ref.read(appPreferencesProvider.notifier);

    return SettingsGroup(
      children: [
        SettingsChoiceRow<ThemeMode>(
          title: 'Appearance',
          value: preferences.themeMode,
          options: _themeLabels.keys.toList(),
          labelOf: (mode) => _themeLabels[mode]!,
          onChanged: controller.setThemeMode,
        ),
        SettingsChoiceRow<AccentColor>(
          title: 'Accent color',
          value: preferences.accent,
          options: AccentColor.values,
          labelOf: (accent) => accent.label,
          leadingOf: (accent) => CircleAvatar(radius: 6, backgroundColor: accent.color),
          onChanged: controller.setAccent,
        ),
      ],
    );
  }
}

class NotificationsSection extends ConsumerWidget {
  const NotificationsSection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => SettingsGroup(
    children: [
      SettingsSwitchRow(
        title: 'Notifications',
        subtitle: 'Receive notifications for important updates',
        value: ref.watch(appPreferencesProvider.select((p) => p.notifications)),
        onChanged: ref.read(appPreferencesProvider.notifier).setNotifications,
      ),
    ],
  );
}

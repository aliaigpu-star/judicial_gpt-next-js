import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';

import '../../../core/theme/app_colors.dart';

/// Loaded in `main()` before the first frame and injected via an override,
/// so the saved theme applies without a flash of the default one.
final sharedPreferencesProvider = Provider<SharedPreferences>(
  (ref) => throw UnimplementedError('Override sharedPreferencesProvider in main()'),
);

/// Accent colours offered in Settings → General, as on the website.
enum AccentColor {
  standard('Default', AppColors.brand),
  blue('Blue', Color(0xFF2563EB)),
  green('Green', Color(0xFF16A34A)),
  yellow('Yellow', Color(0xFFEAB308)),
  pink('Pink', Color(0xFFEC4899)),
  orange('Orange', Color(0xFFF97316));

  const AccentColor(this.label, this.color);

  final String label;
  final Color color;
}

/// Auto sign-out after inactivity (Settings → Security). `null` = never.
const inactivityOptions = <Duration?>[
  Duration(minutes: 15),
  Duration(minutes: 30),
  Duration(hours: 1),
  Duration(hours: 2),
  null,
];

String describeTimeout(Duration? timeout) => switch (timeout) {
  null => 'Never',
  Duration(inMinutes: < 60) => '${timeout.inMinutes} minutes',
  Duration(inHours: 1) => '1 hour',
  _ => '${timeout.inHours} hours',
};

@immutable
class AppPreferences {
  const AppPreferences({
    this.themeMode = ThemeMode.system,
    this.accent = AccentColor.standard,
    this.notifications = true,
    this.showArchived = false,
    this.inactivityTimeout = const Duration(hours: 1),
  });

  final ThemeMode themeMode;
  final AccentColor accent;
  final bool notifications;
  final bool showArchived;
  final Duration? inactivityTimeout;

  AppPreferences copyWith({
    ThemeMode? themeMode,
    AccentColor? accent,
    bool? notifications,
    bool? showArchived,
    Duration? Function()? inactivityTimeout,
  }) => AppPreferences(
    themeMode: themeMode ?? this.themeMode,
    accent: accent ?? this.accent,
    notifications: notifications ?? this.notifications,
    showArchived: showArchived ?? this.showArchived,
    inactivityTimeout: inactivityTimeout == null ? this.inactivityTimeout : inactivityTimeout(),
  );
}

final appPreferencesProvider = NotifierProvider<AppPreferencesController, AppPreferences>(AppPreferencesController.new);

/// Device-local settings, persisted with SharedPreferences.
class AppPreferencesController extends Notifier<AppPreferences> {
  static const _themeKey = 'pref_theme_mode';
  static const _accentKey = 'pref_accent';
  static const _notificationsKey = 'pref_notifications';
  static const _archivedKey = 'pref_show_archived';
  static const _timeoutKey = 'pref_inactivity_minutes';

  SharedPreferences get _store => ref.read(sharedPreferencesProvider);

  @override
  AppPreferences build() {
    final store = ref.watch(sharedPreferencesProvider);
    final minutes = store.getInt(_timeoutKey);
    return AppPreferences(
      themeMode: ThemeMode.values.asNameMap()[store.getString(_themeKey)] ?? ThemeMode.system,
      accent: AccentColor.values.asNameMap()[store.getString(_accentKey)] ?? AccentColor.standard,
      notifications: store.getBool(_notificationsKey) ?? true,
      showArchived: store.getBool(_archivedKey) ?? false,
      // Stored as minutes; 0 means "never".
      inactivityTimeout: minutes == null
          ? const Duration(hours: 1)
          : (minutes == 0 ? null : Duration(minutes: minutes)),
    );
  }

  void setThemeMode(ThemeMode mode) {
    _store.setString(_themeKey, mode.name);
    state = state.copyWith(themeMode: mode);
  }

  void setAccent(AccentColor accent) {
    _store.setString(_accentKey, accent.name);
    state = state.copyWith(accent: accent);
  }

  void setNotifications(bool enabled) {
    _store.setBool(_notificationsKey, enabled);
    state = state.copyWith(notifications: enabled);
  }

  void setShowArchived(bool show) {
    _store.setBool(_archivedKey, show);
    state = state.copyWith(showArchived: show);
  }

  void setInactivityTimeout(Duration? timeout) {
    _store.setInt(_timeoutKey, timeout?.inMinutes ?? 0);
    state = state.copyWith(inactivityTimeout: () => timeout);
  }
}

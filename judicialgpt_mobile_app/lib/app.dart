import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import 'core/router/app_router.dart';
import 'core/theme/app_theme.dart';
import 'features/settings/presentation/inactivity_guard.dart';
import 'features/settings/state/app_preferences.dart';
import 'features/splash/presentation/door_splash.dart';

class JudicialGptApp extends ConsumerWidget {
  const JudicialGptApp({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final preferences = ref.watch(appPreferencesProvider);
    final accent = preferences.accent.color;

    return MaterialApp.router(
      title: 'JudicialGPT',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.light(accent),
      darkTheme: AppTheme.dark(accent),
      themeMode: preferences.themeMode,
      routerConfig: ref.watch(appRouterProvider),
      builder: (_, child) => InactivityGuard(child: DoorSplash(child: child ?? const SizedBox.shrink())),
    );
  }
}

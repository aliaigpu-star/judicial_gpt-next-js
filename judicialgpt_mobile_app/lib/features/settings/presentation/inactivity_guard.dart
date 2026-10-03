import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../auth/state/auth_controller.dart';
import '../state/app_preferences.dart';

/// Signs the user out after the inactivity timeout chosen in
/// Settings → Security. Any touch counts as activity; time spent with the
/// app in the background counts as inactivity.
class InactivityGuard extends ConsumerStatefulWidget {
  const InactivityGuard({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<InactivityGuard> createState() => _InactivityGuardState();
}

class _InactivityGuardState extends ConsumerState<InactivityGuard> with WidgetsBindingObserver {
  DateTime _lastActivity = DateTime.now();
  Timer? _ticker;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _ticker = Timer.periodic(const Duration(minutes: 1), (_) => _checkTimeout());
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _ticker?.cancel();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed) _checkTimeout();
  }

  void _checkTimeout() {
    final timeout = ref.read(appPreferencesProvider).inactivityTimeout;
    final signedIn = ref.read(authControllerProvider).value != null;
    if (timeout == null || !signedIn) return;
    if (DateTime.now().difference(_lastActivity) >= timeout) {
      _lastActivity = DateTime.now();
      ref.read(authControllerProvider.notifier).logout();
    }
  }

  @override
  Widget build(BuildContext context) => Listener(
    behavior: HitTestBehavior.translucent,
    onPointerDown: (_) => _lastActivity = DateTime.now(),
    child: widget.child,
  );
}

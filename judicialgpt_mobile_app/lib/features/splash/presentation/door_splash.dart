import 'dart:async';

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../auth/state/auth_controller.dart';

/// Launch splash: two marble doors cover the app, then slide apart once the
/// stored session has been checked, revealing the sign-in screen or the chat.
class DoorSplash extends ConsumerStatefulWidget {
  const DoorSplash({super.key, required this.child});

  final Widget child;

  @override
  ConsumerState<DoorSplash> createState() => _DoorSplashState();
}

class _DoorSplashState extends ConsumerState<DoorSplash> with SingleTickerProviderStateMixin {
  static const _leftDoor = AssetImage('assets/images/splash_door_left.png');
  static const _rightDoor = AssetImage('assets/images/splash_door_right.png');

  /// How long the closed doors stay up at minimum, so the emblem is seen.
  static const _minHold = Duration(milliseconds: 1800);

  /// Open anyway if the session check is slow; the router's splash route
  /// shows a spinner underneath until it finishes.
  static const _maxHold = Duration(seconds: 5);

  /// How long the doors take to slide fully open.
  static const _openDuration = Duration(milliseconds: 2400);

  late final AnimationController _controller = AnimationController(vsync: this, duration: _openDuration)
    ..addStatusListener((status) {
      if (status == AnimationStatus.completed) setState(() => _opened = true);
    });
  // A gentle ease-in-out: the doors start slowly, glide, then settle, so the
  // whole movement is easy to follow.
  late final CurvedAnimation _swing = CurvedAnimation(parent: _controller, curve: Curves.easeInOutCubic);
  late final List<Timer> _timers;
  bool _minHoldElapsed = false;
  bool _opened = false;

  @override
  void initState() {
    super.initState();
    _timers = [
      Timer(_minHold, () {
        _minHoldElapsed = true;
        _openWhenReady();
      }),
      Timer(_maxHold, _open),
    ];
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    precacheImage(_leftDoor, context);
    precacheImage(_rightDoor, context);
  }

  @override
  void dispose() {
    for (final timer in _timers) {
      timer.cancel();
    }
    _swing.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _openWhenReady() {
    if (_minHoldElapsed && !ref.read(authControllerProvider).isLoading) _open();
  }

  void _open() {
    if (!mounted || _controller.isAnimating || _controller.isCompleted) return;
    for (final timer in _timers) {
      timer.cancel();
    }
    _controller.forward();
  }

  @override
  Widget build(BuildContext context) {
    if (!_opened) ref.listen(authControllerProvider, (_, _) => _openWhenReady());

    // The child stays first in the Stack so the app's navigator keeps its
    // state when the doors are removed.
    return Stack(
      fit: StackFit.expand,
      children: [
        widget.child,
        if (!_opened) ...[
          _Door(image: _leftDoor, side: Alignment.centerLeft, swing: _swing),
          _Door(image: _rightDoor, side: Alignment.centerRight, swing: _swing),
        ],
      ],
    );
  }
}

class _Door extends StatelessWidget {
  const _Door({required this.image, required this.side, required this.swing});

  final ImageProvider image;

  /// [Alignment.centerLeft] or [Alignment.centerRight].
  final Alignment side;
  final Animation<double> swing;

  @override
  Widget build(BuildContext context) => Align(
    alignment: side,
    child: FractionallySizedBox(
      widthFactor: 0.5,
      child: SlideTransition(
        position: Tween(begin: Offset.zero, end: Offset(1.01 * side.x, 0)).animate(swing),
        child: ColoredBox(
          color: JudicialColors.marble,
          // Anchor each half at the seam so the emblem lines up when cropped.
          child: Image(image: image, fit: BoxFit.cover, alignment: -side, excludeFromSemantics: true),
        ),
      ),
    ),
  );
}

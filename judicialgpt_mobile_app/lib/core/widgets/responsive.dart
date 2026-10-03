import 'package:flutter/material.dart';

abstract final class Breakpoints {
  /// At this width the sidebar is shown permanently instead of as a drawer.
  static const double sidebar = 900;

  /// Comfortable reading width for chat content.
  static const double content = 760;

  static bool isWide(BuildContext context) => MediaQuery.sizeOf(context).width >= sidebar;
}

/// Centres [child] and caps its width so text stays readable on tablets.
class ContentWidth extends StatelessWidget {
  const ContentWidth({super.key, required this.child, this.maxWidth = Breakpoints.content});

  final Widget child;
  final double maxWidth;

  @override
  Widget build(BuildContext context) => Center(
    child: ConstrainedBox(
      constraints: BoxConstraints(maxWidth: maxWidth),
      child: child,
    ),
  );
}

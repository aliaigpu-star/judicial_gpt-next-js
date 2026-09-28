import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/widgets/responsive.dart';
import 'app_sidebar.dart';

/// Wraps every signed-in screen: on wide screens the sidebar is docked,
/// on phones it lives in a drawer opened from the app bar.
class ResponsiveShell extends StatelessWidget {
  const ResponsiveShell({super.key, required this.currentPath, required this.child});

  final String currentPath;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    if (!Breakpoints.isWide(context)) return child;
    return Row(
      children: [
        SizedBox(
          width: 280,
          child: Material(child: AppSidebar(currentPath: currentPath)),
        ),
        VerticalDivider(width: 1, color: Theme.of(context).colorScheme.outline),
        Expanded(child: child),
      ],
    );
  }
}

/// Standard page frame: app bar with title/actions and the sidebar drawer.
class AppScaffold extends StatelessWidget {
  const AppScaffold({super.key, required this.title, required this.body, this.actions = const []});

  final String title;
  final Widget body;
  final List<Widget> actions;

  @override
  Widget build(BuildContext context) {
    final wide = Breakpoints.isWide(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        automaticallyImplyLeading: !wide,
        actions: actions,
      ),
      drawer: wide ? null : Drawer(child: AppSidebar(currentPath: GoRouterState.of(context).uri.path)),
      body: SafeArea(top: false, child: body),
    );
  }
}

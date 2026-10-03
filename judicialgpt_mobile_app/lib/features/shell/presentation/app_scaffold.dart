import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/theme/app_colors.dart';
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
          child: Material(
            color: context.palette.sidebar,
            child: AppSidebar(currentPath: currentPath),
          ),
        ),
        VerticalDivider(width: 1, color: Theme.of(context).colorScheme.outline),
        Expanded(child: child),
      ],
    );
  }
}

/// Standard page frame: app bar with title/actions and the sidebar drawer.
class AppScaffold extends StatelessWidget {
  const AppScaffold({super.key, required this.title, required this.body, this.actions = const [], this.leading});

  final String title;
  final Widget body;
  final List<Widget> actions;

  /// Replaces the menu button, e.g. a back arrow on a nested page.
  final Widget? leading;

  @override
  Widget build(BuildContext context) {
    final wide = Breakpoints.isWide(context);
    return Scaffold(
      appBar: AppBar(
        title: Text(title, maxLines: 1, overflow: TextOverflow.ellipsis),
        automaticallyImplyLeading: false,
        leading:
            leading ??
            (wide
                ? null
                : Builder(
                    builder: (context) => IconButton(
                      icon: const Icon(Icons.menu_rounded),
                      tooltip: 'Menu',
                      onPressed: Scaffold.of(context).openDrawer,
                    ),
                  )),
        actions: actions,
      ),
      drawer: wide
          ? null
          : _BelowStatusBar(
              child: Drawer(
                clipBehavior: Clip.antiAlias,
                child: AppSidebar(currentPath: GoRouterState.of(context).uri.path),
              ),
            ),
      body: SafeArea(top: false, child: body),
    );
  }
}

/// Starts the drawer below the system status bar, so the time and battery
/// icons keep their own strip instead of sitting on top of the sidebar.
class _BelowStatusBar extends StatelessWidget {
  const _BelowStatusBar({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => Padding(
    padding: EdgeInsets.only(top: MediaQuery.paddingOf(context).top),
    child: MediaQuery.removePadding(context: context, removeTop: true, child: child),
  );
}

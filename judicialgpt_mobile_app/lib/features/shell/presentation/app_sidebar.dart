import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../chat/state/chat_controller.dart';
import '../../profile/presentation/profile_sheet.dart';
import 'sidebar/sidebar_history.dart';
import 'sidebar/sidebar_widgets.dart';

/// Navigation + chat history.
class AppSidebar extends ConsumerStatefulWidget {
  const AppSidebar({super.key, required this.currentPath});

  final String currentPath;

  @override
  ConsumerState<AppSidebar> createState() => _AppSidebarState();
}

class _AppSidebarState extends ConsumerState<AppSidebar> {
  final _search = TextEditingController();

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _closeDrawer() {
    final scaffold = Scaffold.maybeOf(context);
    if (scaffold?.isDrawerOpen ?? false) scaffold!.closeDrawer();
  }

  void _go(String path) {
    _closeDrawer();
    context.go(path);
  }

  void _newChat() {
    ref.invalidate(chatControllerProvider(null));
    _go(Routes.chat);
  }

  Widget _agent(IconData icon, String label, String route, Color color) => SidebarNavItem(
    icon: icon,
    label: label,
    color: color,
    active: widget.currentPath == route,
    onTap: () => _go(route),
  );

  @override
  Widget build(BuildContext context) {
    final path = widget.currentPath;

    return ColoredBox(
      color: context.palette.sidebar,
      child: SafeArea(
        child: Column(
          children: [
            const SidebarBrand(),
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 12),
              child: NewChatButton(onTap: _newChat),
            ),
            Expanded(
              child: ListView(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                children: [
                  const SidebarSectionLabel('Tools'),
                  Row(
                    children: [
                      Expanded(
                        child: ToolTile(
                          icon: Icons.travel_explore_rounded,
                          label: 'Search',
                          color: AppColors.judgmentSearch,
                          active: path == Routes.judgmentSearch,
                          onTap: () => _go(Routes.judgmentSearch),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ToolTile(
                          icon: Icons.summarize_outlined,
                          label: 'Summarize',
                          color: AppColors.summarize,
                          active: path == Routes.summarize,
                          onTap: () => _go(Routes.summarize),
                        ),
                      ),
                      const SizedBox(width: 8),
                      Expanded(
                        child: ToolTile(
                          icon: Icons.graphic_eq_rounded,
                          label: 'Voice',
                          color: AppColors.voiceAgent,
                          active: path == Routes.voiceAgent,
                          onTap: () => _go(Routes.voiceAgent),
                        ),
                      ),
                    ],
                  ),
                  const SidebarSectionLabel('Agents'),
                  SidebarNavGroup(
                    icon: Icons.gavel_rounded,
                    label: 'Judgment Writing',
                    color: AppColors.civilWriter,
                    containsActive: path == Routes.civilJudgment || path == Routes.criminalJudgment,
                    children: [
                      _agent(Icons.description_outlined, 'Civil Judgment', Routes.civilJudgment, AppColors.civilWriter),
                      _agent(
                        Icons.gavel_rounded,
                        'Criminal Judgment',
                        Routes.criminalJudgment,
                        AppColors.criminalWriter,
                      ),
                    ],
                  ),
                  SidebarNavGroup(
                    icon: Icons.menu_book_rounded,
                    label: 'Law Agents',
                    color: AppColors.civilLaw,
                    containsActive: path == Routes.civilLaw || path == Routes.criminalLaw || path == Routes.familyLaw,
                    children: [
                      _agent(Icons.balance_rounded, 'Civil Law', Routes.civilLaw, AppColors.civilLaw),
                      _agent(Icons.menu_book_rounded, 'Criminal Law', Routes.criminalLaw, AppColors.criminalLaw),
                      _agent(Icons.family_restroom_rounded, 'Family Law', Routes.familyLaw, AppColors.familyLaw),
                    ],
                  ),
                  const SizedBox(height: 16),
                  SidebarSearchField(controller: _search, onChanged: () => setState(() {})),
                  SidebarHistory(
                    filter: _search.text,
                    currentPath: path,
                    onOpen: (c) => _go(Routes.conversation(c.id)),
                    onDeletedCurrent: () => _go(Routes.chat),
                  ),
                ],
              ),
            ),
            SidebarUserCard(onOpenMenu: () => showAccountMenu(context), onOpenSettings: () => _go(Routes.settings)),
          ],
        ),
      ),
    );
  }
}

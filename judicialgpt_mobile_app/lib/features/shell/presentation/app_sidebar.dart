import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';

import '../../../core/router/routes.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/feedback.dart';
import '../../auth/state/auth_controller.dart';
import '../../chat/state/chat_controller.dart';
import '../../conversations/domain/conversation.dart';
import '../../conversations/state/conversations_controller.dart';
import '../../profile/presentation/profile_sheet.dart';

/// Navigation + chat history, matching the website's sidebar.
class AppSidebar extends ConsumerStatefulWidget {
  const AppSidebar({super.key, required this.currentPath});

  final String currentPath;

  @override
  ConsumerState<AppSidebar> createState() => _AppSidebarState();
}

class _AppSidebarState extends ConsumerState<AppSidebar> {
  final _search = TextEditingController();
  bool _searching = false;

  @override
  void dispose() {
    _search.dispose();
    super.dispose();
  }

  void _go(String path) {
    final scaffold = Scaffold.maybeOf(context);
    if (scaffold?.isDrawerOpen ?? false) scaffold!.closeDrawer();
    context.go(path);
  }

  void _newChat() {
    ref.invalidate(chatControllerProvider(null));
    _go(Routes.chat);
  }

  bool _isActive(String path) => widget.currentPath == path;

  @override
  Widget build(BuildContext context) {
    final path = widget.currentPath;
    final writingActive = path == Routes.civilJudgment || path == Routes.criminalJudgment;
    final lawActive = path == Routes.civilLaw || path == Routes.criminalLaw || path == Routes.familyLaw;

    return SafeArea(
      child: Column(
        children: [
          const _Brand(),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 8),
              children: [
                _NavTile(icon: Icons.edit_square, label: 'New Chat', onTap: _newChat),
                _NavTile(
                  icon: Icons.balance,
                  label: 'Judgment Search',
                  active: _isActive(Routes.judgmentSearch),
                  onTap: () => _go(Routes.judgmentSearch),
                ),
                _NavGroup(
                  icon: Icons.gavel,
                  label: 'Judgement Writing',
                  initiallyExpanded: writingActive,
                  children: [
                    _NavTile(
                      icon: Icons.description_outlined,
                      label: 'Civil Judgment',
                      accent: AppColors.civilWriter,
                      active: _isActive(Routes.civilJudgment),
                      onTap: () => _go(Routes.civilJudgment),
                    ),
                    _NavTile(
                      icon: Icons.gavel_outlined,
                      label: 'Criminal Judgment',
                      accent: AppColors.criminalWriter,
                      active: _isActive(Routes.criminalJudgment),
                      onTap: () => _go(Routes.criminalJudgment),
                    ),
                  ],
                ),
                _NavGroup(
                  icon: Icons.menu_book_outlined,
                  label: 'Law Agents',
                  initiallyExpanded: lawActive,
                  children: [
                    _NavTile(
                      icon: Icons.balance_outlined,
                      label: 'Civil Law',
                      accent: AppColors.civilLaw,
                      active: _isActive(Routes.civilLaw),
                      onTap: () => _go(Routes.civilLaw),
                    ),
                    _NavTile(
                      icon: Icons.menu_book_outlined,
                      label: 'Criminal Law',
                      accent: AppColors.criminalLaw,
                      active: _isActive(Routes.criminalLaw),
                      onTap: () => _go(Routes.criminalLaw),
                    ),
                    _NavTile(
                      icon: Icons.people_outline,
                      label: 'Family Law',
                      accent: AppColors.familyLaw,
                      active: _isActive(Routes.familyLaw),
                      onTap: () => _go(Routes.familyLaw),
                    ),
                  ],
                ),
                _NavTile(
                  icon: Icons.summarize_outlined,
                  label: 'Summarize',
                  active: _isActive(Routes.summarize),
                  onTap: () => _go(Routes.summarize),
                ),
                _NavTile(icon: Icons.search, label: 'Search', onTap: () => setState(() => _searching = !_searching)),
                if (_searching)
                  Padding(
                    padding: const EdgeInsets.fromLTRB(8, 4, 8, 8),
                    child: TextField(
                      controller: _search,
                      autofocus: true,
                      onChanged: (_) => setState(() {}),
                      decoration: const InputDecoration(
                        hintText: 'Search chats',
                        isDense: true,
                        prefixIcon: Icon(Icons.search, size: 18),
                      ),
                    ),
                  ),
                const Divider(height: 24),
                _History(
                  filter: _search.text,
                  currentPath: path,
                  onOpen: (c) => _go(Routes.conversation(c.id)),
                  onDeletedCurrent: () => _go(Routes.chat),
                ),
              ],
            ),
          ),
          const Divider(),
          const _UserFooter(),
        ],
      ),
    );
  }
}

class _Brand extends StatelessWidget {
  const _Brand();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.fromLTRB(16, 12, 16, 12),
    child: Row(
      children: [
        ClipOval(child: Image.asset('assets/images/judicial-logo.png', width: 34, height: 34)),
        const SizedBox(width: 10),
        Text('JudicialGPT', style: Theme.of(context).textTheme.titleMedium?.copyWith(fontWeight: FontWeight.w700)),
      ],
    ),
  );
}

class _NavTile extends StatelessWidget {
  const _NavTile({required this.icon, required this.label, required this.onTap, this.active = false, this.accent});

  final IconData icon;
  final String label;
  final VoidCallback onTap;
  final bool active;
  final Color? accent;

  @override
  Widget build(BuildContext context) {
    final color = accent ?? AppColors.brand;
    return ListTile(
      dense: true,
      leading: Icon(icon, size: 20, color: accent ?? (active ? color : null)),
      title: Text(label),
      selected: active,
      selectedColor: color,
      selectedTileColor: color.withValues(alpha: 0.1),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      onTap: onTap,
    );
  }
}

class _NavGroup extends StatelessWidget {
  const _NavGroup({required this.icon, required this.label, required this.children, this.initiallyExpanded = false});

  final IconData icon;
  final String label;
  final List<Widget> children;
  final bool initiallyExpanded;

  @override
  Widget build(BuildContext context) => Theme(
    data: Theme.of(context).copyWith(dividerColor: Colors.transparent),
    child: ExpansionTile(
      dense: true,
      initiallyExpanded: initiallyExpanded,
      leading: Icon(icon, size: 20),
      title: Text(label),
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
      childrenPadding: const EdgeInsets.only(left: 16),
      children: children,
    ),
  );
}

enum _ConversationAction { rename, pin, archive, delete }

class _History extends ConsumerWidget {
  const _History({
    required this.filter,
    required this.currentPath,
    required this.onOpen,
    required this.onDeletedCurrent,
  });

  final String filter;
  final String currentPath;
  final ValueChanged<Conversation> onOpen;
  final VoidCallback onDeletedCurrent;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final conversations = ref.watch(conversationsControllerProvider);
    return conversations.when(
      loading: () => const Padding(
        padding: EdgeInsets.all(16),
        child: Center(child: CircularProgressIndicator(strokeWidth: 2)),
      ),
      error: (e, _) => ListTile(
        title: const Text('Could not load chats'),
        trailing: IconButton(
          icon: const Icon(Icons.refresh),
          onPressed: () => ref.read(conversationsControllerProvider.notifier).refresh(),
        ),
      ),
      data: (items) {
        final query = filter.trim().toLowerCase();
        final visible = query.isEmpty ? items : items.where((c) => c.title.toLowerCase().contains(query)).toList();
        if (visible.isEmpty) {
          return Padding(
            padding: const EdgeInsets.all(16),
            child: Text(
              query.isEmpty ? 'No conversations yet' : 'No matching chats',
              style: TextStyle(color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          );
        }
        return Column(
          children: [
            for (final c in visible)
              ListTile(
                dense: true,
                selected: currentPath == Routes.conversation(c.id),
                selectedTileColor: Theme.of(context).colorScheme.surfaceContainerHighest,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                leading: c.isPinned ? const Icon(Icons.push_pin, size: 16) : null,
                minLeadingWidth: 0,
                title: Text(c.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                onTap: () => onOpen(c),
                trailing: PopupMenuButton<_ConversationAction>(
                  icon: const Icon(Icons.more_horiz, size: 18),
                  onSelected: (action) => _handle(context, ref, c, action),
                  itemBuilder: (_) => [
                    const PopupMenuItem(value: _ConversationAction.rename, child: Text('Rename')),
                    PopupMenuItem(value: _ConversationAction.pin, child: Text(c.isPinned ? 'Unpin' : 'Pin')),
                    const PopupMenuItem(value: _ConversationAction.archive, child: Text('Archive')),
                    const PopupMenuItem(value: _ConversationAction.delete, child: Text('Delete')),
                  ],
                ),
              ),
          ],
        );
      },
    );
  }

  Future<void> _handle(BuildContext context, WidgetRef ref, Conversation c, _ConversationAction action) async {
    final controller = ref.read(conversationsControllerProvider.notifier);
    try {
      switch (action) {
        case _ConversationAction.rename:
          final title = await _askTitle(context, c.title);
          if (title != null && title.isNotEmpty) await controller.rename(c.id, title);
        case _ConversationAction.pin:
          await controller.togglePin(c.id);
        case _ConversationAction.archive:
          await controller.archive(c.id);
          if (currentPath == Routes.conversation(c.id)) onDeletedCurrent();
        case _ConversationAction.delete:
          if (!await _confirmDelete(context)) return;
          await controller.delete(c.id);
          if (currentPath == Routes.conversation(c.id)) onDeletedCurrent();
      }
    } catch (e) {
      if (context.mounted) showAppSnack(context, e.toString(), error: true);
      await controller.refresh();
    }
  }

  Future<String?> _askTitle(BuildContext context, String current) async {
    final controller = TextEditingController(text: current);
    final result = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Rename chat'),
        content: TextField(controller: controller, autofocus: true),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    return result;
  }

  Future<bool> _confirmDelete(BuildContext context) async =>
      await showDialog<bool>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Delete chat?'),
          content: const Text('This conversation will be permanently deleted.'),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.pop(context, true),
              child: Text('Delete', style: TextStyle(color: Theme.of(context).colorScheme.error)),
            ),
          ],
        ),
      ) ??
      false;
}

class _UserFooter extends ConsumerWidget {
  const _UserFooter();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    if (user == null) return const SizedBox.shrink();
    return ListTile(
      leading: CircleAvatar(
        radius: 16,
        backgroundColor: AppColors.brand,
        child: Text(user.initial, style: const TextStyle(color: Colors.white, fontSize: 13)),
      ),
      title: Text(user.displayName, maxLines: 1, overflow: TextOverflow.ellipsis),
      trailing: const Icon(Icons.more_horiz),
      onTap: () => showProfileSheet(context),
    );
  }
}

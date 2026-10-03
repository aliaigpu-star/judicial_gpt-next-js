import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/router/routes.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../conversations/domain/conversation.dart';
import '../../../conversations/state/conversations_controller.dart';
import 'sidebar_widgets.dart';

/// Chat history grouped like "Pinned / Today / Yesterday / Previous 7 days".
class SidebarHistory extends ConsumerWidget {
  const SidebarHistory({
    super.key,
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
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;

    return ref
        .watch(conversationsControllerProvider)
        .when(
          loading: () => const Padding(
            padding: EdgeInsets.all(16),
            child: Center(child: SizedBox.square(dimension: 18, child: CircularProgressIndicator(strokeWidth: 2))),
          ),
          error: (_, _) => TextButton.icon(
            onPressed: () => ref.read(conversationsControllerProvider.notifier).refresh(),
            icon: const Icon(Icons.refresh_rounded, size: 18),
            label: const Text('Could not load chats. Retry'),
          ),
          data: (items) {
            final query = filter.trim().toLowerCase();
            final visible = query.isEmpty ? items : items.where((c) => c.title.toLowerCase().contains(query)).toList();
            if (visible.isEmpty) {
              return Padding(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 16),
                child: Row(
                  children: [
                    Icon(Icons.chat_bubble_outline_rounded, size: 18, color: muted),
                    const SizedBox(width: 10),
                    Text(query.isEmpty ? 'No conversations yet' : 'No matching chats', style: TextStyle(color: muted)),
                  ],
                ),
              );
            }

            return Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                for (final group in _group(visible)) ...[
                  SidebarSectionLabel(group.label),
                  for (final c in group.items)
                    _HistoryItem(
                      conversation: c,
                      active: currentPath == Routes.conversation(c.id),
                      onTap: () => onOpen(c),
                      onAction: (action) => _handle(context, ref, c, action),
                    ),
                ],
              ],
            );
          },
        );
  }

  static List<({String label, List<Conversation> items})> _group(List<Conversation> conversations) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final groups = <String, List<Conversation>>{};

    String bucket(Conversation c) {
      if (c.isPinned) return 'Pinned';
      final updated = c.updatedAt?.toLocal();
      if (updated == null) return 'Older';
      final days = today.difference(DateTime(updated.year, updated.month, updated.day)).inDays;
      if (days <= 0) return 'Today';
      if (days == 1) return 'Yesterday';
      if (days < 7) return 'Previous 7 days';
      if (days < 30) return 'Previous 30 days';
      return 'Older';
    }

    for (final c in conversations) {
      groups.putIfAbsent(bucket(c), () => []).add(c);
    }
    const order = ['Pinned', 'Today', 'Yesterday', 'Previous 7 days', 'Previous 30 days', 'Older'];
    return [
      for (final label in order)
        if (groups[label] case final items?) (label: label, items: items),
    ];
  }

  Future<void> _handle(BuildContext context, WidgetRef ref, Conversation c, _ConversationAction action) async {
    final controller = ref.read(conversationsControllerProvider.notifier);
    final isOpen = currentPath == Routes.conversation(c.id);
    try {
      switch (action) {
        case _ConversationAction.rename:
          final title = await _askTitle(context, c.title);
          if (title != null && title.isNotEmpty) await controller.rename(c.id, title);
        case _ConversationAction.pin:
          await controller.togglePin(c.id);
        case _ConversationAction.archive:
          await controller.archive(c.id);
          if (isOpen && !c.isArchived) onDeletedCurrent();
        case _ConversationAction.delete:
          if (!await _confirmDelete(context)) return;
          await controller.delete(c.id);
          if (isOpen) onDeletedCurrent();
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

enum _ConversationAction { rename, pin, archive, delete }

class _HistoryItem extends StatelessWidget {
  const _HistoryItem({required this.conversation, required this.active, required this.onTap, required this.onAction});

  final Conversation conversation;
  final bool active;
  final VoidCallback onTap;
  final ValueChanged<_ConversationAction> onAction;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    final muted = theme.colorScheme.onSurfaceVariant;
    final c = conversation;

    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 1),
      child: Material(
        color: active ? accent.withValues(alpha: 0.1) : Colors.transparent,
        borderRadius: BorderRadius.circular(10),
        clipBehavior: Clip.antiAlias,
        child: InkWell(
          onTap: onTap,
          child: Padding(
            padding: const EdgeInsets.only(left: 10),
            child: Row(
              children: [
                Icon(
                  c.isPinned
                      ? Icons.push_pin_rounded
                      : (c.isArchived ? Icons.archive_outlined : Icons.chat_bubble_outline_rounded),
                  size: 15,
                  color: active ? accent : muted,
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: Text(
                    c.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: theme.textTheme.bodyMedium?.copyWith(
                      fontWeight: active ? FontWeight.w600 : null,
                      color: c.isArchived ? muted : null,
                    ),
                  ),
                ),
                PopupMenuButton<_ConversationAction>(
                  icon: Icon(Icons.more_horiz_rounded, size: 18, color: muted),
                  tooltip: 'Chat options',
                  onSelected: onAction,
                  itemBuilder: (_) => [
                    _menuItem(_ConversationAction.rename, Icons.edit_outlined, 'Rename'),
                    _menuItem(
                      _ConversationAction.pin,
                      c.isPinned ? Icons.push_pin_outlined : Icons.push_pin_rounded,
                      c.isPinned ? 'Unpin' : 'Pin',
                    ),
                    _menuItem(
                      _ConversationAction.archive,
                      c.isArchived ? Icons.unarchive_outlined : Icons.archive_outlined,
                      c.isArchived ? 'Unarchive' : 'Archive',
                    ),
                    _menuItem(_ConversationAction.delete, Icons.delete_outline_rounded, 'Delete', destructive: true),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  PopupMenuItem<_ConversationAction> _menuItem(
    _ConversationAction value,
    IconData icon,
    String label, {
    bool destructive = false,
  }) => PopupMenuItem(
    value: value,
    height: 40,
    child: Builder(
      builder: (context) {
        final color = destructive ? Theme.of(context).colorScheme.error : null;
        return Row(
          children: [
            Icon(icon, size: 18, color: color),
            const SizedBox(width: 12),
            Text(label, style: TextStyle(color: color)),
          ],
        );
      },
    ),
  );
}

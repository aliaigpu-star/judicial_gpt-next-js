import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/feedback.dart';
import '../../auth/state/auth_controller.dart';
import '../../conversations/state/conversations_controller.dart';

Future<void> showProfileSheet(BuildContext context) =>
    showModalBottomSheet<void>(context: context, showDragHandle: true, builder: (_) => const _ProfileSheet());

/// Account summary and session actions.
class _ProfileSheet extends ConsumerWidget {
  const _ProfileSheet();

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final user = ref.watch(authControllerProvider).value;
    if (user == null) return const SizedBox.shrink();
    final theme = Theme.of(context);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: AppColors.brand,
              child: Text(user.initial, style: const TextStyle(color: Colors.white, fontSize: 24)),
            ),
            const SizedBox(height: 12),
            Text(user.displayName, style: theme.textTheme.titleMedium),
            Text(user.email, style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
            const SizedBox(height: 16),
            ListTile(
              leading: const Icon(Icons.open_in_new),
              title: const Text('Manage account on the website'),
              onTap: () => launchUrl(Uri.parse(AppConfig.baseUrl), mode: LaunchMode.externalApplication),
            ),
            ListTile(
              leading: const Icon(Icons.delete_sweep_outlined),
              title: const Text('Delete all chats'),
              onTap: () => _deleteAll(context, ref),
            ),
            ListTile(
              leading: Icon(Icons.logout, color: theme.colorScheme.error),
              title: Text('Log out', style: TextStyle(color: theme.colorScheme.error)),
              onTap: () async {
                Navigator.pop(context);
                await ref.read(authControllerProvider.notifier).logout();
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _deleteAll(BuildContext context, WidgetRef ref) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete all chats?'),
        content: const Text('Every conversation will be permanently deleted.'),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, true), child: const Text('Delete all')),
        ],
      ),
    );
    if (confirmed != true || !context.mounted) return;
    try {
      await ref.read(conversationsControllerProvider.notifier).deleteAll();
      if (context.mounted) {
        Navigator.pop(context);
        showAppSnack(context, 'All chats deleted');
      }
    } catch (e) {
      if (context.mounted) showAppSnack(context, e.toString(), error: true);
    }
  }
}

import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../../core/widgets/feedback.dart';
import '../../../conversations/state/conversations_controller.dart';
import '../../state/app_preferences.dart';
import '../widgets/settings_widgets.dart';

enum _BulkAction { archive, unarchive, delete }

class DataControlsSection extends ConsumerStatefulWidget {
  const DataControlsSection({super.key});

  @override
  ConsumerState<DataControlsSection> createState() => _DataControlsSectionState();
}

class _DataControlsSectionState extends ConsumerState<DataControlsSection> {
  _BulkAction? _running;

  Future<void> _run(_BulkAction action) async {
    if (action == _BulkAction.delete &&
        !await confirmAction(
          context,
          title: 'Delete all chats?',
          message: 'This will permanently delete all your conversations. This action cannot be undone.',
          confirmLabel: 'Delete all',
          destructive: true,
        )) {
      return;
    }

    setState(() => _running = action);
    final conversations = ref.read(conversationsControllerProvider.notifier);
    try {
      switch (action) {
        case _BulkAction.archive:
          await conversations.archiveAll();
        case _BulkAction.unarchive:
          await conversations.unarchiveAll();
        case _BulkAction.delete:
          await conversations.deleteAll();
      }
      if (mounted) {
        showAppSnack(context, switch (action) {
          _BulkAction.archive => 'All chats archived',
          _BulkAction.unarchive => 'All chats restored',
          _BulkAction.delete => 'All chats deleted',
        });
      }
    } catch (e) {
      if (mounted) showAppSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _running = null);
    }
  }

  Widget _button(_BulkAction action, String label, IconData icon, {bool destructive = false}) {
    final color = destructive ? Theme.of(context).colorScheme.error : null;
    return TextButton.icon(
      onPressed: _running == null ? () => _run(action) : null,
      style: TextButton.styleFrom(foregroundColor: color),
      icon: _running == action
          ? const SizedBox.square(dimension: 16, child: CircularProgressIndicator(strokeWidth: 2))
          : Icon(icon, size: 18),
      label: Text(label),
    );
  }

  @override
  Widget build(BuildContext context) => Column(
    children: [
      SettingsGroup(
        children: [
          SettingsSwitchRow(
            title: 'Show archived chats',
            subtitle: 'Display archived conversations in the sidebar',
            value: ref.watch(appPreferencesProvider.select((p) => p.showArchived)),
            onChanged: ref.read(appPreferencesProvider.notifier).setShowArchived,
          ),
        ],
      ),
      const SizedBox(height: 20),
      SettingsGroup(
        children: [
          SettingsRow(
            title: 'Archive all chats',
            subtitle: 'Move all conversations to archive',
            trailing: _button(_BulkAction.archive, 'Archive', Icons.archive_outlined),
          ),
          SettingsRow(
            title: 'Unarchive all chats',
            subtitle: 'Restore all archived conversations',
            trailing: _button(_BulkAction.unarchive, 'Restore', Icons.unarchive_outlined),
          ),
          SettingsRow(
            title: 'Delete all chats',
            subtitle: 'Permanently delete all conversations',
            destructive: true,
            trailing: _button(_BulkAction.delete, 'Delete', Icons.delete_outline_rounded, destructive: true),
          ),
        ],
      ),
    ],
  );
}

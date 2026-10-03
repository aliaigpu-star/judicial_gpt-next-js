import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/message_content.dart';
import '../../conversations/domain/chat_message.dart';
import '../../judgment_search/domain/judgment_search_result.dart';
import '../../judgment_search/presentation/sources_panel.dart';

class ChatMessageTile extends StatelessWidget {
  const ChatMessageTile({
    super.key,
    required this.message,
    required this.busy,
    required this.onRegenerate,
    required this.onEdit,
    required this.onFeedback,
    required this.onSwitchVersion,
    this.onShare,
  });

  final ChatMessage message;
  final bool busy;
  final ValueChanged<String> onRegenerate;
  final void Function(String id, String content) onEdit;
  final void Function(String id, MessageFeedback feedback) onFeedback;
  final void Function(String id, int step) onSwitchVersion;
  final VoidCallback? onShare;

  @override
  Widget build(BuildContext context) => message.isUser ? _userMessage(context) : _assistantMessage(context);

  Widget _userMessage(BuildContext context) => UserBubble(
    text: message.content,
    actions: [
      MessageAction(
        icon: Icons.copy_rounded,
        tooltip: 'Copy',
        onPressed: () => copyToClipboard(context, message.content),
      ),
      if (!message.isLocal)
        MessageAction(icon: Icons.edit_outlined, tooltip: 'Edit', onPressed: busy ? null : () => _edit(context)),
    ],
  );

  Widget _assistantMessage(BuildContext context) {
    final sources = SourcesSummary.fromMetadata(message.metadata);
    final saved = !message.isLocal && !message.isStreaming;
    final isDocument = message.content.contains('IN THE COURT OF');

    return AssistantMessage(
      icon: Icons.layers_outlined,
      accent: AppColors.judgmentSearch,
      boxed: isDocument,
      badges: sources == null ? const [] : sourcesBadges(sources),
      footer: sources == null ? null : SourcesPanel(summary: sources),
      actions: saved ? _assistantActions(context) : const [],
      child: message.content.isEmpty && message.isStreaming
          ? const ThinkingIndicator(label: 'Thinking...', accent: AppColors.judgmentSearch)
          : MessageContent(text: message.content),
    );
  }

  List<Widget> _assistantActions(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    return [
      if (message.responseTime != null)
        Padding(
          padding: const EdgeInsets.only(right: 4),
          child: Text(
            '${(message.responseTime! / 1000).toStringAsFixed(2)}s',
            style: TextStyle(fontSize: 12, color: muted),
          ),
        ),
      MessageAction(
        icon: Icons.copy_rounded,
        tooltip: 'Copy',
        onPressed: () => copyToClipboard(context, message.content),
      ),
      MessageAction(
        icon: message.feedback == MessageFeedback.like ? Icons.thumb_up : Icons.thumb_up_outlined,
        tooltip: 'Good response',
        color: message.feedback == MessageFeedback.like ? Theme.of(context).colorScheme.primary : null,
        onPressed: () => onFeedback(message.id, MessageFeedback.like),
      ),
      MessageAction(
        icon: message.feedback == MessageFeedback.dislike ? Icons.thumb_down : Icons.thumb_down_outlined,
        tooltip: 'Bad response',
        color: message.feedback == MessageFeedback.dislike ? Colors.red : null,
        onPressed: () => onFeedback(message.id, MessageFeedback.dislike),
      ),
      MessageAction(
        icon: Icons.refresh_rounded,
        tooltip: 'Regenerate',
        onPressed: busy ? null : () => onRegenerate(message.id),
      ),
      if (onShare != null) MessageAction(icon: Icons.share_outlined, tooltip: 'Share conversation', onPressed: onShare),
      if (message.totalVersions > 1) _versionSwitcher(muted),
    ];
  }

  Widget _versionSwitcher(Color muted) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      MessageAction(
        icon: Icons.chevron_left,
        tooltip: 'Previous version',
        onPressed: message.currentVersion > 1 ? () => onSwitchVersion(message.id, -1) : null,
      ),
      Text(
        '${message.currentVersion}/${message.totalVersions}',
        style: TextStyle(fontSize: 12, color: muted, fontWeight: FontWeight.w600),
      ),
      MessageAction(
        icon: Icons.chevron_right,
        tooltip: 'Next version',
        onPressed: message.currentVersion < message.totalVersions ? () => onSwitchVersion(message.id, 1) : null,
      ),
    ],
  );

  Future<void> _edit(BuildContext context) async {
    final controller = TextEditingController(text: message.content);
    final edited = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit message'),
        content: TextField(controller: controller, autofocus: true, minLines: 2, maxLines: 8),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Save')),
        ],
      ),
    );
    controller.dispose();
    if (edited != null && edited.isNotEmpty && edited != message.content) {
      onEdit(message.id, edited);
    }
  }
}

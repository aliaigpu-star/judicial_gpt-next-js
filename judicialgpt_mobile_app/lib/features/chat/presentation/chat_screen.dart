import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/agent_empty_state.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_composer.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/responsive.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../state/chat_controller.dart';
import 'chat_message_tile.dart';

/// The general JudicialGPT chat. `conversationId == null` is a new chat.
class ChatScreen extends ConsumerStatefulWidget {
  const ChatScreen({super.key, this.conversationId});

  final String? conversationId;

  @override
  ConsumerState<ChatScreen> createState() => _ChatScreenState();
}

class _ChatScreenState extends ConsumerState<ChatScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  static const _suggestions = [
    'What are the grounds for bail under Section 497 Cr.P.C.?',
    'Explain the limitation period for a suit for recovery of money.',
    'What is the procedure for filing a writ petition in the High Court?',
    'Summarize the essentials of a valid contract under the Contract Act 1872.',
  ];

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  void _send(String text) {
    _input.clear();
    ref.read(chatControllerProvider(widget.conversationId).notifier).send(text);
    scrollToBottom(_scroll, force: true);
  }

  Future<void> _share() async {
    try {
      final url = await ref.read(chatControllerProvider(widget.conversationId).notifier).createShareLink();
      if (url != null) await SharePlus.instance.share(ShareParams(text: url));
    } catch (e) {
      if (mounted) showAppSnack(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = chatControllerProvider(widget.conversationId);
    final chat = ref.watch(provider);
    final notifier = ref.read(provider.notifier);

    ref.listen(provider.select((s) => s.error), (_, error) {
      if (error == null) return;
      showAppSnack(context, error, error: true);
      notifier.clearError();
    });
    ref.listen(provider.select((s) => s.messages), (_, _) => scrollToBottom(_scroll));

    return AppScaffold(
      title: chat.title,
      actions: [
        if (chat.conversationId != null)
          IconButton(icon: const Icon(Icons.ios_share), tooltip: 'Share', onPressed: _share),
      ],
      body: Column(
        children: [
          Expanded(
            child: chat.isLoading
                ? const Center(child: CircularProgressIndicator())
                : chat.messages.isEmpty
                ? ContentWidth(
                    child: AgentEmptyState(
                      icon: Icons.auto_awesome,
                      title: 'What can I help with?',
                      description: 'Ask JudicialGPT anything about Pakistani law and procedure.',
                      accent: AppColors.brand,
                      suggestions: _suggestions,
                      onSuggestion: (s) => _input.text = s,
                    ),
                  )
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    itemCount: chat.messages.length,
                    itemBuilder: (context, i) => ContentWidth(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: ChatMessageTile(
                          message: chat.messages[i],
                          busy: chat.isResponding,
                          onRegenerate: notifier.regenerate,
                          onEdit: notifier.editMessage,
                          onFeedback: notifier.setFeedback,
                          onSwitchVersion: notifier.switchVersion,
                          onShare: chat.conversationId == null ? null : _share,
                        ),
                      ),
                    ),
                  ),
          ),
          ContentWidth(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Column(
                children: [
                  ChatComposer(
                    controller: _input,
                    hint: 'Message JudicialGPT',
                    busy: chat.isResponding,
                    onStop: notifier.stop,
                    onSend: _send,
                    leading: IconButton(
                      tooltip: chat.webSearch ? 'Web search on' : 'Web search off',
                      isSelected: chat.webSearch,
                      color: chat.webSearch ? AppColors.brand : null,
                      icon: const Icon(Icons.language),
                      onPressed: chat.isResponding ? null : notifier.toggleWebSearch,
                    ),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'JudicialGPT can make mistakes. Consider checking important information.',
                    textAlign: TextAlign.center,
                    style: Theme.of(
                      context,
                    ).textTheme.labelSmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

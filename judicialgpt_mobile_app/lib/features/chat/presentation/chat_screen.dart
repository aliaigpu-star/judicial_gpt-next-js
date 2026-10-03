import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:go_router/go_router.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/router/routes.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/chat_composer.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/responsive.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../../speech/presentation/dictation_button.dart';
import '../state/chat_controller.dart';
import 'attachment_menu.dart';
import 'chat_message_tile.dart';
import 'welcome_view.dart';

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
                ? const WelcomeView()
                : ListView.builder(
                    controller: _scroll,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    itemCount: chat.messages.length + (chat.activity == null ? 0 : 1),
                    itemBuilder: (context, i) => ContentWidth(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        child: i == chat.messages.length
                            ? ThinkingIndicator(label: chat.activity!, accent: Theme.of(context).colorScheme.primary)
                            : ChatMessageTile(
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
                    hint: chat.webSearch ? 'Search the web...' : 'Message JudicialGPT',
                    busy: chat.isResponding,
                    onStop: notifier.stop,
                    onSend: _send,
                    allowEmpty: chat.attachment != null,
                    onVoiceAgent: () => context.go(Routes.voiceAgent),
                    header: chat.attachment == null
                        ? null
                        : AttachmentChip(attachment: chat.attachment!, onRemove: notifier.removeAttachment),
                    leading: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        AttachmentMenuButton(
                          enabled: !chat.isResponding,
                          webSearch: chat.webSearch,
                          onToggleWebSearch: notifier.toggleWebSearch,
                          onAttach: notifier.attach,
                        ),
                        if (chat.webSearch) ...[
                          const SizedBox(width: 8),
                          ComposerToggle(
                            icon: Icons.language_rounded,
                            label: 'Search',
                            selected: true,
                            onPressed: chat.isResponding ? null : notifier.toggleWebSearch,
                          ),
                        ],
                      ],
                    ),
                    actions: [
                      DictationButton(
                        enabled: !chat.isResponding,
                        onText: (text) => _input.text = _input.text.isEmpty ? text : '${_input.text} $text',
                      ),
                      const SizedBox(width: 4),
                    ],
                  ),
                  const SizedBox(height: 8),
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

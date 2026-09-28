import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/agent_empty_state.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/chat_composer.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/message_content.dart';
import '../../../core/widgets/responsive.dart';
import '../../conversations/domain/chat_message.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../state/judgment_search_controller.dart';
import 'sources_panel.dart';

class JudgmentSearchScreen extends ConsumerStatefulWidget {
  const JudgmentSearchScreen({super.key});

  @override
  ConsumerState<JudgmentSearchScreen> createState() => _JudgmentSearchScreenState();
}

class _JudgmentSearchScreenState extends ConsumerState<JudgmentSearchScreen> {
  static const _accent = AppColors.judgmentSearch;
  static const _suggestions = [
    'Bail conditions under section 497 CrPC',
    'Supreme Court ruling on fundamental rights',
    'Land acquisition compensation case law',
    'Blasphemy law interpretation Pakistan',
  ];

  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  JudgmentSearchController get _controller => ref.read(judgmentSearchControllerProvider.notifier);

  void _search(String query) {
    _input.clear();
    _controller.search(query);
    scrollToBottom(_scroll, force: true);
  }

  Future<void> _share() async {
    try {
      final url = await _controller.createShareLink();
      if (url != null) await SharePlus.instance.share(ShareParams(text: url));
    } catch (e) {
      if (mounted) showAppSnack(context, e.toString(), error: true);
    }
  }

  Future<void> _editQuery(SearchItem item) async {
    final controller = TextEditingController(text: item.query);
    final edited = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Edit search'),
        content: TextField(controller: controller, autofocus: true, minLines: 1, maxLines: 5),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(
            onPressed: () => Navigator.pop(context, controller.text.trim()),
            child: const Text('Save & search'),
          ),
        ],
      ),
    );
    controller.dispose();
    if (edited != null && edited.isNotEmpty) _controller.editQuery(item.id, edited);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(judgmentSearchControllerProvider);

    ref.listen(judgmentSearchControllerProvider.select((s) => s.error), (_, error) {
      if (error == null) return;
      showAppSnack(context, error, error: true);
      _controller.clearError();
    });
    ref.listen(judgmentSearchControllerProvider.select((s) => s.items.length), (_, _) => scrollToBottom(_scroll));

    final empty = state.items.isEmpty && !state.isSearching;

    return AppScaffold(
      title: 'Judgment Search',
      body: Column(
        children: [
          Expanded(
            child: empty
                ? ContentWidth(
                    child: AgentEmptyState(
                      icon: Icons.balance,
                      title: 'Judgment Search',
                      description:
                          'Search Pakistani court judgments, statutes, and legal precedents from authentic sources.',
                      accent: _accent,
                      suggestions: _suggestions,
                      onSuggestion: (s) => _input.text = s,
                    ),
                  )
                : ListView(
                    controller: _scroll,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    children: [
                      for (final item in state.items)
                        ContentWidth(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: _SearchResultView(
                              item: item,
                              busy: state.isBusy,
                              regenerating: state.busyItemId == item.id,
                              onEdit: () => _editQuery(item),
                              onRegenerate: () => _controller.regenerate(item.id),
                              onFeedback: (f) => _controller.setFeedback(item.id, f),
                              onShare: _share,
                            ),
                          ),
                        ),
                      if (state.isBusy && state.progress.isNotEmpty)
                        ContentWidth(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: ThinkingIndicator(label: state.progress, accent: _accent),
                          ),
                        ),
                    ],
                  ),
          ),
          ContentWidth(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
              child: ChatComposer(
                controller: _input,
                hint: 'Search for judgments, case law, or legal topics...',
                accent: _accent,
                busy: state.isBusy,
                onSend: _search,
                leading: const Padding(
                  padding: EdgeInsets.all(10),
                  child: Icon(Icons.balance, color: _accent, size: 20),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SearchResultView extends StatelessWidget {
  const _SearchResultView({
    required this.item,
    required this.busy,
    required this.regenerating,
    required this.onEdit,
    required this.onRegenerate,
    required this.onFeedback,
    required this.onShare,
  });

  final SearchItem item;
  final bool busy;
  final bool regenerating;
  final VoidCallback onEdit;
  final VoidCallback onRegenerate;
  final ValueChanged<MessageFeedback> onFeedback;
  final VoidCallback onShare;

  @override
  Widget build(BuildContext context) {
    final summary = item.result.summary;
    final saved = item.assistantMessageId != null;
    final time = TimeOfDay.fromDateTime(item.timestamp).format(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        UserBubble(
          text: item.query,
          actions: [
            MessageAction(
              icon: Icons.copy_rounded,
              tooltip: 'Copy',
              onPressed: () => copyToClipboard(context, item.query),
            ),
            MessageAction(icon: Icons.edit_outlined, tooltip: 'Edit', onPressed: busy ? null : onEdit),
          ],
        ),
        AssistantMessage(
          icon: Icons.balance,
          accent: AppColors.judgmentSearch,
          badges: [
            ...sourcesBadges(summary),
            InfoBadge(label: time, color: Theme.of(context).colorScheme.onSurfaceVariant, icon: Icons.schedule),
          ],
          footer: SourcesPanel(summary: summary),
          actions: [
            MessageAction(
              icon: Icons.copy_rounded,
              tooltip: 'Copy response',
              onPressed: () => copyToClipboard(context, item.result.explanation),
            ),
            if (saved) ...[
              MessageAction(
                icon: item.feedback == MessageFeedback.like ? Icons.thumb_up : Icons.thumb_up_outlined,
                tooltip: 'Good response',
                color: item.feedback == MessageFeedback.like ? AppColors.judgmentSearch : null,
                onPressed: () => onFeedback(MessageFeedback.like),
              ),
              MessageAction(
                icon: item.feedback == MessageFeedback.dislike ? Icons.thumb_down : Icons.thumb_down_outlined,
                tooltip: 'Bad response',
                color: item.feedback == MessageFeedback.dislike ? Colors.red : null,
                onPressed: () => onFeedback(MessageFeedback.dislike),
              ),
            ],
            MessageAction(icon: Icons.refresh_rounded, tooltip: 'Regenerate', onPressed: busy ? null : onRegenerate),
            if (saved) MessageAction(icon: Icons.share_outlined, tooltip: 'Share conversation', onPressed: onShare),
          ],
          child: AnimatedOpacity(
            opacity: regenerating ? 0.4 : 1,
            duration: const Duration(milliseconds: 200),
            child: MarkdownMessage(text: item.result.explanation),
          ),
        ),
      ],
    );
  }
}

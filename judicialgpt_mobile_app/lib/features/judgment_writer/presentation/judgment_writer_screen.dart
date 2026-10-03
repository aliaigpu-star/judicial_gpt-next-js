import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:share_plus/share_plus.dart';

import '../../../core/widgets/agent_empty_state.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/chat_composer.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/message_content.dart';
import '../../../core/widgets/responsive.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../data/judgment_writer_repository.dart';
import '../domain/writer_kind.dart';
import '../state/judgment_writer_controller.dart';

/// Civil or Criminal Judgment Writing, depending on [kind].
class JudgmentWriterScreen extends ConsumerStatefulWidget {
  const JudgmentWriterScreen({super.key, required this.kind});

  final WriterKind kind;

  @override
  ConsumerState<JudgmentWriterScreen> createState() => _JudgmentWriterScreenState();
}

class _JudgmentWriterScreenState extends ConsumerState<JudgmentWriterScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  WriterKind get _kind => widget.kind;

  void _draft(String query) {
    _input.clear();
    ref.read(judgmentWriterControllerProvider(_kind).notifier).draft(query);
    scrollToBottom(_scroll, force: true);
  }

  Future<void> _download(WriterDocument document) async {
    showAppSnack(context, 'Preparing ${document.title}.docx...');
    try {
      final file = await ref.read(judgmentWriterRepositoryProvider).downloadDocument(_kind, document.fileName);
      await SharePlus.instance.share(ShareParams(files: [XFile(file.path)], title: document.title));
    } catch (e) {
      if (mounted) showAppSnack(context, 'Download failed: $e', error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    final provider = judgmentWriterControllerProvider(_kind);
    final state = ref.watch(provider);
    final notifier = ref.read(provider.notifier);

    ref.listen(provider.select((s) => s.error), (_, error) {
      if (error == null) return;
      showAppSnack(context, error, error: true);
      notifier.clearError();
    });
    ref.listen(provider.select((s) => s.items), (_, _) => scrollToBottom(_scroll));

    return AppScaffold(
      title: _kind.title,
      body: Column(
        children: [
          Expanded(
            child: state.items.isEmpty
                ? ContentWidth(
                    child: AgentEmptyState(
                      icon: _kind.icon,
                      title: _kind.title,
                      description: _kind.description,
                      accent: _kind.accent,
                      suggestions: _kind.suggestions,
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
                            child: _DraftView(item: item, kind: _kind, onDownload: _download),
                          ),
                        ),
                    ],
                  ),
          ),
          ContentWidth(
            child: Padding(
              padding: const EdgeInsets.fromLTRB(12, 4, 12, 8),
              child: Column(
                children: [
                  ChatComposer(
                    controller: _input,
                    hint: 'Provide case details or ask to draft a judgment section...',
                    accent: _kind.accent,
                    busy: state.isBusy,
                    onStop: notifier.stop,
                    onSend: _draft,
                    leading: ComposerTag(icon: _kind.icon, label: _kind.title, color: _kind.accent),
                  ),
                  if (state.items.isNotEmpty) ...[
                    const SizedBox(height: 6),
                    Text(
                      _kind.disclaimer,
                      textAlign: TextAlign.center,
                      style: Theme.of(
                        context,
                      ).textTheme.labelSmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
                    ),
                  ],
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _DraftView extends StatelessWidget {
  const _DraftView({required this.item, required this.kind, required this.onDownload});

  final DraftItem item;
  final WriterKind kind;
  final ValueChanged<WriterDocument> onDownload;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;
    final document = item.document;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        UserBubble(text: item.query),
        AssistantMessage(
          icon: kind.icon,
          accent: kind.accent,
          boxed: true,
          badges: [
            InfoBadge(
              label: item.isStreaming ? 'Generating draft...' : kind.complianceLabel,
              color: kind.accent,
              icon: item.isStreaming ? Icons.hourglass_top : Icons.check_circle_outline,
            ),
            InfoBadge(
              label: TimeOfDay.fromDateTime(item.timestamp).format(context),
              color: muted,
              icon: Icons.schedule,
            ),
          ],
          actions: item.isStreaming
              ? const []
              : [
                  MessageAction(
                    icon: Icons.copy_rounded,
                    tooltip: 'Copy judgment',
                    onPressed: () => copyToClipboard(context, item.response),
                  ),
                  if (document != null)
                    TextButton.icon(
                      onPressed: () => onDownload(document),
                      icon: Icon(Icons.download_rounded, size: 18, color: kind.accent),
                      label: Text('Download DOCX', style: TextStyle(color: kind.accent)),
                    ),
                ],
          child: item.response.isEmpty && item.isStreaming
              ? ThinkingIndicator(label: 'Drafting...', accent: kind.accent)
              : JudgmentDocumentView(text: item.response),
        ),
      ],
    );
  }
}

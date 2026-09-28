import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/chat_composer.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/message_content.dart';
import '../../../core/widgets/responsive.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../data/summarizer_repository.dart';
import '../state/summarizer_controller.dart';

const _accent = AppColors.summarize;
const _maxBytes = 50 * 1024 * 1024;

String _formatElapsed(Duration d) =>
    '${d.inMinutes.toString().padLeft(2, '0')}:${(d.inSeconds % 60).toString().padLeft(2, '0')}';

/// Document Summarizer: upload a legal document, read the summary,
/// then ask follow-up questions about it.
class SummarizerScreen extends ConsumerStatefulWidget {
  const SummarizerScreen({super.key});

  @override
  ConsumerState<SummarizerScreen> createState() => _SummarizerScreenState();
}

class _SummarizerScreenState extends ConsumerState<SummarizerScreen> {
  final _question = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _question.dispose();
    _scroll.dispose();
    super.dispose();
  }

  Future<void> _pickDocument() async {
    final file = await FilePicker.pickFile(
      type: FileType.custom,
      allowedExtensions: SummarizerRepository.supportedExtensions,
    );
    if (file == null || !mounted) return;

    if ((await file.length() ?? 0) > _maxBytes) {
      if (mounted) showAppSnack(context, 'File is larger than 50MB.', error: true);
      return;
    }
    final bytes = await file.readAsBytes();
    ref.read(summarizerControllerProvider.notifier).summarize(file.name, bytes);
  }

  void _ask(String question) {
    _question.clear();
    ref.read(summarizerControllerProvider.notifier).ask(question);
    scrollToBottom(_scroll, force: true);
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(summarizerControllerProvider);
    final notifier = ref.read(summarizerControllerProvider.notifier);
    ref.listen(summarizerControllerProvider.select((s) => s.qaItems.length), (_, _) => scrollToBottom(_scroll));

    final body = switch (state.phase) {
      SummarizerPhase.idle => _UploadView(onPick: _pickDocument),
      SummarizerPhase.uploading || SummarizerPhase.processing => _ProcessingView(state: state),
      SummarizerPhase.failed => _FailedView(message: state.error ?? 'Summarization failed', onRetry: notifier.reset),
      SummarizerPhase.done => _SummaryView(state: state, scroll: _scroll),
    };

    return AppScaffold(
      title: 'Document Summarizer',
      actions: [
        if (state.phase == SummarizerPhase.done)
          IconButton(tooltip: 'New document', icon: const Icon(Icons.upload_file), onPressed: notifier.reset),
      ],
      body: Column(
        children: [
          Expanded(child: body),
          if (state.phase == SummarizerPhase.done)
            ContentWidth(
              child: Padding(
                padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
                child: ChatComposer(
                  controller: _question,
                  hint: 'Ask a question about the document...',
                  accent: _accent,
                  busy: state.isAsking,
                  onSend: _ask,
                ),
              ),
            ),
        ],
      ),
    );
  }
}

class _UploadView extends StatelessWidget {
  const _UploadView({required this.onPick});

  final VoidCallback onPick;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;

    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 520),
          child: Column(
            children: [
              CircleAvatar(
                radius: 32,
                backgroundColor: _accent.withValues(alpha: 0.12),
                child: const Icon(Icons.description_outlined, color: _accent, size: 32),
              ),
              const SizedBox(height: 16),
              Text('Document Summarizer', style: theme.textTheme.headlineSmall, textAlign: TextAlign.center),
              const SizedBox(height: 8),
              Text(
                'Upload a legal document (PDF, DOCX, TXT) for AI-powered summarization '
                'with a comprehensive judicial analysis.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodyMedium?.copyWith(color: muted),
              ),
              const SizedBox(height: 24),
              InkWell(
                onTap: onPick,
                borderRadius: BorderRadius.circular(16),
                child: Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: 40, horizontal: 16),
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: theme.colorScheme.outline, width: 1.5),
                  ),
                  child: Column(
                    children: [
                      Icon(Icons.cloud_upload_outlined, size: 40, color: muted),
                      const SizedBox(height: 12),
                      Text('Tap to upload a document', style: theme.textTheme.titleSmall),
                      const SizedBox(height: 4),
                      Text(
                        'Supports PDF, DOCX, DOC, TXT • Up to 50MB',
                        style: theme.textTheme.bodySmall?.copyWith(color: muted),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ProcessingView extends StatelessWidget {
  const _ProcessingView({required this.state});

  final SummarizerState state;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final muted = theme.colorScheme.onSurfaceVariant;

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const SizedBox(width: 64, height: 64, child: CircularProgressIndicator(color: _accent, strokeWidth: 3)),
            const SizedBox(height: 24),
            Text('Analyzing Document', style: theme.textTheme.titleLarge),
            const SizedBox(height: 6),
            Text(
              state.filename,
              overflow: TextOverflow.ellipsis,
              style: theme.textTheme.bodyMedium?.copyWith(color: muted),
            ),
            const SizedBox(height: 16),
            Text(state.progress, style: theme.textTheme.bodyMedium?.copyWith(color: _accent)),
            const SizedBox(height: 4),
            Text(_formatElapsed(state.elapsed), style: theme.textTheme.bodySmall?.copyWith(color: muted)),
            const SizedBox(height: 24),
            ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 360),
              child: Text(
                'Large documents may take several minutes. You can keep this screen open while the analysis runs.',
                textAlign: TextAlign.center,
                style: theme.textTheme.bodySmall?.copyWith(color: muted),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FailedView extends StatelessWidget {
  const _FailedView({required this.message, required this.onRetry});

  final String message;
  final VoidCallback onRetry;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(24),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(Icons.error_outline, size: 48, color: theme.colorScheme.error),
            const SizedBox(height: 16),
            Text('Summarization Failed', style: theme.textTheme.titleLarge),
            const SizedBox(height: 8),
            Text(message, textAlign: TextAlign.center, style: theme.textTheme.bodyMedium),
            const SizedBox(height: 20),
            FilledButton(
              style: FilledButton.styleFrom(backgroundColor: _accent),
              onPressed: onRetry,
              child: const Text('Try Again'),
            ),
          ],
        ),
      ),
    );
  }
}

class _SummaryView extends StatelessWidget {
  const _SummaryView({required this.state, required this.scroll});

  final SummarizerState state;
  final ScrollController scroll;

  @override
  Widget build(BuildContext context) {
    final muted = Theme.of(context).colorScheme.onSurfaceVariant;

    Widget padded(Widget child) => ContentWidth(
      child: Padding(padding: const EdgeInsets.symmetric(horizontal: 16), child: child),
    );

    return ListView(
      controller: scroll,
      padding: const EdgeInsets.symmetric(vertical: 12),
      children: [
        padded(
          AssistantMessage(
            icon: Icons.description_outlined,
            accent: _accent,
            boxed: true,
            badges: [
              const InfoBadge(label: 'Summary complete', color: _accent, icon: Icons.check_circle_outline),
              InfoBadge(label: state.filename, color: muted, icon: Icons.insert_drive_file_outlined),
              InfoBadge(label: _formatElapsed(state.elapsed), color: muted, icon: Icons.schedule),
            ],
            actions: [
              MessageAction(
                icon: Icons.copy_rounded,
                tooltip: 'Copy summary',
                onPressed: () => copyToClipboard(context, state.summary),
              ),
            ],
            child: MessageContent(text: state.summary),
          ),
        ),
        for (final item in state.qaItems)
          padded(
            Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                UserBubble(text: item.question),
                AssistantMessage(
                  icon: Icons.question_answer_outlined,
                  accent: _accent,
                  actions: [
                    MessageAction(
                      icon: Icons.copy_rounded,
                      tooltip: 'Copy',
                      onPressed: () => copyToClipboard(context, item.answer),
                    ),
                  ],
                  child: MarkdownMessage(text: item.answer),
                ),
              ],
            ),
          ),
        if (state.isAsking) padded(const ThinkingIndicator(label: 'Reading the document...', accent: _accent)),
      ],
    );
  }
}

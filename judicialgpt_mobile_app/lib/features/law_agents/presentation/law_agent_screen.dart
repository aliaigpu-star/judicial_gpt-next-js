import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/widgets/agent_empty_state.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/chat_composer.dart';
import '../../../core/widgets/feedback.dart';
import '../../../core/widgets/message_content.dart';
import '../../../core/widgets/responsive.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../data/law_agent_repository.dart';
import '../domain/law_agent_kind.dart';
import '../state/law_agent_controller.dart';

/// Civil, Criminal or Family Law Q&A, depending on [kind].
class LawAgentScreen extends ConsumerStatefulWidget {
  const LawAgentScreen({super.key, required this.kind});

  final LawAgentKind kind;

  @override
  ConsumerState<LawAgentScreen> createState() => _LawAgentScreenState();
}

class _LawAgentScreenState extends ConsumerState<LawAgentScreen> {
  final _input = TextEditingController();
  final _scroll = ScrollController();

  @override
  void dispose() {
    _input.dispose();
    _scroll.dispose();
    super.dispose();
  }

  LawAgentKind get _kind => widget.kind;

  void _ask(String query) {
    _input.clear();
    ref.read(lawAgentControllerProvider(_kind).notifier).ask(query);
    scrollToBottom(_scroll, force: true);
  }

  @override
  Widget build(BuildContext context) {
    final provider = lawAgentControllerProvider(_kind);
    final state = ref.watch(provider);

    ref.listen(provider.select((s) => s.error), (_, error) {
      if (error == null) return;
      showAppSnack(context, error, error: true);
      ref.read(provider.notifier).clearError();
    });
    ref.listen(provider.select((s) => s.exchanges.length), (_, _) => scrollToBottom(_scroll));

    final empty = state.exchanges.isEmpty && !state.isAsking;

    return AppScaffold(
      title: _kind.title,
      body: Column(
        children: [
          Expanded(
            child: empty
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
                      for (final exchange in state.exchanges)
                        ContentWidth(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: _ExchangeView(exchange: exchange, kind: _kind),
                          ),
                        ),
                      if (state.isAsking)
                        ContentWidth(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: ThinkingIndicator(label: 'Consulting legal knowledge base...', accent: _kind.accent),
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
                hint: 'Ask ${_kind.title}...',
                accent: _kind.accent,
                busy: state.isAsking,
                onSend: _ask,
                leading: ComposerTag(icon: _kind.icon, label: _kind.title, color: _kind.accent),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _ExchangeView extends StatelessWidget {
  const _ExchangeView({required this.exchange, required this.kind});

  final LawExchange exchange;
  final LawAgentKind kind;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final sources = exchange.answer.sources.take(4).toList();

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        UserBubble(text: exchange.query),
        AssistantMessage(
          icon: kind.icon,
          accent: kind.accent,
          boxed: true,
          badges: [
            InfoBadge(label: kind.ragLabel, color: kind.accent, icon: Icons.check_circle_outline),
            InfoBadge(
              label: TimeOfDay.fromDateTime(exchange.timestamp).format(context),
              color: theme.colorScheme.onSurfaceVariant,
              icon: Icons.schedule,
            ),
          ],
          actions: [
            MessageAction(
              icon: Icons.copy_rounded,
              tooltip: 'Copy',
              onPressed: () => copyToClipboard(context, exchange.answer.answer),
            ),
          ],
          footer: sources.isEmpty ? null : _SourcesList(sources: sources),
          child: MessageContent(text: exchange.answer.answer),
        ),
      ],
    );
  }
}

class _SourcesList extends StatelessWidget {
  const _SourcesList({required this.sources});

  final List<StatuteSource> sources;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Sources', style: theme.textTheme.labelMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant)),
          const SizedBox(height: 6),
          for (final source in sources)
            Container(
              width: double.infinity,
              margin: const EdgeInsets.only(bottom: 6),
              padding: const EdgeInsets.all(10),
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(8),
                border: Border.all(color: theme.colorScheme.outline),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text.rich(
                    TextSpan(
                      text: source.file,
                      style: const TextStyle(fontWeight: FontWeight.w600),
                      children: [
                        if (source.page != null)
                          TextSpan(
                            text: '  ·  p.${source.page}',
                            style: TextStyle(fontWeight: FontWeight.normal, color: theme.colorScheme.onSurfaceVariant),
                          ),
                      ],
                    ),
                    style: theme.textTheme.bodySmall,
                  ),
                  if (source.snippet?.isNotEmpty ?? false)
                    Padding(
                      padding: const EdgeInsets.only(top: 4),
                      child: Text(
                        source.snippet!,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                      ),
                    ),
                ],
              ),
            ),
        ],
      ),
    );
  }
}

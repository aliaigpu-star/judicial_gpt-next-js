import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/theme/app_theme.dart';
import '../../../core/widgets/auto_scroll.dart';
import '../../../core/widgets/chat_bubbles.dart';
import '../../../core/widgets/message_content.dart';
import '../../../core/widgets/responsive.dart';
import '../../shell/presentation/app_scaffold.dart';
import '../../speech/data/speech_repository.dart';
import '../state/voice_agent_controller.dart';

/// Hands-free conversation with JudicialGPT: tap to talk, tap again to send,
/// and the answer is read aloud.
class VoiceAgentScreen extends ConsumerStatefulWidget {
  const VoiceAgentScreen({super.key});

  @override
  ConsumerState<VoiceAgentScreen> createState() => _VoiceAgentScreenState();
}

class _VoiceAgentScreenState extends ConsumerState<VoiceAgentScreen> {
  final _scroll = ScrollController();

  @override
  void dispose() {
    _scroll.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final state = ref.watch(voiceAgentControllerProvider);
    final controller = ref.read(voiceAgentControllerProvider.notifier);
    final theme = Theme.of(context);
    ref.listen(voiceAgentControllerProvider.select((s) => s.turns.length), (_, _) => scrollToBottom(_scroll));

    return AppScaffold(
      title: 'Voice Agent',
      actions: [
        PopupMenuButton<TtsVoice>(
          tooltip: 'Voice',
          initialValue: state.voice,
          onSelected: controller.selectVoice,
          itemBuilder: (_) => [
            for (final voice in TtsVoice.values)
              PopupMenuItem(
                value: voice,
                child: ListTile(
                  contentPadding: EdgeInsets.zero,
                  title: Text(voice.label),
                  subtitle: Text(voice.accent),
                  trailing: voice == state.voice ? Icon(Icons.check_rounded, color: theme.colorScheme.primary) : null,
                ),
              ),
          ],
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 12),
            child: Row(
              children: [
                const Icon(Icons.record_voice_over_outlined, size: 20),
                const SizedBox(width: 6),
                Text(state.voice.label),
              ],
            ),
          ),
        ),
      ],
      body: Column(
        children: [
          Expanded(
            child: state.turns.isEmpty
                ? const _Intro()
                : ListView(
                    controller: _scroll,
                    padding: const EdgeInsets.symmetric(vertical: 12),
                    children: [
                      for (final turn in state.turns)
                        ContentWidth(
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                UserBubble(text: turn.question),
                                AssistantMessage(
                                  icon: Icons.graphic_eq_rounded,
                                  accent: theme.colorScheme.primary,
                                  child: MarkdownMessage(text: turn.answer),
                                ),
                              ],
                            ),
                          ),
                        ),
                    ],
                  ),
          ),
          if (state.error != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 24),
              child: Text(
                state.error!,
                textAlign: TextAlign.center,
                style: TextStyle(color: theme.colorScheme.error),
              ),
            ),
          const SizedBox(height: 12),
          _TalkButton(status: state.status, onPressed: controller.toggleListening),
          const SizedBox(height: 12),
          Text(
            state.progress ?? _hint(state.status),
            style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
          const SizedBox(height: 24),
        ],
      ),
    );
  }

  static String _hint(VoiceStatus status) => switch (status) {
    VoiceStatus.listening => 'Tap to send',
    VoiceStatus.speaking => 'Tap to stop',
    _ => 'Tap to speak',
  };
}

class _Intro extends StatelessWidget {
  const _Intro();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AgentMark(icon: Icons.graphic_eq_rounded, accent: theme.colorScheme.primary, size: 56),
            const SizedBox(height: 20),
            Text('Talk to JudicialGPT', style: AppTheme.display(context, size: 26), textAlign: TextAlign.center),
            const SizedBox(height: 8),
            Text(
              'Ask a legal question out loud. The answer is shown here and read back to you.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}

class _TalkButton extends StatefulWidget {
  const _TalkButton({required this.status, required this.onPressed});

  final VoiceStatus status;
  final VoidCallback onPressed;

  @override
  State<_TalkButton> createState() => _TalkButtonState();
}

class _TalkButtonState extends State<_TalkButton> with SingleTickerProviderStateMixin {
  late final AnimationController _pulse = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400))
    ..repeat();

  @override
  void dispose() {
    _pulse.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final status = widget.status;
    final active = status == VoiceStatus.listening || status == VoiceStatus.speaking;
    final color = status == VoiceStatus.listening ? theme.colorScheme.error : theme.colorScheme.primary;

    final icon = switch (status) {
      VoiceStatus.idle => const Icon(Icons.mic_rounded, size: 36, color: Colors.white),
      VoiceStatus.listening => const Icon(Icons.send_rounded, size: 32, color: Colors.white),
      VoiceStatus.processing => const SizedBox.square(
        dimension: 30,
        child: CircularProgressIndicator(strokeWidth: 3, color: Colors.white),
      ),
      VoiceStatus.speaking => const Icon(Icons.stop_rounded, size: 36, color: Colors.white),
    };

    return SizedBox.square(
      dimension: 132,
      child: Stack(
        alignment: Alignment.center,
        children: [
          if (active)
            AnimatedBuilder(
              animation: _pulse,
              builder: (_, _) => Container(
                width: 88 + 44 * _pulse.value,
                height: 88 + 44 * _pulse.value,
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  color: color.withValues(alpha: 0.25 * (1 - _pulse.value)),
                ),
              ),
            ),
          Material(
            color: status == VoiceStatus.processing ? color.withValues(alpha: 0.6) : color,
            shape: const CircleBorder(),
            elevation: 4,
            child: InkWell(
              customBorder: const CircleBorder(),
              onTap: status == VoiceStatus.processing ? null : widget.onPressed,
              child: SizedBox.square(dimension: 88, child: Center(child: icon)),
            ),
          ),
        ],
      ),
    );
  }
}

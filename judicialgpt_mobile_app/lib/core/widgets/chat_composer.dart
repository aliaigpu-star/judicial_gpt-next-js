import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Message input card: the text field on top, tools and the send button
/// underneath.
///
/// The parent owns [controller] so it can pre-fill suggestions and clear
/// the field after sending.
class ChatComposer extends StatefulWidget {
  const ChatComposer({
    super.key,
    required this.controller,
    required this.onSend,
    required this.hint,
    this.accent,
    this.busy = false,
    this.onStop,
    this.leading,
    this.actions = const [],
    this.header,
    this.allowEmpty = false,
    this.onVoiceAgent,
    this.focusNode,
  });

  final TextEditingController controller;
  final ValueChanged<String> onSend;
  final String hint;
  final Color? accent;
  final bool busy;

  /// When set, a stop button replaces the spinner while [busy].
  final VoidCallback? onStop;

  /// Tool shown bottom-left, e.g. the attach menu or the agent's icon.
  final Widget? leading;

  /// Extra buttons placed just before the send button (e.g. microphone).
  final List<Widget> actions;

  /// Shown above the text field, e.g. the chip of an attached file.
  final Widget? header;

  /// Lets an empty message be sent (when an attachment carries the content).
  final bool allowEmpty;

  /// When set, the send button becomes a Voice Agent button while there is
  /// nothing to send, and turns back into Send as soon as the user types.
  final VoidCallback? onVoiceAgent;
  final FocusNode? focusNode;

  @override
  State<ChatComposer> createState() => _ChatComposerState();
}

class _ChatComposerState extends State<ChatComposer> {
  @override
  void initState() {
    super.initState();
    widget.controller.addListener(_rebuild);
  }

  @override
  void didUpdateWidget(ChatComposer oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.controller != widget.controller) {
      oldWidget.controller.removeListener(_rebuild);
      widget.controller.addListener(_rebuild);
    }
  }

  @override
  void dispose() {
    widget.controller.removeListener(_rebuild);
    super.dispose();
  }

  void _rebuild() => setState(() {});

  void _submit() {
    final text = widget.controller.text.trim();
    if ((text.isEmpty && !widget.allowEmpty) || widget.busy) return;
    widget.onSend(text);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = widget.accent ?? theme.colorScheme.primary;
    final canSend = (widget.allowEmpty || widget.controller.text.trim().isNotEmpty) && !widget.busy;

    return DecoratedBox(
      decoration: BoxDecoration(
        color: context.palette.card,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: theme.colorScheme.outline),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: theme.brightness == Brightness.dark ? 0.25 : 0.05),
            blurRadius: 18,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 6, 8, 8),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (widget.header != null) Padding(padding: const EdgeInsets.only(top: 6), child: widget.header),
            TextField(
              controller: widget.controller,
              focusNode: widget.focusNode,
              enabled: !widget.busy,
              minLines: 1,
              maxLines: 6,
              style: theme.textTheme.bodyLarge,
              textCapitalization: TextCapitalization.sentences,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: widget.hint,
                filled: false,
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(vertical: 10),
              ),
            ),
            Row(
              children: [
                ?widget.leading,
                const Spacer(),
                ...widget.actions,
                _SendButton(
                  accent: accent,
                  busy: widget.busy,
                  enabled: canSend,
                  onSend: _submit,
                  onStop: widget.onStop,
                  onVoiceAgent: widget.onVoiceAgent,
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _SendButton extends StatelessWidget {
  const _SendButton({
    required this.accent,
    required this.busy,
    required this.enabled,
    required this.onSend,
    required this.onStop,
    this.onVoiceAgent,
  });

  final Color accent;
  final bool busy;
  final bool enabled;
  final VoidCallback onSend;
  final VoidCallback? onStop;
  final VoidCallback? onVoiceAgent;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final stopping = busy && onStop != null;
    final voice = !busy && !enabled && onVoiceAgent != null;

    final Widget icon = switch ((busy, stopping)) {
      (_, true) => const Icon(Icons.stop_rounded, size: 18, key: ValueKey('stop')),
      (true, false) => const SizedBox(
        key: ValueKey('busy'),
        width: 16,
        height: 16,
        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
      ),
      _ when voice => const Icon(Icons.graphic_eq_rounded, size: 20, key: ValueKey('voice')),
      _ => const Icon(Icons.arrow_upward_rounded, size: 20, key: ValueKey('send')),
    };

    return AnimatedContainer(
      duration: const Duration(milliseconds: 150),
      width: 36,
      height: 36,
      decoration: BoxDecoration(
        color: stopping
            ? theme.colorScheme.onSurface
            : enabled || busy || voice
            ? accent
            : accent.withValues(alpha: 0.35),
        borderRadius: BorderRadius.circular(10),
      ),
      child: IconButton(
        padding: EdgeInsets.zero,
        tooltip: stopping ? 'Stop generating' : (voice ? 'Voice Agent' : 'Send'),
        color: stopping ? theme.colorScheme.surface : Colors.white,
        onPressed: stopping ? onStop : (voice ? onVoiceAgent : (enabled ? onSend : null)),
        icon: IconTheme.merge(
          data: IconThemeData(color: stopping ? theme.colorScheme.surface : Colors.white),
          child: AnimatedSwitcher(
            duration: const Duration(milliseconds: 180),
            transitionBuilder: (child, animation) => ScaleTransition(scale: animation, child: child),
            child: icon,
          ),
        ),
      ),
    );
  }
}

/// Small pill toggle for the composer's tool row (e.g. "Web search").
class ComposerToggle extends StatelessWidget {
  const ComposerToggle({
    super.key,
    required this.icon,
    required this.label,
    required this.selected,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback? onPressed;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    final color = selected ? accent : theme.colorScheme.onSurfaceVariant;
    return Material(
      color: selected ? accent.withValues(alpha: 0.1) : Colors.transparent,
      shape: StadiumBorder(
        side: BorderSide(color: selected ? accent.withValues(alpha: 0.4) : theme.colorScheme.outline),
      ),
      child: InkWell(
        customBorder: const StadiumBorder(),
        onTap: onPressed,
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, size: 16, color: color),
              const SizedBox(width: 6),
              Text(
                label,
                style: theme.textTheme.labelMedium?.copyWith(color: color, fontWeight: FontWeight.w600),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

/// Compact label shown in the composer's tool row (e.g. the agent's name).
class ComposerTag extends StatelessWidget {
  const ComposerTag({super.key, required this.icon, required this.label, required this.color});

  final IconData icon;
  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) => Row(
    mainAxisSize: MainAxisSize.min,
    children: [
      Icon(icon, size: 16, color: color),
      const SizedBox(width: 6),
      Text(
        label,
        style: Theme.of(context).textTheme.labelMedium?.copyWith(color: color, fontWeight: FontWeight.w600),
      ),
    ],
  );
}

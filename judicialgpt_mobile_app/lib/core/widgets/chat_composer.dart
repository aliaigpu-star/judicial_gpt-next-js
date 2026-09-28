import 'package:flutter/material.dart';

/// Pill-shaped message input with a send button, as on the website.
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
    this.focusNode,
  });

  final TextEditingController controller;
  final ValueChanged<String> onSend;
  final String hint;
  final Color? accent;
  final bool busy;

  /// When set, a stop button replaces the spinner while [busy].
  final VoidCallback? onStop;
  final Widget? leading;
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
    if (text.isEmpty || widget.busy) return;
    widget.onSend(text);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = widget.accent ?? theme.colorScheme.primary;
    final canSend = widget.controller.text.trim().isNotEmpty && !widget.busy;

    return Container(
      padding: const EdgeInsets.fromLTRB(6, 6, 6, 6),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(28),
        border: Border.all(color: theme.colorScheme.outline),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (widget.leading != null) widget.leading! else const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: widget.controller,
              focusNode: widget.focusNode,
              enabled: !widget.busy,
              minLines: 1,
              maxLines: 6,
              textInputAction: TextInputAction.newline,
              decoration: InputDecoration(
                hintText: widget.hint,
                filled: false,
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                disabledBorder: InputBorder.none,
                contentPadding: const EdgeInsets.symmetric(horizontal: 6, vertical: 12),
              ),
            ),
          ),
          if (widget.busy && widget.onStop != null)
            Padding(
              padding: const EdgeInsets.all(2),
              child: IconButton.filled(
                onPressed: widget.onStop,
                tooltip: 'Stop generating',
                style: IconButton.styleFrom(
                  backgroundColor: theme.colorScheme.onSurface,
                  foregroundColor: theme.colorScheme.surface,
                ),
                icon: const Icon(Icons.stop_rounded),
              ),
            )
          else
            Padding(
              padding: const EdgeInsets.all(2),
              child: IconButton.filled(
                onPressed: canSend ? _submit : null,
                style: IconButton.styleFrom(
                  backgroundColor: accent,
                  disabledBackgroundColor: theme.colorScheme.outline,
                  foregroundColor: Colors.white,
                ),
                icon: widget.busy
                    ? const SizedBox(
                        width: 18,
                        height: 18,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : const Icon(Icons.arrow_upward_rounded),
              ),
            ),
        ],
      ),
    );
  }
}

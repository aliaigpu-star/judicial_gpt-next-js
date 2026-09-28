import 'package:flutter/widgets.dart';

/// Scrolls to the newest content after the next frame.
///
/// Unless [force] is set, it only follows new content while the user is
/// already near the bottom, so reading earlier messages isn't interrupted.
void scrollToBottom(ScrollController controller, {bool force = false}) {
  WidgetsBinding.instance.addPostFrameCallback((_) {
    if (!controller.hasClients) return;
    final position = controller.position;
    final nearBottom = position.maxScrollExtent - position.pixels < 160;
    if (!force && !nearBottom) return;
    controller.animateTo(position.maxScrollExtent, duration: const Duration(milliseconds: 200), curve: Curves.easeOut);
  });
}

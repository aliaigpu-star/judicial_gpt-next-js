import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

/// What the user picked in the "+" sheet.
enum AttachmentChoice { camera, gallery, file, webSearch }

/// Opens the "Add to chat" bottom sheet and resolves with the user's choice.
Future<AttachmentChoice?> showAttachmentSheet(BuildContext context, {required bool webSearch}) =>
    showModalBottomSheet<AttachmentChoice>(
      context: context,
      showDragHandle: true,
      builder: (_) => _AttachmentSheet(webSearch: webSearch),
    );

class _AttachmentSheet extends StatelessWidget {
  const _AttachmentSheet({required this.webSearch});

  final bool webSearch;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    void choose(AttachmentChoice choice) => Navigator.pop(context, choice);

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text('Add to chat', style: AppTheme.display(context, size: 22)),
            const SizedBox(height: 4),
            Text(
              'Attach a document or image, or let JudicialGPT search the web.',
              style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  child: _SourceTile(
                    icon: Icons.photo_camera_rounded,
                    label: 'Camera',
                    color: const Color(0xFF3B82F6),
                    onTap: () => choose(AttachmentChoice.camera),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _SourceTile(
                    icon: Icons.photo_library_rounded,
                    label: 'Photos',
                    color: const Color(0xFFEC4899),
                    onTap: () => choose(AttachmentChoice.gallery),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: _SourceTile(
                    icon: Icons.description_rounded,
                    label: 'Files',
                    color: const Color(0xFFF59E0B),
                    onTap: () => choose(AttachmentChoice.file),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Images up to 10MB · PDF, Word or text up to 5MB',
              textAlign: TextAlign.center,
              style: theme.textTheme.labelSmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
            ),
            const SizedBox(height: 16),
            _WebSearchCard(enabled: webSearch, onTap: () => choose(AttachmentChoice.webSearch)),
          ],
        ),
      ),
    );
  }
}

/// Large tile with a coloured circular icon, e.g. "Camera".
class _SourceTile extends StatelessWidget {
  const _SourceTile({required this.icon, required this.label, required this.color, required this.onTap});

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Material(
      color: context.palette.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: theme.colorScheme.outline),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 16),
          child: Column(
            children: [
              Container(
                width: 48,
                height: 48,
                decoration: BoxDecoration(color: color.withValues(alpha: 0.14), shape: BoxShape.circle),
                child: Icon(icon, color: color, size: 24),
              ),
              const SizedBox(height: 10),
              Text(label, style: theme.textTheme.labelLarge?.copyWith(fontWeight: FontWeight.w600)),
            ],
          ),
        ),
      ),
    );
  }
}

/// Web-search toggle styled as a card; tinted with the accent while on.
class _WebSearchCard extends StatelessWidget {
  const _WebSearchCard({required this.enabled, required this.onTap});

  final bool enabled;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final accent = theme.colorScheme.primary;
    return Material(
      color: enabled ? accent.withValues(alpha: 0.08) : context.palette.card,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(18),
        side: BorderSide(color: enabled ? accent.withValues(alpha: 0.45) : theme.colorScheme.outline),
      ),
      clipBehavior: Clip.antiAlias,
      child: InkWell(
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.fromLTRB(14, 12, 8, 12),
          child: Row(
            children: [
              Container(
                width: 40,
                height: 40,
                decoration: BoxDecoration(
                  color: accent.withValues(alpha: 0.14),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: Icon(Icons.language_rounded, color: accent),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('Search the web', style: theme.textTheme.bodyLarge?.copyWith(fontWeight: FontWeight.w600)),
                    Text(
                      enabled ? 'On · answers use live web results' : 'Get answers from live web results',
                      style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                    ),
                  ],
                ),
              ),
              Switch(value: enabled, onChanged: (_) => onTap()),
            ],
          ),
        ),
      ),
    );
  }
}

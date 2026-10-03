import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/utils/mime_types.dart';
import '../../../core/widgets/feedback.dart';
import '../domain/chat_attachment.dart';
import 'attachment_sheet.dart';

/// The composer's "+" button: upload a file or image, or toggle web search.
class AttachmentMenuButton extends StatelessWidget {
  const AttachmentMenuButton({
    super.key,
    required this.webSearch,
    required this.onToggleWebSearch,
    required this.onAttach,
    this.enabled = true,
  });

  final bool webSearch;
  final VoidCallback onToggleWebSearch;
  final ValueChanged<ChatAttachment> onAttach;
  final bool enabled;

  Future<void> _open(BuildContext context) async {
    final choice = await showAttachmentSheet(context, webSearch: webSearch);
    if (choice == null || !context.mounted) return;
    if (choice == AttachmentChoice.webSearch) {
      onToggleWebSearch();
      return;
    }

    try {
      final picking = switch (choice) {
        AttachmentChoice.gallery => _pickImage(context, ImageSource.gallery),
        AttachmentChoice.camera => _pickImage(context, ImageSource.camera),
        _ => _pickDocument(context),
      };
      final attachment = await picking;
      if (attachment != null) onAttach(attachment);
    } catch (e) {
      if (context.mounted) showAppSnack(context, 'Could not attach file: $e', error: true);
    }
  }

  Future<ChatAttachment?> _pickDocument(BuildContext context) async {
    final file = await FilePicker.pickFile(type: FileType.custom, allowedExtensions: ChatAttachment.documentExtensions);
    if (file == null) return null;
    final contentType = MimeTypes.forFilename(file.name);
    if (contentType == null) {
      if (context.mounted) showAppSnack(context, 'Please select a PDF, Word, or Text file', error: true);
      return null;
    }
    if ((await file.length() ?? 0) > ChatAttachment.maxDocumentBytes) {
      if (context.mounted) showAppSnack(context, 'File must be smaller than 5MB', error: true);
      return null;
    }
    return ChatAttachment(
      kind: AttachmentKind.document,
      name: file.name,
      bytes: await file.readAsBytes(),
      contentType: contentType,
    );
  }

  Future<ChatAttachment?> _pickImage(BuildContext context, ImageSource source) async {
    // Re-encoding (imageQuality) turns HEIC camera photos into JPEG for OCR.
    final image = await ImagePicker().pickImage(source: source, imageQuality: 90);
    if (image == null) return null;
    final bytes = await image.readAsBytes();
    if (bytes.length > ChatAttachment.maxImageBytes) {
      if (context.mounted) showAppSnack(context, 'Image must be smaller than 10MB', error: true);
      return null;
    }
    return ChatAttachment(
      kind: AttachmentKind.image,
      name: image.name,
      bytes: bytes,
      contentType: image.mimeType ?? MimeTypes.forFilename(image.name) ?? 'image/jpeg',
    );
  }

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: 'Attach or search',
    onPressed: enabled ? () => _open(context) : null,
    icon: const Icon(Icons.add_rounded),
    style: IconButton.styleFrom(
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(10),
        side: BorderSide(color: Theme.of(context).colorScheme.outline),
      ),
    ),
  );
}

/// Chip for the attached file, shown above the message field.
class AttachmentChip extends StatelessWidget {
  const AttachmentChip({super.key, required this.attachment, required this.onRemove});

  final ChatAttachment attachment;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isImage = attachment.kind == AttachmentKind.image;
    return Container(
      padding: const EdgeInsets.fromLTRB(8, 6, 4, 6),
      decoration: BoxDecoration(color: context.palette.userBubble, borderRadius: BorderRadius.circular(12)),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          if (isImage)
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: Image.memory(attachment.bytes, width: 32, height: 32, fit: BoxFit.cover),
            )
          else
            Icon(Icons.description_outlined, color: theme.colorScheme.primary),
          const SizedBox(width: 8),
          ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 200),
            child: Text(attachment.name, maxLines: 1, overflow: TextOverflow.ellipsis),
          ),
          IconButton(
            tooltip: 'Remove',
            visualDensity: VisualDensity.compact,
            onPressed: onRemove,
            icon: const Icon(Icons.close_rounded, size: 18),
          ),
        ],
      ),
    );
  }
}

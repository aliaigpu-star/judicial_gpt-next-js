import 'dart:typed_data';

enum AttachmentKind { document, image }

/// A file attached to the next chat message. Its text is extracted by the
/// backend and sent to the model along with the question, as on the website.
class ChatAttachment {
  const ChatAttachment({required this.kind, required this.name, required this.bytes, required this.contentType});

  final AttachmentKind kind;
  final String name;
  final Uint8List bytes;
  final String contentType;

  static const documentExtensions = ['pdf', 'doc', 'docx', 'txt'];
  static const maxDocumentBytes = 5 * 1024 * 1024;
  static const maxImageBytes = 10 * 1024 * 1024;

  /// What the conversation shows (and saves) for this upload.
  String displayLabel(String question) {
    final icon = kind == AttachmentKind.document ? '📄' : '🖼️';
    return '$icon Uploaded: $name\n\n$question'.trim();
  }
}

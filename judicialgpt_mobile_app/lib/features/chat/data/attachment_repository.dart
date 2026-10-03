import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../domain/chat_attachment.dart';

final attachmentRepositoryProvider = Provider<AttachmentRepository>(
  (ref) => AttachmentRepository(ref.watch(apiClientProvider)),
);

/// Extracts text from chat attachments via the backend's services:
/// documents through `/pdf-read`, images through OCR.
class AttachmentRepository {
  AttachmentRepository(this._api);

  final ApiClient _api;

  Future<String> extractText(ChatAttachment attachment) async {
    final path = switch (attachment.kind) {
      AttachmentKind.document => '/api/services/pdf-read',
      AttachmentKind.image => '/api/services/ocr',
    };
    final data = await _api.postMultipart(
      path,
      file: UploadFile(
        field: 'file',
        bytes: attachment.bytes,
        filename: attachment.name,
        contentType: attachment.contentType,
      ),
    );
    return data['text'] as String? ?? '';
  }
}

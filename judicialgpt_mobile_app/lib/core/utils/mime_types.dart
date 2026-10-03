/// Content types for the uploads the backend accepts. It checks the declared
/// type against the file's magic bytes, so these must match the file.
abstract final class MimeTypes {
  static const _byExtension = {
    'pdf': 'application/pdf',
    'doc': 'application/msword',
    'docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt': 'text/plain',
    'jpg': 'image/jpeg',
    'jpeg': 'image/jpeg',
    'png': 'image/png',
    'webp': 'image/webp',
    'gif': 'image/gif',
    'wav': 'audio/wav',
    'm4a': 'audio/mp4',
    'mp3': 'audio/mpeg',
  };

  static String? forFilename(String filename) {
    final dot = filename.lastIndexOf('.');
    return dot < 0 ? null : _byExtension[filename.substring(dot + 1).toLowerCase()];
  }
}

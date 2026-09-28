import 'dart:convert';
import 'dart:io';

import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:path_provider/path_provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../../../core/utils/judgment_text.dart';
import '../domain/writer_kind.dart';

final judgmentWriterRepositoryProvider = Provider<JudgmentWriterRepository>(
  (ref) => JudgmentWriterRepository(ref.watch(apiClientProvider)),
);

sealed class WriterEvent {
  const WriterEvent();
}

class WriterText extends WriterEvent {
  const WriterText(this.text);
  final String text;
}

/// A generated `.docx` is available for this draft.
class WriterDocument extends WriterEvent {
  const WriterDocument({required this.title, required this.fileName});
  final String title;
  final String fileName;
}

class JudgmentWriterRepository {
  JudgmentWriterRepository(this._api);

  final ApiClient _api;

  Stream<WriterEvent> draft(WriterKind kind, String query) async* {
    final events = _api.streamEvents('${kind.proxyPath}/chat/stream', body: {'query': query});

    await for (final payload in events) {
      final trimmed = payload.trim();
      if (trimmed == '[DONE]') return;
      if (trimmed.startsWith('[ERROR]')) {
        final reason = trimmed.substring(7).trim();
        throw ApiException(reason.isEmpty ? 'The agent failed to respond.' : reason);
      }

      final Object? data;
      try {
        data = jsonDecode(payload);
      } catch (_) {
        // Older agent builds stream raw tokens instead of JSON.
        yield WriterText(AgentTokens.fromRaw(payload));
        continue;
      }

      if (data is Json && data['text'] is String) {
        yield WriterText(data['text'] as String);
      } else if (data is Json && data['metadata'] is Json) {
        final document = (data['metadata'] as Json)['document'];
        if (document is Json) {
          final url = document['download_url'] as String? ?? '';
          final fileName = Uri.tryParse(url)?.pathSegments.lastOrNull;
          if (fileName != null && fileName.isNotEmpty) {
            yield WriterDocument(title: document['title'] as String? ?? 'Judgment', fileName: fileName);
          }
        }
      } else if (data is String) {
        yield WriterText(data);
      }
    }
  }

  /// Downloads a generated document through the proxy and saves it locally.
  ///
  /// The agent reports a `localhost` URL, which a phone can't reach, so only
  /// the file name is used and the request goes via the backend.
  Future<File> downloadDocument(WriterKind kind, String fileName) async {
    final bytes = await _api.getBytes('${kind.proxyPath}/documents/${Uri.encodeComponent(fileName)}');
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/$fileName');
    return file.writeAsBytes(bytes, flush: true);
  }
}

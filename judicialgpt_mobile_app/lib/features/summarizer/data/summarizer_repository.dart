import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';

final summarizerRepositoryProvider = Provider<SummarizerRepository>(
  (ref) => SummarizerRepository(ref.watch(apiClientProvider)),
);

enum SummaryJobStatus { pending, processing, done, failed }

class SummaryJob {
  const SummaryJob({required this.status, this.summary, this.error});

  factory SummaryJob.fromJson(Json json) => SummaryJob(
    status: SummaryJobStatus.values.firstWhere(
      (s) => s.name == json['status'],
      orElse: () => SummaryJobStatus.processing,
    ),
    summary: json['summary'] as String?,
    error: json['error'] as String?,
  );

  final SummaryJobStatus status;
  final String? summary;
  final String? error;
}

/// Talks to the Summarization Agent through the backend proxy.
class SummarizerRepository {
  SummarizerRepository(this._api);

  final ApiClient _api;

  static const supportedExtensions = ['pdf', 'docx', 'doc', 'txt'];

  /// Uploads the document and returns the background job id.
  Future<String> upload(String filename, Uint8List bytes) async {
    final data = await _api.postMultipart(
      '/api/ai/summarize',
      file: UploadFile(field: 'file', bytes: bytes, filename: filename),
    );
    return data['jobId'] as String;
  }

  Future<SummaryJob> status(String jobId) async =>
      SummaryJob.fromJson(await _api.get('/api/ai/summarize-status/$jobId'));

  Future<String> ask(String jobId, String question) async {
    final data = await _api.post('/api/ai/summarize-ask', body: {'jobId': jobId, 'question': question});
    return data['answer'] as String? ?? '';
  }
}

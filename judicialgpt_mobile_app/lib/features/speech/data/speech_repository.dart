import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';

final speechRepositoryProvider = Provider<SpeechRepository>((ref) => SpeechRepository(ref.watch(apiClientProvider)));

/// Voices offered by the backend's text-to-speech service (same list as the
/// website's Voice Agent).
enum TtsVoice {
  jenny('en-US-JennyNeural', 'Jenny', 'US · Female'),
  guy('en-US-GuyNeural', 'Guy', 'US · Male'),
  sonia('en-GB-SoniaNeural', 'Sonia', 'UK · Female'),
  ryan('en-GB-RyanNeural', 'Ryan', 'UK · Male'),
  natasha('en-AU-NatashaNeural', 'Natasha', 'AU · Female'),
  neerja('en-IN-NeerjaNeural', 'Neerja', 'IN · Female');

  const TtsVoice(this.id, this.label, this.accent);

  final String id;
  final String label;
  final String accent;
}

/// Speech-to-text and text-to-speech through the backend's services.
class SpeechRepository {
  SpeechRepository(this._api);

  final ApiClient _api;

  Future<String> transcribe(Uint8List audio, {required String filename, required String contentType}) async {
    final data = await _api.postMultipart(
      '/api/services/transcribe',
      file: UploadFile(field: 'audio', bytes: audio, filename: filename, contentType: contentType),
    );
    return (data['text'] as String? ?? '').trim();
  }

  /// Returns MP3 audio of [text] read in [voice].
  Future<Uint8List> synthesize(String text, {TtsVoice voice = TtsVoice.jenny}) =>
      _api.postForBytes('/api/services/tts', body: {'text': text, 'voice': voice.id});
}

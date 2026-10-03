import 'dart:io';
import 'dart:typed_data';

import 'package:path_provider/path_provider.dart';
import 'package:record/record.dart';

/// Records the microphone to a WAV file.
///
/// WAV is used because the backend validates uploads by magic bytes and the
/// speech-to-text model accepts it reliably; 16 kHz mono keeps it small.
class VoiceRecorder {
  final AudioRecorder _recorder = AudioRecorder();
  String? _path;

  static const filename = 'recording.wav';
  static const contentType = 'audio/wav';

  Future<bool> hasPermission() => _recorder.hasPermission();

  Future<bool> get isRecording => _recorder.isRecording();

  Future<void> start() async {
    final dir = await getTemporaryDirectory();
    _path = '${dir.path}/judicialgpt_${DateTime.now().millisecondsSinceEpoch}.wav';
    await _recorder.start(
      const RecordConfig(encoder: AudioEncoder.wav, sampleRate: 16000, numChannels: 1),
      path: _path!,
    );
  }

  /// Stops recording and returns the audio, or `null` if nothing was captured.
  Future<Uint8List?> stop() async {
    final path = await _recorder.stop() ?? _path;
    if (path == null) return null;
    final file = File(path);
    if (!await file.exists()) return null;
    final bytes = await file.readAsBytes();
    await file.delete();
    // A WAV header alone is 44 bytes; anything that short holds no speech.
    return bytes.length > 1024 ? bytes : null;
  }

  Future<void> cancel() async {
    if (await _recorder.isRecording()) await _recorder.cancel();
  }

  Future<void> dispose() => _recorder.dispose();
}

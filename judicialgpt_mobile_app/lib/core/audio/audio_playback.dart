import 'dart:io';
import 'dart:typed_data';

import 'package:just_audio/just_audio.dart';
import 'package:path_provider/path_provider.dart';

/// Plays generated speech (MP3 bytes from the TTS endpoint).
class AudioPlayback {
  final AudioPlayer _player = AudioPlayer();

  /// Plays [bytes] and completes when playback finishes or is stopped.
  Future<void> play(Uint8List bytes) async {
    final dir = await getTemporaryDirectory();
    final file = File('${dir.path}/judicialgpt_speech.mp3');
    await file.writeAsBytes(bytes, flush: true);
    await _player.setFilePath(file.path);
    await _player.play();
    await _player.stop();
  }

  Future<void> stop() => _player.stop();

  Future<void> dispose() => _player.dispose();
}

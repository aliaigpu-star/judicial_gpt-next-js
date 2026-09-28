import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the JWT access token in the platform keychain/keystore and keeps
/// an in-memory copy so request headers don't hit storage every time.
class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const _key = 'auth_token';

  final FlutterSecureStorage _storage;
  String? _cached;

  String? get current => _cached;

  Future<String?> read() async => _cached ??= await _storage.read(key: _key);

  Future<void> write(String token) async {
    _cached = token;
    await _storage.write(key: _key, value: token);
  }

  Future<void> clear() async {
    _cached = null;
    await _storage.delete(key: _key);
  }
}

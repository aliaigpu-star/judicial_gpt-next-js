import 'package:flutter_secure_storage/flutter_secure_storage.dart';

/// Persists the session in the platform keychain/keystore: the short-lived
/// JWT access token and the long-lived refresh token used to renew it.
/// In-memory copies keep request headers from hitting storage every time.
class TokenStorage {
  TokenStorage([FlutterSecureStorage? storage]) : _storage = storage ?? const FlutterSecureStorage();

  static const _accessKey = 'auth_token';
  static const _refreshKey = 'refresh_token';

  final FlutterSecureStorage _storage;
  String? _access;
  String? _refresh;

  String? get current => _access;
  String? get refreshToken => _refresh;

  /// Loads both tokens from storage; returns the access token.
  Future<String?> read() async {
    _access ??= await _storage.read(key: _accessKey);
    _refresh ??= await _storage.read(key: _refreshKey);
    return _access;
  }

  Future<void> write(String token) async {
    _access = token;
    await _storage.write(key: _accessKey, value: token);
  }

  Future<void> writeRefresh(String token) async {
    _refresh = token;
    await _storage.write(key: _refreshKey, value: token);
  }

  Future<void> clear() async {
    _access = null;
    _refresh = null;
    await _storage.delete(key: _accessKey);
    await _storage.delete(key: _refreshKey);
  }
}

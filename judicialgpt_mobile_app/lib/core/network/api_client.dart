import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;
import 'package:http_parser/http_parser.dart';

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

typedef Json = Map<String, dynamic>;

/// A file to upload in a multipart request.
///
/// The backend validates both the declared [contentType] and the file's magic
/// bytes, so the type must be accurate (e.g. `application/pdf`, `image/png`).
class UploadFile {
  const UploadFile({required this.field, required this.bytes, required this.filename, this.contentType});

  final String field;
  final Uint8List bytes;
  final String filename;
  final String? contentType;
}

/// Single HTTP entry point for the app.
///
/// Paths starting with `/` are resolved against [AppConfig.baseUrl]; absolute
/// URLs are used as-is (only needed for the Family Law agent).
///
/// Access tokens are short-lived. When the backend rejects one, the client
/// renews it once with the stored refresh token and retries the request.
class ApiClient {
  ApiClient({required TokenStorage tokens, http.Client? httpClient, this.onUnauthorized})
    : _tokens = tokens,
      _http = httpClient ?? http.Client();

  final TokenStorage _tokens;
  final http.Client _http;
  Future<bool>? _renewing;

  /// Invoked when the session cannot be renewed, so the app can drop it and
  /// return to the login screen.
  void Function()? onUnauthorized;

  // ── JSON ────────────────────────────────────────────────────────────────

  Future<Json> get(String path, {bool auth = true}) => _send('GET', path, auth: auth);

  Future<Json> post(String path, {Object? body, bool auth = true}) => _send('POST', path, body: body, auth: auth);

  Future<Json> patch(String path, {Object? body}) => _send('PATCH', path, body: body);

  Future<Json> put(String path, {Object? body}) => _send('PUT', path, body: body);

  Future<Json> delete(String path) => _send('DELETE', path);

  // ── Other body encodings ────────────────────────────────────────────────

  /// `application/x-www-form-urlencoded`, for FastAPI `Form(...)` endpoints.
  Future<Json> postForm(String path, Map<String, String> fields) async {
    final response = await _execute(
      () => http.Request('POST', _uri(path))
        ..headers.addAll(_headers(auth: true))
        ..bodyFields = fields,
      auth: true,
    );
    return _decode(response);
  }

  Future<Json> postMultipart(String path, {Map<String, String> fields = const {}, required UploadFile file}) async {
    final response = await _execute(
      () => http.MultipartRequest('POST', _uri(path))
        ..headers.addAll(_headers(auth: true))
        ..fields.addAll(fields)
        ..files.add(
          http.MultipartFile.fromBytes(
            file.field,
            file.bytes,
            filename: file.filename,
            contentType: file.contentType == null ? null : MediaType.parse(file.contentType!),
          ),
        ),
      auth: true,
    );
    return _decode(response);
  }

  Future<Uint8List> getBytes(String path) async {
    final response = await _execute(
      () => http.Request('GET', _uri(path))..headers.addAll(_headers(auth: true)),
      auth: true,
    );
    _throwIfFailed(response);
    return response.bodyBytes;
  }

  /// POSTs JSON and returns the raw response body (e.g. generated audio).
  Future<Uint8List> postForBytes(String path, {required Json body}) async {
    final response = await _execute(
      () => http.Request('POST', _uri(path))
        ..headers.addAll(_headers(auth: true, json: true))
        ..body = jsonEncode(body),
      auth: true,
    );
    _throwIfFailed(response);
    return response.bodyBytes;
  }

  // ── Server-sent events ──────────────────────────────────────────────────

  /// POSTs [body] as JSON and yields the payload of every `data:` line.
  ///
  /// Payloads are yielded untrimmed: a whitespace-only token is still a real
  /// token and must reach the UI intact.
  Stream<String> streamEvents(String path, {required Json body}) async* {
    http.Request build() => http.Request('POST', _uri(path))
      ..headers.addAll(_headers(auth: true, json: true))
      ..headers['Accept'] = 'text/event-stream'
      ..body = jsonEncode(body);

    var response = await _http.send(build()).timeout(AppConfig.requestTimeout);
    if (response.statusCode == 401) {
      final failed = await http.Response.fromStream(response);
      if (_isSessionError(failed) && await _renewSession()) {
        response = await _http.send(build()).timeout(AppConfig.requestTimeout);
      } else {
        _reportSessionLoss(failed);
        _throwIfFailed(failed);
      }
    }
    if (response.statusCode >= 400) {
      final full = await http.Response.fromStream(response);
      _reportSessionLoss(full);
      _throwIfFailed(full);
    }

    final lines = response.stream.transform(utf8.decoder).transform(const LineSplitter());
    await for (final line in lines) {
      if (!line.startsWith('data:')) continue;
      final payload = line.startsWith('data: ') ? line.substring(6) : line.substring(5);
      yield payload;
    }
  }

  // ── Session ─────────────────────────────────────────────────────────────

  /// Exchanges the refresh token for a new access token. Concurrent callers
  /// share a single attempt.
  Future<bool> _renewSession() => _renewing ??= _refresh().whenComplete(() => _renewing = null);

  Future<bool> _refresh() async {
    final refreshToken = _tokens.refreshToken;
    if (refreshToken == null) return false;
    try {
      final request = http.Request('POST', _uri('/api/auth/refresh'))
        ..headers.addAll(_headers(auth: false, json: true))
        ..body = jsonEncode({'refreshToken': refreshToken});
      final response = await http.Response.fromStream(await _http.send(request).timeout(AppConfig.requestTimeout));
      if (response.statusCode != 200) return false;

      final token = (jsonDecode(response.body) as Json)['token'] as String?;
      if (token == null) return false;
      await _tokens.write(token);
      await _storeRefreshCookie(response);
      return true;
    } catch (_) {
      return false;
    }
  }

  /// The backend sends the refresh token only as a cookie; keep it so the
  /// session can be renewed after the access token expires.
  Future<void> _storeRefreshCookie(http.BaseResponse response) async {
    final cookies = response.headers['set-cookie'];
    final match = cookies == null ? null : RegExp(r'refreshToken=([^;,\s]+)').firstMatch(cookies);
    if (match != null) await _tokens.writeRefresh(match.group(1)!);
  }

  // ── Internals ───────────────────────────────────────────────────────────

  Future<Json> _send(String method, String path, {Object? body, bool auth = true}) async {
    final response = await _execute(() {
      final request = http.Request(method, _uri(path))..headers.addAll(_headers(auth: auth, json: body != null));
      if (body != null) request.body = jsonEncode(body);
      return request;
    }, auth: auth);
    return _decode(response);
  }

  /// Sends the request built by [build]; on an expired session renews the
  /// token and sends a freshly built copy once more.
  Future<http.Response> _execute(http.BaseRequest Function() build, {required bool auth}) async {
    var response = await _sendOnce(build());
    await _storeRefreshCookie(response);

    if (auth && _isSessionError(response) && await _renewSession()) {
      response = await _sendOnce(build());
    }
    if (auth) _reportSessionLoss(response);
    return response;
  }

  Future<http.Response> _sendOnce(http.BaseRequest request) async {
    try {
      final streamed = await _http.send(request).timeout(AppConfig.requestTimeout);
      return await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw const ApiException('The request timed out. Please try again.');
    } on http.ClientException catch (e) {
      throw ApiException('Network error: ${e.message}');
    }
  }

  bool _isSessionError(http.Response response) {
    if (response.statusCode != 401) return false;
    final code = _errorBody(response)?['code'];
    return code == null || ApiException.sessionErrorCodes.contains(code);
  }

  void _reportSessionLoss(http.Response response) {
    if (_isSessionError(response)) onUnauthorized?.call();
  }

  Json _decode(http.Response response) {
    _throwIfFailed(response);
    if (response.body.isEmpty) return const {};
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    return decoded is Json ? decoded : {'data': decoded};
  }

  void _throwIfFailed(http.Response response) {
    if (response.statusCode < 400) return;
    final body = _errorBody(response);
    final detail = body?['error'] ?? body?['detail'] ?? body?['message'];
    throw ApiException(
      detail is String && detail.isNotEmpty ? detail : 'Request failed (${response.statusCode})',
      statusCode: response.statusCode,
      code: body?['code'] as String?,
    );
  }

  Json? _errorBody(http.Response response) {
    try {
      final body = jsonDecode(utf8.decode(response.bodyBytes));
      return body is Json ? body : null;
    } catch (_) {
      return null;
    }
  }

  Uri _uri(String path) => Uri.parse(path.startsWith('http') ? path : '${AppConfig.baseUrl}$path');

  Map<String, String> _headers({required bool auth, bool json = false}) {
    final token = _tokens.current;
    return {
      if (json) 'Content-Type': 'application/json',
      'Accept': 'application/json',
      // Harmless elsewhere; required when talking to an ngrok tunnel directly.
      'ngrok-skip-browser-warning': 'true',
      if (auth && token != null) 'Authorization': 'Bearer $token',
    };
  }
}

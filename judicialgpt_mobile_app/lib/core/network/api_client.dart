import 'dart:async';
import 'dart:convert';
import 'dart:typed_data';

import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../storage/token_storage.dart';
import 'api_exception.dart';

typedef Json = Map<String, dynamic>;

/// A file to upload in a multipart request.
class UploadFile {
  const UploadFile({required this.field, required this.bytes, required this.filename});

  final String field;
  final Uint8List bytes;
  final String filename;
}

/// Single HTTP entry point for the app.
///
/// Paths starting with `/` are resolved against [AppConfig.baseUrl]; absolute
/// URLs are used as-is (only needed for the Family Law agent).
class ApiClient {
  ApiClient({required TokenStorage tokens, http.Client? httpClient, this.onUnauthorized})
    : _tokens = tokens,
      _http = httpClient ?? http.Client();

  final TokenStorage _tokens;
  final http.Client _http;

  /// Invoked when an authenticated request is rejected with 401, so the app
  /// can drop the stale session and return to the login screen.
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
    final request = http.Request('POST', _uri(path))
      ..headers.addAll(_headers(auth: true))
      ..bodyFields = fields;
    return _decode(await _execute(request, auth: true));
  }

  Future<Json> postMultipart(String path, {Map<String, String> fields = const {}, required UploadFile file}) async {
    final request = http.MultipartRequest('POST', _uri(path))
      ..headers.addAll(_headers(auth: true))
      ..fields.addAll(fields)
      ..files.add(http.MultipartFile.fromBytes(file.field, file.bytes, filename: file.filename));
    return _decode(await _execute(request, auth: true));
  }

  Future<Uint8List> getBytes(String path) async {
    final request = http.Request('GET', _uri(path))..headers.addAll(_headers(auth: true));
    final response = await _execute(request, auth: true);
    _throwIfFailed(response);
    return response.bodyBytes;
  }

  // ── Server-sent events ──────────────────────────────────────────────────

  /// POSTs [body] as JSON and yields the payload of every `data:` line.
  ///
  /// Payloads are yielded untrimmed: a whitespace-only token is still a real
  /// token and must reach the UI intact.
  Stream<String> streamEvents(String path, {required Json body}) async* {
    final request = http.Request('POST', _uri(path))
      ..headers.addAll(_headers(auth: true, json: true))
      ..headers['Accept'] = 'text/event-stream'
      ..body = jsonEncode(body);

    final response = await _http.send(request).timeout(AppConfig.requestTimeout);
    if (response.statusCode >= 400) {
      final full = await http.Response.fromStream(response);
      if (response.statusCode == 401) onUnauthorized?.call();
      _throwIfFailed(full);
    }

    final lines = response.stream.transform(utf8.decoder).transform(const LineSplitter());
    await for (final line in lines) {
      if (!line.startsWith('data:')) continue;
      final payload = line.startsWith('data: ') ? line.substring(6) : line.substring(5);
      yield payload;
    }
  }

  // ── Internals ───────────────────────────────────────────────────────────

  Future<Json> _send(String method, String path, {Object? body, bool auth = true}) async {
    final request = http.Request(method, _uri(path))..headers.addAll(_headers(auth: auth, json: body != null));
    if (body != null) request.body = jsonEncode(body);
    return _decode(await _execute(request, auth: auth));
  }

  Future<http.Response> _execute(http.BaseRequest request, {required bool auth}) async {
    final http.Response response;
    try {
      final streamed = await _http.send(request).timeout(AppConfig.requestTimeout);
      response = await http.Response.fromStream(streamed);
    } on TimeoutException {
      throw const ApiException('The request timed out. Please try again.');
    } on http.ClientException catch (e) {
      throw ApiException('Network error: ${e.message}');
    }

    if (auth && response.statusCode == 401) onUnauthorized?.call();
    return response;
  }

  Json _decode(http.Response response) {
    _throwIfFailed(response);
    if (response.body.isEmpty) return const {};
    final decoded = jsonDecode(utf8.decode(response.bodyBytes));
    return decoded is Json ? decoded : {'data': decoded};
  }

  void _throwIfFailed(http.Response response) {
    if (response.statusCode < 400) return;
    String message = 'Request failed (${response.statusCode})';
    String? code;
    try {
      final body = jsonDecode(utf8.decode(response.bodyBytes));
      if (body is Json) {
        final detail = body['error'] ?? body['detail'] ?? body['message'];
        if (detail is String && detail.isNotEmpty) message = detail;
        code = body['code'] as String?;
      }
    } catch (_) {
      // Non-JSON error body: keep the generic message.
    }
    throw ApiException(message, statusCode: response.statusCode, code: code);
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

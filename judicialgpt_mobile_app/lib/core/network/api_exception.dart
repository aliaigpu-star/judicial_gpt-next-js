/// A failed request, carrying the server's own error message when available.
class ApiException implements Exception {
  const ApiException(this.message, {this.statusCode, this.code});

  final String message;
  final int? statusCode;
  final String? code;

  bool get isUnauthorized => statusCode == 401;

  /// A 401 caused by the session itself (missing/expired/invalid token), as
  /// opposed to e.g. a wrong "current password", which is also a 401.
  bool get isSessionError => isUnauthorized && (code == null || sessionErrorCodes.contains(code));

  static const sessionErrorCodes = {'NO_TOKEN', 'TOKEN_EXPIRED', 'INVALID_TOKEN', 'USER_NOT_FOUND'};

  @override
  String toString() => message;
}

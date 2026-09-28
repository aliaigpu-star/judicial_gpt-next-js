import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';
import '../../../core/storage/token_storage.dart';
import '../domain/app_user.dart';

final authRepositoryProvider = Provider<AuthRepository>(
  (ref) => AuthRepository(ref.watch(apiClientProvider), ref.watch(tokenStorageProvider)),
);

class SignUpDetails {
  const SignUpDetails({
    required this.firstName,
    required this.lastName,
    required this.email,
    required this.password,
    required this.countryCode,
    required this.phoneNumber,
  });

  final String firstName;
  final String lastName;
  final String email;
  final String password;
  final String countryCode;
  final String phoneNumber;
}

class AuthRepository {
  AuthRepository(this._api, this._tokens);

  final ApiClient _api;
  final TokenStorage _tokens;

  Future<bool> hasStoredSession() async => await _tokens.read() != null;

  Future<AppUser> login({required String email, required String password, String? captchaToken}) async {
    final data = await _api.post(
      '/api/auth/login',
      auth: false,
      body: {'email': email.trim().toLowerCase(), 'password': password, 'captchaToken': ?captchaToken},
    );
    await _tokens.write(data['token'] as String);
    return AppUser.fromJson(data['user'] as Json);
  }

  /// Returns the server's confirmation message (e.g. "check your email").
  Future<String> register(SignUpDetails details, {String? captchaToken}) async {
    final data = await _api.post(
      '/api/auth/register',
      auth: false,
      body: {
        'email': details.email.trim(),
        'password': details.password,
        'name': '${details.firstName.trim()} ${details.lastName.trim()}',
        'firstName': details.firstName.trim(),
        'lastName': details.lastName.trim(),
        'phoneNumber': '${details.countryCode}${details.phoneNumber.trim()}',
        'countryCode': details.countryCode,
        'captchaToken': ?captchaToken,
      },
    );
    return data['message'] as String? ?? 'Account created. Please verify your email, then sign in.';
  }

  Future<AppUser> currentUser() async {
    final data = await _api.get('/api/auth/session');
    return AppUser.fromJson(data['user'] as Json);
  }

  Future<void> forgotPassword(String email) =>
      _api.post('/api/auth/forgot-password', auth: false, body: {'email': email.trim()});

  Future<void> logout() async {
    try {
      await _api.post('/api/auth/logout');
    } catch (_) {
      // Signing out locally must succeed even if the server call fails.
    }
    await _tokens.clear();
  }

  Future<void> clearLocalSession() => _tokens.clear();
}

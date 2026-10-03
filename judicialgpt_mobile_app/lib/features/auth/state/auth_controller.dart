import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';

final authControllerProvider = AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

/// The signed-in user, or `null` when signed out.
class AuthController extends AsyncNotifier<AppUser?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AppUser?> build() async {
    // The API client calls this when the session can no longer be renewed:
    // drop it so the router returns to the login screen.
    ref.read(apiClientProvider).onUnauthorized = _handleExpiredSession;

    if (!await _repo.hasStoredSession()) return null;
    try {
      return await _repo.currentUser();
    } on ApiException catch (e) {
      // Only a rejected session signs the user out; a network hiccup at
      // start-up keeps the stored session for the next launch.
      if (e.isSessionError) await _repo.clearLocalSession();
      return null;
    }
  }

  /// Reloads the user after a profile change (name, avatar).
  Future<void> refreshUser() async {
    final user = await _repo.currentUser();
    state = AsyncData(user);
  }

  Future<void> login({required String email, required String password, String? captchaToken}) async {
    final user = await _repo.login(email: email, password: password, captchaToken: captchaToken);
    state = AsyncData(user);
  }

  /// Returns `false` if the user backed out of the Google screen.
  Future<bool> loginWithGoogle() async {
    final user = await _repo.signInWithGoogle();
    if (user == null) return false;
    state = AsyncData(user);
    return true;
  }

  Future<void> logout() async {
    await _repo.logout();
    state = const AsyncData(null);
  }

  void _handleExpiredSession() {
    if (state.value == null) return;
    _repo.clearLocalSession();
    state = const AsyncData(null);
  }
}

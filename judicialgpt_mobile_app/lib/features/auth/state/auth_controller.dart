import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/providers.dart';
import '../data/auth_repository.dart';
import '../domain/app_user.dart';

final authControllerProvider = AsyncNotifierProvider<AuthController, AppUser?>(AuthController.new);

/// The signed-in user, or `null` when signed out.
class AuthController extends AsyncNotifier<AppUser?> {
  AuthRepository get _repo => ref.read(authRepositoryProvider);

  @override
  Future<AppUser?> build() async {
    // Any authenticated request rejected with 401 means the stored token is
    // no longer valid: drop it so the router returns to the login screen.
    ref.read(apiClientProvider).onUnauthorized = _handleExpiredSession;

    if (!await _repo.hasStoredSession()) return null;
    try {
      return await _repo.currentUser();
    } catch (_) {
      await _repo.clearLocalSession();
      return null;
    }
  }

  Future<void> login({required String email, required String password, String? captchaToken}) async {
    final user = await _repo.login(email: email, password: password, captchaToken: captchaToken);
    state = AsyncData(user);
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

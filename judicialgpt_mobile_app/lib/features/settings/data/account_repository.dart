import 'dart:typed_data';

import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/network/api_client.dart';
import '../../../core/providers.dart';

final accountRepositoryProvider = Provider<AccountRepository>((ref) => AccountRepository(ref.watch(apiClientProvider)));

class ProfileStats {
  const ProfileStats({required this.conversations, required this.messages});

  final int conversations;
  final int messages;
}

class Profile {
  const Profile({required this.preferences, required this.stats});

  final Json preferences;
  final ProfileStats stats;

  String get customInstructions => preferences['custom_instructions'] as String? ?? '';
}

/// Profile, preferences, avatar and password endpoints used by Settings.
class AccountRepository {
  AccountRepository(this._api);

  final ApiClient _api;

  Future<Profile> profile() async {
    final data = await _api.get('/api/users/profile');
    final profile = data['profile'] as Json? ?? const {};
    final stats = data['stats'] as Json? ?? const {};
    return Profile(
      preferences: (profile['preferences'] as Map?)?.cast<String, dynamic>() ?? const {},
      stats: ProfileStats(
        conversations: (stats['conversationCount'] as num?)?.toInt() ?? 0,
        messages: (stats['messageCount'] as num?)?.toInt() ?? 0,
      ),
    );
  }

  Future<void> updateName(String name) => _api.put('/api/users/profile', body: {'name': name.trim()});

  /// Custom instructions live inside the profile's preferences object; the
  /// other preference keys are preserved, as on the website.
  Future<void> saveCustomInstructions(String instructions) async {
    final current = await profile();
    await _api.put(
      '/api/users/profile',
      body: {
        'preferences': {...current.preferences, 'custom_instructions': instructions},
      },
    );
  }

  Future<void> uploadAvatar(Uint8List bytes, {required String filename, required String contentType}) =>
      _api.postMultipart(
        '/api/users/avatar',
        file: UploadFile(field: 'avatar', bytes: bytes, filename: filename, contentType: contentType),
      );

  Future<void> deleteAvatar() => _api.delete('/api/users/avatar');

  Future<void> changePassword({required String currentPassword, required String newPassword}) =>
      _api.put('/api/auth/change-password', body: {'currentPassword': currentPassword, 'newPassword': newPassword});
}

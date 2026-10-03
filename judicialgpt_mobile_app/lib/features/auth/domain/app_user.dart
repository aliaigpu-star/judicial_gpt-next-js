import '../../../core/config/app_config.dart';

class AppUser {
  const AppUser({
    required this.id,
    required this.email,
    this.name,
    this.role,
    this.avatarUrl,
    this.emailVerified = false,
  });

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
    id: json['id'].toString(),
    email: json['email'] as String? ?? '',
    name: json['name'] as String?,
    role: json['role'] as String?,
    avatarUrl: json['avatarUrl'] as String?,
    emailVerified: json['emailVerified'] as bool? ?? false,
  );

  final String id;
  final String email;
  final String? name;
  final String? role;
  final String? avatarUrl;
  final bool emailVerified;

  String get displayName => (name?.trim().isNotEmpty ?? false) ? name!.trim() : email;

  String get initial => displayName.isEmpty ? 'U' : displayName[0].toUpperCase();

  /// Absolute URL of the profile picture; the API returns `/uploads/...`.
  String? get avatarImageUrl {
    final url = avatarUrl;
    if (url == null || url.isEmpty) return null;
    return url.startsWith('http') ? url : '${AppConfig.baseUrl}${url.startsWith('/') ? '' : '/'}$url';
  }

  bool get isAdmin => role == 'admin';
}

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
}

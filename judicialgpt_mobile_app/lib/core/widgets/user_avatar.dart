import 'package:flutter/material.dart';

import '../../features/auth/domain/app_user.dart';

/// The user's profile picture, or their initial on the accent colour.
class UserAvatar extends StatelessWidget {
  const UserAvatar({super.key, required this.user, this.radius = 17});

  final AppUser user;
  final double radius;

  @override
  Widget build(BuildContext context) {
    final accent = Theme.of(context).colorScheme.primary;
    final imageUrl = user.avatarImageUrl;
    return CircleAvatar(
      radius: radius,
      backgroundColor: accent,
      foregroundImage: imageUrl == null ? null : NetworkImage(imageUrl),
      onForegroundImageError: imageUrl == null ? null : (_, _) {},
      child: Text(
        user.initial,
        style: TextStyle(color: Colors.white, fontWeight: FontWeight.w600, fontSize: radius * 0.8),
      ),
    );
  }
}

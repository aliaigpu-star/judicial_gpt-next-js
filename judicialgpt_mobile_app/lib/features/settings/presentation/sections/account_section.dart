import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';

import '../../../../core/theme/app_theme.dart';
import '../../../../core/utils/mime_types.dart';
import '../../../../core/widgets/feedback.dart';
import '../../../../core/widgets/sheet_widgets.dart';
import '../../../../core/widgets/user_avatar.dart';
import '../../../auth/state/auth_controller.dart';
import '../../data/account_repository.dart';
import '../widgets/settings_widgets.dart';

class AccountSection extends ConsumerStatefulWidget {
  const AccountSection({super.key});

  @override
  ConsumerState<AccountSection> createState() => _AccountSectionState();
}

class _AccountSectionState extends ConsumerState<AccountSection> {
  late final _name = TextEditingController(text: ref.read(authControllerProvider).value?.name ?? '');
  bool _savingName = false;
  bool _updatingAvatar = false;
  ProfileStats? _stats;

  @override
  void initState() {
    super.initState();
    ref.read(accountRepositoryProvider).profile().then((p) {
      if (mounted) setState(() => _stats = p.stats);
    }, onError: (_) {});
  }

  @override
  void dispose() {
    _name.dispose();
    super.dispose();
  }

  AccountRepository get _account => ref.read(accountRepositoryProvider);

  Future<void> _changeAvatar(ImageSource source) async {
    // Re-encoding (imageQuality) also turns HEIC camera photos into JPEG,
    // which the backend accepts.
    final picked = await ImagePicker().pickImage(source: source, maxWidth: 1024, imageQuality: 85);
    if (picked == null) return;

    final contentType = picked.mimeType ?? MimeTypes.forFilename(picked.name) ?? 'image/jpeg';
    if (!const {'image/jpeg', 'image/png', 'image/webp'}.contains(contentType)) {
      if (mounted) showAppSnack(context, 'Please choose a JPEG, PNG or WebP image', error: true);
      return;
    }
    await _updateAvatar(
      () async => _account.uploadAvatar(await picked.readAsBytes(), filename: picked.name, contentType: contentType),
      success: 'Avatar updated',
    );
  }

  Future<void> _updateAvatar(Future<void> Function() action, {required String success}) async {
    setState(() => _updatingAvatar = true);
    try {
      await action();
      await ref.read(authControllerProvider.notifier).refreshUser();
      if (mounted) showAppSnack(context, success);
    } catch (e) {
      if (mounted) showAppSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _updatingAvatar = false);
    }
  }

  Future<void> _saveName() async {
    setState(() => _savingName = true);
    try {
      await _account.updateName(_name.text);
      await ref.read(authControllerProvider.notifier).refreshUser();
      if (mounted) showAppSnack(context, 'Profile updated');
    } catch (e) {
      if (mounted) showAppSnack(context, e.toString(), error: true);
    } finally {
      if (mounted) setState(() => _savingName = false);
    }
  }

  void _showAvatarOptions(bool hasAvatar) => showModalBottomSheet<void>(
    context: context,
    showDragHandle: true,
    builder: (sheet) {
      void run(VoidCallback action) {
        Navigator.pop(sheet);
        action();
      }

      return SafeArea(
        child: Padding(
          padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Text('Profile photo', style: AppTheme.display(context, size: 22)),
              const SizedBox(height: 4),
              Text(
                'JPEG, PNG or WebP. It appears in the sidebar and your account.',
                style: Theme.of(
                  context,
                ).textTheme.bodySmall?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
              ),
              const SizedBox(height: 16),
              SheetActionGroup(
                children: [
                  SheetActionRow(
                    icon: Icons.photo_library_rounded,
                    title: 'Choose from gallery',
                    color: const Color(0xFFEC4899),
                    onTap: () => run(() => _changeAvatar(ImageSource.gallery)),
                  ),
                  SheetActionRow(
                    icon: Icons.photo_camera_rounded,
                    title: 'Take a photo',
                    color: const Color(0xFF3B82F6),
                    onTap: () => run(() => _changeAvatar(ImageSource.camera)),
                  ),
                ],
              ),
              if (hasAvatar) ...[
                const SizedBox(height: 12),
                SheetActionGroup(
                  children: [
                    SheetActionRow(
                      icon: Icons.delete_outline_rounded,
                      title: 'Remove photo',
                      destructive: true,
                      onTap: () => run(() => _updateAvatar(_account.deleteAvatar, success: 'Avatar removed')),
                    ),
                  ],
                ),
              ],
            ],
          ),
        ),
      );
    },
  );

  @override
  Widget build(BuildContext context) {
    final user = ref.watch(authControllerProvider).value;
    if (user == null) return const SizedBox.shrink();
    final theme = Theme.of(context);
    final stats = _stats;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Center(
          child: Stack(
            children: [
              UserAvatar(user: user, radius: 44),
              Positioned(
                right: 0,
                bottom: 0,
                child: IconButton.filled(
                  tooltip: 'Change photo',
                  onPressed: _updatingAvatar ? null : () => _showAvatarOptions(user.avatarImageUrl != null),
                  icon: _updatingAvatar
                      ? const SizedBox.square(
                          dimension: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                        )
                      : const Icon(Icons.photo_camera_outlined, size: 18),
                ),
              ),
            ],
          ),
        ),
        if (stats != null) ...[
          const SizedBox(height: 12),
          Text(
            '${stats.conversations} conversations · ${stats.messages} messages',
            textAlign: TextAlign.center,
            style: theme.textTheme.bodySmall?.copyWith(color: theme.colorScheme.onSurfaceVariant),
          ),
        ],
        const SizedBox(height: 24),
        TextField(
          controller: _name,
          textCapitalization: TextCapitalization.words,
          decoration: const InputDecoration(labelText: 'Display name'),
        ),
        const SizedBox(height: 12),
        TextFormField(
          initialValue: user.email,
          enabled: false,
          decoration: const InputDecoration(labelText: 'Email', helperText: 'Email cannot be changed'),
        ),
        const SizedBox(height: 16),
        FilledButton(
          onPressed: _savingName ? null : _saveName,
          child: _savingName
              ? const SizedBox.square(
                  dimension: 18,
                  child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                )
              : const Text('Save changes'),
        ),
        const SizedBox(height: 24),
        SettingsGroup(
          children: [
            SettingsRow(
              title: 'Log out',
              destructive: true,
              trailing: Icon(Icons.logout_rounded, color: theme.colorScheme.error),
              onTap: () => ref.read(authControllerProvider.notifier).logout(),
            ),
          ],
        ),
      ],
    );
  }
}

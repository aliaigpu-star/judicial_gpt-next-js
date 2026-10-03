import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../data/account_repository.dart';
import '../../state/app_preferences.dart';
import '../widgets/settings_widgets.dart';

class SecuritySection extends ConsumerWidget {
  const SecuritySection({super.key});

  @override
  Widget build(BuildContext context, WidgetRef ref) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      SettingsGroup(
        children: [
          SettingsChoiceRow<Duration?>(
            title: 'Inactivity timeout',
            subtitle: 'Automatically log out after inactivity',
            value: ref.watch(appPreferencesProvider.select((p) => p.inactivityTimeout)),
            options: inactivityOptions,
            labelOf: describeTimeout,
            onChanged: ref.read(appPreferencesProvider.notifier).setInactivityTimeout,
          ),
        ],
      ),
      const SizedBox(height: 24),
      const _ChangePasswordForm(),
    ],
  );
}

class _ChangePasswordForm extends ConsumerStatefulWidget {
  const _ChangePasswordForm();

  @override
  ConsumerState<_ChangePasswordForm> createState() => _ChangePasswordFormState();
}

class _ChangePasswordFormState extends ConsumerState<_ChangePasswordForm> {
  final _current = TextEditingController();
  final _next = TextEditingController();
  final _confirm = TextEditingController();
  bool _obscure = true;
  bool _saving = false;
  ({String text, bool isError})? _message;

  @override
  void dispose() {
    _current.dispose();
    _next.dispose();
    _confirm.dispose();
    super.dispose();
  }

  String? _validate() {
    if (_current.text.isEmpty || _next.text.isEmpty || _confirm.text.isEmpty) {
      return 'All password fields are required';
    }
    if (_next.text.length < 8) return 'New password must be at least 8 characters';
    if (_next.text != _confirm.text) return 'New passwords do not match';
    return null;
  }

  Future<void> _submit() async {
    final error = _validate();
    if (error != null) {
      setState(() => _message = (text: error, isError: true));
      return;
    }

    setState(() {
      _saving = true;
      _message = null;
    });
    try {
      await ref.read(accountRepositoryProvider).changePassword(currentPassword: _current.text, newPassword: _next.text);
      _current.clear();
      _next.clear();
      _confirm.clear();
      _message = (text: 'Password changed successfully', isError: false);
    } catch (e) {
      _message = (text: e.toString(), isError: true);
    } finally {
      if (mounted) setState(() => _saving = false);
    }
  }

  Widget _field(TextEditingController controller, String label) => TextField(
    controller: controller,
    obscureText: _obscure,
    decoration: InputDecoration(
      labelText: label,
      suffixIcon: IconButton(
        icon: Icon(_obscure ? Icons.visibility_outlined : Icons.visibility_off_outlined),
        onPressed: () => setState(() => _obscure = !_obscure),
      ),
    ),
  );

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.stretch,
    children: [
      Text('Change password', style: Theme.of(context).textTheme.titleSmall),
      const SizedBox(height: 12),
      _field(_current, 'Current password'),
      const SizedBox(height: 12),
      _field(_next, 'New password'),
      const SizedBox(height: 12),
      _field(_confirm, 'Confirm new password'),
      if (_message != null) ...[
        const SizedBox(height: 12),
        StatusMessage(text: _message!.text, isError: _message!.isError),
      ],
      const SizedBox(height: 16),
      FilledButton(
        onPressed: _saving ? null : _submit,
        child: _saving
            ? const SizedBox.square(
                dimension: 18,
                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
              )
            : const Text('Update password'),
      ),
    ],
  );
}

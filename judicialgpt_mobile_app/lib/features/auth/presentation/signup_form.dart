import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/widgets/feedback.dart';
import '../data/auth_repository.dart';
import '../domain/password_policy.dart';
import 'auth_style.dart';
import 'turnstile_sheet.dart';

class SignUpForm extends ConsumerStatefulWidget {
  const SignUpForm({super.key, required this.onRegistered});

  /// Called with the server's confirmation message after sign-up succeeds.
  final ValueChanged<String> onRegistered;

  @override
  ConsumerState<SignUpForm> createState() => _SignUpFormState();
}

class _SignUpFormState extends ConsumerState<SignUpForm> {
  static const _countryCodes = ['+92', '+1', '+44', '+91', '+971'];

  final _formKey = GlobalKey<FormState>();
  final _firstName = TextEditingController();
  final _lastName = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _password = TextEditingController();
  String _countryCode = _countryCodes.first;
  bool _obscure = true;
  bool _loading = false;
  String? _error;

  PasswordPolicy get _policy => PasswordPolicy.evaluate(_password.text, _email.text);

  @override
  void dispose() {
    for (final c in [_firstName, _lastName, _email, _phone, _password]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_policy.isStrong) {
      setState(() => _error = 'Password is weak. Please meet all requirements.');
      return;
    }
    FocusScope.of(context).unfocus();

    final accepted = await showDialog<bool>(context: context, builder: (_) => const _AgreementDialog());
    if (accepted != true || !mounted) return;

    String? captchaToken;
    if (AppConfig.captchaEnabled) {
      captchaToken = await requestCaptchaToken(context);
      if (captchaToken == null) return;
    }

    setState(() {
      _loading = true;
      _error = null;
    });
    try {
      final message = await ref
          .read(authRepositoryProvider)
          .register(
            SignUpDetails(
              firstName: _firstName.text,
              lastName: _lastName.text,
              email: _email.text,
              password: _password.text,
              countryCode: _countryCode,
              phoneNumber: _phone.text,
            ),
            captchaToken: captchaToken,
          );
      widget.onRegistered(message);
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  String? _required(String? v) => (v == null || v.trim().isEmpty) ? 'Required' : null;

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[ErrorBanner(message: _error!), const SizedBox(height: 14)],
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Expanded(
                child: AuthField(
                  label: 'First name',
                  child: TextFormField(
                    controller: _firstName,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.givenName],
                    decoration: authInputDecoration(hint: 'First', icon: Icons.person_outline_rounded),
                    validator: _required,
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: AuthField(
                  label: 'Last name',
                  child: TextFormField(
                    controller: _lastName,
                    textCapitalization: TextCapitalization.words,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.familyName],
                    decoration: authInputDecoration(hint: 'Last', icon: Icons.person_outline_rounded),
                    validator: _required,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          AuthField(
            label: 'Email address',
            child: TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: authInputDecoration(hint: 'you@example.com', icon: Icons.mail_outline_rounded),
              onChanged: (_) => setState(() {}),
              validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
            ),
          ),
          const SizedBox(height: 14),
          AuthField(
            label: 'Phone number',
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                SizedBox(
                  width: 96,
                  child: DropdownButtonFormField<String>(
                    initialValue: _countryCode,
                    isExpanded: true,
                    decoration: authInputDecoration(hint: 'Code'),
                    items: [for (final code in _countryCodes) DropdownMenuItem(value: code, child: Text(code))],
                    onChanged: (v) => setState(() => _countryCode = v ?? _countryCode),
                  ),
                ),
                const SizedBox(width: 8),
                Expanded(
                  child: TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    textInputAction: TextInputAction.next,
                    autofillHints: const [AutofillHints.telephoneNumberNational],
                    decoration: authInputDecoration(hint: '3001234567', icon: Icons.phone_outlined),
                    validator: _required,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 14),
          AuthField(
            label: 'Password',
            child: TextFormField(
              controller: _password,
              obscureText: _obscure,
              autofillHints: const [AutofillHints.newPassword],
              onChanged: (_) => setState(() {}),
              onFieldSubmitted: (_) => _submit(),
              decoration: authInputDecoration(
                hint: 'Create a strong password',
                icon: Icons.lock_outline_rounded,
                suffix: PasswordVisibilityToggle(
                  obscured: _obscure,
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
            ),
          ),
          if (_password.text.isNotEmpty) ...[const SizedBox(height: 10), _PasswordChecklist(policy: _policy)],
          const SizedBox(height: 18),
          AuthSubmitButton(label: 'Create Account', loading: _loading, onPressed: _submit),
        ],
      ),
    );
  }
}

class _PasswordChecklist extends StatelessWidget {
  const _PasswordChecklist({required this.policy});

  final PasswordPolicy policy;

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final (label, color, fraction) = switch (policy.strength) {
      PasswordStrength.strong => ('Strong password', Colors.green, 1.0),
      PasswordStrength.medium => ('Medium password', Colors.orange, 0.66),
      PasswordStrength.weak => ('Weak password', Colors.red, 0.33),
    };

    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: theme.colorScheme.surfaceContainerHighest,
        borderRadius: BorderRadius.circular(12),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(4),
            child: LinearProgressIndicator(value: fraction, color: color, minHeight: 4),
          ),
          const SizedBox(height: 6),
          Text(
            label,
            style: TextStyle(color: color, fontSize: 12, fontWeight: FontWeight.w600),
          ),
          if (!policy.isStrong) ...[
            const SizedBox(height: 8),
            for (final rule in policy.rules.entries)
              Padding(
                padding: const EdgeInsets.only(bottom: 2),
                child: Row(
                  children: [
                    Icon(
                      rule.value ? Icons.check_circle : Icons.radio_button_unchecked,
                      size: 14,
                      color: rule.value ? Colors.green : theme.colorScheme.onSurfaceVariant,
                    ),
                    const SizedBox(width: 6),
                    Expanded(child: Text(rule.key, style: theme.textTheme.bodySmall)),
                  ],
                ),
              ),
          ],
        ],
      ),
    );
  }
}

class _AgreementDialog extends StatefulWidget {
  const _AgreementDialog();

  @override
  State<_AgreementDialog> createState() => _AgreementDialogState();
}

class _AgreementDialogState extends State<_AgreementDialog> {
  bool _accepted = false;

  static const _sections = [
    (
      '1. Acceptance of Terms',
      'By accessing and using this service, you accept and agree to be bound by the terms and provisions of this agreement.',
    ),
    (
      '2. User Account',
      'You are responsible for maintaining the confidentiality of your account credentials and for all activities under your account.',
    ),
    (
      '3. Privacy Policy',
      'We respect your privacy and are committed to protecting your personal data according to our privacy policy.',
    ),
  ];

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return AlertDialog(
      title: const Text('User Agreement'),
      content: SingleChildScrollView(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisSize: MainAxisSize.min,
          children: [
            Text(
              'By creating an account, you agree to comply with our terms of service and privacy policy.',
              style: theme.textTheme.bodySmall,
            ),
            for (final (title, body) in _sections) ...[
              const SizedBox(height: 12),
              Text(title, style: theme.textTheme.titleSmall),
              const SizedBox(height: 4),
              Text(body, style: theme.textTheme.bodySmall),
            ],
            const SizedBox(height: 12),
            CheckboxListTile(
              value: _accepted,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              onChanged: (v) => setState(() => _accepted = v ?? false),
              title: const Text('I have read and agree to the terms of service and privacy policy'),
            ),
          ],
        ),
      ),
      actions: [
        TextButton(onPressed: () => Navigator.pop(context, false), child: const Text('Cancel')),
        FilledButton(
          style: FilledButton.styleFrom(minimumSize: const Size(0, 40)),
          onPressed: _accepted ? () => Navigator.pop(context, true) : null,
          child: const Text('Accept & Continue'),
        ),
      ],
    );
  }
}

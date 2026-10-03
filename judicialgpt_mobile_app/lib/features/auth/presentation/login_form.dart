import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

import '../../../core/config/app_config.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/widgets/feedback.dart';
import '../data/auth_repository.dart';
import '../state/auth_controller.dart';
import 'auth_style.dart';
import 'google_sign_in_button.dart';
import 'turnstile_sheet.dart';

class LoginForm extends ConsumerStatefulWidget {
  const LoginForm({super.key});

  @override
  ConsumerState<LoginForm> createState() => _LoginFormState();
}

class _LoginFormState extends ConsumerState<LoginForm> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _obscure = true;
  bool _loading = false;
  bool _googleLoading = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    FocusScope.of(context).unfocus();

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
      await ref
          .read(authControllerProvider.notifier)
          .login(email: _email.text, password: _password.text, captchaToken: captchaToken);
      // The router redirects to the app once auth state changes.
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _loading = false);
    }
  }

  Future<void> _continueWithGoogle() async {
    setState(() {
      _googleLoading = true;
      _error = null;
    });
    try {
      // The router redirects to the app once auth state changes.
      await ref.read(authControllerProvider.notifier).loginWithGoogle();
    } catch (e) {
      if (mounted) setState(() => _error = e.toString());
    } finally {
      if (mounted) setState(() => _googleLoading = false);
    }
  }

  Future<void> _forgotPassword() async {
    final controller = TextEditingController(text: _email.text);
    final email = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Reset password'),
        content: TextField(
          controller: controller,
          keyboardType: TextInputType.emailAddress,
          decoration: const InputDecoration(hintText: 'Your email address'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          TextButton(onPressed: () => Navigator.pop(context, controller.text.trim()), child: const Text('Send link')),
        ],
      ),
    );
    controller.dispose();
    if (email == null || email.isEmpty || !mounted) return;

    try {
      await ref.read(authRepositoryProvider).forgotPassword(email);
      if (mounted) showAppSnack(context, 'If that account exists, a reset link has been sent.');
    } catch (e) {
      if (mounted) showAppSnack(context, e.toString(), error: true);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Form(
      key: _formKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          if (_error != null) ...[ErrorBanner(message: _error!), const SizedBox(height: 14)],
          AuthField(
            label: 'Email address',
            child: TextFormField(
              controller: _email,
              keyboardType: TextInputType.emailAddress,
              textInputAction: TextInputAction.next,
              autofillHints: const [AutofillHints.email],
              decoration: authInputDecoration(hint: 'you@example.com', icon: Icons.mail_outline_rounded),
              validator: (v) => (v == null || !v.contains('@')) ? 'Enter a valid email' : null,
            ),
          ),
          const SizedBox(height: 14),
          AuthField(
            label: 'Password',
            child: TextFormField(
              controller: _password,
              obscureText: _obscure,
              autofillHints: const [AutofillHints.password],
              onFieldSubmitted: (_) => _submit(),
              decoration: authInputDecoration(
                hint: 'Enter your password',
                icon: Icons.lock_outline_rounded,
                suffix: PasswordVisibilityToggle(
                  obscured: _obscure,
                  onPressed: () => setState(() => _obscure = !_obscure),
                ),
              ),
              validator: (v) => (v == null || v.isEmpty) ? 'Enter your password' : null,
            ),
          ),
          Align(
            alignment: Alignment.centerRight,
            child: TextButton(
              onPressed: _forgotPassword,
              child: const Text('Forgot password?', style: TextStyle(fontSize: 11.5)),
            ),
          ),
          AuthSubmitButton(label: 'Log In', loading: _loading, onPressed: _submit),
          const _OrDivider(),
          GoogleSignInButton(loading: _googleLoading, onPressed: _continueWithGoogle),
        ],
      ),
    );
  }
}

class _OrDivider extends StatelessWidget {
  const _OrDivider();

  @override
  Widget build(BuildContext context) => const Padding(
    padding: EdgeInsets.symmetric(vertical: 16),
    child: Row(
      children: [
        Expanded(child: Divider(color: Color(0x33718477))),
        Padding(
          padding: EdgeInsets.symmetric(horizontal: 12),
          child: Text('or', style: TextStyle(color: JudicialColors.muted, fontSize: 12)),
        ),
        Expanded(child: Divider(color: Color(0x33718477))),
      ],
    ),
  );
}

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import 'login_form.dart';
import 'signup_form.dart';

/// Sign-in / sign-up screen, switching between the two forms in place like
/// the website's auth card.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  String? _notice;

  void _showLogin({String? notice}) => setState(() {
    _isLogin = true;
    _notice = notice;
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.all(24),
            child: ConstrainedBox(
              constraints: const BoxConstraints(maxWidth: 420),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  Center(child: ClipOval(child: Image.asset('assets/images/judicial-logo.png', width: 72, height: 72))),
                  const SizedBox(height: 16),
                  Text(
                    _isLogin ? 'Sign in to JudicialGPT' : 'Create your account',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.headlineSmall?.copyWith(fontWeight: FontWeight.w700),
                  ),
                  const SizedBox(height: 6),
                  Text(
                    _isLogin
                        ? 'Welcome back! Please sign in to continue'
                        : 'Welcome! Please fill in the details to get started.',
                    textAlign: TextAlign.center,
                    style: theme.textTheme.bodyMedium?.copyWith(color: theme.colorScheme.onSurfaceVariant),
                  ),
                  const SizedBox(height: 24),
                  if (_notice != null) ...[_Notice(message: _notice!), const SizedBox(height: 16)],
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 200),
                    child: _isLogin
                        ? const LoginForm(key: ValueKey('login'))
                        : SignUpForm(
                            key: const ValueKey('signup'),
                            onRegistered: (message) => _showLogin(notice: message),
                          ),
                  ),
                  const SizedBox(height: 16),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        _isLogin ? "Don't have an account?" : 'Already have an account?',
                        style: theme.textTheme.bodySmall,
                      ),
                      TextButton(
                        onPressed: () => setState(() {
                          _isLogin = !_isLogin;
                          _notice = null;
                        }),
                        child: Text(_isLogin ? 'Sign up' : 'Sign in'),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _Notice extends StatelessWidget {
  const _Notice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(12),
    decoration: BoxDecoration(
      color: AppColors.brand.withValues(alpha: 0.08),
      border: Border.all(color: AppColors.brand.withValues(alpha: 0.3)),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Text(message, style: const TextStyle(color: AppColors.brand)),
  );
}

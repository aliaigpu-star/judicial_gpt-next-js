import 'package:flutter/material.dart';

import '../../../core/widgets/brand_mark.dart';
import '../../../core/theme/app_colors.dart';
import 'auth_style.dart';
import 'login_form.dart';
import 'signup_form.dart';

/// Sign-in / sign-up screen: the JudicialGPT brand lockup above a
/// card that switches between the two forms with tabs.
class AuthScreen extends StatefulWidget {
  const AuthScreen({super.key});

  @override
  State<AuthScreen> createState() => _AuthScreenState();
}

class _AuthScreenState extends State<AuthScreen> {
  bool _isLogin = true;
  String? _notice;

  void _setMode({required bool isLogin, String? notice}) => setState(() {
    _isLogin = isLogin;
    _notice = notice;
  });

  @override
  Widget build(BuildContext context) => Theme(
    data: authTheme,
    child: Scaffold(
      backgroundColor: JudicialColors.marble,
      body: AuthBackdrop(
        child: SafeArea(
          child: _FadeSlideIn(
            child: SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 28),
              child: Center(
                child: ConstrainedBox(
                  constraints: const BoxConstraints(maxWidth: 380),
                  child: Column(
                    children: [
                      const _BrandLockup(),
                      _AuthCard(
                        isLogin: _isLogin,
                        notice: _notice,
                        onModeChanged: (isLogin) {
                          if (isLogin != _isLogin) _setMode(isLogin: isLogin);
                        },
                        onRegistered: (message) => _setMode(isLogin: true, notice: message),
                      ),
                      const Padding(
                        padding: EdgeInsets.fromLTRB(0, 18, 0, 24),
                        child: Text(
                          'Your conversations are protected with secure access controls.',
                          textAlign: TextAlign.center,
                          style: TextStyle(color: Color(0xBF718477), fontSize: 10.5),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    ),
  );
}

class _BrandLockup extends StatelessWidget {
  const _BrandLockup();

  @override
  Widget build(BuildContext context) => Padding(
    padding: const EdgeInsets.only(top: 40, bottom: 22),
    child: Column(
      children: [
        Semantics(label: 'JudicialGPT logo', child: const BrandMark(size: 72, shadow: true)),
        const SizedBox(height: 16),
        const Text(
          'JudicialGPT',
          style: TextStyle(color: JudicialColors.ink, fontSize: 28, fontWeight: FontWeight.w700, letterSpacing: 0.2),
        ),
        const SizedBox(height: 4),
        const Text(
          'Intelligent Legal Assistance',
          style: TextStyle(color: JudicialColors.muted, fontSize: 11, letterSpacing: 0.9),
        ),
      ],
    ),
  );
}

class _AuthCard extends StatelessWidget {
  const _AuthCard({
    required this.isLogin,
    required this.notice,
    required this.onModeChanged,
    required this.onRegistered,
  });

  final bool isLogin;
  final String? notice;
  final ValueChanged<bool> onModeChanged;
  final ValueChanged<String> onRegistered;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.fromLTRB(22, 21, 22, 22),
    decoration: BoxDecoration(
      color: Colors.white.withValues(alpha: 0.78),
      borderRadius: BorderRadius.circular(22),
      border: Border.all(color: JudicialColors.green.withValues(alpha: 0.18)),
      boxShadow: const [BoxShadow(color: Color(0x241D412E), blurRadius: 34, offset: Offset(0, 16))],
    ),
    child: Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _AuthTabs(isLogin: isLogin, onChanged: onModeChanged),
        const SizedBox(height: 21),
        _AuthHeading(isLogin: isLogin),
        const SizedBox(height: 18),
        if (notice != null) ...[_Notice(message: notice!), const SizedBox(height: 14)],
        AnimatedSize(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          alignment: Alignment.topCenter,
          child: isLogin
              ? const LoginForm(key: ValueKey('login'))
              : SignUpForm(key: const ValueKey('signup'), onRegistered: onRegistered),
        ),
        const SizedBox(height: 14),
        Wrap(
          alignment: WrapAlignment.center,
          crossAxisAlignment: WrapCrossAlignment.center,
          children: [
            Text(
              isLogin ? "Don't have an account?" : 'Already have an account?',
              style: const TextStyle(color: JudicialColors.muted, fontSize: 12.5),
            ),
            TextButton(
              style: TextButton.styleFrom(padding: const EdgeInsets.symmetric(horizontal: 6)),
              onPressed: () => onModeChanged(!isLogin),
              child: Text(
                isLogin ? 'Sign Up' : 'Log In',
                style: const TextStyle(fontSize: 12.5, fontWeight: FontWeight.w700),
              ),
            ),
          ],
        ),
      ],
    ),
  );
}

class _AuthTabs extends StatelessWidget {
  const _AuthTabs({required this.isLogin, required this.onChanged});

  final bool isLogin;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.all(4),
    decoration: BoxDecoration(
      color: JudicialColors.green.withValues(alpha: 0.07),
      borderRadius: BorderRadius.circular(12),
    ),
    child: Row(
      children: [
        _AuthTab(label: 'Log In', selected: isLogin, onTap: () => onChanged(true)),
        const SizedBox(width: 4),
        _AuthTab(label: 'Sign Up', selected: !isLogin, onTap: () => onChanged(false)),
      ],
    ),
  );
}

class _AuthTab extends StatelessWidget {
  const _AuthTab({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) => Expanded(
    child: Semantics(
      button: true,
      selected: selected,
      child: GestureDetector(
        behavior: HitTestBehavior.opaque,
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 250),
          curve: Curves.easeOut,
          padding: const EdgeInsets.symmetric(vertical: 10),
          alignment: Alignment.center,
          decoration: BoxDecoration(
            color: selected ? JudicialColors.green : Colors.transparent,
            borderRadius: BorderRadius.circular(9),
            boxShadow: selected
                ? [
                    BoxShadow(
                      color: JudicialColors.green.withValues(alpha: 0.22),
                      blurRadius: 12,
                      offset: const Offset(0, 5),
                    ),
                  ]
                : const [],
          ),
          child: AnimatedDefaultTextStyle(
            duration: const Duration(milliseconds: 250),
            style: TextStyle(
              color: selected ? Colors.white : JudicialColors.muted,
              fontSize: 13,
              fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
            ),
            child: Text(label),
          ),
        ),
      ),
    ),
  );
}

class _AuthHeading extends StatelessWidget {
  const _AuthHeading({required this.isLogin});

  final bool isLogin;

  @override
  Widget build(BuildContext context) => Row(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Container(
        width: 3,
        height: 43,
        margin: const EdgeInsets.only(top: 2),
        decoration: BoxDecoration(color: JudicialColors.green, borderRadius: BorderRadius.circular(3)),
      ),
      const SizedBox(width: 13),
      Expanded(
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              isLogin ? 'Welcome back' : 'Create your account',
              style: const TextStyle(color: JudicialColors.ink, fontSize: 20, fontWeight: FontWeight.w700),
            ),
            const SizedBox(height: 3),
            Text(
              isLogin ? 'Access your secure legal workspace.' : 'Set up your secure legal workspace in minutes.',
              style: const TextStyle(color: JudicialColors.muted, fontSize: 12, height: 1.45),
            ),
          ],
        ),
      ),
    ],
  );
}

class _Notice extends StatelessWidget {
  const _Notice({required this.message});

  final String message;

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
    decoration: BoxDecoration(
      color: JudicialColors.greenSoft.withValues(alpha: 0.1),
      border: Border.all(color: JudicialColors.green.withValues(alpha: 0.15)),
      borderRadius: BorderRadius.circular(10),
    ),
    child: Text(
      message,
      textAlign: TextAlign.center,
      style: const TextStyle(color: JudicialColors.greenDeep, fontSize: 12, height: 1.4),
    ),
  );
}

/// Fades the screen in while lifting it slightly into place.
class _FadeSlideIn extends StatelessWidget {
  const _FadeSlideIn({required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => TweenAnimationBuilder<double>(
    tween: Tween(begin: 0, end: 1),
    duration: const Duration(milliseconds: 500),
    curve: const Cubic(0.22, 1, 0.36, 1),
    child: child,
    builder: (context, t, child) => Opacity(
      opacity: t,
      child: Transform.translate(offset: Offset(0, 18 * (1 - t)), child: child),
    ),
  );
}

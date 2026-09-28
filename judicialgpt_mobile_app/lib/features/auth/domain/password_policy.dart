enum PasswordStrength { weak, medium, strong }

/// Same rules the website enforces on its sign-up form.
class PasswordPolicy {
  PasswordPolicy._(this.rules);

  factory PasswordPolicy.evaluate(String password, String email) {
    final lower = password.toLowerCase();
    final emailLocal = email.split('@').first.toLowerCase();
    return PasswordPolicy._({
      'At least 8 characters': password.length >= 8,
      'One lowercase letter': RegExp('[a-z]').hasMatch(password),
      'One uppercase letter': RegExp('[A-Z]').hasMatch(password),
      'One number': RegExp(r'\d').hasMatch(password),
      'One special character': RegExp('[^A-Za-z0-9]').hasMatch(password),
      'No spaces': !RegExp(r'\s').hasMatch(password),
      'Does not contain your email name': emailLocal.isEmpty || !lower.contains(emailLocal),
      'No common words (password, admin, 123456...)': !_commonWords.any(lower.contains),
    });
  }

  static const _commonWords = [
    'password',
    'admin',
    'user',
    'login',
    'root',
    'test',
    'demo',
    '123456',
    '12345678',
    'qwerty',
    'abc123',
    'letmein',
    'welcome',
    'monkey',
    'dragon',
    'master',
    'sunshine',
    'princess',
    'iloveyou',
  ];

  /// Rule description -> whether it passes.
  final Map<String, bool> rules;

  PasswordStrength get strength {
    final passed = rules.values.where((ok) => ok).length;
    if (passed == rules.length) return PasswordStrength.strong;
    if (passed >= 6 && rules['At least 8 characters']!) return PasswordStrength.medium;
    return PasswordStrength.weak;
  }

  bool get isStrong => strength == PasswordStrength.strong;
}

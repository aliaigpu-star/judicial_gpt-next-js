import 'package:flutter_test/flutter_test.dart';
import 'package:judicialgpt_mobile_app/features/auth/domain/password_policy.dart';

void main() {
  group('PasswordPolicy', () {
    test('rejects a weak password', () {
      expect(PasswordPolicy.evaluate('abc', 'user@example.com').isStrong, isFalse);
    });

    test('accepts a strong password', () {
      expect(PasswordPolicy.evaluate('Kx9#mTq2vL', 'user@example.com').isStrong, isTrue);
    });
  });
}

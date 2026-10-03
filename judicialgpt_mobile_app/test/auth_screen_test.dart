import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:flutter_test/flutter_test.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:judicialgpt_mobile_app/features/auth/domain/app_user.dart';
import 'package:judicialgpt_mobile_app/features/auth/presentation/auth_screen.dart';
import 'package:judicialgpt_mobile_app/features/auth/state/auth_controller.dart';
import 'package:judicialgpt_mobile_app/features/splash/presentation/door_splash.dart';

class _SignedOut extends AuthController {
  @override
  Future<AppUser?> build() async => null;
}

void main() {
  setUpAll(() => GoogleFonts.config.allowRuntimeFetching = false);

  testWidgets('auth screen switches between log in and sign up', (tester) async {
    tester.view.physicalSize = const Size(390, 844);
    tester.view.devicePixelRatio = 1;
    addTearDown(tester.view.reset);

    await tester.pumpWidget(const ProviderScope(child: MaterialApp(home: AuthScreen())));
    await tester.pumpAndSettle();

    expect(find.text('JudicialGPT'), findsOneWidget);
    expect(find.text('Welcome back'), findsOneWidget);
    expect(find.text('First name'), findsNothing);

    await tester.tap(find.text('Sign Up').first);
    await tester.pumpAndSettle();

    expect(find.text('Create your account'), findsOneWidget);
    expect(find.text('First name'), findsOneWidget);
    expect(find.text('Phone number'), findsOneWidget);
    expect(find.text('Create Account'), findsOneWidget);

    await tester.tap(find.text('Log In').first);
    await tester.pumpAndSettle();
    expect(find.text('Welcome back'), findsOneWidget);
  });

  testWidgets('splash doors open once auth resolves, keeping the app underneath', (tester) async {
    await tester.pumpWidget(
      ProviderScope(
        overrides: [authControllerProvider.overrideWith(_SignedOut.new)],
        child: const MaterialApp(home: DoorSplash(child: Text('app'))),
      ),
    );

    expect(find.byType(Image), findsNWidgets(2));
    await tester.pump(const Duration(milliseconds: 1700));
    expect(find.byType(Image), findsNWidgets(2), reason: 'doors hold for the minimum time (1.8 s)');

    await tester.pump(const Duration(milliseconds: 100));
    await tester.pumpAndSettle();
    expect(find.byType(Image), findsNothing);
    expect(find.text('app'), findsOneWidget);
  });
}

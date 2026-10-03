import 'package:flutter/material.dart';

import '../../../core/widgets/brand_mark.dart';
import '../../../core/theme/app_theme.dart';

/// Landing view of a new chat: the logo and one line of guidance, fading in
/// gently.
class WelcomeView extends StatelessWidget {
  const WelcomeView({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: SingleChildScrollView(
        padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
        child: TweenAnimationBuilder<double>(
          tween: Tween(begin: 0, end: 1),
          duration: const Duration(milliseconds: 700),
          curve: Curves.easeOutCubic,
          builder: (_, t, child) => Opacity(
            opacity: t,
            child: Transform.translate(offset: Offset(0, 16 * (1 - t)), child: child),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              const BrandMark(size: 76, shadow: true),
              const SizedBox(height: 28),
              Text(
                'How can I help with Pakistani law today?',
                textAlign: TextAlign.center,
                style: AppTheme.display(context, size: 26),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

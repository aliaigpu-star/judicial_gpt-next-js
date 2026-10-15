import 'package:flutter/material.dart';

/// The JudicialGPT logo (assets/images/logo.png): scales of justice with a
/// circuit-brain core.
///
/// It is drawn in the brand's dark green on light surfaces and tinted light on
/// dark ones. Screens whose background never changes (splash, sign-in) pass
/// [onDark] explicitly; everywhere else it follows the app theme.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 38, this.onDark});

  /// Height of the logo; the width follows its aspect ratio.
  final double size;

  /// `true`/`false` to force the light/dark-surface version, `null` to follow the theme.
  final bool? onDark;

  /// Green used for the "GPT" half of the wordmark (same as the website).
  static const color = Color(0xFF0C7A4B);

  /// Logo colour on dark surfaces.
  static const _onDarkTint = Color(0xFFE3F3EA);

  @override
  Widget build(BuildContext context) {
    final dark = onDark ?? Theme.of(context).brightness == Brightness.dark;
    return Image.asset(
      'assets/images/logo.png',
      height: size,
      color: dark ? _onDarkTint : null,
      colorBlendMode: dark ? BlendMode.srcIn : null,
      filterQuality: FilterQuality.high,
      semanticLabel: 'JudicialGPT logo',
    );
  }
}

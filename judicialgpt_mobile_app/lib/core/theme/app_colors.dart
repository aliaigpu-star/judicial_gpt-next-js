import 'package:flutter/material.dart';

/// Colour tokens: warm, paper-like neutrals with the JudicialGPT green as the
/// single brand accent.
abstract final class AppColors {
  static const Color brand = Color(0xFF0C9344);

  // Light
  static const Color lightBackground = Color(0xFFFAF9F5);
  static const Color lightSidebar = Color(0xFFF3F1EA);
  static const Color lightCard = Color(0xFFFFFFFF);
  static const Color lightUserBubble = Color(0xFFEFECE3);
  static const Color lightBorder = Color(0xFFE6E3D9);
  static const Color lightText = Color(0xFF1F1E1B);
  static const Color lightTextMuted = Color(0xFF75736B);

  // Dark
  static const Color darkBackground = Color(0xFF262624);
  static const Color darkSidebar = Color(0xFF1F1E1C);
  static const Color darkCard = Color(0xFF30302D);
  static const Color darkUserBubble = Color(0xFF3A3A36);
  static const Color darkBorder = Color(0xFF41413C);
  static const Color darkText = Color(0xFFF4F2EC);
  static const Color darkTextMuted = Color(0xFFA6A49B);

  // Per-agent accents (match each agent page on the website).
  static const Color judgmentSearch = Color(0xFF10A37F);
  static const Color civilWriter = Color(0xFF3B82F6);
  static const Color criminalWriter = Color(0xFFDC2626);
  static const Color civilLaw = Color(0xFF0EA5E9);
  static const Color criminalLaw = Color(0xFFD97706);
  static const Color familyLaw = Color(0xFFDB2777);
  static const Color summarize = Color(0xFF00A859);
  static const Color voiceAgent = Color(0xFF8B5CF6);
}

/// Marble-and-green Punjab Judicial Academy palette used by the splash and
/// sign-in screens, which keep this look in both light and dark mode.
abstract final class JudicialColors {
  static const Color green = Color(0xFF087E45);
  static const Color greenDeep = Color(0xFF075B38);
  static const Color greenSoft = Color(0xFF39A66D);
  static const Color ink = Color(0xFF0B5138);
  static const Color marble = Color(0xFFF5F1E7);
  static const Color gold = Color(0xFFCF9F38);
  static const Color muted = Color(0xFF718477);
  static const Color fieldFill = Color(0xC7F5F7ED);
  static const Color placeholder = Color(0xFF9AAB9E);
}

/// Surfaces that have no direct [ColorScheme] slot.
@immutable
class AppPalette extends ThemeExtension<AppPalette> {
  const AppPalette({required this.sidebar, required this.card, required this.userBubble});

  static const light = AppPalette(
    sidebar: AppColors.lightSidebar,
    card: AppColors.lightCard,
    userBubble: AppColors.lightUserBubble,
  );

  static const dark = AppPalette(
    sidebar: AppColors.darkSidebar,
    card: AppColors.darkCard,
    userBubble: AppColors.darkUserBubble,
  );

  final Color sidebar;

  /// Raised surfaces: the composer, suggestion cards, document cards.
  final Color card;
  final Color userBubble;

  @override
  AppPalette copyWith({Color? sidebar, Color? card, Color? userBubble}) =>
      AppPalette(sidebar: sidebar ?? this.sidebar, card: card ?? this.card, userBubble: userBubble ?? this.userBubble);

  @override
  AppPalette lerp(AppPalette? other, double t) => other == null
      ? this
      : AppPalette(
          sidebar: Color.lerp(sidebar, other.sidebar, t)!,
          card: Color.lerp(card, other.card, t)!,
          userBubble: Color.lerp(userBubble, other.userBubble, t)!,
        );
}

extension AppPaletteContext on BuildContext {
  AppPalette get palette => Theme.of(this).extension<AppPalette>()!;
}

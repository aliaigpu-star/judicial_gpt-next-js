import 'package:flutter/material.dart';

/// Colour tokens mirrored from the website's chat UI.
abstract final class AppColors {
  static const Color brand = Color(0xFF0C9344);

  // Light
  static const Color lightBackground = Color(0xFFFFFFFF);
  static const Color lightSurface = Color(0xFFF4F4F4);
  static const Color lightSurfaceAlt = Color(0xFFF9F9F9);
  static const Color lightBorder = Color(0xFFE5E5E5);
  static const Color lightText = Color(0xFF0D0D0D);
  static const Color lightTextMuted = Color(0xFF666666);

  // Dark
  static const Color darkBackground = Color(0xFF212121);
  static const Color darkSurface = Color(0xFF2F2F2F);
  static const Color darkSurfaceAlt = Color(0xFF171717);
  static const Color darkBorder = Color(0xFF424242);
  static const Color darkText = Color(0xFFECECEC);
  static const Color darkTextMuted = Color(0xFFB4B4B4);

  // Per-agent accents (match each agent page on the website).
  static const Color judgmentSearch = Color(0xFF10A37F);
  static const Color civilWriter = Color(0xFF3B82F6);
  static const Color criminalWriter = Color(0xFFDC2626);
  static const Color civilLaw = Color(0xFF0EA5E9);
  static const Color criminalLaw = Color(0xFFD97706);
  static const Color familyLaw = Color(0xFFDB2777);
  static const Color summarize = Color(0xFF00A859);
}

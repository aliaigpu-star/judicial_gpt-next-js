import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_theme.dart';

/// Theme for the sign-in screens: always the light marble-and-green look,
/// whatever the system brightness.
final ThemeData authTheme = _buildAuthTheme();

ThemeData _buildAuthTheme() {
  final base = AppTheme.light();
  final error = base.colorScheme.error;
  final radius = BorderRadius.circular(12);
  OutlineInputBorder outline(Color color, [double width = 1]) => OutlineInputBorder(
    borderRadius: radius,
    borderSide: BorderSide(color: color, width: width),
  );
  final idleBorder = outline(JudicialColors.green.withValues(alpha: 0.16));

  return base.copyWith(
    colorScheme: base.colorScheme.copyWith(
      primary: JudicialColors.green,
      onSurface: JudicialColors.ink,
      onSurfaceVariant: JudicialColors.muted,
    ),
    inputDecorationTheme: InputDecorationTheme(
      filled: true,
      fillColor: WidgetStateColor.resolveWith(
        (states) => states.contains(WidgetState.focused) ? Colors.white : JudicialColors.fieldFill,
      ),
      isDense: true,
      contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 14),
      hintStyle: const TextStyle(color: JudicialColors.placeholder, fontSize: 14),
      prefixIconColor: JudicialColors.green,
      suffixIconColor: JudicialColors.muted,
      border: idleBorder,
      enabledBorder: idleBorder,
      focusedBorder: outline(JudicialColors.green, 1.4),
      errorBorder: outline(error),
      focusedErrorBorder: outline(error, 1.4),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: FilledButton.styleFrom(
        backgroundColor: JudicialColors.green,
        foregroundColor: Colors.white,
        disabledBackgroundColor: JudicialColors.green.withValues(alpha: 0.7),
        disabledForegroundColor: Colors.white,
        minimumSize: const Size.fromHeight(50),
        shape: RoundedRectangleBorder(borderRadius: radius),
        textStyle: base.textTheme.labelLarge?.copyWith(fontSize: 14, fontWeight: FontWeight.w700),
      ),
    ),
    textButtonTheme: TextButtonThemeData(style: TextButton.styleFrom(foregroundColor: JudicialColors.green)),
    progressIndicatorTheme: const ProgressIndicatorThemeData(color: JudicialColors.green),
  );
}

/// Input decoration for an auth field: hint text with a leading green icon.
InputDecoration authInputDecoration({required String hint, IconData? icon, Widget? suffix}) => InputDecoration(
  hintText: hint,
  prefixIcon: icon == null ? null : Icon(icon, size: 19),
  prefixIconConstraints: const BoxConstraints(minWidth: 42, minHeight: 40),
  suffixIcon: suffix,
);

/// A form field with its label above it.
class AuthField extends StatelessWidget {
  const AuthField({super.key, required this.label, required this.child});

  final String label;
  final Widget child;

  @override
  Widget build(BuildContext context) => Column(
    crossAxisAlignment: CrossAxisAlignment.start,
    children: [
      Text(
        label,
        style: const TextStyle(color: JudicialColors.ink, fontSize: 11.5, fontWeight: FontWeight.w600),
      ),
      const SizedBox(height: 6),
      child,
    ],
  );
}

/// Show/hide toggle for a password field's suffix.
class PasswordVisibilityToggle extends StatelessWidget {
  const PasswordVisibilityToggle({super.key, required this.obscured, required this.onPressed});

  final bool obscured;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => IconButton(
    tooltip: obscured ? 'Show password' : 'Hide password',
    icon: Icon(obscured ? Icons.visibility_outlined : Icons.visibility_off_outlined, size: 19),
    onPressed: onPressed,
  );
}

/// The green call-to-action with a trailing arrow, or a spinner while busy.
class AuthSubmitButton extends StatelessWidget {
  const AuthSubmitButton({super.key, required this.label, required this.loading, required this.onPressed});

  final String label;
  final bool loading;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) => DecoratedBox(
    decoration: BoxDecoration(
      borderRadius: BorderRadius.circular(12),
      boxShadow: [
        BoxShadow(color: JudicialColors.green.withValues(alpha: 0.22), blurRadius: 16, offset: const Offset(0, 7)),
      ],
    ),
    child: FilledButton(
      onPressed: loading ? null : onPressed,
      child: loading
          ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
          : Row(
              mainAxisSize: MainAxisSize.min,
              children: [Text(label), const SizedBox(width: 8), const Icon(Icons.arrow_forward_rounded, size: 19)],
            ),
    ),
  );
}

/// Warm marble backdrop with faint gold columns and green orbit rings.
class AuthBackdrop extends StatelessWidget {
  const AuthBackdrop({super.key, required this.child});

  final Widget child;

  @override
  Widget build(BuildContext context) => SizedBox.expand(
    child: CustomPaint(painter: const _AtmospherePainter(), child: child),
  );
}

class _AtmospherePainter extends CustomPainter {
  const _AtmospherePainter();

  static const _orbits = [
    (width: 330.0, height: 520.0, round: 0.42, degrees: 28.0),
    (width: 430.0, height: 690.0, round: 0.45, degrees: -28.0),
  ];

  @override
  void paint(Canvas canvas, Size size) {
    final rect = Offset.zero & size;

    canvas
      ..drawRect(
        rect,
        Paint()
          ..shader = const RadialGradient(
            center: Alignment(0, -0.4),
            radius: 1.4,
            colors: [Color(0xFFFFFEFA), Color(0xFFF7F3E9), Color(0xFFEEE8DA)],
            stops: [0, 0.64, 1],
          ).createShader(rect),
      )
      ..drawRect(
        rect,
        Paint()
          ..shader = LinearGradient(
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
            colors: [Colors.white.withValues(alpha: 0.72), Colors.white.withValues(alpha: 0)],
            stops: const [0, 0.36],
          ).createShader(rect),
      );

    final column = Paint()
      ..shader = LinearGradient(
        begin: Alignment.topCenter,
        end: Alignment.bottomCenter,
        colors: [
          JudicialColors.gold.withValues(alpha: 0),
          JudicialColors.gold.withValues(alpha: 0.28),
          JudicialColors.gold.withValues(alpha: 0),
        ],
      ).createShader(rect);
    for (final x in [size.width * 0.12, size.width * 0.88]) {
      canvas.drawRect(Rect.fromLTWH(x, 0, 1, size.height), column);
    }

    final orbit = Paint()
      ..style = PaintingStyle.stroke
      ..color = JudicialColors.green.withValues(alpha: 0.06);
    for (final o in _orbits) {
      canvas
        ..save()
        ..translate(size.width / 2, size.height * 0.48)
        ..rotate(o.degrees * math.pi / 180)
        ..drawRRect(
          RRect.fromRectXY(
            Rect.fromCenter(center: Offset.zero, width: o.width, height: o.height),
            o.width * o.round,
            o.height * o.round,
          ),
          orbit,
        )
        ..restore();
    }
  }

  @override
  bool shouldRepaint(_AtmospherePainter oldDelegate) => false;
}

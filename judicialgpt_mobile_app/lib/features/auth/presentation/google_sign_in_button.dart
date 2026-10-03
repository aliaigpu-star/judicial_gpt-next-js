import 'dart:math' as math;

import 'package:flutter/material.dart';

/// "Continue with Google": white button with the four-colour Google "G".
class GoogleSignInButton extends StatelessWidget {
  const GoogleSignInButton({super.key, required this.onPressed, this.loading = false});

  final VoidCallback onPressed;
  final bool loading;

  @override
  Widget build(BuildContext context) => SizedBox(
    height: 50,
    child: OutlinedButton(
      onPressed: loading ? null : onPressed,
      style: OutlinedButton.styleFrom(
        backgroundColor: Colors.white,
        foregroundColor: const Color(0xFF1F1F1F),
        side: const BorderSide(color: Color(0xFFDADCE0)),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
        textStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 15),
      ),
      child: loading
          ? const SizedBox.square(dimension: 20, child: CircularProgressIndicator(strokeWidth: 2))
          : const Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                SizedBox.square(dimension: 20, child: CustomPaint(painter: _GoogleLogoPainter())),
                SizedBox(width: 12),
                Flexible(child: Text('Continue with Google', maxLines: 1, overflow: TextOverflow.ellipsis)),
              ],
            ),
    ),
  );
}

/// The Google "G": four coloured arcs and the blue crossbar.
class _GoogleLogoPainter extends CustomPainter {
  const _GoogleLogoPainter();

  static const _blue = Color(0xFF4285F4);
  static const _green = Color(0xFF34A853);
  static const _yellow = Color(0xFFFBBC05);
  static const _red = Color(0xFFEA4335);

  @override
  void paint(Canvas canvas, Size size) {
    final stroke = size.width * 0.2;
    final rect = Rect.fromLTWH(stroke / 2, stroke / 2, size.width - stroke, size.height - stroke);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = stroke;

    double rad(double degrees) => degrees * math.pi / 180;

    // Angles run clockwise from 3 o'clock; the opening is at the upper right.
    for (final (color, start, sweep) in [
      (_blue, 0.0, 45.0),
      (_green, 45.0, 105.0),
      (_yellow, 150.0, 60.0),
      (_red, 210.0, 110.0),
    ]) {
      canvas.drawArc(rect, rad(start), rad(sweep), false, paint..color = color);
    }

    // Crossbar from the centre to the right edge.
    canvas.drawRect(
      Rect.fromLTWH(size.width / 2, size.height / 2 - stroke / 2, size.width / 2, stroke),
      Paint()..color = _blue,
    );
  }

  @override
  bool shouldRepaint(_GoogleLogoPainter oldDelegate) => false;
}

import 'package:flutter/material.dart';

/// The JudicialGPT logo used on the website: white scales of justice on a
/// green rounded square.
class BrandMark extends StatelessWidget {
  const BrandMark({super.key, this.size = 34, this.shadow = false});

  final double size;

  /// Adds a soft green glow, for larger standalone uses.
  final bool shadow;

  /// The website header's logo green.
  static const color = Color(0xFF0C7A4B);

  @override
  Widget build(BuildContext context) => Container(
    width: size,
    height: size,
    decoration: BoxDecoration(
      color: color,
      borderRadius: BorderRadius.circular(size * 0.3),
      boxShadow: shadow
          ? [BoxShadow(color: color.withValues(alpha: 0.35), blurRadius: size * 0.4, offset: Offset(0, size * 0.1))]
          : null,
    ),
    child: Padding(
      padding: EdgeInsets.all(size * 0.22),
      child: const CustomPaint(painter: _ScalePainter()),
    ),
  );
}

/// Lucide's "scale" icon (the one the website uses), drawn from its 24×24
/// SVG paths so it stays sharp at any size.
class _ScalePainter extends CustomPainter {
  const _ScalePainter();

  @override
  void paint(Canvas canvas, Size size) {
    final s = size.shortestSide / 24;
    canvas.scale(s);

    final stroke = Paint()
      ..color = Colors.white
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round;

    // Pan hanging below a pivot at (x, 8): "m x 8 3 8 a5 5 0 0 1 -6 0 z V7".
    Path pan(double x) => Path()
      ..moveTo(x, 8)
      ..lineTo(x + 3, 16)
      ..arcToPoint(Offset(x - 3, 16), radius: const Radius.circular(5))
      ..close()
      ..moveTo(x, 8)
      ..lineTo(x, 7);

    final scale = Path()
      // Pillar and base.
      ..moveTo(12, 3)
      ..lineTo(12, 21)
      ..moveTo(7, 21)
      ..lineTo(17, 21)
      // Beam: "M3 7h1 a17 17 0 0 0 8-2 a17 17 0 0 0 8 2 h1".
      ..moveTo(3, 7)
      ..lineTo(4, 7)
      ..arcToPoint(const Offset(12, 5), radius: const Radius.circular(17), clockwise: false)
      ..arcToPoint(const Offset(20, 7), radius: const Radius.circular(17), clockwise: false)
      ..lineTo(21, 7)
      ..addPath(pan(19), Offset.zero)
      ..addPath(pan(5), Offset.zero);

    canvas.drawPath(scale, stroke);
  }

  @override
  bool shouldRepaint(_ScalePainter oldDelegate) => false;
}

import 'dart:math' as math;

import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../core/router/route_paths.dart';
import '../../providers/agent_auth_provider.dart';
import '../../providers/customer_auth_provider.dart';

// Blueprint palette — deliberately distinct from AppColors: this splash is a
// one-off "architect's sketch" moment, not a themed app screen.
const _paper = Color(0xFFF3EDDF);
const _paper2 = Color(0xFFEDE5D2);
const _ink = Color(0xFF212B3A);
const _blue = Color(0xFF3D5D8A);
const _blueSoft = Color(0xFF8CA3C4);
const _gold = Color(0xFFAD7C34);
const _goldLight = Color(0xFFD9AE68);

const int _totalMs = 8200;

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: _totalMs),
    )..forward();
    _bootstrap();
  }

  Future<void> _bootstrap() async {
    final agentAuth = context.read<AgentAuthProvider>();
    final customerAuth = context.read<CustomerAuthProvider>();
    final minimumSplash =
        Future.delayed(const Duration(milliseconds: _totalMs));
    await Future.wait([
      agentAuth.restoreSession(),
      customerAuth.restoreSession(),
      minimumSplash,
    ]);
    if (!mounted) return;
    context.go(RoutePaths.home);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  double _t(double startSec, double durSec, [Curve curve = Curves.easeOut]) {
    final elapsed = _controller.value * (_totalMs / 1000);
    final raw = ((elapsed - startSec) / durSec).clamp(0.0, 1.0);
    return curve.transform(raw);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: _paper,
      body: LayoutBuilder(
        builder: (context, constraints) {
          final w = constraints.maxWidth;
          final h = constraints.maxHeight;
          return AnimatedBuilder(
            animation: _controller,
            builder: (context, _) => Stack(
              fit: StackFit.expand,
              children: [
                const DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: Alignment(0, -0.7),
                      radius: 1.1,
                      colors: [_paper2, _paper],
                      stops: [0.0, 0.6],
                    ),
                  ),
                ),
                CustomPaint(
                  size: Size(w, h),
                  painter: _GridPainter(opacity: _t(0.13, 1.47)),
                ),
                DecoratedBox(
                  decoration: BoxDecoration(
                    gradient: RadialGradient(
                      center: const Alignment(0, -0.2),
                      radius: 0.9,
                      colors: [_paper.withValues(alpha: 0), _paper],
                      stops: const [0.3, 1.0],
                    ),
                  ),
                ),
                Positioned(
                  top: h * 0.09,
                  right: w * 0.10,
                  width: 70,
                  height: 70,
                  child: CustomPaint(
                    painter: _SunPainter(rayT: [
                      _t(0.27, 0.74, Curves.easeOutBack),
                      _t(0.34, 0.74, Curves.easeOutBack),
                      _t(0.40, 0.74, Curves.easeOutBack),
                      _t(0.47, 0.74, Curves.easeOutBack),
                      _t(0.54, 0.74, Curves.easeOutBack),
                      _t(0.60, 0.74, Curves.easeOutBack),
                    ]),
                  ),
                ),
                Positioned(
                  top: h * 0.15,
                  left: 0,
                  right: 0,
                  child: Center(
                    child: SizedBox(
                      width: math.min(w * 0.78, 300),
                      height: math.min(w * 0.78, 300) * (200 / 230),
                      child: CustomPaint(
                        painter: _HousePainter(
                          ground: _t(0.13, 1.27, Curves.easeInOutCubic),
                          path: _t(0.34, 1.27, Curves.easeInOutCubic),
                          trunk: _t(0.54, 1.27, Curves.easeInOutCubic),
                          treeTop: _t(0.80, 1.27, Curves.easeInOutCubic),
                          roof: _t(1.01, 1.27, Curves.easeInOutCubic),
                          roofLines: _t(1.74, 1.27, Curves.easeInOutCubic),
                          chimney: _t(1.81, 1.27, Curves.easeInOutCubic),
                          walls: _t(1.94, 1.27, Curves.easeInOutCubic),
                          window: _t(2.88, 1.27, Curves.easeInOutCubic),
                          windowCross: _t(3.08, 1.27, Curves.easeInOutCubic),
                          porch: _t(3.22, 1.27, Curves.easeInOutCubic),
                          door: _t(3.35, 1.27, Curves.easeInOutCubic),
                          doorOpen: _t(3.82, 1.21, Curves.easeOutQuint),
                          doorknob: _t(4.09, 0.40),
                          fillWash: _t(3.69, 1.21),
                          doorLight: _t(3.82, 1.14),
                          shadow: _t(3.48, 1.21),
                          keyT: _t(4.49, 1.14, Curves.easeOutBack),
                        ),
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: h * 0.18,
                  child: _Brand(
                    logoT: _t(3.69, 1.54, Curves.easeOutCubic),
                    ruleT: _t(4.89, 0.80, Curves.easeOutCubic),
                    tagT: _t(5.09, 0.94, Curves.easeOutCubic),
                    width: w,
                  ),
                ),
                Positioned(
                  left: 0,
                  right: 0,
                  bottom: 46,
                  child: Center(
                    child: _Loader(
                      wrapT: _t(5.36, 0.80, Curves.easeOutCubic),
                      fillT: _t(5.49, 2.14, Curves.easeInOutCubic),
                    ),
                  ),
                ),
              ],
            ),
          );
        },
      ),
    );
  }
}

/// Draws the fraction [t] (0..1) of [source]'s total arc length, matching
/// the CSS stroke-dasharray/dashoffset "hand-drawn" reveal.
Path _partial(Path source, double t) {
  if (t >= 1) return source;
  if (t <= 0) return Path();
  final metrics = source.computeMetrics().toList();
  final total = metrics.fold<double>(0, (sum, m) => sum + m.length);
  final target = total * t;
  final result = Path();
  var consumed = 0.0;
  for (final metric in metrics) {
    if (consumed >= target) break;
    final remaining = target - consumed;
    final take = math.min(metric.length, remaining);
    result.addPath(metric.extractPath(0, take), Offset.zero);
    consumed += metric.length;
  }
  return result;
}

class _GridPainter extends CustomPainter {
  _GridPainter({required this.opacity});
  final double opacity;

  @override
  void paint(Canvas canvas, Size size) {
    if (opacity <= 0) return;
    final paint = Paint()
      ..color = _blue.withValues(alpha: 0.09 * opacity)
      ..strokeWidth = 1;
    const spacing = 24.0;
    for (double x = 0; x <= size.width; x += spacing) {
      canvas.drawLine(Offset(x, 0), Offset(x, size.height), paint);
    }
    for (double y = 0; y <= size.height; y += spacing) {
      canvas.drawLine(Offset(0, y), Offset(size.width, y), paint);
    }
  }

  @override
  bool shouldRepaint(covariant _GridPainter oldDelegate) =>
      oldDelegate.opacity != opacity;
}

class _SunPainter extends CustomPainter {
  _SunPainter({required this.rayT});
  final List<double> rayT;

  static const _rays = [
    [Offset(35, 0), Offset(35, 12)],
    [Offset(35, 70), Offset(35, 58)],
    [Offset(0, 35), Offset(12, 35)],
    [Offset(70, 35), Offset(58, 35)],
    [Offset(10, 10), Offset(18, 18)],
    [Offset(60, 10), Offset(52, 18)],
  ];

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 70, size.height / 70);
    for (var i = 0; i < _rays.length; i++) {
      final t = rayT[i].clamp(0.0, 1.0);
      if (t <= 0) continue;
      final paint = Paint()
        ..color = _gold.withValues(alpha: 0.5 * t)
        ..strokeWidth = 1.4
        ..strokeCap = StrokeCap.round;
      final s = 0.4 + 0.6 * t;
      canvas.save();
      canvas.translate(35, 35);
      canvas.scale(s);
      canvas.translate(-35, -35);
      canvas.drawLine(_rays[i][0], _rays[i][1], paint);
      canvas.restore();
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SunPainter oldDelegate) => true;
}

class _HousePainter extends CustomPainter {
  _HousePainter({
    required this.ground,
    required this.path,
    required this.trunk,
    required this.treeTop,
    required this.roof,
    required this.roofLines,
    required this.chimney,
    required this.walls,
    required this.window,
    required this.windowCross,
    required this.porch,
    required this.door,
    required this.doorOpen,
    required this.doorknob,
    required this.fillWash,
    required this.doorLight,
    required this.shadow,
    required this.keyT,
  });

  final double ground, path, trunk, treeTop, roof, roofLines, chimney, walls;
  final double window, windowCross, porch, door, doorOpen, doorknob;
  final double fillWash, doorLight, shadow, keyT;

  static final Path _ground = Path()
    ..moveTo(6, 170)
    ..lineTo(224, 170);

  static final Path _pathCurve = Path()
    ..moveTo(110, 170)
    ..cubicTo(112, 178, 118, 183, 128, 188);

  static final Path _trunk = Path()
    ..moveTo(188, 170)
    ..lineTo(188, 142);

  static final Path _treeTop = Path()
    ..moveTo(188, 145)
    ..cubicTo(170, 140, 168, 120, 188, 116)
    ..cubicTo(205, 120, 208, 140, 188, 145)
    ..close();

  static final Path _roof = Path()
    ..moveTo(30, 92)
    ..lineTo(112, 32)
    ..lineTo(194, 92);

  static final Path _roofLines = _buildRoofLines();

  static Path _buildRoofLines() {
    final p = Path();
    for (final seg in const [
      [50.0, 86.0, 50.0, 78.0],
      [70.0, 86.0, 70.0, 72.0],
      [90.0, 86.0, 90.0, 66.0],
      [112.0, 86.0, 112.0, 62.0],
      [134.0, 86.0, 134.0, 66.0],
      [154.0, 86.0, 154.0, 72.0],
      [174.0, 86.0, 174.0, 78.0],
    ]) {
      p.moveTo(seg[0], seg[1]);
      p.lineTo(seg[2], seg[3]);
    }
    return p;
  }

  static final Path _chimney = Path()
    ..moveTo(156, 60)
    ..lineTo(156, 38)
    ..lineTo(172, 38)
    ..lineTo(172, 72);

  static final Path _walls = Path()
    ..moveTo(44, 92)
    ..lineTo(44, 170)
    ..lineTo(180, 170)
    ..lineTo(180, 92);

  static final Path _window = Path()
    ..moveTo(58, 108)
    ..lineTo(86, 108)
    ..lineTo(86, 134)
    ..lineTo(58, 134)
    ..close();

  static final Path _windowCross = _buildWindowCross();

  static Path _buildWindowCross() {
    final p = Path();
    p.moveTo(72, 108);
    p.lineTo(72, 134);
    p.moveTo(58, 121);
    p.lineTo(86, 121);
    return p;
  }

  static final Path _porch = Path()
    ..moveTo(92, 170)
    ..lineTo(92, 152)
    ..lineTo(146, 152)
    ..lineTo(146, 170);

  static final Path _doorPath = Path()
    ..moveTo(98, 122)
    ..lineTo(122, 122)
    ..lineTo(122, 170)
    ..lineTo(98, 170)
    ..close();

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 230, size.height / 200);

    if (shadow > 0) {
      canvas.drawOval(
        Rect.fromCenter(center: const Offset(115, 176), width: 160, height: 14),
        Paint()..color = _ink.withValues(alpha: 0.08 * shadow),
      );
    }

    final dim = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.6
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = _ink.withValues(alpha: 0.3);
    canvas.drawPath(_partial(_ground, ground), dim);
    canvas.drawPath(_partial(_pathCurve, path), dim);

    final ink = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 2.2
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = _ink;
    final thin = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = _ink.withValues(alpha: 0.75);
    final blueInk = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1.4
      ..strokeCap = StrokeCap.round
      ..strokeJoin = StrokeJoin.round
      ..color = _blue.withValues(alpha: 0.75);

    canvas.drawPath(_partial(_trunk, trunk), ink);
    canvas.drawPath(_partial(_treeTop, treeTop), blueInk);
    canvas.drawPath(_partial(_roof, roof), ink);
    canvas.drawPath(_partial(_roofLines, roofLines), thin);
    canvas.drawPath(_partial(_chimney, chimney), ink);
    canvas.drawPath(_partial(_walls, walls), ink);

    if (fillWash > 0) {
      canvas.drawRect(
        const Rect.fromLTWH(30, 92, 164, 78),
        Paint()..color = _blueSoft.withValues(alpha: 0.16 * fillWash),
      );
    }

    canvas.drawPath(_partial(_window, window), ink);
    canvas.drawPath(_partial(_windowCross, windowCross), thin);
    canvas.drawPath(_partial(_porch, porch), thin);

    if (doorLight > 0) {
      canvas.drawRect(
        const Rect.fromLTWH(96, 122, 26, 48),
        Paint()..color = _gold.withValues(alpha: 0.3 * doorLight),
      );
    }

    if (door > 0) {
      canvas.save();
      const originX = 98.0, originY = 158.0;
      final dy = 158 * doorOpen;
      final sx = 1 - 0.9 * doorOpen;
      canvas.translate(originX, originY + dy);
      canvas.scale(sx, 1.0);
      canvas.translate(-originX, -originY);
      canvas.drawPath(
        _partial(_doorPath, door),
        Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = 2.2
          ..strokeCap = StrokeCap.round
          ..strokeJoin = StrokeJoin.round
          ..color = _ink.withValues(alpha: 1 - doorOpen),
      );
      if (doorknob > 0) {
        canvas.drawCircle(
          const Offset(117, 147),
          1.6,
          Paint()..color = _ink.withValues(alpha: doorknob * (1 - doorOpen)),
        );
      }
      canvas.restore();
    }

    if (keyT > 0) {
      canvas.save();
      canvas.translate(196, 128);
      canvas.rotate((-18 * (1 - keyT)) * (math.pi / 180));
      canvas.scale(0.85 * (0.75 + 0.25 * keyT));
      final keyPaint = Paint()
        ..style = PaintingStyle.stroke
        ..strokeWidth = 2.2
        ..strokeCap = StrokeCap.round
        ..strokeJoin = StrokeJoin.round
        ..color = _gold.withValues(alpha: keyT.clamp(0.0, 1.0));
      canvas.drawCircle(Offset.zero, 8, keyPaint);
      canvas.drawPath(
        Path()
          ..moveTo(8, 0)
          ..lineTo(30, 0)
          ..moveTo(23, 0)
          ..lineTo(23, 6)
          ..moveTo(30, 0)
          ..lineTo(30, 7),
        keyPaint,
      );
      canvas.restore();
    }

    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _HousePainter oldDelegate) => true;
}

class _Brand extends StatelessWidget {
  const _Brand({
    required this.logoT,
    required this.ruleT,
    required this.tagT,
    required this.width,
  });

  final double logoT;
  final double ruleT;
  final double tagT;
  final double width;

  @override
  Widget build(BuildContext context) {
    final fontSize = math.min(width * 0.075, 26.0);
    final letterSpacing = fontSize * (0.4 - 0.16 * logoT);
    final strokeWidth = (1 - logoT) * 0.9;
    final base = GoogleFonts.cormorantGaramond(
      fontSize: fontSize,
      fontWeight: FontWeight.w600,
      letterSpacing: letterSpacing,
    );

    TextStyle styleFor(Color color, {required bool stroke}) {
      if (!stroke) return base.copyWith(color: color.withValues(alpha: logoT));
      return base.copyWith(
        foreground: Paint()
          ..style = PaintingStyle.stroke
          ..strokeWidth = strokeWidth
          ..color = color,
      );
    }

    Widget logoLayer({required bool stroke}) => RichText(
          text: TextSpan(children: [
            TextSpan(text: 'BAY', style: styleFor(_ink, stroke: stroke)),
            TextSpan(text: 'AE', style: styleFor(_gold, stroke: stroke)),
            TextSpan(text: 'STATE', style: styleFor(_ink, stroke: stroke)),
          ]),
        );

    return Opacity(
      opacity: math.min(1.0, logoT / 0.45).clamp(0.0, 1.0),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          Stack(
            alignment: Alignment.center,
            children: [
              if (strokeWidth > 0.01) logoLayer(stroke: true),
              logoLayer(stroke: false),
            ],
          ),
          const SizedBox(height: 14),
          Transform.scale(
            scaleX: ruleT,
            child: Container(width: 24, height: 1, color: _gold),
          ),
          const SizedBox(height: 10),
          Opacity(
            opacity: tagT,
            child: Transform.translate(
              offset: Offset(0, (1 - tagT) * 6),
              child: Text(
                'BUILT ON TRUST. DRAWN FOR YOU.',
                style: GoogleFonts.inter(
                  fontSize: 10.5,
                  letterSpacing: 2.2,
                  color: _ink.withValues(alpha: 0.58),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Loader extends StatelessWidget {
  const _Loader({required this.wrapT, required this.fillT});
  final double wrapT;
  final double fillT;

  @override
  Widget build(BuildContext context) {
    return Opacity(
      opacity: wrapT,
      child: Transform.translate(
        offset: Offset(0, (1 - wrapT) * 6),
        child: SizedBox(
          width: 120,
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: List.generate(13, (i) {
                  final tall = (i + 1) % 3 == 0;
                  return Container(
                    width: 1,
                    height: tall ? 8 : 5,
                    color: _ink.withValues(alpha: 0.35),
                  );
                }),
              ),
              const SizedBox(height: 6),
              Container(
                height: 2,
                decoration: BoxDecoration(
                  color: _ink.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(2),
                ),
                child: Align(
                  alignment: Alignment.centerLeft,
                  child: FractionallySizedBox(
                    widthFactor: fillT.clamp(0.0, 1.0),
                    child: Container(
                      height: 2,
                      decoration: BoxDecoration(
                        borderRadius: BorderRadius.circular(2),
                        gradient: const LinearGradient(
                          colors: [_gold, _goldLight],
                        ),
                      ),
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

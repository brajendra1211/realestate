import 'package:flutter/material.dart';

/// Color tokens for the BayaEstate app: navy and brass on a warm ivory
/// ground — an editorial, "curated real estate" identity established by
/// the splash and home screens and shared by every screen in the app.
class AppColors {
  AppColors._();

  static const Color primaryNavy = Color(0xFF0A1230);
  static const Color navyLight = Color(0xFF17338A);
  static const Color charcoal = Color(0xFF1B2447);
  static const Color gold = Color(0xFF1A4AD8);
  static const Color goldLight = Color(0xFFBDD2FF);
  static const Color goldSoft = Color(0xFF2F66F5);
  static const Color goldDark = Color(0xFF1639AD);

  static const Color background = Color(0xFFF6F8FE);
  static const Color surface = Colors.white;
  static const Color surfaceAlt = Color(0xFFEAF0FF);
  static const Color divider = Color(0xFFDDE5F6);

  static const Color textPrimary = primaryNavy;
  static const Color textSecondary = Color(0xFF4A5578);
  static const Color textMuted = Color(0xFF8590AD);
  static const Color textOnGold = Colors.white;

  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFC2660B);
  static const Color danger = Color(0xFFC0392B);

  /// Website accent (real gold) for badges such as BEST VALUE / Pro.
  static const Color accentGold = Color(0xFFEFBD48);

  /// Neon accents (same family as the admin console).
  static const Color neonCyan = Color(0xFF00C8FF);
  static const Color neonBlue = Color(0xFF0A6CFF);
  static const Color neonGreen = Color(0xFF00C46A);
  static const Color neonViolet = Color(0xFF8B5CFF);
  static const Color neonMagenta = Color(0xFFFF2BD6);
  static const Color neonLine = Color(0x3300A2FF);

  /// Bright blue-to-cyan gradient for the big "hero" number cards (wallet, totals).
  static const LinearGradient heroGradient = LinearGradient(
    colors: [Color(0xFF1A4AD8), Color(0xFF2F66F5), Color(0xFF00A8FF)],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );
  static const List<BoxShadow> heroGlow = [
    BoxShadow(color: Color(0x551A4AD8), blurRadius: 24, offset: Offset(0, 10)),
  ];

  static const Color saleTag = primaryNavy;
  static const Color rentTag = navyLight;
}

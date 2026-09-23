import 'package:flutter/material.dart';

/// Color tokens for the BayaEstate app: navy and brass on a warm ivory
/// ground — an editorial, "curated real estate" identity established by
/// the splash and home screens and shared by every screen in the app.
class AppColors {
  AppColors._();

  static const Color primaryNavy = Color(0xFF0D1A2B);
  static const Color navyLight = Color(0xFF152841);
  static const Color charcoal = Color(0xFF211D17);
  static const Color gold = Color(0xFFA5813F);
  static const Color goldLight = Color(0xFFE3CAA0);
  static const Color goldSoft = Color(0xFFBD965A);

  static const Color background = Color(0xFFFAF7F1);
  static const Color surfaceAlt = Color(0xFFF2ECE1);
  static const Color divider = Color(0xFFE7E0D0);

  static const Color textPrimary = primaryNavy;
  static const Color textSecondary = Color(0xFF5C574C);
  static const Color textMuted = Color(0xFF8B8375);
  static const Color textOnGold = primaryNavy;

  static const Color success = Color(0xFF2E7D32);
  static const Color warning = Color(0xFFC2660B);
  static const Color danger = Color(0xFFC0392B);

  static const Color saleTag = primaryNavy;
  static const Color rentTag = navyLight;
}

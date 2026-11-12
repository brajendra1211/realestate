import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';

// Real calls don't ring forever — auto-decline so a missed ring doesn't
// leave the screen (and the loop) stuck on indefinitely if the agent
// genuinely can't get to the phone.
const _autoDismiss = Duration(seconds: 45);

/// Shown full-screen (even over the lock screen, via MainActivity's window
/// flags + the triggering notification's fullScreenIntent) when a buyer
/// rings a channel partner's listing — an actual-call-style takeover rather
/// than just a notification banner.
class IncomingRingScreen extends StatefulWidget {
  const IncomingRingScreen({
    super.key,
    required this.propertyTitle,
    required this.buyerName,
    required this.buyerPhone,
  });

  final String propertyTitle;
  final String buyerName;
  final String buyerPhone;

  @override
  State<IncomingRingScreen> createState() => _IncomingRingScreenState();
}

class _IncomingRingScreenState extends State<IncomingRingScreen> {
  final _player = AudioPlayer();
  Timer? _autoDismissTimer;
  bool _resolved = false;

  @override
  void initState() {
    super.initState();
    _startRinging();
    _autoDismissTimer = Timer(_autoDismiss, _decline);
  }

  Future<void> _startRinging() async {
    try {
      await _player.setReleaseMode(ReleaseMode.loop);
      await _player.play(AssetSource('sounds/ring_alert.wav'));
    } catch (_) {
      // The buyer/agent still see the full-screen Answer/Decline UI even if
      // playback fails for some reason (e.g. silenced media session) — the
      // takeover itself is the main signal, sound is the enhancement.
    }
  }

  Future<void> _stopRinging() async {
    try {
      await _player.stop();
    } catch (_) {
      // Already stopped/disposed — fine to ignore.
    }
  }

  void _decline() {
    if (_resolved) return;
    _resolved = true;
    _autoDismissTimer?.cancel();
    _stopRinging();
    if (mounted) {
      if (context.canPop()) {
        context.pop();
      } else {
        context.go(RoutePaths.agentDashboard);
      }
    }
  }

  Future<void> _answer() async {
    if (_resolved) return;
    _resolved = true;
    _autoDismissTimer?.cancel();
    await _stopRinging();
    if (!mounted) return;

    if (widget.buyerPhone.isNotEmpty) {
      final uri = Uri(scheme: 'tel', path: widget.buyerPhone);
      try {
        await launchUrl(uri);
      } catch (_) {
        // No dialer available or launch failed — still take them to the
        // dashboard below rather than leaving them stuck on this screen.
      }
    }
    if (mounted) context.go(RoutePaths.agentDashboard);
  }

  @override
  void dispose() {
    _autoDismissTimer?.cancel();
    _player.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return PopScope(
      canPop: false,
      onPopInvokedWithResult: (didPop, _) {
        if (!didPop) _decline();
      },
      child: Scaffold(
        backgroundColor: AppColors.primaryNavy,
        body: SafeArea(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 28, vertical: 32),
            child: Column(
              children: [
                const Spacer(flex: 2),
                Text(
                  'INCOMING RING',
                  style: GoogleFonts.inter(
                    color: AppColors.goldLight,
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    letterSpacing: 3,
                  ),
                ),
                const SizedBox(height: 24),
                CircleAvatar(
                  radius: 54,
                  backgroundColor: AppColors.navyLight,
                  child: Text(
                    widget.buyerName.isNotEmpty ? widget.buyerName[0].toUpperCase() : '?',
                    style: GoogleFonts.fraunces(
                      color: AppColors.goldLight,
                      fontSize: 42,
                      fontWeight: FontWeight.w600,
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  widget.buyerName.isNotEmpty ? widget.buyerName : 'A buyer',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.fraunces(
                    color: Colors.white,
                    fontSize: 26,
                    fontWeight: FontWeight.w600,
                  ),
                ),
                const SizedBox(height: 8),
                Text(
                  widget.propertyTitle.isNotEmpty
                      ? 'wants to talk about "${widget.propertyTitle}"'
                      : 'wants to talk to you',
                  textAlign: TextAlign.center,
                  style: GoogleFonts.inter(
                    color: AppColors.goldLight.withValues(alpha: 0.85),
                    fontSize: 15,
                  ),
                ),
                const Spacer(flex: 3),
                Row(
                  mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                  children: [
                    _RingButton(
                      icon: Icons.call_end_rounded,
                      label: 'Decline',
                      color: AppColors.danger,
                      onPressed: _decline,
                    ),
                    _RingButton(
                      icon: Icons.call_rounded,
                      label: 'Answer',
                      color: AppColors.success,
                      onPressed: _answer,
                    ),
                  ],
                ),
                const SizedBox(height: 12),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _RingButton extends StatelessWidget {
  const _RingButton({
    required this.icon,
    required this.label,
    required this.color,
    required this.onPressed,
  });

  final IconData icon;
  final String label;
  final Color color;
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Material(
          color: color,
          shape: const CircleBorder(),
          child: InkWell(
            customBorder: const CircleBorder(),
            onTap: onPressed,
            child: Padding(
              padding: const EdgeInsets.all(22),
              child: Icon(icon, color: Colors.white, size: 32),
            ),
          ),
        ),
        const SizedBox(height: 10),
        Text(
          label,
          style: GoogleFonts.inter(
            color: Colors.white,
            fontSize: 13,
            fontWeight: FontWeight.w600,
          ),
        ),
      ],
    );
  }
}

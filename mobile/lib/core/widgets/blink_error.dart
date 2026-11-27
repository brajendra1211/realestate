import 'dart:math' as math;

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

/// Wraps an input (or a button) and, whenever [trigger] changes, scrolls it into view and blinks a red
/// border around it three times — so the person sees exactly which field is wrong. Pair it with the
/// field's `forceErrorText` to keep the message under the field.
class BlinkError extends StatefulWidget {
  const BlinkError({super.key, required this.trigger, required this.child, this.radius = 14});

  final int trigger;
  final Widget child;
  final double radius;

  @override
  State<BlinkError> createState() => _BlinkErrorState();
}

class _BlinkErrorState extends State<BlinkError> with SingleTickerProviderStateMixin {
  late final AnimationController _c = AnimationController(vsync: this, duration: const Duration(milliseconds: 1400));

  @override
  void didUpdateWidget(BlinkError old) {
    super.didUpdateWidget(old);
    if (widget.trigger != old.trigger && widget.trigger > 0) {
      _c.forward(from: 0);
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (!mounted) return;
        Scrollable.ensureVisible(context, alignment: 0.3, duration: const Duration(milliseconds: 250));
      });
    }
  }

  @override
  void dispose() {
    _c.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _c,
      child: widget.child,
      builder: (context, child) {
        // Three on/off pulses over the animation, then it stays off (the field keeps its red error text).
        final v = _c.isAnimating ? (math.sin(_c.value * math.pi * 6)).abs() : 0.0;
        return Container(
          foregroundDecoration: BoxDecoration(
            borderRadius: BorderRadius.circular(widget.radius),
            border: Border.all(color: AppColors.danger.withValues(alpha: v), width: 2.5),
          ),
          child: child,
        );
      },
    );
  }
}

import 'package:flutter/material.dart';

import '../theme/app_colors.dart';

const _dockInactive = Color(0xFF9AA6BA);

class NavDockItem {
  const NavDockItem({required this.icon, required this.label});

  final IconData icon;
  final String label;
}

/// Floating navy pill with a sliding brass-gradient highlight — the app's
/// shared bottom-nav chrome, first established on the consumer shell.
class NavDock extends StatelessWidget {
  const NavDock({
    super.key,
    required this.items,
    required this.currentIndex,
    required this.onTap,
  });

  final List<NavDockItem> items;
  final int currentIndex;
  final ValueChanged<int> onTap;

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.fromLTRB(16, 0, 16, 10),
        child: Container(
          height: 64,
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(
            color: AppColors.primaryNavy,
            borderRadius: BorderRadius.circular(24),
            boxShadow: [
              BoxShadow(
                color: AppColors.primaryNavy.withValues(alpha: 0.45),
                blurRadius: 30,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: LayoutBuilder(
            builder: (context, constraints) {
              final segment = constraints.maxWidth / items.length;
              return Stack(
                children: [
                  AnimatedPositioned(
                    duration: const Duration(milliseconds: 380),
                    curve: Curves.easeOutCubic,
                    left: segment * currentIndex,
                    top: 0,
                    bottom: 0,
                    width: segment,
                    child: Padding(
                      padding: const EdgeInsets.symmetric(horizontal: 4),
                      child: DecoratedBox(
                        decoration: BoxDecoration(
                          gradient: const LinearGradient(
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                            colors: [AppColors.goldSoft, AppColors.gold],
                          ),
                          borderRadius: BorderRadius.circular(18),
                        ),
                      ),
                    ),
                  ),
                  Row(
                    children: List.generate(items.length, (i) {
                      final item = items[i];
                      final active = i == currentIndex;
                      return Expanded(
                        child: InkWell(
                          borderRadius: BorderRadius.circular(18),
                          onTap: () => onTap(i),
                          child: Column(
                            mainAxisAlignment: MainAxisAlignment.center,
                            children: [
                              Icon(
                                item.icon,
                                size: 20,
                                color: active ? AppColors.primaryNavy : _dockInactive,
                              ),
                              const SizedBox(height: 3),
                              Text(
                                item.label,
                                style: TextStyle(
                                  fontSize: 10.5,
                                  fontWeight: FontWeight.w600,
                                  color: active ? AppColors.primaryNavy : _dockInactive,
                                ),
                              ),
                            ],
                          ),
                        ),
                      );
                    }),
                  ),
                ],
              );
            },
          ),
        ),
      ),
    );
  }
}

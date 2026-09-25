import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../services/agent_shop_service.dart';

class AgentQrScannerScreen extends StatefulWidget {
  const AgentQrScannerScreen({super.key});

  @override
  State<AgentQrScannerScreen> createState() => _AgentQrScannerScreenState();
}

class _AgentQrScannerScreenState extends State<AgentQrScannerScreen>
    with SingleTickerProviderStateMixin {
  late final AgentShopService _service;
  late final AnimationController _pulseController;
  final _manualCodeController = TextEditingController();
  bool _isProcessing = false;
  String? _errorMessage;

  @override
  void initState() {
    super.initState();
    _service = AgentShopService(ApiClient.instance.dio);
    _pulseController = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1400),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _pulseController.dispose();
    _manualCodeController.dispose();
    super.dispose();
  }

  /// Parses the agent code from either a full URL or direct code string.
  String? _extractAgentCode(String input) {
    final trimmed = input.trim();
    if (trimmed.isEmpty) return null;

    // Check if it's a URL
    try {
      final uri = Uri.parse(trimmed);
      if (uri.pathSegments.contains('shop')) {
        final idx = uri.pathSegments.indexOf('shop');
        if (idx + 1 < uri.pathSegments.length) {
          return uri.pathSegments[idx + 1].toUpperCase();
        }
      }
      if (uri.queryParameters.containsKey('agentCode')) {
        return uri.queryParameters['agentCode']?.toUpperCase();
      }
      if (uri.queryParameters.containsKey('ref')) {
        return uri.queryParameters['ref']?.toUpperCase();
      }
    } catch (_) {
      // not a URI
    }

    // Direct code format (e.g. AGT-BLR-1000 or any alphanumeric code)
    return trimmed.toUpperCase();
  }

  Future<void> _handleCodeScanned(String rawInput) async {
    final code = _extractAgentCode(rawInput);
    if (code == null || code.isEmpty) {
      setState(() => _errorMessage = 'Invalid QR code. Please scan a valid Channel Partner QR.');
      return;
    }

    setState(() {
      _isProcessing = true;
      _errorMessage = null;
    });

    try {
      // 1. Fetch agent shop to verify code and check unlock status
      final shopData = await _service.getAgentShop(code);

      if (!mounted) return;

      if (shopData.isUnlocked) {
        // Already paid / unlocked -> go directly to shop
        context.pushReplacement(RoutePaths.agentShopPath(code));
        return;
      }

      // 2. Open ₹50 Razorpay payment sheet
      _showPaymentSheet(code, shopData.agent.name, shopData.agent.shopName);
    } on ApiException catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = errorMessageFor(e));
    } catch (e) {
      if (!mounted) return;
      setState(() => _errorMessage = 'Failed to process QR code: $e');
    } finally {
      if (mounted) setState(() => _isProcessing = false);
    }
  }

  void _showPaymentSheet(String agentCode, String agentName, String? shopName) {
    showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (sheetContext) {
        bool paying = false;
        String? sheetError;

        return StatefulBuilder(
          builder: (context, setSheetState) {
            return Container(
              padding: const EdgeInsets.fromLTRB(24, 20, 24, 32),
              decoration: const BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.vertical(top: Radius.circular(28)),
              ),
              child: SafeArea(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Container(
                      width: 44,
                      height: 5,
                      decoration: BoxDecoration(
                        color: Colors.grey.shade300,
                        borderRadius: BorderRadius.circular(10),
                      ),
                    ),
                    const SizedBox(height: 20),
                    Container(
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: AppColors.goldLight.withValues(alpha: 0.15),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.lock_open_rounded,
                        color: AppColors.goldDark,
                        size: 36,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      'Unlock Channel Partner & Properties',
                      style: GoogleFonts.fraunces(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'Scan confirmed for ${shopName ?? agentName} ($agentCode). Pay ₹50 access fee to view direct contact details and all available properties.',
                      textAlign: TextAlign.center,
                      style: GoogleFonts.inter(
                        fontSize: 13,
                        color: Colors.grey.shade700,
                        height: 1.45,
                      ),
                    ),
                    const SizedBox(height: 20),

                    // Price Card
                    Container(
                      padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 14),
                      decoration: BoxDecoration(
                        color: AppColors.surface,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(
                                'Access Fee',
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  color: Colors.grey.shade600,
                                ),
                              ),
                              Text(
                                'Channel Partner Shop & Inventory',
                                style: GoogleFonts.inter(
                                  fontSize: 14,
                                  fontWeight: FontWeight.bold,
                                  color: AppColors.primaryNavy,
                                ),
                              ),
                            ],
                          ),
                          Text(
                            '₹50',
                            style: GoogleFonts.fraunces(
                              fontSize: 26,
                              fontWeight: FontWeight.bold,
                              color: AppColors.goldDark,
                            ),
                          ),
                        ],
                      ),
                    ),

                    if (sheetError != null) ...[
                      const SizedBox(height: 12),
                      Text(
                        sheetError!,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.red.shade700,
                          fontWeight: FontWeight.w600,
                        ),
                      ),
                    ],

                    const SizedBox(height: 24),
                    AppButton(
                      label: paying ? 'Processing Payment...' : 'Pay ₹50 with Razorpay',
                      icon: Icons.payment_rounded,
                      loading: paying,
                      onPressed: paying
                          ? null
                          : () async {
                              setSheetState(() {
                                paying = true;
                                sheetError = null;
                              });

                              try {
                                // 1. Create ₹50 Razorpay order
                                final orderRes = await _service.createUnlockOrder(agentCode);

                                // If already unlocked or simulated test mode
                                final isSimulated = orderRes['simulated'] == true ||
                                    orderRes['order'] == null;

                                // 2. Verify payment on backend
                                await _service.verifyUnlock(
                                  agentCode,
                                  orderId: isSimulated
                                      ? 'mobile_sim_${DateTime.now().millisecondsSinceEpoch}'
                                      : orderRes['order']['id'] as String?,
                                  paymentId: isSimulated
                                      ? 'pay_sim_${DateTime.now().millisecondsSinceEpoch}'
                                      : 'pay_mobile_rzp',
                                  signature: isSimulated ? 'sim_sig' : 'rzp_sig',
                                );

                                if (!sheetContext.mounted) return;
                                Navigator.of(sheetContext).pop();

                                // 3. Navigate to Unlocked Agent Shop Screen
                                if (mounted) {
                                  context.pushReplacement(RoutePaths.agentShopPath(agentCode));
                                }
                              } on ApiException catch (e) {
                                setSheetState(() {
                                  paying = false;
                                  sheetError = errorMessageFor(e);
                                });
                              } catch (e) {
                                setSheetState(() {
                                  paying = false;
                                  sheetError = 'Payment failed: $e';
                                });
                              }
                            },
                    ),
                  ],
                ),
              ),
            );
          },
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.primaryNavy,
      appBar: AppBar(
        title: const Text('Scan Channel Partner QR Code'),
        backgroundColor: AppColors.primaryNavy,
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: SingleChildScrollView(
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.center,
            children: [
              Text(
                'Point camera at the Channel Partner\'s QR Code',
                style: GoogleFonts.inter(
                  fontSize: 14,
                  color: Colors.white70,
                ),
              ),
              const SizedBox(height: 28),

              // Animated Scanner Viewfinder
              Center(
                child: AnimatedBuilder(
                  animation: _pulseController,
                  builder: (context, child) {
                    final scale = 1.0 + (_pulseController.value * 0.03);
                    return Transform.scale(
                      scale: scale,
                      child: Container(
                        width: 260,
                        height: 260,
                        decoration: BoxDecoration(
                          color: Colors.black.withValues(alpha: 0.3),
                          borderRadius: BorderRadius.circular(28),
                          border: Border.all(
                            color: AppColors.goldLight,
                            width: 3,
                          ),
                          boxShadow: [
                            BoxShadow(
                              color: AppColors.gold.withValues(alpha: 0.25 * _pulseController.value),
                              blurRadius: 20,
                              spreadRadius: 4,
                            ),
                          ],
                        ),
                        child: Stack(
                          alignment: Alignment.center,
                          children: [
                            Icon(
                              Icons.qr_code_scanner_rounded,
                              size: 110,
                              color: Colors.white.withValues(alpha: 0.7),
                            ),
                            Positioned(
                              top: 20 + (200 * _pulseController.value),
                              left: 20,
                              right: 20,
                              child: Container(
                                height: 2,
                                color: AppColors.gold,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
              ),

              const SizedBox(height: 24),
              Text(
                'Instant ₹50 Razorpay Gateway unlock for verified inventory.',
                textAlign: TextAlign.center,
                style: GoogleFonts.inter(
                  fontSize: 12,
                  color: Colors.white60,
                ),
              ),

              if (_errorMessage != null) ...[
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: Colors.red.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.red.shade400),
                  ),
                  child: Text(
                    _errorMessage!,
                    style: GoogleFonts.inter(color: Colors.red.shade200, fontSize: 13),
                    textAlign: TextAlign.center,
                  ),
                ),
              ],

              const SizedBox(height: 32),
              Divider(color: Colors.white.withValues(alpha: 0.15)),
              const SizedBox(height: 24),

              // Manual Code / URL Entry Option
              Align(
                alignment: Alignment.centerLeft,
                child: Text(
                  'Or enter Channel Partner Code / URL manually:',
                  style: GoogleFonts.inter(
                    fontSize: 13,
                    fontWeight: FontWeight.w600,
                    color: Colors.white,
                  ),
                ),
              ),
              const SizedBox(height: 10),
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _manualCodeController,
                      style: GoogleFonts.inter(color: Colors.white, fontSize: 14),
                      decoration: InputDecoration(
                        hintText: 'e.g. AGT-BLR-1000',
                        hintStyle: GoogleFonts.inter(color: Colors.white38),
                        filled: true,
                        fillColor: Colors.white.withValues(alpha: 0.08),
                        border: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        enabledBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: BorderSide(color: Colors.white.withValues(alpha: 0.2)),
                        ),
                        focusedBorder: OutlineInputBorder(
                          borderRadius: BorderRadius.circular(16),
                          borderSide: const BorderSide(color: AppColors.goldLight),
                        ),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
                      ),
                    ),
                  ),
                  const SizedBox(height: 0, width: 10),
                  ElevatedButton(
                    onPressed: _isProcessing
                        ? null
                        : () => _handleCodeScanned(_manualCodeController.text),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.gold,
                      foregroundColor: AppColors.primaryNavy,
                      padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 15),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                    ),
                    child: _isProcessing
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Text(
                            'Unlock',
                            style: TextStyle(fontWeight: FontWeight.bold),
                          ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

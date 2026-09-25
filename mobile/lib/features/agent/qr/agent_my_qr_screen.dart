import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/agent_profile.dart';
import '../../../services/agent_service.dart';

class AgentMyQrScreen extends StatefulWidget {
  const AgentMyQrScreen({super.key});

  @override
  State<AgentMyQrScreen> createState() => _AgentMyQrScreenState();
}

class _AgentMyQrScreenState extends State<AgentMyQrScreen> {
  late final AgentService _service;
  late Future<AgentProfile> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentService(ApiClient.instance.dio);
    _future = _service.me();
  }

  void _copyToClipboard(String text, String label) {
    Clipboard.setData(ClipboardData(text: text));
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text('$label copied to clipboard!'),
        backgroundColor: AppColors.success,
        behavior: SnackBarBehavior.floating,
      ),
    );
  }

  void _shareOnWhatsApp(AgentProfile profile) {
    final code = profile.agentCode ?? '';
    final shopUrl = '${ApiClient.instance.baseUrl}/shop/$code';
    final message = '''*REAL ESTATE CONSULTANT*
*${profile.shopName ?? 'Authorized Agency'}*
Agent Code: *$code*
📍 ${profile.shopAddress ?? profile.city ?? 'Ghaziabad / NCR'}
📞 Contact: ${profile.alternatePhone ?? ''}

Scan QR or click below to view all my available verified properties:
🔗 $shopUrl''';

    _copyToClipboard(message, 'Shop brochure & link');
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A), // Dark navy
      appBar: AppBar(
        title: const Text('My Shop QR Code'),
        backgroundColor: const Color(0xFF0F172A),
        foregroundColor: Colors.white,
        elevation: 0,
      ),
      body: FutureBuilder<AgentProfile>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator(color: AppColors.gold));
          }
          if (snapshot.hasError) {
            final message = snapshot.error is ApiException
                ? errorMessageFor(snapshot.error as ApiException)
                : 'Failed to load agent profile.';
            return Center(
              child: ErrorView(
                message: message,
                onRetry: () => setState(() => _future = _service.me()),
              ),
            );
          }

          final profile = snapshot.data!;
          final agentCode = profile.agentCode;

          if (agentCode == null || agentCode.isEmpty) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(AppSpacing.xl),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.qr_code_2_rounded, size: 64, color: AppColors.goldLight),
                    const SizedBox(height: 16),
                    Text(
                      'Agent Code Pending',
                      style: GoogleFonts.fraunces(
                        fontSize: 22,
                        fontWeight: FontWeight.bold,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Your profile is currently awaiting admin verification or Prime activation. Your unique Shop QR Code will appear here as soon as your Agent Code is assigned.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white70, height: 1.5),
                    ),
                  ],
                ),
              ),
            );
          }

          final qrImageUrl = '${ApiClient.instance.baseUrl}/api/agent/qr?code=$agentCode&format=png';
          final publicShopUrl = '${ApiClient.instance.baseUrl}/shop/$agentCode';

          return SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
            child: Column(
              children: [
                // Standee Card
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(28),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.35),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    children: [
                      // Badge
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFEFF6FF),
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFFBFDBFE)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.verified, color: Color(0xFF2563EB), size: 16),
                            const SizedBox(width: 6),
                            Text(
                              'Verified Partner Standee',
                              style: GoogleFonts.inter(
                                fontSize: 12,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1D4ED8),
                              ),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Shop Name & Details
                      Text(
                        profile.shopName ?? 'Agent Property Shop',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.fraunces(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: const Color(0xFF0F172A),
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        profile.shopAddress ?? profile.city ?? 'Authorized Real Estate Office',
                        textAlign: TextAlign.center,
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          color: Colors.grey.shade600,
                        ),
                      ),

                      const SizedBox(height: 18),

                      // Scannable QR Code Image container
                      Container(
                        width: 220,
                        height: 220,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(20),
                          border: Border.all(color: const Color(0xFF0F172A), width: 3),
                          boxShadow: [
                            BoxShadow(
                              color: Colors.grey.withValues(alpha: 0.15),
                              blurRadius: 10,
                              offset: const Offset(0, 4),
                            ),
                          ],
                        ),
                        child: CachedNetworkImage(
                          imageUrl: qrImageUrl,
                          placeholder: (context, url) => const Center(
                            child: CircularProgressIndicator(color: AppColors.primaryNavy),
                          ),
                          errorWidget: (context, url, error) => Center(
                            child: Column(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                const Icon(Icons.qr_code_2, size: 48, color: Colors.grey),
                                const SizedBox(height: 4),
                                Text(
                                  agentCode,
                                  style: const TextStyle(fontWeight: FontWeight.bold),
                                ),
                              ],
                            ),
                          ),
                          fit: BoxFit.contain,
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Agent Code Pill
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: const Color(0xFFE2E8F0)),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Text(
                              'Code: ',
                              style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
                            ),
                            Text(
                              agentCode,
                              style: GoogleFonts.inter(
                                fontSize: 13,
                                fontWeight: FontWeight.bold,
                                color: const Color(0xFF1E3A8A),
                                letterSpacing: 0.5,
                              ),
                            ),
                            const SizedBox(width: 8),
                            InkWell(
                              onTap: () => _copyToClipboard(agentCode, 'Agent code'),
                              child: const Icon(Icons.copy, size: 14, color: Color(0xFF2563EB)),
                            ),
                          ],
                        ),
                      ),

                      const SizedBox(height: 14),

                      // Notice
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: const Color(0xFFFEF3C7),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: const Color(0xFFFDE68A)),
                        ),
                        child: Row(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('💡', style: TextStyle(fontSize: 16)),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'Customers scan this QR code with any mobile camera or the BayaEstate app, pay ₹50 via Razorpay, and immediately see your verified contact & all properties.',
                                style: GoogleFonts.inter(
                                  fontSize: 11,
                                  color: const Color(0xFF92400E),
                                  height: 1.4,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Action 1: View Public Shop Preview
                SizedBox(
                  width: double.infinity,
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: AppColors.gold,
                      foregroundColor: const Color(0xFF0F172A),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 0,
                    ),
                    icon: const Icon(Icons.storefront_rounded),
                    label: Text(
                      'Preview My Public Storefront',
                      style: GoogleFonts.inter(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                    onPressed: () => context.push(RoutePaths.agentShopPath(agentCode)),
                  ),
                ),

                const SizedBox(height: 10),

                // Row of Action 2 & 3: Copy Link & Share WhatsApp
                Row(
                  children: [
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          side: const BorderSide(color: Colors.white24),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.link_rounded, size: 18),
                        label: const Text('Copy Link', style: TextStyle(fontSize: 13)),
                        onPressed: () => _copyToClipboard(publicShopUrl, 'Shop URL'),
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: const Color(0xFF25D366),
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 0,
                        ),
                        icon: const Icon(Icons.share_rounded, size: 18),
                        label: const Text('WhatsApp', style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold)),
                        onPressed: () => _shareOnWhatsApp(profile),
                      ),
                    ),
                  ],
                ),

                const SizedBox(height: 24),
              ],
            ),
          );
        },
      ),
    );
  }
}

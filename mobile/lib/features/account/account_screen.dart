import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../core/config/app_brand.dart';
import '../../core/router/route_paths.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../providers/agent_auth_provider.dart';
import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/utils/error_messages.dart';
import '../../providers/customer_auth_provider.dart';
import '../../services/auth_service.dart';
import '../../core/widgets/back_app_bar.dart';

class AccountScreen extends StatelessWidget {
  const AccountScreen({super.key});

  @override
  Widget build(BuildContext context) {
    final agentAuth = context.watch<AgentAuthProvider>();
    final customerAuth = context.watch<CustomerAuthProvider>();

    // NextAuth holds one session per cookie jar, so at most one role is signed in.
    final signedIn = agentAuth.isLoggedIn || customerAuth.isBuyer || customerAuth.isInvestor || customerAuth.isOwner;

    Future<void> logout() async {
      if (agentAuth.isLoggedIn) {
        await agentAuth.logout();
      } else {
        await customerAuth.logout();
      }
      if (context.mounted) context.go(RoutePaths.home);
    }

    Future<void> deleteAccount() async {
      final sure = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Delete your account?'),
          content: const Text(
            'This permanently erases your profile and you will not be able to sign in again. '
            'Payments and records that other people depend on are kept, without your personal details. This cannot be undone.',
          ),
          actions: [
            TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(true),
              style: TextButton.styleFrom(foregroundColor: Colors.red),
              child: const Text('Delete my account'),
            ),
          ],
        ),
      );
      if (sure != true || !context.mounted) return;
      final messenger = ScaffoldMessenger.of(context);
      try {
        await context.read<AuthService>().deleteAccount();
        if (agentAuth.isLoggedIn) {
          await agentAuth.logout();
        } else {
          await customerAuth.logout();
        }
        if (context.mounted) context.go(RoutePaths.home);
        messenger.showSnackBar(const SnackBar(content: Text('Your account has been deleted.')));
      } on ApiException catch (e) {
        messenger.showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
      } catch (_) {
        messenger.showSnackBar(const SnackBar(content: Text('Could not delete your account. Please try again.')));
      }
    }

    Future<void> openLink(String path) => launchUrl(Uri.parse('${ApiClient.baseUrl}$path'), mode: LaunchMode.externalApplication);

    return Scaffold(
      appBar: BackAppBar(title: const Text('Account')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            Text(
              signedIn ? 'Your ${AppBrand.name} account' : 'Welcome to ${AppBrand.name}',
              style: GoogleFonts.fraunces(fontSize: 22, fontWeight: FontWeight.w600, color: AppColors.textPrimary),
            ),
            const SizedBox(height: AppSpacing.xs),
            Text(
              signedIn ? 'Everything for your account is here.' : 'Choose how you want to continue.',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
            const SizedBox(height: AppSpacing.lg),
            if (agentAuth.isLoggedIn) ...[
              _AccountOption(
                icon: Icons.badge_outlined,
                title: 'Channel Partner',
                subtitle: 'Signed in as ${agentAuth.name ?? 'partner'}',
                signedIn: true,
                onTap: () => context.push(RoutePaths.agentDashboard),
              ),
            ] else if (customerAuth.isOwner) ...[
              _AccountOption(
                icon: Icons.home_work_outlined,
                title: 'Property Owner',
                subtitle: 'Signed in as ${customerAuth.name ?? customerAuth.email ?? 'owner'}',
                signedIn: true,
                onTap: () => context.push(RoutePaths.ownerStatus),
              ),
            ] else if (customerAuth.isInvestor) ...[
              _AccountOption(
                icon: Icons.trending_up,
                title: 'Referral Partner',
                subtitle: 'Signed in as ${customerAuth.name ?? customerAuth.email ?? customerAuth.phone ?? 'referral partner'}',
                signedIn: true,
                onTap: () => context.push(RoutePaths.investorDashboard),
              ),
            ] else if (customerAuth.isBuyer) ...[
              _AccountOption(
                icon: Icons.person_outline,
                title: 'Buyer',
                subtitle: 'Signed in as ${customerAuth.name ?? customerAuth.email ?? customerAuth.phone ?? 'buyer'}',
                signedIn: true,
                onTap: () => context.push(RoutePaths.buyerDashboard),
              ),
            ] else ...[
              _section(context, 'Log in as'),
              _AccountOption(
                icon: Icons.person_outline,
                title: 'Buyer',
                subtitle: 'Find and unlock properties. Login with an OTP.',
                signedIn: false,
                onTap: () => context.push(RoutePaths.buyerLogin),
              ),
              const SizedBox(height: AppSpacing.sm),
              _AccountOption(
                icon: Icons.home_work_outlined,
                title: 'Property Owner',
                subtitle: 'Track your listed property. Login with email and password.',
                signedIn: false,
                onTap: () => context.push(RoutePaths.ownerLogin),
              ),
              const SizedBox(height: AppSpacing.sm),
              _AccountOption(
                icon: Icons.badge_outlined,
                title: 'Channel Partner',
                subtitle: 'Buzzer, listings, commissions and your wallet.',
                signedIn: false,
                onTap: () => context.push(RoutePaths.agentLogin),
              ),
              const SizedBox(height: AppSpacing.sm),
              _AccountOption(
                icon: Icons.trending_up,
                title: 'Referral Partner',
                subtitle: 'Track your referrals and earnings.',
                signedIn: false,
                onTap: () => context.push(RoutePaths.investorLogin),
              ),
              const SizedBox(height: AppSpacing.lg),
              _section(context, 'New here?'),
              _AccountOption(
                icon: Icons.add_home_work_outlined,
                title: 'List your property',
                subtitle: 'Owners: plans from ₹299, verified on site by a partner.',
                signedIn: false,
                onTap: () => context.push(RoutePaths.ownerStart),
              ),
              const SizedBox(height: AppSpacing.sm),
              _AccountOption(
                icon: Icons.handshake_outlined,
                title: 'Become a Channel Partner',
                subtitle: 'Register your shop and start getting buzzers.',
                signedIn: false,
                onTap: () => context.push(RoutePaths.agentRegister),
              ),
            ],
            const SizedBox(height: AppSpacing.lg),
            _section(context, 'Help'),
            _AccountOption(
              icon: Icons.support_agent_outlined,
              title: 'Help & support',
              subtitle: 'Raise a ticket. We reply within 2 hours.',
              signedIn: false,
              onTap: () => context.push(RoutePaths.support),
            ),
            const SizedBox(height: AppSpacing.sm),
            _AccountOption(
              icon: Icons.privacy_tip_outlined,
              title: 'Privacy policy',
              subtitle: 'How we use your information.',
              signedIn: false,
              onTap: () => openLink('/privacy-policy'),
            ),
            const SizedBox(height: AppSpacing.sm),
            _AccountOption(
              icon: Icons.description_outlined,
              title: 'Terms & conditions',
              subtitle: 'The rules for using Pronesto.',
              signedIn: false,
              onTap: () => openLink('/terms'),
            ),
            if (signedIn) ...[
              const SizedBox(height: AppSpacing.lg),
              OutlinedButton.icon(
                onPressed: logout,
                icon: const Icon(Icons.logout),
                label: const Text('Log out'),
              ),
              const SizedBox(height: AppSpacing.sm),
              TextButton.icon(
                onPressed: deleteAccount,
                style: TextButton.styleFrom(foregroundColor: Colors.red),
                icon: const Icon(Icons.delete_outline),
                label: const Text('Delete my account'),
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _section(BuildContext context, String title) => Padding(
        padding: const EdgeInsets.only(bottom: AppSpacing.sm),
        child: Text(
          title.toUpperCase(),
          style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w800, letterSpacing: 1.2, color: AppColors.textMuted),
        ),
      );
}

class _AccountOption extends StatelessWidget {
  const _AccountOption({
    required this.icon,
    required this.title,
    required this.subtitle,
    required this.signedIn,
    required this.onTap,
  });

  final IconData icon;
  final String title;
  final String subtitle;
  final bool signedIn;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return Material(
      color: Colors.white,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.lg),
        onTap: onTap,
        child: Container(
          padding: const EdgeInsets.all(AppSpacing.lg),
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(AppRadius.lg),
            border: Border.all(color: AppColors.divider),
          ),
          child: Row(
            children: [
              Container(
                width: 44,
                height: 44,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: Icon(icon, color: AppColors.goldLight, size: 22),
              ),
              const SizedBox(width: AppSpacing.md),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Text(
                          title,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        if (signedIn) ...[
                          const SizedBox(width: 6),
                          Container(
                            width: 6,
                            height: 6,
                            decoration: const BoxDecoration(
                              color: AppColors.success,
                              shape: BoxShape.circle,
                            ),
                          ),
                        ],
                      ],
                    ),
                    const SizedBox(height: 2),
                    Text(subtitle, style: Theme.of(context).textTheme.bodySmall),
                  ],
                ),
              ),
              const Icon(Icons.chevron_right, color: AppColors.textSecondary),
            ],
          ),
        ),
      ),
    );
  }
}

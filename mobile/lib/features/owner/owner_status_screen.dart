import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/router/route_paths.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/empty_state.dart';
import '../../providers/customer_auth_provider.dart';
import '../../services/owner_service.dart';

/// "My property": the owner's requests and where each one stands.
class OwnerStatusScreen extends StatefulWidget {
  const OwnerStatusScreen({super.key});

  @override
  State<OwnerStatusScreen> createState() => _OwnerStatusScreenState();
}

class _OwnerStatusScreenState extends State<OwnerStatusScreen> {
  late final OwnerService _service = OwnerService(ApiClient.instance.dio);
  late Future<List<OwnerRequest>> _future = _service.myRequests();

  Future<void> _refresh() async {
    setState(() { _future = _service.myRequests(); });
    await _future;
  }

  static const _steps = ['Paid', 'Details added', 'Partner assigned', 'Verified & live'];

  int _stepIndex(OwnerRequest r) {
    switch (r.status) {
      case 'PENDING_PAYMENT':
        return -1;
      case 'DETAILS_PENDING':
        return 0;
      case 'SEARCHING':
        return 1;
      case 'ACCEPTED':
      case 'LINK_SENT':
        return 2;
      case 'SUBMITTED':
        return 3;
      default:
        return 0;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My property'),
        actions: [
          IconButton(
            tooltip: 'Log out',
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await context.read<CustomerAuthProvider>().logout();
              if (context.mounted) context.go(RoutePaths.home);
            },
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        onPressed: () => context.push(RoutePaths.ownerStart),
        icon: const Icon(Icons.add),
        label: const Text('List another'),
      ),
      body: RefreshIndicator(
        onRefresh: _refresh,
        child: FutureBuilder<List<OwnerRequest>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator());
            }
            if (snap.hasError) {
              return ListView(children: [
                Padding(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  child: Text(ownerErrorMessage(snap.error!), textAlign: TextAlign.center),
                ),
              ]);
            }
            final list = snap.data ?? [];
            if (list.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 80),
                EmptyState(icon: Icons.home_work_outlined, message: "No property yet. List your property to get started."),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (_, i) => _card(list[i]),
            );
          },
        ),
      ),
    );
  }

  Widget _card(OwnerRequest r) {
    final t = Theme.of(context).textTheme;
    final idx = _stepIndex(r);
    final sell = r.purpose == 'SELL';
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  r.listingTitle ?? [r.locality, r.city].where((e) => e != null && e.isNotEmpty).join(', '),
                  style: t.titleMedium,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(AppRadius.pill)),
                child: Text('${sell ? 'Sell' : 'Rent'} · ${r.planName} ₹${r.amount}', style: t.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.sm),
          Text(r.statusLabel, style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w800, color: AppColors.gold)),
          const SizedBox(height: AppSpacing.sm),
          if (r.status == 'DETAILS_PENDING') ...[
            const Text('Payment received. Add your property details so a partner can verify it.'),
            const SizedBox(height: AppSpacing.md),
            AppButton(label: 'Add property details', icon: Icons.edit_note, expand: true, onPressed: () => context.push(RoutePaths.ownerDetailsPath(r.formToken))),
          ] else if (sell) ...[
            const Text('Our team will call you and take your property details and documents.'),
          ] else if (r.status == 'SUBMITTED') ...[
            const Text('Your property is verified and live.'),
            if (r.listingSlug != null) ...[
              const SizedBox(height: AppSpacing.sm),
              AppButton(
                label: 'View my listing',
                variant: AppButtonVariant.secondary,
                onPressed: () => context.push(RoutePaths.listingDetailPath(r.listingSlug!)),
              ),
            ],
          ] else ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.sm + 2),
              decoration: BoxDecoration(color: AppColors.warning.withValues(alpha: 0.10), borderRadius: BorderRadius.circular(AppRadius.sm)),
              child: Row(
                children: [
                  const Icon(Icons.hourglass_top, size: 18, color: AppColors.warning),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      r.status == 'ACCEPTED' && r.partnerName != null
                          ? 'In process. ${r.partnerName} will visit and verify within 48 hours. Keep your phone nearby, they will ask for an OTP.'
                          : 'In process. A partner will verify your property within 48 hours.',
                      style: t.bodySmall?.copyWith(fontWeight: FontWeight.w600),
                    ),
                  ),
                ],
              ),
            ),
          ],
          if (!sell && r.status != 'PENDING_PAYMENT') ...[
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                for (var i = 0; i < _steps.length; i++)
                  Expanded(
                    child: Column(
                      children: [
                        Container(
                          height: 6,
                          margin: const EdgeInsets.symmetric(horizontal: 2),
                          decoration: BoxDecoration(
                            color: i <= idx ? AppColors.gold : AppColors.divider,
                            borderRadius: BorderRadius.circular(3),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(_steps[i], textAlign: TextAlign.center, style: t.bodySmall?.copyWith(fontSize: 10)),
                      ],
                    ),
                  ),
              ],
            ),
          ],
        ],
      ),
    );
  }
}

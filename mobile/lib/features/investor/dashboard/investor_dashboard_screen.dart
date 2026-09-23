import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/investor_ledger.dart';
import '../../../models/investor_me.dart';
import '../../../providers/customer_auth_provider.dart';
import '../../../services/investor_service.dart';

class InvestorDashboardScreen extends StatefulWidget {
  const InvestorDashboardScreen({super.key});

  @override
  State<InvestorDashboardScreen> createState() => _InvestorDashboardScreenState();
}

class _InvestorDashboardScreenState extends State<InvestorDashboardScreen> {
  late final InvestorService _service;
  late Future<InvestorMe> _profileFuture;
  late Future<InvestorLedger> _ledgerFuture;

  @override
  void initState() {
    super.initState();
    _service = InvestorService(ApiClient.instance.dio);
    _reload();
  }

  void _reload() {
    _profileFuture = _service.getMe();
    _ledgerFuture = _service.getLedger();
  }

  Future<void> _logout() async {
    await context.read<CustomerAuthProvider>().logout();
    if (!mounted) return;
    context.go(RoutePaths.home);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Investor Portal'),
        actions: [
          IconButton(
            icon: const Icon(Icons.folder_outlined),
            tooltip: 'Document Vault',
            onPressed: () => context.push(RoutePaths.investorDocuments),
          ),
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(_reload),
        child: FutureBuilder<InvestorMe>(
          future: _profileFuture,
          builder: (context, profileSnapshot) {
            if (profileSnapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.gold));
            }
            if (profileSnapshot.hasError) {
              final message = profileSnapshot.error is ApiException
                  ? errorMessageFor(profileSnapshot.error as ApiException)
                  : 'Something went wrong.';
              return ErrorView(message: message, onRetry: () => setState(_reload));
            }

            final profile = profileSnapshot.data!;
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                Text(
                  profile.investorCode != null
                      ? 'Investor Code ${profile.investorCode}'
                      : 'Registration fee pending — contact your agent.',
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
                const SizedBox(height: AppSpacing.md),
                FutureBuilder<InvestorLedger>(
                  future: _ledgerFuture,
                  builder: (context, ledgerSnapshot) {
                    final ledger = ledgerSnapshot.data;
                    return _SummaryCard(profile: profile, totalProfit: ledger?.totalProfit ?? 0);
                  },
                ),
                if (profile.expiresAt != null) ...[
                  const SizedBox(height: AppSpacing.md),
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(
                      color: AppColors.warning.withValues(alpha: 0.08),
                      borderRadius: BorderRadius.circular(AppRadius.md),
                      border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
                    ),
                    child: Text(
                      'Registration valid until '
                      '${profile.expiresAt!.toLocal()}'.split(' ').first,
                      style: const TextStyle(color: AppColors.warning, fontSize: 13),
                    ),
                  ),
                ],
                const SizedBox(height: AppSpacing.xl),
                _SectionLabel('Date-wise profit ledger'),
                const SizedBox(height: AppSpacing.sm),
                FutureBuilder<InvestorLedger>(
                  future: _ledgerFuture,
                  builder: (context, ledgerSnapshot) {
                    if (ledgerSnapshot.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                        child: Center(child: CircularProgressIndicator(color: AppColors.gold)),
                      );
                    }
                    if (ledgerSnapshot.hasError) {
                      return const EmptyState(message: 'Couldn\'t load your ledger.');
                    }
                    final entries = ledgerSnapshot.data!.entries;
                    if (entries.isEmpty) {
                      return const EmptyState(
                        message: 'No profit credited yet.',
                        icon: Icons.receipt_long_outlined,
                      );
                    }
                    return _CardList(
                      children: entries
                          .map((e) => _LedgerRow(entry: e))
                          .toList(),
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.xl),
                _SectionLabel('Deal profit distributions'),
                const SizedBox(height: 2),
                Text(
                  'Full split for each deal cycle — your share plus the agent/expense/'
                  'company lines for transparency.',
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                const SizedBox(height: AppSpacing.sm),
                FutureBuilder<InvestorLedger>(
                  future: _ledgerFuture,
                  builder: (context, ledgerSnapshot) {
                    if (ledgerSnapshot.connectionState != ConnectionState.done) {
                      return const SizedBox.shrink();
                    }
                    final distributions = ledgerSnapshot.data?.distributions ?? [];
                    if (distributions.isEmpty) {
                      return const EmptyState(message: 'No deal cycles yet.');
                    }
                    return _CardList(
                      children:
                          distributions.map((d) => _DistributionRow(distribution: d)).toList(),
                    );
                  },
                ),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.fraunces(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _SummaryCard extends StatelessWidget {
  const _SummaryCard({required this.profile, required this.totalProfit});

  final InvestorMe profile;
  final int totalProfit;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: AppColors.primaryNavy,
        borderRadius: BorderRadius.circular(AppRadius.lg),
      ),
      child: Row(
        children: [
          Expanded(child: _Stat(label: 'Active capital', value: Formatters.price(profile.totalInvested))),
          Expanded(child: _Stat(label: 'Total profit', value: Formatters.price(totalProfit))),
          Expanded(
            child: _Stat(
              label: 'Referring agent',
              value: profile.referringAgent.agentCode ??
                  profile.referringAgent.shopName ??
                  '—',
            ),
          ),
        ],
      ),
    );
  }
}

class _Stat extends StatelessWidget {
  const _Stat({required this.label, required this.value});
  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(label, style: const TextStyle(color: Color(0xFFC6CEDB), fontSize: 11)),
        const SizedBox(height: 2),
        Text(
          value,
          maxLines: 1,
          overflow: TextOverflow.ellipsis,
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w700, fontSize: 15),
        ),
      ],
    );
  }
}

class _CardList extends StatelessWidget {
  const _CardList({required this.children});
  final List<Widget> children;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        children: [
          for (var i = 0; i < children.length; i++) ...[
            if (i > 0) const Divider(height: 1, color: AppColors.divider),
            children[i],
          ],
        ],
      ),
    );
  }
}

class _LedgerRow extends StatelessWidget {
  const _LedgerRow({required this.entry});
  final InvestorLedgerEntry entry;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: AppSpacing.md, vertical: AppSpacing.sm),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(entry.note ?? '—', style: Theme.of(context).textTheme.bodyMedium),
                Text(
                  [
                    '${entry.createdAt.toLocal()}'.split(' ').first,
                    if (entry.customerTransactionRef != null) 'Txn ${entry.customerTransactionRef}',
                    if (entry.holdDurationDays != null) 'held ${entry.holdDurationDays} days',
                  ].join(' · '),
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
          Text(
            Formatters.price(entry.amount),
            style: const TextStyle(fontWeight: FontWeight.w700),
          ),
        ],
      ),
    );
  }
}

class _DistributionRow extends StatelessWidget {
  const _DistributionRow({required this.distribution});
  final ProfitDistribution distribution;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.all(AppSpacing.md),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  '${distribution.distributedAt.toLocal()}'.split(' ').first,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text('Total profit: ${Formatters.price(distribution.totalProfit)}'),
                Text(distribution.paymentModeLabel, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          Text(
            Formatters.price(distribution.investorShare),
            style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.gold),
          ),
        ],
      ),
    );
  }
}

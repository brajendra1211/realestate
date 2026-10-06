import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/agent_payment_history.dart';
import '../../../services/agent_payouts_service.dart';

class AgentPayoutsScreen extends StatefulWidget {
  const AgentPayoutsScreen({super.key});

  @override
  State<AgentPayoutsScreen> createState() => _AgentPayoutsScreenState();
}

class _AgentPayoutsScreenState extends State<AgentPayoutsScreen>
    with SingleTickerProviderStateMixin {
  late final AgentPayoutsService _service;
  late Future<AgentPaymentHistory> _future;
  late final TabController _tabController;
  bool _requesting = false;

  @override
  void initState() {
    super.initState();
    _service = AgentPayoutsService(ApiClient.instance.dio);
    _future = _service.getPaymentHistory();
    _tabController = TabController(length: 2, vsync: this);
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  BadgeKind _statusKind(String status) => switch (status) {
        'PAID' => BadgeKind.success,
        'REJECTED' => BadgeKind.danger,
        _ => BadgeKind.warning,
      };

  Future<void> _requestPayout(int maxBalance) async {
    final amountController = TextEditingController();
    final amount = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Request Bank Withdrawal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Available balance: ${Formatters.price(maxBalance)}',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: Colors.grey.shade600,
              ),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: amountController,
              keyboardType: TextInputType.number,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Amount (INR)',
                hintText: 'e.g. 2000',
                prefixText: '₹ ',
              ),
            ),
            const SizedBox(height: 8),
            Text(
              'TDS will be deducted automatically before admin transfer.',
              style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade500),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(
              backgroundColor: AppColors.gold,
              foregroundColor: AppColors.textOnGold,
            ),
            onPressed: () => Navigator.of(context).pop(amountController.text.trim()),
            child: const Text('Submit Request'),
          ),
        ],
      ),
    );

    final parsed = int.tryParse(amount ?? '');
    if (parsed == null || parsed <= 0 || !mounted) return;

    if (parsed > maxBalance) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Amount exceeds available wallet balance.')),
      );
      return;
    }

    setState(() => _requesting = true);
    try {
      await _service.requestPayout(parsed);
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('Withdrawal request submitted successfully!'),
          backgroundColor: Colors.green,
        ),
      );
      setState(() => _future = _service.getPaymentHistory());
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _requesting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Earnings & Payments',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        elevation: 0,
      ),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(() => _future = _service.getPaymentHistory()),
        child: FutureBuilder<AgentPaymentHistory>(
          future: _future,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.gold));
            }
            if (snapshot.hasError) {
              final message = snapshot.error is ApiException
                  ? errorMessageFor(snapshot.error as ApiException)
                  : 'Something went wrong.';
              return ErrorView(
                message: message,
                onRetry: () => setState(() => _future = _service.getPaymentHistory()),
              );
            }

            final data = snapshot.data!;

            return NestedScrollView(
              headerSliverBuilder: (context, _) => [
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    child: _buildWalletSummaryCard(data),
                  ),
                ),
                SliverPersistentHeader(
                  pinned: true,
                  delegate: _TabBarHeaderDelegate(
                    TabBar(
                      controller: _tabController,
                      labelColor: AppColors.primaryNavy,
                      unselectedLabelColor: Colors.grey.shade500,
                      indicatorColor: AppColors.gold,
                      indicatorWeight: 3,
                      labelStyle: GoogleFonts.inter(fontWeight: FontWeight.bold, fontSize: 13),
                      tabs: [
                        Tab(text: 'Earnings (${data.earnings.length})'),
                        Tab(text: 'Withdrawals (${data.payouts.length})'),
                      ],
                    ),
                  ),
                ),
              ],
              body: TabBarView(
                controller: _tabController,
                children: [
                  _buildEarningsTab(data.earnings),
                  _buildWithdrawalsTab(data.payouts, data.walletBalance),
                ],
              ),
            );
          },
        ),
      ),
      floatingActionButton: FutureBuilder<AgentPaymentHistory>(
        future: _future,
        builder: (context, snapshot) {
          final balance = snapshot.data?.walletBalance ?? 0;
          return FloatingActionButton.extended(
            backgroundColor: AppColors.gold,
            foregroundColor: AppColors.textOnGold,
            onPressed: (_requesting || balance < 100)
                ? null
                : () => _requestPayout(balance),
            icon: const Icon(Icons.account_balance_wallet_outlined, size: 20),
            label: Text(
              'Withdraw',
              style: GoogleFonts.inter(fontWeight: FontWeight.bold),
            ),
          );
        },
      ),
    );
  }

  Widget _buildWalletSummaryCard(AgentPaymentHistory data) {
    return Container(
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
        borderRadius: BorderRadius.circular(20),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.12),
            blurRadius: 12,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Available Wallet Balance',
                style: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: const Color(0xFF94A3B8),
                  letterSpacing: 0.5,
                ),
              ),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.2),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  'ACTIVE',
                  style: GoogleFonts.inter(
                    fontSize: 10,
                    fontWeight: FontWeight.w800,
                    color: AppColors.goldLight,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Text(
            Formatters.price(data.walletBalance),
            style: GoogleFonts.fraunces(
              fontSize: 32,
              fontWeight: FontWeight.bold,
              color: Colors.white,
            ),
          ),
          const SizedBox(height: 18),
          const Divider(color: Color(0xFF334155), height: 1),
          const SizedBox(height: 14),
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Lifetime Earned',
                      style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      Formatters.price(data.totalEarned),
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: AppColors.goldLight,
                      ),
                    ),
                  ],
                ),
              ),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Total Withdrawn',
                      style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      Formatters.price(data.totalWithdrawn),
                      style: GoogleFonts.inter(
                        fontSize: 15,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  Widget _buildEarningsTab(List<CommissionEntry> earnings) {
    if (earnings.isEmpty) {
      return const EmptyState(
        message: 'No earnings recorded yet. Unlock properties or scan QR to earn commissions!',
        icon: Icons.payments_outlined,
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 80),
      itemCount: earnings.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final item = earnings[index];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.center,
              children: [
                Container(
                  width: 40,
                  height: 40,
                  decoration: BoxDecoration(
                    color: const Color(0xFFDCFCE7),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: const Center(
                    child: Text(
                      '+₹',
                      style: TextStyle(
                        color: Color(0xFF16A34A),
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        item.displayTitle,
                        style: GoogleFonts.inter(
                          fontWeight: FontWeight.w700,
                          fontSize: 13.5,
                          color: AppColors.charcoal,
                        ),
                      ),
                      if (item.note != null && item.note!.isNotEmpty) ...[
                        const SizedBox(height: 2),
                        Text(
                          item.note!,
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            color: Colors.grey.shade600,
                          ),
                          maxLines: 2,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ],
                      const SizedBox(height: 4),
                      Text(
                        '${item.createdAt.day}/${item.createdAt.month}/${item.createdAt.year}',
                        style: GoogleFonts.inter(
                          fontSize: 10.5,
                          color: Colors.grey.shade400,
                        ),
                      ),
                    ],
                  ),
                ),
                Text(
                  '+${Formatters.price(item.amount)}',
                  style: GoogleFonts.inter(
                    fontWeight: FontWeight.w800,
                    fontSize: 15,
                    color: const Color(0xFF16A34A),
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildWithdrawalsTab(List<dynamic> payouts, int walletBalance) {
    if (payouts.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(Icons.account_balance_outlined, size: 48, color: Colors.grey.shade400),
              const SizedBox(height: 12),
              Text(
                'No withdrawal requests yet.',
                style: GoogleFonts.inter(fontSize: 14, color: Colors.grey.shade600),
              ),
              const SizedBox(height: 4),
              Text(
                'Wallet balance: ${Formatters.price(walletBalance)}',
                style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade500),
              ),
            ],
          ),
        ),
      );
    }

    return ListView.separated(
      padding: const EdgeInsets.fromLTRB(AppSpacing.md, AppSpacing.sm, AppSpacing.md, 80),
      itemCount: payouts.length,
      separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (context, index) {
        final payout = payouts[index];
        return Card(
          elevation: 0,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(14),
            side: BorderSide(color: Colors.grey.shade200),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Text(
                            Formatters.price(payout.netAmount),
                            style: GoogleFonts.inter(
                              fontWeight: FontWeight.w800,
                              fontSize: 16,
                              color: AppColors.charcoal,
                            ),
                          ),
                          const SizedBox(width: 8),
                          StatusBadge(
                            label: payout.status,
                            kind: _statusKind(payout.status),
                          ),
                        ],
                      ),
                      const SizedBox(height: 3),
                      Text(
                        'Gross ${Formatters.price(payout.grossAmount)} · TDS ${Formatters.price(payout.tdsAmount)}',
                        style: GoogleFonts.inter(fontSize: 11.5, color: Colors.grey.shade600),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        'Requested: ${payout.requestedAt.day}/${payout.requestedAt.month}/${payout.requestedAt.year}',
                        style: GoogleFonts.inter(fontSize: 10.5, color: Colors.grey.shade400),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        );
      },
    );
  }
}

class _TabBarHeaderDelegate extends SliverPersistentHeaderDelegate {
  _TabBarHeaderDelegate(this._tabBar);

  final TabBar _tabBar;

  @override
  double get minExtent => _tabBar.preferredSize.height;
  @override
  double get maxExtent => _tabBar.preferredSize.height;

  @override
  Widget build(BuildContext context, double shrinkOffset, bool overlapsContent) {
    return Container(
      color: AppColors.background,
      child: _tabBar,
    );
  }

  @override
  bool shouldRebuild(covariant _TabBarHeaderDelegate oldDelegate) {
    return false;
  }
}

import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/back_app_bar.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';

/// Everything the buyer has paid for: which property, where, the price, who the partner is and when.
/// One payment opens every listing, so this also tells the buyer they have full access.
class BuyerPaymentsScreen extends StatefulWidget {
  const BuyerPaymentsScreen({super.key});

  @override
  State<BuyerPaymentsScreen> createState() => _BuyerPaymentsScreenState();
}

class _BuyerPaymentsScreenState extends State<BuyerPaymentsScreen> {
  late Future<Map<String, dynamic>> _future = _load();

  Future<Map<String, dynamic>> _load() async {
    try {
      final res = await ApiClient.instance.dio.get('/api/buyer/payments');
      return Map<String, dynamic>.from(res.data as Map);
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  String _date(String? iso) {
    final d = DateTime.tryParse(iso ?? '')?.toLocal();
    if (d == null) return '';
    const m = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return '${d.day} ${m[d.month - 1]} ${d.year}';
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: const BackAppBar(title: Text('My payments')),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(() { _future = _load(); }),
        child: FutureBuilder<Map<String, dynamic>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.gold));
            }
            if (snap.hasError) {
              final e = snap.error;
              return ErrorView(
                message: e is ApiException ? errorMessageFor(e) : 'Could not load your payments.',
                onRetry: () => setState(() { _future = _load(); }),
              );
            }
            final d = snap.data!;
            final props = ((d['propertyUnlocks'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
            final shops = ((d['shopUnlocks'] as List?) ?? []).map((e) => Map<String, dynamic>.from(e as Map)).toList();
            final total = (d['totalSpent'] as num?)?.toInt() ?? 0;
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Container(
                  padding: const EdgeInsets.all(AppSpacing.lg),
                  decoration: BoxDecoration(color: AppColors.primaryNavy, borderRadius: BorderRadius.circular(AppRadius.lg)),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text('Total paid', style: t.bodySmall?.copyWith(color: Colors.white70)),
                      Text(Formatters.price(total), style: t.headlineSmall?.copyWith(color: Colors.white, fontWeight: FontWeight.w800)),
                      if (total > 0) ...[
                        const SizedBox(height: 6),
                        const Text(
                          'You have full access: open any listing and see all its details, no extra payment.',
                          style: TextStyle(color: Color(0xFFBDD2FF), fontSize: 12),
                        ),
                      ],
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                Text('Properties unlocked (${props.length})', style: t.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                if (props.isEmpty)
                  const EmptyState(icon: Icons.lock_open_outlined, message: 'No payments yet. Unlock a property to see its address and contact.')
                else
                  for (final p in props) _propertyCard(p, t),
                if (shops.isNotEmpty) ...[
                  const SizedBox(height: AppSpacing.lg),
                  Text('Partner shop unlocks (${shops.length})', style: t.titleMedium),
                  const SizedBox(height: AppSpacing.sm),
                  for (final s in shops)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.storefront_outlined, color: AppColors.gold),
                        title: Text('${s['partnerName'] ?? 'Channel partner'}'),
                        isThreeLine: s['paymentId'] != null,
                        subtitle: Text([
                          if (s['partnerPhone'] != null) '${s['partnerPhone']}',
                          _date(s['createdAt'] as String?),
                          if (s['paymentId'] != null) 'Payment ID: ${s['paymentId']}',
                        ].where((e) => e.isNotEmpty).join('\n')),
                        trailing: Text(Formatters.price((s['amount'] as num?) ?? 0), style: const TextStyle(fontWeight: FontWeight.w800)),
                      ),
                    ),
                ],
              ],
            );
          },
        ),
      ),
    );
  }

  Widget _propertyCard(Map<String, dynamic> p, TextTheme t) {
    final where = [p['locality'], p['city']].where((e) => e != null && '$e'.isNotEmpty).join(', ');
    final kind = [
      if (p['bedrooms'] != null) '${p['bedrooms']} BHK',
      if (p['propertyType'] != null) '${p['propertyType']}'.replaceAll('_', ' ').toLowerCase(),
      if (p['listingType'] != null) 'for ${'${p['listingType']}' == 'RENT' ? 'rent' : 'sale'}',
      if (p['areaSqft'] != null) '${p['areaSqft']} sqft',
    ].join(' · ');
    final slug = p['listingSlug'] as String?;
    return Card(
      child: InkWell(
        borderRadius: BorderRadius.circular(AppRadius.md),
        onTap: slug == null ? null : () => context.push(RoutePaths.listingDetailPath(slug)),
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.md),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Row(
                children: [
                  Expanded(child: Text('${p['listingTitle'] ?? 'Property'}', style: t.titleSmall?.copyWith(fontWeight: FontWeight.w800))),
                  Text(Formatters.price((p['amount'] as num?) ?? 0), style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.success)),
                ],
              ),
              if (kind.isNotEmpty) Text(kind, style: t.bodySmall),
              if (where.isNotEmpty) Text(where, style: t.bodySmall),
              if (p['price'] != null) Text('Price: ${Formatters.price(p['price'] as num)}', style: t.bodySmall),
              const Divider(height: 18),
              if (p['exactAddress'] != null) _line(Icons.place_outlined, '${p['exactAddress']}', t),
              if (p['assignedAgentName'] != null)
                _line(Icons.badge_outlined, 'Partner: ${p['assignedAgentName']}${p['assignedAgentPhone'] != null ? ' · ${p['assignedAgentPhone']}' : ''}', t),
              _line(Icons.event_outlined, 'Paid on ${_date(p['createdAt'] as String?)}', t),
              if (slug != null)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Text('Tap to open full details →', style: TextStyle(color: AppColors.gold, fontWeight: FontWeight.w700, fontSize: 12)),
                ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _line(IconData icon, String text, TextTheme t) => Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: Row(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Icon(icon, size: 15, color: AppColors.textMuted),
            const SizedBox(width: 6),
            Expanded(child: Text(text, style: t.bodySmall)),
          ],
        ),
      );
}

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../services/agent_work_service.dart';
import '../../../core/widgets/back_app_bar.dart';

/// Buyers who paid to see a property. The buzzer offers them first; the partner
/// calls the buyer and shares the shop link so the buyer sees all the partner's listings.
class AgentBuyerLeadsScreen extends StatefulWidget {
  const AgentBuyerLeadsScreen({super.key});

  @override
  State<AgentBuyerLeadsScreen> createState() => _AgentBuyerLeadsScreenState();
}

class _AgentBuyerLeadsScreenState extends State<AgentBuyerLeadsScreen> {
  late final AgentWorkService _service = AgentWorkService(ApiClient.instance.dio);
  late Future<BuyerLeadsData> _future = _service.buyerLeads();

  Future<void> _reload() async {
    setState(() { _future = _service.buyerLeads(); });
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: BackAppBar(title: const Text('Buyer leads')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<BuyerLeadsData>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
            if (snap.hasError) {
              return ListView(children: [Padding(padding: const EdgeInsets.all(AppSpacing.lg), child: Text(workError(snap.error!), textAlign: TextAlign.center))]);
            }
            final d = snap.data!;
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.md),
              children: [
                Text(
                  'Buyers who paid to see a property. You are buzzed first for your own listings, and for buyers within 5 km. Accept fast, call them, and send your listings link.',
                  style: t.bodySmall,
                ),
                const SizedBox(height: AppSpacing.md),
                if (d.shopLink != null)
                  Container(
                    padding: const EdgeInsets.all(AppSpacing.md),
                    decoration: BoxDecoration(color: AppColors.success.withValues(alpha: 0.08), borderRadius: BorderRadius.circular(AppRadius.md)),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('Your listings link', style: t.titleMedium),
                        const SizedBox(height: 2),
                        Text(d.shopLink!, style: t.bodySmall),
                        const SizedBox(height: AppSpacing.sm),
                        Wrap(spacing: 8, children: [
                          AppButton(
                            label: 'Copy',
                            icon: Icons.copy,
                            variant: AppButtonVariant.secondary,
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: d.shopLink!));
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied')));
                            },
                          ),
                          AppButton(
                            label: 'WhatsApp',
                            icon: Icons.chat,
                            onPressed: () => launchUrl(
                              Uri.parse('https://wa.me/?text=${Uri.encodeComponent('See all my verified listings: ${d.shopLink}')}'),
                              mode: LaunchMode.externalApplication,
                            ),
                          ),
                        ]),
                      ],
                    ),
                  ),
                const SizedBox(height: AppSpacing.lg),
                Text('Waiting for a partner (${d.waiting.length})', style: t.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                if (d.waiting.isEmpty)
                  const EmptyState(icon: Icons.person_search, message: 'No buyers waiting. When a buyer pays to unlock a property you get a buzzer.')
                else
                  for (final w in d.waiting)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.person_search, color: AppColors.success),
                        title: Text(w.primary ? 'A buyer unlocked your listing: ${w.title}' : 'A buyer near you wants a property'),
                        isThreeLine: true,
                        subtitle: Text([
                          if (w.kind.isNotEmpty) w.kind else w.summary,
                          if (w.where.isNotEmpty) w.where + (w.distanceKm != null ? ' · ${w.distanceKm} km away' : ''),
                          if (w.price != null) '₹${w.price}',
                          if (w.listedByLabel.isNotEmpty) w.listedByLabel,
                        ].join('\n')),
                        trailing: TextButton(
                          onPressed: () async {
                            try {
                              await _service.acceptBuyer(w.id);
                              await _reload();
                            } catch (e) {
                              if (context.mounted) ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(workError(e))));
                              await _reload();
                            }
                          },
                          child: const Text('Accept'),
                        ),
                      ),
                    ),
                const SizedBox(height: AppSpacing.lg),
                Text('Your buyers (${d.accepted.length})', style: t.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                if (d.accepted.isEmpty)
                  const EmptyState(icon: Icons.groups_outlined, message: 'No buyers accepted yet.')
                else
                  for (final b in d.accepted)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.person, color: AppColors.gold),
                        title: Text(b.buyerName),
                        isThreeLine: b.propertyTitle.isNotEmpty,
                        subtitle: Text([
                          if (b.buyerPhone != null) b.buyerPhone!,
                          if (b.propertyTitle.isNotEmpty) 'Wants: ${b.propertyTitle}',
                          if (b.propertyWhere.isNotEmpty) b.propertyWhere,
                          if (b.listedByLabel.isNotEmpty) b.listedByLabel,
                        ].join('\n')),
                        trailing: b.buyerPhone == null
                            ? null
                            : IconButton(icon: const Icon(Icons.call, color: AppColors.success), onPressed: () => launchUrl(Uri.parse('tel:${b.buyerPhone}'))),
                      ),
                    ),
              ],
            );
          },
        ),
      ),
    );
  }
}

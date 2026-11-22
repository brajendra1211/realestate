import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/payments/razorpay_checkout.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../services/agent_work_service.dart';

/// Brochure maker: one credit per brochure, 10 credits for Rs 100 (Razorpay).
class AgentBrochuresScreen extends StatefulWidget {
  const AgentBrochuresScreen({super.key});

  @override
  State<AgentBrochuresScreen> createState() => _AgentBrochuresScreenState();
}

class _AgentBrochuresScreenState extends State<AgentBrochuresScreen> {
  late final AgentWorkService _service = AgentWorkService(ApiClient.instance.dio);
  late Future<BrochuresData> _future = _service.brochures();
  final _property = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _property.dispose();
    super.dispose();
  }

  Future<void> _reload() async {
    setState(() => _future = _service.brochures());
    await _future;
  }

  Future<void> _create() async {
    if (_property.text.trim().isEmpty) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final b = await _service.createBrochure(_property.text.trim());
      _property.clear();
      await launchUrl(Uri.parse(b.url), mode: LaunchMode.externalApplication);
      await _reload();
    } catch (e) {
      setState(() => _error = workError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _recharge() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final o = await _service.brochureRechargeOrder();
      final paid = await openRazorpayCheckout(keyId: o.keyId, orderId: o.orderId, amountPaise: o.amountPaise, description: 'Brochure credits');
      if (paid != null) {
        await _service.brochureRechargeVerify(paid.orderId, paid.paymentId, paid.signature);
        await _reload();
      }
    } catch (e) {
      setState(() => _error = workError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Brochure maker')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<BrochuresData>(
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
                Container(
                  padding: const EdgeInsets.all(AppSpacing.md),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.divider)),
                  child: Row(
                    children: [
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text('${d.credits} credits', style: Theme.of(context).textTheme.displayLarge),
                            Text('₹${d.packPrice} for ${d.packCredits} brochures', style: t.bodySmall),
                          ],
                        ),
                      ),
                      AppButton(label: 'Recharge ₹${d.packPrice}', icon: Icons.bolt, loading: _busy, onPressed: _busy ? null : _recharge),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.md),
                if (_error != null)
                  Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600))),
                TextField(
                  controller: _property,
                  decoration: const InputDecoration(labelText: 'Property link or code', hintText: 'Paste a listing link'),
                ),
                const SizedBox(height: AppSpacing.sm),
                AppButton(label: 'Make brochure (1 credit)', icon: Icons.picture_as_pdf_outlined, expand: true, loading: _busy, onPressed: _busy ? null : _create),
                const SizedBox(height: AppSpacing.lg),
                Text('Your brochures', style: t.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                if (d.brochures.isEmpty)
                  const EmptyState(icon: Icons.description_outlined, message: 'No brochures yet.')
                else
                  for (final b in d.brochures)
                    Card(
                      child: ListTile(
                        leading: const Icon(Icons.description, color: AppColors.gold),
                        title: Text(b.title, maxLines: 1, overflow: TextOverflow.ellipsis),
                        subtitle: Text(b.createdAt.split('T').first),
                        trailing: Wrap(children: [
                          IconButton(icon: const Icon(Icons.open_in_new), onPressed: () => launchUrl(Uri.parse(b.url), mode: LaunchMode.externalApplication)),
                          IconButton(
                            icon: const Icon(Icons.copy),
                            onPressed: () {
                              Clipboard.setData(ClipboardData(text: b.url));
                              ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Link copied')));
                            },
                          ),
                        ]),
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

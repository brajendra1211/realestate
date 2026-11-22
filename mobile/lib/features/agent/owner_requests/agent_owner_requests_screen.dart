import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../services/agent_work_service.dart';

/// Owners this partner accepted. The partner visits, checks the details and photos,
/// asks the owner for the WhatsApp OTP and verifies, which publishes the listing
/// and credits the partner's share to the wallet.
class AgentOwnerRequestsScreen extends StatefulWidget {
  const AgentOwnerRequestsScreen({super.key});

  @override
  State<AgentOwnerRequestsScreen> createState() => _AgentOwnerRequestsScreenState();
}

class _AgentOwnerRequestsScreenState extends State<AgentOwnerRequestsScreen> {
  late final AgentWorkService _service = AgentWorkService(ApiClient.instance.dio);
  late Future<List<AcceptedOwnerRequest>> _future = _service.ownerRequests();

  Future<void> _reload() async {
    setState(() => _future = _service.ownerRequests());
    await _future;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Owner requests')),
      body: RefreshIndicator(
        onRefresh: _reload,
        child: FutureBuilder<List<AcceptedOwnerRequest>>(
          future: _future,
          builder: (context, snap) {
            if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
            if (snap.hasError) {
              return ListView(children: [Padding(padding: const EdgeInsets.all(AppSpacing.lg), child: Text(workError(snap.error!), textAlign: TextAlign.center))]);
            }
            final list = snap.data ?? [];
            if (list.isEmpty) {
              return ListView(children: const [
                SizedBox(height: 80),
                EmptyState(icon: Icons.home_work_outlined, message: 'No owner requests yet. When an owner near you lists a property, the buzzer rings here.'),
              ]);
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.md),
              itemCount: list.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.md),
              itemBuilder: (_, i) => _RequestCard(request: list[i], service: _service, onChanged: _reload),
            );
          },
        ),
      ),
    );
  }
}

class _RequestCard extends StatefulWidget {
  const _RequestCard({required this.request, required this.service, required this.onChanged});
  final AcceptedOwnerRequest request;
  final AgentWorkService service;
  final Future<void> Function() onChanged;

  @override
  State<_RequestCard> createState() => _RequestCardState();
}

class _RequestCardState extends State<_RequestCard> {
  final _code = TextEditingController();
  final _checks = [false, false, false];
  bool _otpSent = false;
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _code.dispose();
    super.dispose();
  }

  Future<void> _sendOtp() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.service.sendVerifyOtp(widget.request.id);
      setState(() => _otpSent = true);
    } catch (e) {
      setState(() => _error = workError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  Future<void> _verify() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await widget.service.verifyOwner(widget.request.id, _code.text.trim());
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Verified. The listing is live and your share is credited.')));
      await widget.onChanged();
    } catch (e) {
      if (mounted) setState(() => _error = workError(e));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  String _abs(String url) => url.startsWith('http') ? url : '${ApiClient.baseUrl}$url';

  @override
  Widget build(BuildContext context) {
    final r = widget.request;
    final d = r.details;
    final t = Theme.of(context).textTheme;
    final area = [r.locality, r.city].where((e) => e != null && e.isNotEmpty).join(', ');
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(AppRadius.md), border: Border.all(color: AppColors.divider)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(child: Text(r.ownerName, style: t.titleMedium)),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                decoration: BoxDecoration(
                  color: (r.verified ? AppColors.success : AppColors.warning).withValues(alpha: 0.12),
                  borderRadius: BorderRadius.circular(AppRadius.pill),
                ),
                child: Text(
                  r.verified ? 'Verified' : 'To verify',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w800, color: r.verified ? AppColors.success : AppColors.warning),
                ),
              ),
            ],
          ),
          Text('$area · ${r.planName} plan · you earn ₹${r.agentSplit} after verification', style: t.bodySmall),
          const SizedBox(height: AppSpacing.sm),
          Wrap(
            spacing: AppSpacing.sm,
            runSpacing: AppSpacing.sm,
            children: [
              AppButton(
                label: 'Call ${r.ownerPhone}',
                icon: Icons.call,
                onPressed: () => launchUrl(Uri.parse('tel:${r.ownerPhone}')),
              ),
              if (r.latitude != null && r.longitude != null)
                AppButton(
                  label: 'Open map',
                  icon: Icons.map_outlined,
                  variant: AppButtonVariant.secondary,
                  onPressed: () => launchUrl(
                    Uri.parse('https://www.google.com/maps/dir/?api=1&destination=${r.latitude},${r.longitude}'),
                    mode: LaunchMode.externalApplication,
                  ),
                ),
            ],
          ),
          if (d == null) ...[
            const SizedBox(height: AppSpacing.md),
            Text('Waiting for the owner to submit the property details.', style: t.bodySmall),
          ] else ...[
            const SizedBox(height: AppSpacing.md),
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(AppRadius.md)),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text('${d['title']}', style: t.titleMedium),
                  const SizedBox(height: 2),
                  Text(
                    '${(d['propertyType'] as String).replaceAll('_', ' ')} · ${d['bedrooms'] ?? '-'} BHK · ${d['areaSqft'] ?? '-'} sqft · rent ₹${d['price']}'
                    '${d['securityDeposit'] != null ? ' · deposit ₹${d['securityDeposit']}' : ''}',
                    style: t.bodySmall,
                  ),
                  const SizedBox(height: 4),
                  Text('Address: ${d['exactAddress']}', style: t.bodySmall),
                  const SizedBox(height: AppSpacing.sm),
                  SizedBox(
                    height: 70,
                    child: ListView(
                      scrollDirection: Axis.horizontal,
                      children: [
                        for (final img in (d['images'] as List).cast<String>())
                          Padding(
                            padding: const EdgeInsets.only(right: 8),
                            child: GestureDetector(
                              onTap: () => showDialog(context: context, builder: (_) => Dialog(child: InteractiveViewer(child: Image.network(_abs(img))))),
                              child: ClipRRect(
                                borderRadius: BorderRadius.circular(8),
                                child: Image.network(_abs(img), width: 96, height: 70, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox(width: 96, height: 70)),
                              ),
                            ),
                          ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            if (r.verified) ...[
              const SizedBox(height: AppSpacing.md),
              Text('Verified. The listing is live under your partner ID.', style: t.bodySmall?.copyWith(color: AppColors.success, fontWeight: FontWeight.w700)),
              if (r.listingSlug != null)
                TextButton(onPressed: () => context.push(RoutePaths.listingDetailPath(r.listingSlug!)), child: const Text('View listing')),
            ] else
              _verifyPanel(t),
          ],
        ],
      ),
    );
  }

  Widget _verifyPanel(TextTheme t) {
    const labels = [
      'Property exists at this address',
      'Details match what the owner entered',
      'Photos are real and match the property',
    ];
    final allChecked = _checks.every((c) => c);
    return Container(
      margin: const EdgeInsets.only(top: AppSpacing.md),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(border: Border.all(color: AppColors.gold.withValues(alpha: 0.4)), borderRadius: BorderRadius.circular(AppRadius.md)),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('Verify on site', style: t.titleMedium),
          const SizedBox(height: 4),
          Text('Check everything at the property, then ask the owner for the OTP sent to their WhatsApp.', style: t.bodySmall),
          for (var i = 0; i < labels.length; i++)
            CheckboxListTile(
              dense: true,
              contentPadding: EdgeInsets.zero,
              controlAffinity: ListTileControlAffinity.leading,
              value: _checks[i],
              onChanged: (v) => setState(() => _checks[i] = v ?? false),
              title: Text(labels[i], style: t.bodyMedium),
            ),
          if (_error != null) Padding(padding: const EdgeInsets.only(bottom: 8), child: Text(_error!, style: const TextStyle(color: AppColors.danger, fontWeight: FontWeight.w600))),
          if (!_otpSent)
            AppButton(label: 'Send OTP to owner', icon: Icons.sms_outlined, loading: _busy, expand: true, onPressed: allChecked && !_busy ? _sendOtp : null)
          else ...[
            TextField(
              controller: _code,
              keyboardType: TextInputType.number,
              maxLength: 6,
              decoration: const InputDecoration(labelText: 'OTP from the owner', counterText: ''),
            ),
            const SizedBox(height: AppSpacing.sm),
            AppButton(label: 'Verify and publish', icon: Icons.verified_outlined, loading: _busy, expand: true, onPressed: _busy ? null : _verify),
            TextButton(onPressed: _busy ? null : _sendOtp, child: const Text('Resend OTP')),
          ],
        ],
      ),
    );
  }
}

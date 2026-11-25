import 'dart:async';

import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../services/agent_work_service.dart';

/// The in-app buzzer: while the partner app is open it checks every 5 seconds for
/// owner listing requests and buyer leads, rings, and shows cards with the property
/// photo, rent, distance and a map link, so the partner can decide before accepting.
/// The first partner to accept gets the contact; the card vanishes for the rest.
class AgentBuzzerOverlay extends StatefulWidget {
  const AgentBuzzerOverlay({super.key, required this.child});
  final Widget child;

  @override
  State<AgentBuzzerOverlay> createState() => _AgentBuzzerOverlayState();
}

class _AgentBuzzerOverlayState extends State<AgentBuzzerOverlay> {
  late final AgentWorkService _service = AgentWorkService(ApiClient.instance.dio);
  final _player = AudioPlayer();
  Timer? _timer;
  List<OwnerBuzz> _owners = [];
  List<BuyerBuzz> _buyers = [];
  Set<String>? _seen;
  // Pop-ups are real-time: ones already waiting when the app opened, ones the partner closed and ones older than
  // 45 s stay out of the way (everything is still listed in Owner requests / Buyer leads).
  final Set<String> _hidden = {};
  final Map<String, DateTime> _shownAt = {};
  String? _busyId;
  String? _message;

  @override
  void initState() {
    super.initState();
    _poll();
    _timer = Timer.periodic(const Duration(seconds: 5), (_) => _poll());
  }

  @override
  void dispose() {
    _timer?.cancel();
    _player.dispose();
    super.dispose();
  }

  Future<void> _poll() async {
    try {
      final r = await _service.poll();
      if (!mounted) return;
      final keys = {...r.owners.map((o) => o.key), ...r.buyers.map((b) => b.key)};
      if (_seen == null) {
        _seen = keys; // first load: do not ring for what was already waiting
        _hidden.addAll(keys);
      } else if (keys.difference(_seen!).isNotEmpty) {
        _ring();
        _seen = {..._seen!, ...keys};
      }
      for (final k in keys) {
        _shownAt.putIfAbsent(k, DateTime.now);
      }
      setState(() {
        _owners = r.owners;
        _buyers = r.buyers;
      });
    } catch (_) {
      // offline or signed out: try again on the next tick
    }
  }

  Future<void> _ring() async {
    try {
      await _player.stop();
      await _player.play(AssetSource('sounds/ring_alert.wav'));
    } catch (_) {}
  }

  Future<void> _acceptOwner(OwnerBuzz o) async {
    setState(() {
      _busyId = o.id;
      _message = null;
    });
    try {
      await _service.acceptOwner(o.id);
      if (!mounted) return;
      setState(() { _owners = _owners.where((x) => x.id != o.id).toList(); });
      context.go(RoutePaths.agentOwnerRequests);
    } catch (e) {
      if (mounted) {
        setState(() {
          _message = workError(e);
          _owners = _owners.where((x) => x.id != o.id).toList();
        });
      }
    } finally {
      if (mounted) setState(() { _busyId = null; });
    }
  }

  Future<void> _acceptBuyer(BuyerBuzz b) async {
    setState(() {
      _busyId = b.id;
      _message = null;
    });
    try {
      await _service.acceptBuyer(b.id);
      if (!mounted) return;
      setState(() { _buyers = _buyers.where((x) => x.id != b.id).toList(); });
      context.go(RoutePaths.agentBuyerLeads);
    } catch (e) {
      if (mounted) {
        setState(() {
          _message = workError(e);
          _buyers = _buyers.where((x) => x.id != b.id).toList();
        });
      }
    } finally {
      if (mounted) setState(() { _busyId = null; });
    }
  }

  bool _visible(String key) {
    if (_hidden.contains(key)) return false;
    final at = _shownAt[key];
    return at == null || DateTime.now().difference(at) < const Duration(seconds: 45);
  }

  Widget _closeButton(String key) => InkWell(
        onTap: () => setState(() { _hidden.add(key); }),
        borderRadius: BorderRadius.circular(20),
        child: const Padding(
          padding: EdgeInsets.all(4),
          child: Icon(Icons.close, size: 20, color: AppColors.textMuted),
        ),
      );

  @override
  Widget build(BuildContext context) {
    final owners = _owners.where((o) => _visible(o.key)).toList();
    final buyers = _buyers.where((b) => _visible(b.key)).toList();
    final hasCards = owners.isNotEmpty || buyers.isNotEmpty || _message != null;
    return Stack(
      children: [
        widget.child,
        if (hasCards)
          Positioned(
            left: 12,
            right: 12,
            top: MediaQuery.of(context).padding.top + 8,
            child: ConstrainedBox(
              constraints: BoxConstraints(maxHeight: MediaQuery.of(context).size.height * 0.8),
              child: Material(
                type: MaterialType.transparency,
                child: ListView(
                  shrinkWrap: true,
                  children: [
                    if (_message != null)
                      Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(color: AppColors.primaryNavy, borderRadius: BorderRadius.circular(AppRadius.md)),
                        child: Row(
                          children: [
                            Expanded(child: Text(_message!, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w600))),
                            InkWell(onTap: () => setState(() { _message = null; }), child: const Icon(Icons.close, color: Colors.white, size: 18)),
                          ],
                        ),
                      ),
                    for (final b in buyers) _buyerCard(b),
                    for (final o in owners) _ownerCard(o),
                  ],
                ),
              ),
            ),
          ),
      ],
    );
  }

  BoxDecoration _cardDecoration(Color border) => BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: border, width: 2),
        boxShadow: const [BoxShadow(color: Color(0x33000000), blurRadius: 16, offset: Offset(0, 6))],
      );

  Widget _ownerCard(OwnerBuzz o) {
    final t = Theme.of(context).textTheme;
    final p = o.property;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: _cardDecoration(AppColors.accentGold),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(radius: 18, backgroundColor: AppColors.accentGold, child: Icon(Icons.notifications_active, size: 18, color: AppColors.primaryNavy)),
              const SizedBox(width: 10),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text('New owner wants to list a property', style: t.titleMedium),
                    Text(
                      '${[o.locality, o.city].where((e) => e != null && e.isNotEmpty).join(', ')} · ${o.planName} plan · paid',
                      style: t.bodySmall,
                    ),
                  ],
                ),
              ),
              _closeButton(o.key),
            ],
          ),
          if (p != null) ...[
            const SizedBox(height: AppSpacing.sm),
            Container(
              padding: const EdgeInsets.all(8),
              decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(AppRadius.sm)),
              child: Row(
                children: [
                  if (p['photo'] != null)
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: Image.network(_abs(p['photo'] as String), width: 76, height: 60, fit: BoxFit.cover, errorBuilder: (_, _, _) => const SizedBox(width: 76, height: 60)),
                    ),
                  if (p['photo'] != null) const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text('${p['title']}', maxLines: 1, overflow: TextOverflow.ellipsis, style: t.bodyMedium?.copyWith(fontWeight: FontWeight.w800)),
                        Text(
                          '${(p['type'] as String).replaceAll('_', ' ')}'
                          '${p['bedrooms'] != null ? ' · ${p['bedrooms']} BHK' : ''}'
                          '${p['areaSqft'] != null ? ' · ${p['areaSqft']} sqft' : ''}',
                          style: t.bodySmall,
                        ),
                        Text('Rent ₹${p['rent']} · ${p['photos']} photos', style: t.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
          const SizedBox(height: AppSpacing.sm),
          Row(
            children: [
              if (o.distanceKm != null) ...[
                const Icon(Icons.place, size: 15, color: AppColors.danger),
                const SizedBox(width: 3),
                Text('${o.distanceKm} km from you', style: t.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
                const SizedBox(width: 12),
              ],
              if (o.mapUrl != null)
                InkWell(
                  onTap: () => launchUrl(Uri.parse(o.mapUrl!), mode: LaunchMode.externalApplication),
                  child: Text('View on map', style: t.bodySmall?.copyWith(color: AppColors.gold, fontWeight: FontWeight.w800, decoration: TextDecoration.underline)),
                ),
            ],
          ),
          const SizedBox(height: 4),
          Text('Accept, visit the property, check details and photos, then verify with the owner\'s OTP.', style: t.bodySmall?.copyWith(fontSize: 11)),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busyId == o.id ? null : () => _acceptOwner(o),
              child: Text(_busyId == o.id ? 'Accepting…' : 'Accept & get the owner\'s number'),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buyerCard(BuyerBuzz b) {
    final t = Theme.of(context).textTheme;
    return Container(
      margin: const EdgeInsets.only(bottom: 8),
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: _cardDecoration(AppColors.success),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              const CircleAvatar(radius: 18, backgroundColor: AppColors.success, child: Icon(Icons.person_search, size: 18, color: Colors.white)),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  b.primary ? 'A buyer paid to see your listing' : 'A buyer near you wants a property',
                  style: t.titleMedium,
                ),
              ),
              _closeButton(b.key),
            ],
          ),
          const SizedBox(height: 4),
          Text(b.primary ? b.title : b.summary, style: t.bodySmall),
          const SizedBox(height: AppSpacing.sm),
          SizedBox(
            width: double.infinity,
            child: ElevatedButton(
              onPressed: _busyId == b.id ? null : () => _acceptBuyer(b),
              child: Text(_busyId == b.id ? 'Accepting…' : 'Accept & get the buyer\'s number'),
            ),
          ),
        ],
      ),
    );
  }

  String _abs(String url) => url.startsWith('http') ? url : '${ApiClient.baseUrl}$url';
}

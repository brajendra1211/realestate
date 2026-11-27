import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../services/cart_watch_service.dart';
import '../../../core/widgets/back_app_bar.dart';

/// Property cart (share / send to agent) and the saved-requirement watch-list.
class BuyerCartScreen extends StatefulWidget {
  const BuyerCartScreen({super.key});

  @override
  State<BuyerCartScreen> createState() => _BuyerCartScreenState();
}

class _BuyerCartScreenState extends State<BuyerCartScreen> {
  late final CartWatchService _service;
  List<Map<String, dynamic>> _cart = [];
  List<Map<String, dynamic>> _reqs = [];
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _service = CartWatchService(ApiClient.instance.dio);
    _load();
  }

  void _toast(String m) =>
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(m)));

  String _err(Object e) => e is ApiException ? errorMessageFor(e) : 'Something went wrong.';

  Future<void> _load() async {
    try {
      final cart = await _service.getCart();
      final reqs = await _service.getMyRequirements();
      if (!mounted) return;
      setState(() {
        _cart = cart;
        _reqs = reqs;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _toast(_err(e));
    }
  }

  Future<void> _remove(String id) async {
    try {
      await _service.removeFromCart(id);
      await _load();
    } catch (e) {
      _toast(_err(e));
    }
  }

  Future<void> _share() async {
    try {
      final r = await _service.shareCart();
      final url = r['url'] as String;
      await Clipboard.setData(ClipboardData(text: url));
      final wa = Uri.parse('https://wa.me/?text=${Uri.encodeComponent('My property shortlist: $url')}');
      await launchUrl(wa, mode: LaunchMode.externalApplication);
      _toast('Cart link copied');
    } catch (e) {
      _toast(_err(e));
    }
  }

  Future<void> _sendToAgent() async {
    final ctrl = TextEditingController();
    final code = await showDialog<String>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Send to agent'),
        content: TextField(
          controller: ctrl,
          textCapitalization: TextCapitalization.characters,
          decoration: const InputDecoration(labelText: 'Agent code'),
        ),
        actions: [
          TextButton(onPressed: () => Navigator.pop(ctx), child: const Text('Cancel')),
          FilledButton(onPressed: () => Navigator.pop(ctx, ctrl.text.trim()), child: const Text('Send')),
        ],
      ),
    );
    if (code == null || code.isEmpty) return;
    try {
      await _service.shareCart(agentCode: code);
      _toast('Cart sent to the agent');
    } catch (e) {
      _toast(_err(e));
    }
  }

  Future<void> _cancelReq(String id) async {
    try {
      await _service.cancelRequirement(id);
      await _load();
    } catch (e) {
      _toast(_err(e));
    }
  }

  @override
  Widget build(BuildContext context) {
    return DefaultTabController(
      length: 2,
      child: Scaffold(
        appBar: BackAppBar(
          title: const Text('Property Cart'),
          bottom: const TabBar(tabs: [Tab(text: 'Cart'), Tab(text: 'My requirements')]),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
            : TabBarView(children: [_cartTab(), _reqTab()]),
      ),
    );
  }

  Widget _cartTab() {
    if (_cart.isEmpty) {
      return const EmptyState(message: 'Your cart is empty. Add properties from a listing.', icon: Icons.shopping_cart_outlined);
    }
    return Column(
      children: [
        Expanded(
          child: ListView.separated(
            padding: const EdgeInsets.all(AppSpacing.lg),
            itemCount: _cart.length,
            separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
            itemBuilder: (_, i) {
              final it = _cart[i];
              return Card(
                child: ListTile(
                  title: Text('${it['title']}', style: const TextStyle(fontWeight: FontWeight.w600)),
                  subtitle: Text('${it['city'] ?? ''} · ₹${it['price']}'),
                  trailing: IconButton(
                    icon: const Icon(Icons.delete_outline),
                    onPressed: () => _remove(it['id'] as String),
                  ),
                ),
              );
            },
          ),
        ),
        SafeArea(
          child: Padding(
            padding: const EdgeInsets.all(AppSpacing.lg),
            child: Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: _share,
                    icon: const Icon(Icons.share_outlined),
                    label: const Text('Share Cart'),
                  ),
                ),
                const SizedBox(width: AppSpacing.md),
                Expanded(
                  child: FilledButton.icon(
                    onPressed: _sendToAgent,
                    icon: const Icon(Icons.send_outlined),
                    label: const Text('Send to Agent'),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  Widget _reqTab() {
    if (_reqs.isEmpty) {
      return const EmptyState(
        message: 'No saved requirements. If nothing matches nearby, your requirement is saved here and we alert you when a property is listed.',
        icon: Icons.radar_outlined,
      );
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: _reqs.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, i) {
        final r = _reqs[i];
        final status = '${r['status']}';
        return Card(
          child: ListTile(
            title: Text(
              '${r['purpose']} · ${r['bhk'] != null ? '${r['bhk']} BHK' : 'Any size'}',
              style: const TextStyle(fontWeight: FontWeight.w600),
            ),
            subtitle: Text(
              '${r['societyName'] ?? 'Any society'} · within ${r['radiusKm']} km${r['budgetMax'] != null ? ' · up to ₹${r['budgetMax']}' : ''}\n$status',
            ),
            isThreeLine: true,
            trailing: status == 'ACTIVE'
                ? IconButton(icon: const Icon(Icons.close), onPressed: () => _cancelReq(r['id'] as String))
                : const Icon(Icons.check_circle, color: Colors.green),
          ),
        );
      },
    );
  }
}

import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../services/cart_watch_service.dart';
import '../../../core/widgets/back_app_bar.dart';

/// Open customer requirements ("I have a property") and carts customers sent to this agent.
class AgentRequirementsScreen extends StatefulWidget {
  const AgentRequirementsScreen({super.key});

  @override
  State<AgentRequirementsScreen> createState() => _AgentRequirementsScreenState();
}

class _AgentRequirementsScreenState extends State<AgentRequirementsScreen> {
  late final CartWatchService _service;
  List<Map<String, dynamic>> _reqs = [];
  List<Map<String, dynamic>> _carts = [];
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
      final reqs = await _service.getOpenRequirements();
      final carts = await _service.getReceivedCarts();
      if (!mounted) return;
      setState(() {
        _reqs = reqs;
        _carts = carts;
        _loading = false;
      });
    } catch (e) {
      if (!mounted) return;
      setState(() => _loading = false);
      _toast(_err(e));
    }
  }

  Future<void> _have(String id) async {
    try {
      await _service.haveProperty(id);
      _toast('Customer notified with your details');
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
          title: const Text('Requirements'),
          bottom: const TabBar(tabs: [Tab(text: 'Open requirements'), Tab(text: 'Carts received')]),
        ),
        body: _loading
            ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
            : TabBarView(children: [_reqTab(), _cartTab()]),
      ),
    );
  }

  Widget _reqTab() {
    if (_reqs.isEmpty) {
      return const EmptyState(message: 'No open customer requirements right now.', icon: Icons.radar_outlined);
    }
    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.all(AppSpacing.lg),
        itemCount: _reqs.length,
        separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
        itemBuilder: (_, i) {
          final r = _reqs[i];
          return Card(
            child: ListTile(
              title: Text(
                '${r['purpose']} · ${r['bhk'] != null ? '${r['bhk']} BHK' : 'Any size'}',
                style: const TextStyle(fontWeight: FontWeight.w600),
              ),
              subtitle: Text(
                '${r['societyName'] ?? 'Any society'} · within ${r['radiusKm']} km${r['budgetMax'] != null ? ' · up to ₹${r['budgetMax']}' : ''}',
              ),
              trailing: FilledButton(
                onPressed: () => _have(r['id'] as String),
                child: const Text('I have a property'),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _cartTab() {
    if (_carts.isEmpty) {
      return const EmptyState(message: 'No customer has sent you a cart yet.', icon: Icons.shopping_cart_outlined);
    }
    return ListView.separated(
      padding: const EdgeInsets.all(AppSpacing.lg),
      itemCount: _carts.length,
      separatorBuilder: (_, __) => const SizedBox(height: AppSpacing.sm),
      itemBuilder: (_, i) {
        final c = _carts[i];
        final items = (c['items'] as List).cast<Map<String, dynamic>>();
        return Card(
          child: ExpansionTile(
            title: Text('${items.length} properties'),
            subtitle: Text('${c['createdAt']}'.split('T').first),
            children: [
              for (final it in items) ListTile(title: Text('${it['title']}'), subtitle: Text('${it['city'] ?? ''} · ₹${it['price']}')),
            ],
          ),
        );
      },
    );
  }
}

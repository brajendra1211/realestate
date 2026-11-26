import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../services/cart_watch_service.dart';
import '../../../core/widgets/back_app_bar.dart';

String _fmt(dynamic iso) {
  final d = DateTime.tryParse('$iso')?.toLocal();
  if (d == null) return '—';
  final h = d.hour % 12 == 0 ? 12 : d.hour % 12;
  final m = d.minute.toString().padLeft(2, '0');
  return '${d.day}/${d.month}/${d.year}  $h:$m ${d.hour >= 12 ? 'PM' : 'AM'}';
}

/// Last office visit + history, as marked by the reception desk.
class AgentOfficeVisitsScreen extends StatefulWidget {
  const AgentOfficeVisitsScreen({super.key});

  @override
  State<AgentOfficeVisitsScreen> createState() => _AgentOfficeVisitsScreenState();
}

class _AgentOfficeVisitsScreenState extends State<AgentOfficeVisitsScreen> {
  late final CartWatchService _service;
  late Future<Map<String, dynamic>> _future;

  @override
  void initState() {
    super.initState();
    _service = CartWatchService(ApiClient.instance.dio);
    _future = _service.getOfficeVisits();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: BackAppBar(title: const Text('Office Visits')),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _future,
        builder: (context, snap) {
          if (snap.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator(color: AppColors.gold));
          }
          if (snap.hasError) {
            final msg = snap.error is ApiException ? errorMessageFor(snap.error as ApiException) : 'Something went wrong.';
            return ErrorView(message: msg, onRetry: () => setState(() => _future = _service.getOfficeVisits()));
          }
          final d = snap.data!;
          final history = (d['history'] as List).cast<Map<String, dynamic>>();
          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Container(
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  gradient: AppColors.heroGradient,
                  boxShadow: AppColors.heroGlow,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Last office visit', style: TextStyle(color: Color(0xFFC6CEDB), fontSize: 13)),
                    const SizedBox(height: 4),
                    Text(
                      d['lastVisitAt'] == null ? 'No visit yet' : _fmt(d['lastVisitAt']),
                      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.w700, color: Colors.white),
                    ),
                    const SizedBox(height: 4),
                    Text('${d['totalVisits']} total visits', style: const TextStyle(color: Color(0xFFC6CEDB), fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.lg),
              if (history.isEmpty)
                const EmptyState(message: 'No office visits recorded yet.', icon: Icons.business_outlined)
              else
                ...history.map((v) {
                  final visitors = (v['visitors'] as List).cast<Map<String, dynamic>>();
                  return Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: Card(
                      child: ListTile(
                        leading: Icon(
                          v['visited'] == true ? Icons.check_circle : Icons.cancel_outlined,
                          color: v['visited'] == true ? Colors.green : Colors.grey,
                        ),
                        title: Text(_fmt(v['visitedAt'])),
                        subtitle: Text([
                          if (v['notes'] != null) '${v['notes']}',
                          if (visitors.isNotEmpty) 'With: ${visitors.map((p) => '${p['name']} (${p['relation']})').join(', ')}',
                        ].join('\n')),
                      ),
                    ),
                  );
                }),
            ],
          );
        },
      ),
    );
  }
}

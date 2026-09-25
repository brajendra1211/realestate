import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/enum_labels.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/leaderboard_entry.dart';
import '../../../services/leaderboard_service.dart';

const _rankColors = {
  1: Color(0xFFE3CAA0),
  2: Color(0xFFD3D6DC),
  3: Color(0xFFCBA277),
};

class _RankBadge extends StatelessWidget {
  const _RankBadge({required this.rank});

  final int rank;

  @override
  Widget build(BuildContext context) {
    final medal = _rankColors[rank];
    return Container(
      width: 40,
      height: 40,
      alignment: Alignment.center,
      decoration: BoxDecoration(
        color: medal ?? AppColors.surfaceAlt,
        shape: BoxShape.circle,
        border: medal == null ? Border.all(color: AppColors.divider) : null,
      ),
      child: medal != null
          ? const Icon(Icons.emoji_events, color: AppColors.primaryNavy, size: 20)
          : Text(
              '$rank',
              style: const TextStyle(
                color: AppColors.textSecondary,
                fontWeight: FontWeight.w700,
                fontSize: 14,
              ),
            ),
    );
  }
}

class LeaderboardScreen extends StatefulWidget {
  const LeaderboardScreen({super.key});

  @override
  State<LeaderboardScreen> createState() => _LeaderboardScreenState();
}

class _LeaderboardScreenState extends State<LeaderboardScreen> {
  late final LeaderboardService _service;
  late Future<LeaderboardData> _future;

  @override
  void initState() {
    super.initState();
    _service = LeaderboardService(ApiClient.instance.dio);
    _future = _service.getLeaderboard();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Leaderboard')),
      body: FutureBuilder<LeaderboardData>(
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
              onRetry: () => setState(() {
                _future = _service.getLeaderboard();
              }),
            );
          }

          final data = snapshot.data!;
          if (data.agentsOfWeek.isEmpty &&
              data.ticker.isEmpty &&
              data.areaDominance.isEmpty) {
            return const EmptyState(
              message: 'No leaderboard activity yet.',
              icon: Icons.leaderboard_outlined,
            );
          }

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              if (data.agentsOfWeek.isNotEmpty) ...[
                Text('Channel Partners of the Week', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: AppSpacing.sm),
                for (var i = 0; i < data.agentsOfWeek.length; i++)
                  Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: Card(
                      child: ListTile(
                        leading: _RankBadge(rank: i + 1),
                        title: Text(
                          data.agentsOfWeek[i].agentName,
                          style: Theme.of(context).textTheme.titleMedium,
                        ),
                        subtitle: Text(
                          '${EnumLabels.badge(data.agentsOfWeek[i].badge)}'
                          '${data.agentsOfWeek[i].city != null ? " · ${data.agentsOfWeek[i].city}" : ""}',
                        ),
                        trailing: Text(
                          data.agentsOfWeek[i].agentCode,
                          style: Theme.of(context).textTheme.bodySmall,
                        ),
                      ),
                    ),
                  ),
                const SizedBox(height: AppSpacing.lg),
              ],
              if (data.areaDominance.isNotEmpty) ...[
                Text('Area Dominance', style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: AppSpacing.sm),
                ...data.areaDominance.map((area) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Card(
                        child: ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.surfaceAlt,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: const Icon(Icons.flag_rounded, color: AppColors.gold),
                          ),
                          title: Text('${area.agentName} — King of ${area.area}'),
                          subtitle: Text('${area.listingCount} active listings'),
                        ),
                      ),
                    )),
                const SizedBox(height: AppSpacing.lg),
              ],
              if (data.ticker.isNotEmpty) ...[
                Text("Today's activity", style: Theme.of(context).textTheme.headlineMedium),
                const SizedBox(height: AppSpacing.sm),
                Container(
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Column(
                    children: [
                      for (var i = 0; i < data.ticker.length; i++) ...[
                        if (i > 0) const Divider(height: 1, color: AppColors.divider),
                        ListTile(
                          dense: true,
                          leading: const Icon(Icons.bolt_rounded, color: AppColors.gold),
                          title: Text('${data.ticker[i].agentCode} ${data.ticker[i].label}'),
                        ),
                      ],
                    ],
                  ),
                ),
              ],
            ],
          );
        },
      ),
    );
  }
}

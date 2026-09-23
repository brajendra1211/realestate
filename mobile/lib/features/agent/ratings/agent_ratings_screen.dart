import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/agent_rating.dart';
import '../../../services/agent_ratings_service.dart';

class AgentRatingsScreen extends StatefulWidget {
  const AgentRatingsScreen({super.key});

  @override
  State<AgentRatingsScreen> createState() => _AgentRatingsScreenState();
}

class _AgentRatingsScreenState extends State<AgentRatingsScreen> {
  late final AgentRatingsService _service;
  late Future<AgentRatingsData> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentRatingsService(ApiClient.instance.dio);
    _future = _service.getRatings();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Ratings & Reviews')),
      body: FutureBuilder<AgentRatingsData>(
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
              onRetry: () => setState(() => _future = _service.getRatings()),
            );
          }
          final data = snapshot.data!;
          if (data.ratings.isEmpty) {
            return const EmptyState(
              message: 'No ratings yet.',
              icon: Icons.reviews_outlined,
            );
          }
          final average = data.ratings.isEmpty
              ? 0.0
              : data.ratings.map((r) => r.stars).reduce((a, b) => a + b) / data.ratings.length;

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              Container(
                width: double.infinity,
                padding: const EdgeInsets.all(AppSpacing.lg),
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy,
                  borderRadius: BorderRadius.circular(AppRadius.lg),
                ),
                child: Row(
                  children: [
                    Text(
                      average.toStringAsFixed(1),
                      style: const TextStyle(
                        fontSize: 34,
                        fontWeight: FontWeight.w700,
                        color: Colors.white,
                      ),
                    ),
                    const SizedBox(width: AppSpacing.md),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          children: List.generate(
                            5,
                            (i) => Icon(
                              i < average.round() ? Icons.star_rounded : Icons.star_outline_rounded,
                              color: AppColors.goldLight,
                              size: 18,
                            ),
                          ),
                        ),
                        Text(
                          '${data.count} ${data.count == 1 ? 'rating' : 'ratings'}',
                          style: const TextStyle(color: Color(0xFFC6CEDB), fontSize: 13),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              ...data.ratings.map((r) => Padding(
                    padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                    child: Card(
                      child: ListTile(
                        leading: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: List.generate(
                            5,
                            (i) => Icon(
                              i < r.stars ? Icons.star_rounded : Icons.star_outline_rounded,
                              color: AppColors.gold,
                              size: 16,
                            ),
                          ),
                        ),
                        title: Text(r.review ?? 'No written review'),
                        subtitle: Text('${r.createdAt.toLocal()}'.split(' ').first),
                      ),
                    ),
                  )),
            ],
          );
        },
      ),
    );
  }
}

import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/status_badge.dart';
import '../../../models/appointment.dart';
import '../../../services/agent_appointments_service.dart';

class AgentAppointmentsScreen extends StatefulWidget {
  const AgentAppointmentsScreen({super.key});

  @override
  State<AgentAppointmentsScreen> createState() => _AgentAppointmentsScreenState();
}

class _AgentAppointmentsScreenState extends State<AgentAppointmentsScreen> {
  late final AgentAppointmentsService _service;
  late Future<List<Appointment>> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentAppointmentsService(ApiClient.instance.dio);
    _future = _service.getAppointments();
  }

  BadgeKind _statusKind(String status) => switch (status) {
        'COMPLETED' => BadgeKind.success,
        'NO_SHOW' || 'CANCELLED' => BadgeKind.danger,
        _ => BadgeKind.warning,
      };

  Future<void> _act(String id, String action) async {
    try {
      await _service.markAction(id, action);
      if (!mounted) return;
      setState(() => _future = _service.getAppointments());
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Appointments')),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getAppointments()),
        child: FutureBuilder<List<Appointment>>(
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
                onRetry: () => setState(() => _future = _service.getAppointments()),
              );
            }
            final appointments = snapshot.data ?? [];
            if (appointments.isEmpty) {
              return const EmptyState(
                message: 'No appointments scheduled yet.',
                icon: Icons.event_available_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: appointments.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final appt = appointments[index];
                return Card(
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: AppColors.primaryNavy,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                      ),
                      child: const Icon(Icons.event_outlined,
                          color: AppColors.goldLight, size: 20),
                    ),
                    title: Text(appt.buyerName ?? appt.bookingCode),
                    subtitle: Text(
                      '${appt.scheduledAt.toLocal()}'.split('.').first,
                    ),
                    trailing: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        StatusBadge(label: appt.status, kind: _statusKind(appt.status)),
                        if (appt.status == 'SCHEDULED')
                          PopupMenuButton<String>(
                            onSelected: (action) => _act(appt.id, action),
                            itemBuilder: (context) => const [
                              PopupMenuItem(value: 'complete', child: Text('Mark complete')),
                              PopupMenuItem(value: 'cancel', child: Text('Cancel')),
                            ],
                          ),
                      ],
                    ),
                  ),
                );
              },
            );
          },
        ),
      ),
    );
  }
}

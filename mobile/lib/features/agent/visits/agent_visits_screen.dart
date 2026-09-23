import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/visit_log.dart';
import '../../../services/agent_visits_service.dart';

class AgentVisitsScreen extends StatefulWidget {
  const AgentVisitsScreen({super.key});

  @override
  State<AgentVisitsScreen> createState() => _AgentVisitsScreenState();
}

class _AgentVisitsScreenState extends State<AgentVisitsScreen> {
  late final AgentVisitsService _service;
  late Future<List<VisitLog>> _future;

  @override
  void initState() {
    super.initState();
    _service = AgentVisitsService(ApiClient.instance.dio);
    _future = _service.getVisits();
  }

  Future<void> _openLogVisitFlow() async {
    final phoneController = TextEditingController();
    final phone = await showDialog<String>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Log a property visit'),
        content: TextField(
          controller: phoneController,
          keyboardType: TextInputType.phone,
          decoration: const InputDecoration(labelText: "Customer's phone number"),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(phoneController.text.trim()),
            child: const Text('Send OTP'),
          ),
        ],
      ),
    );
    if (phone == null || Validators.phone(phone) != null || !mounted) return;

    try {
      await _service.requestOtp(phone);
      if (!mounted) return;
      await _showOtpAndMasterIdDialog(phone);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  Future<void> _showOtpAndMasterIdDialog(String phone) async {
    final otpController = TextEditingController();
    final masterIdController = TextEditingController();
    final nameController = TextEditingController();

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Verify & log visit'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: nameController,
              decoration: const InputDecoration(labelText: 'Customer name (optional)'),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: masterIdController,
              decoration: const InputDecoration(labelText: 'Property ID (masterId)'),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: otpController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'OTP sent to customer'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Submit'),
          ),
        ],
      ),
    );

    if (confirmed != true || !mounted) return;

    try {
      await _service.logVisit(
        customerPhone: phone,
        customerName: nameController.text.trim().isEmpty ? null : nameController.text.trim(),
        masterId: masterIdController.text.trim(),
        otp: otpController.text.trim(),
      );
      if (!mounted) return;
      setState(() => _future = _service.getVisits());
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Visit logged')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Visit Log')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: _openLogVisitFlow,
        child: const Icon(Icons.add),
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getVisits()),
        child: FutureBuilder<List<VisitLog>>(
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
                onRetry: () => setState(() => _future = _service.getVisits()),
              );
            }
            final visits = snapshot.data ?? [];
            if (visits.isEmpty) {
              return const EmptyState(
                message: 'No visits logged yet. Tap + after each site visit to '
                    'protect your lead with an OTP-verified record.',
                icon: Icons.qr_code_scanner_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: visits.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final visit = visits[index];
                return Card(
                  child: ListTile(
                    leading: Container(
                      width: 40,
                      height: 40,
                      alignment: Alignment.center,
                      decoration: BoxDecoration(
                        color: (visit.otpVerified ? AppColors.success : AppColors.warning)
                            .withValues(alpha: 0.12),
                        shape: BoxShape.circle,
                      ),
                      child: Icon(
                        visit.otpVerified ? Icons.verified_outlined : Icons.warning_amber_outlined,
                        color: visit.otpVerified ? AppColors.success : AppColors.warning,
                        size: 20,
                      ),
                    ),
                    title: Text(visit.customerName ?? visit.customerPhone),
                    subtitle: Text(
                      '${visit.masterId ?? "Unknown property"} · '
                      '${visit.visitedAt.toLocal()}'.split('.').first,
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

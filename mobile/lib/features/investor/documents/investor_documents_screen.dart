import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/investor_document.dart';
import '../../../services/investor_service.dart';

class InvestorDocumentsScreen extends StatefulWidget {
  const InvestorDocumentsScreen({super.key});

  @override
  State<InvestorDocumentsScreen> createState() => _InvestorDocumentsScreenState();
}

class _InvestorDocumentsScreenState extends State<InvestorDocumentsScreen> {
  late final InvestorService _service;
  late Future<InvestorDocuments> _future;

  @override
  void initState() {
    super.initState();
    _service = InvestorService(ApiClient.instance.dio);
    _future = _service.getDocuments();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Document Vault')),
      body: FutureBuilder<InvestorDocuments>(
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
              onRetry: () => setState(() => _future = _service.getDocuments()),
            );
          }

          final data = snapshot.data!;
          if (data.documents.isEmpty && data.agreements.isEmpty) {
            return const EmptyState(
              message: 'No documents on file yet.',
              icon: Icons.folder_outlined,
            );
          }

          return ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              if (data.documents.isNotEmpty) ...[
                Text('Documents', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                ...data.documents.map((doc) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Card(
                        child: ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.danger.withValues(alpha: 0.10),
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: const Icon(Icons.picture_as_pdf_outlined,
                                color: AppColors.danger, size: 20),
                          ),
                          title: Text(doc.title,
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(doc.type),
                        ),
                      ),
                    )),
              ],
              if (data.agreements.isNotEmpty) ...[
                const SizedBox(height: AppSpacing.lg),
                Text('Agreements', style: Theme.of(context).textTheme.titleMedium),
                const SizedBox(height: AppSpacing.sm),
                ...data.agreements.map((a) => Padding(
                      padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                      child: Card(
                        child: ListTile(
                          leading: Container(
                            width: 40,
                            height: 40,
                            alignment: Alignment.center,
                            decoration: BoxDecoration(
                              color: AppColors.primaryNavy,
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                            ),
                            child: const Icon(Icons.description_outlined,
                                color: AppColors.goldLight, size: 20),
                          ),
                          title: Text(a.customerName,
                              style: const TextStyle(fontWeight: FontWeight.w600)),
                          subtitle: Text(
                            [
                              '${a.agreementDate.toLocal()}'.split(' ').first,
                              if (a.flatUnitNumber != null) a.flatUnitNumber!,
                              if (a.paymentAmount != null) Formatters.price(a.paymentAmount!),
                            ].join(' · '),
                          ),
                        ),
                      ),
                    )),
              ],
            ],
          );
        },
      ),
    );
  }
}

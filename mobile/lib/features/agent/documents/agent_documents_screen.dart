import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/agent_document.dart';
import '../../../services/agent_documents_service.dart';

class AgentDocumentsScreen extends StatefulWidget {
  const AgentDocumentsScreen({super.key});

  @override
  State<AgentDocumentsScreen> createState() => _AgentDocumentsScreenState();
}

class _AgentDocumentsScreenState extends State<AgentDocumentsScreen> {
  late final AgentDocumentsService _service;
  late Future<List<AgentDocument>> _future;

  static const _types = [
    'REGISTRY',
    'SALE_DEED',
    'AGREEMENT_TO_SELL',
    'ENCUMBRANCE_CERTIFICATE',
    'LAYOUT_PLAN',
    'PAYMENT_RECEIPT',
    'SIGNED_AGREEMENT',
    'OTHER',
  ];

  @override
  void initState() {
    super.initState();
    _service = AgentDocumentsService(ApiClient.instance.dio);
    _future = _service.getDocuments();
  }

  Future<void> _addDocument() async {
    final result = await FilePicker.platform.pickFiles(
      type: FileType.custom,
      allowedExtensions: ['pdf'],
    );
    final path = result?.files.single.path;
    if (path == null || !mounted) return;

    final titleController = TextEditingController();
    String selectedType = 'OTHER';

    final confirmed = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setDialogState) => AlertDialog(
          title: const Text('Add document'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                controller: titleController,
                decoration: const InputDecoration(labelText: 'Title'),
              ),
              const SizedBox(height: AppSpacing.md),
              DropdownButtonFormField<String>(
                initialValue: selectedType,
                decoration: const InputDecoration(labelText: 'Type'),
                items: _types
                    .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                    .toList(),
                onChanged: (v) => setDialogState(() => selectedType = v!),
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
              child: const Text('Upload'),
            ),
          ],
        ),
      ),
    );

    if (confirmed != true || !mounted) return;
    if (Validators.required(titleController.text) != null) return;

    try {
      await _service.addDocument(
        filePath: path,
        title: titleController.text.trim(),
        type: selectedType,
      );
      if (!mounted) return;
      setState(() => _future = _service.getDocuments());
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Document uploaded')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Documents')),
      floatingActionButton: FloatingActionButton(
        backgroundColor: AppColors.gold,
        foregroundColor: AppColors.textOnGold,
        onPressed: _addDocument,
        child: const Icon(Icons.upload_file_outlined),
      ),
      body: RefreshIndicator(
        onRefresh: () async => setState(() => _future = _service.getDocuments()),
        child: FutureBuilder<List<AgentDocument>>(
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
            final documents = snapshot.data ?? [];
            if (documents.isEmpty) {
              return const EmptyState(
                message: 'No documents uploaded yet. Tap + to add one (PDF only).',
                icon: Icons.folder_outlined,
              );
            }
            return ListView.separated(
              padding: const EdgeInsets.all(AppSpacing.lg),
              itemCount: documents.length,
              separatorBuilder: (_, _) => const SizedBox(height: AppSpacing.sm),
              itemBuilder: (context, index) {
                final doc = documents[index];
                return Card(
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
                    title: Text(doc.title, style: const TextStyle(fontWeight: FontWeight.w600)),
                    subtitle: Text(doc.type),
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

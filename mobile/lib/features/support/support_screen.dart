import 'package:dio/dio.dart';
import 'package:flutter/material.dart';

import '../../core/network/api_client.dart';
import '../../core/network/api_exception.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/empty_state.dart';
import '../../core/widgets/form_error_banner.dart';
import '../../services/owner_service.dart';

const _categories = {
  'COMMISSION_CONFLICT': 'Commission conflict',
  'CUSTOMER_COMPLAINT': 'Customer complaint',
  'WEBSITE_FEEDBACK': 'App / website feedback',
};

/// Help desk for every role: raise a ticket (answered within 2 hours) and see its status.
class SupportScreen extends StatefulWidget {
  const SupportScreen({super.key});

  @override
  State<SupportScreen> createState() => _SupportScreenState();
}

class _SupportScreenState extends State<SupportScreen> {
  final Dio _dio = ApiClient.instance.dio;
  final _subject = TextEditingController();
  final _message = TextEditingController();
  String _category = 'WEBSITE_FEEDBACK';
  late Future<List<Map<String, dynamic>>> _future = _load();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _subject.dispose();
    _message.dispose();
    super.dispose();
  }

  Future<List<Map<String, dynamic>>> _load() async {
    try {
      final res = await _dio.get('/api/support');
      return ((res.data as Map)['tickets'] as List).map((e) => Map<String, dynamic>.from(e as Map)).toList();
    } on DioException catch (e) {
      throw ApiException.fromDioError(e);
    }
  }

  Future<void> _send() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _dio.post('/api/support', data: {'category': _category, 'subject': _subject.text, 'message': _message.text});
      _subject.clear();
      _message.clear();
      setState(() => _future = _load());
      if (mounted) ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Sent. We will reply within 2 hours.')));
    } on DioException catch (e) {
      setState(() => _error = ownerErrorMessage(ApiException.fromDioError(e)));
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final t = Theme.of(context).textTheme;
    return Scaffold(
      appBar: AppBar(title: const Text('Help & support')),
      body: ListView(
        padding: const EdgeInsets.all(AppSpacing.md),
        children: [
          Text('Tell us what went wrong. We resolve every ticket within 2 hours.', style: t.bodySmall),
          const SizedBox(height: AppSpacing.md),
          if (_error != null) ...[FormErrorBanner(message: _error!), const SizedBox(height: AppSpacing.sm)],
          DropdownButtonFormField<String>(
            initialValue: _category,
            decoration: const InputDecoration(labelText: 'Topic'),
            items: [for (final e in _categories.entries) DropdownMenuItem(value: e.key, child: Text(e.value))],
            onChanged: (v) => setState(() => _category = v!),
          ),
          const SizedBox(height: AppSpacing.sm),
          TextField(controller: _subject, decoration: const InputDecoration(labelText: 'Subject')),
          const SizedBox(height: AppSpacing.sm),
          TextField(controller: _message, maxLines: 4, decoration: const InputDecoration(labelText: 'Message')),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Send', icon: Icons.send, expand: true, loading: _busy, onPressed: _busy ? null : _send),
          const SizedBox(height: AppSpacing.lg),
          Text('Your tickets', style: t.titleMedium),
          const SizedBox(height: AppSpacing.sm),
          FutureBuilder<List<Map<String, dynamic>>>(
            future: _future,
            builder: (context, snap) {
              if (snap.connectionState != ConnectionState.done) return const Center(child: CircularProgressIndicator());
              if (snap.hasError) return Text('Sign in to see your tickets.', style: t.bodySmall);
              final list = snap.data ?? [];
              if (list.isEmpty) return const EmptyState(icon: Icons.support_agent, message: 'No tickets yet.');
              return Column(
                children: [
                  for (final k in list)
                    Card(
                      child: ListTile(
                        title: Text('${k['subject']}'),
                        subtitle: Text(
                          '${_categories[k['category']] ?? k['category']}\n${k['resolution'] ?? k['message']}',
                          maxLines: 3,
                          overflow: TextOverflow.ellipsis,
                        ),
                        isThreeLine: true,
                        trailing: Text(
                          '${k['status']}'.replaceAll('_', ' '),
                          style: TextStyle(fontWeight: FontWeight.w800, fontSize: 11, color: k['status'] == 'RESOLVED' ? AppColors.success : AppColors.warning),
                        ),
                      ),
                    ),
                ],
              );
            },
          ),
        ],
      ),
    );
  }
}

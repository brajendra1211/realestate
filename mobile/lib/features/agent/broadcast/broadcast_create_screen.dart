import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/form_section.dart';
import '../../../services/agent_broadcast_service.dart';

class BroadcastCreateScreen extends StatefulWidget {
  const BroadcastCreateScreen({super.key});

  @override
  State<BroadcastCreateScreen> createState() => _BroadcastCreateScreenState();
}

class _BroadcastCreateScreenState extends State<BroadcastCreateScreen> {
  final _formKey = GlobalKey<FormState>();
  final _societyController = TextEditingController();
  final _flatSizeController = TextEditingController();
  final _budgetMinController = TextEditingController();
  final _budgetMaxController = TextEditingController();
  late final AgentBroadcastService _service;

  int _radiusKm = 1;
  String _txnType = 'BUY';
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _service = AgentBroadcastService(ApiClient.instance.dio);
  }

  @override
  void dispose() {
    _societyController.dispose();
    _flatSizeController.dispose();
    _budgetMinController.dispose();
    _budgetMaxController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await _service.create(
        radiusKm: _radiusKm,
        society: _societyController.text.trim().isEmpty ? null : _societyController.text.trim(),
        flatSize: _flatSizeController.text.trim(),
        txnType: _txnType,
        budgetMin: int.parse(_budgetMinController.text.trim()),
        budgetMax: int.parse(_budgetMaxController.text.trim()),
      );
      if (!mounted) return;
      Navigator.of(context).pop(true);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('New B2B Requirement')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: ListView(
              children: [
                FormSection(
                  title: 'Requirement',
                  subtitle: 'Broadcast this to verified channel partners nearby.',
                  children: [
                    DropdownButtonFormField<int>(
                      initialValue: _radiusKm,
                      decoration: const InputDecoration(
                        labelText: 'Radius',
                        prefixIcon: Icon(Icons.radar_outlined),
                      ),
                      items: const [
                        DropdownMenuItem(value: 1, child: Text('1 km')),
                        DropdownMenuItem(value: 3, child: Text('3 km')),
                        DropdownMenuItem(value: 5, child: Text('5 km')),
                      ],
                      onChanged: (v) => setState(() => _radiusKm = v!),
                    ),
                    TextFormField(
                      controller: _societyController,
                      decoration: const InputDecoration(labelText: 'Society (optional)'),
                    ),
                    TextFormField(
                      controller: _flatSizeController,
                      decoration: const InputDecoration(labelText: 'Flat size (e.g. 2BHK)'),
                      validator: (v) => Validators.required(v, label: 'Flat size'),
                    ),
                    DropdownButtonFormField<String>(
                      initialValue: _txnType,
                      decoration: const InputDecoration(labelText: 'Transaction type'),
                      items: const [
                        DropdownMenuItem(value: 'BUY', child: Text('Buy')),
                        DropdownMenuItem(value: 'SELL', child: Text('Sell')),
                        DropdownMenuItem(value: 'RENT', child: Text('Rent')),
                        DropdownMenuItem(value: 'LETOUT', child: Text('Let out')),
                      ],
                      onChanged: (v) => setState(() => _txnType = v!),
                    ),
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _budgetMinController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(
                              labelText: 'Budget min',
                              prefixIcon: Icon(Icons.currency_rupee),
                            ),
                            validator: (v) => Validators.required(v, label: 'Budget min'),
                          ),
                        ),
                        const SizedBox(width: AppSpacing.sm),
                        Expanded(
                          child: TextFormField(
                            controller: _budgetMaxController,
                            keyboardType: TextInputType.number,
                            decoration: const InputDecoration(labelText: 'Budget max'),
                            validator: (v) => Validators.required(v, label: 'Budget max'),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'Broadcast to nearby channel partners',
                  expand: true,
                  loading: _submitting,
                  onPressed: _submit,
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

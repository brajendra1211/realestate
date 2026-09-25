import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/form_section.dart';
import '../../../services/agent_service.dart';

class AgentRegisterScreen extends StatefulWidget {
  const AgentRegisterScreen({super.key});

  @override
  State<AgentRegisterScreen> createState() => _AgentRegisterScreenState();
}

class _AgentRegisterScreenState extends State<AgentRegisterScreen> {
  final _formKey = GlobalKey<FormState>();
  late final AgentService _service;

  final _name = TextEditingController();
  final _email = TextEditingController();
  final _phone = TextEditingController();
  final _alternatePhone = TextEditingController();
  final _password = TextEditingController();
  final _shopName = TextEditingController();
  final _shopAddress = TextEditingController();
  final _city = TextEditingController();
  final _yearsExperience = TextEditingController();
  final _staffCount = TextEditingController();
  final _reraNumber = TextEditingController();
  final _gstNumber = TextEditingController();
  final _referredByAgentCode = TextEditingController();

  bool _submitting = false;
  bool _obscurePassword = true;

  @override
  void initState() {
    super.initState();
    _service = AgentService(ApiClient.instance.dio);
  }

  @override
  void dispose() {
    for (final c in [
      _name,
      _email,
      _phone,
      _alternatePhone,
      _password,
      _shopName,
      _shopAddress,
      _city,
      _yearsExperience,
      _staffCount,
      _reraNumber,
      _gstNumber,
      _referredByAgentCode,
    ]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      final result = await _service.register(
        name: _name.text.trim(),
        email: _email.text.trim(),
        password: _password.text,
        phone: _phone.text.trim().isEmpty ? null : _phone.text.trim(),
        alternatePhone:
            _alternatePhone.text.trim().isEmpty ? null : _alternatePhone.text.trim(),
        shopName: _shopName.text.trim(),
        shopAddress: _shopAddress.text.trim(),
        city: _city.text.trim(),
        yearsExperience: int.tryParse(_yearsExperience.text.trim()),
        staffCount: int.tryParse(_staffCount.text.trim()),
        reraNumber: _reraNumber.text.trim().isEmpty ? null : _reraNumber.text.trim(),
        gstNumber: _gstNumber.text.trim().isEmpty ? null : _gstNumber.text.trim(),
        referredByAgentCode: _referredByAgentCode.text.trim().isEmpty
            ? null
            : _referredByAgentCode.text.trim(),
      );
      if (!mounted) return;
      await showDialog<void>(
        context: context,
        builder: (context) => AlertDialog(
          title: const Text('Application submitted'),
          content: Text(
            'Your channel partner account is ${result.status.toLowerCase()}. '
            'You can log in now — full channel partner features unlock once an admin approves your application.',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('OK'),
            ),
          ],
        ),
      );
      if (!mounted) return;
      context.go(RoutePaths.agentLogin);
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
      appBar: AppBar(title: const Text('Become a Channel Partner')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.lg),
            children: [
              const AuthHeader(
                title: 'Join as a channel partner',
                subtitle:
                    'Tell us about you and your shop — we review every application.',
              ),
              const SizedBox(height: AppSpacing.xl),
              FormSection(
                title: 'Your details',
                stepNumber: 1,
                children: [
                  TextFormField(
                    controller: _name,
                    decoration: const InputDecoration(
                      labelText: 'Full name',
                      prefixIcon: Icon(Icons.person_outline),
                    ),
                    validator: (v) => Validators.required(v, label: 'Name'),
                  ),
                  TextFormField(
                    controller: _email,
                    keyboardType: TextInputType.emailAddress,
                    decoration: const InputDecoration(
                      labelText: 'Email',
                      prefixIcon: Icon(Icons.mail_outline),
                    ),
                    validator: Validators.email,
                  ),
                  TextFormField(
                    controller: _phone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(
                      labelText: 'Phone (optional)',
                      prefixIcon: Icon(Icons.call_outlined),
                    ),
                  ),
                  TextFormField(
                    controller: _alternatePhone,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Alternate phone (optional)'),
                  ),
                  TextFormField(
                    controller: _password,
                    obscureText: _obscurePassword,
                    decoration: InputDecoration(
                      labelText: 'Password',
                      prefixIcon: const Icon(Icons.lock_outline),
                      suffixIcon: IconButton(
                        icon: Icon(_obscurePassword
                            ? Icons.visibility_outlined
                            : Icons.visibility_off_outlined),
                        onPressed: () =>
                            setState(() => _obscurePassword = !_obscurePassword),
                      ),
                    ),
                    validator: Validators.password,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              FormSection(
                title: 'Shop details',
                stepNumber: 2,
                children: [
                  TextFormField(
                    controller: _shopName,
                    decoration: const InputDecoration(
                      labelText: 'Shop / business name',
                      prefixIcon: Icon(Icons.storefront_outlined),
                    ),
                    validator: (v) => Validators.required(v, label: 'Shop name'),
                  ),
                  TextFormField(
                    controller: _shopAddress,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Shop address'),
                    validator: (v) => Validators.required(v, label: 'Shop address'),
                  ),
                  TextFormField(
                    controller: _city,
                    decoration: const InputDecoration(
                      labelText: 'City',
                      prefixIcon: Icon(Icons.location_city_outlined),
                    ),
                    validator: (v) => Validators.required(v, label: 'City'),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          controller: _yearsExperience,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Years of experience'),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: TextFormField(
                          controller: _staffCount,
                          keyboardType: TextInputType.number,
                          decoration: const InputDecoration(labelText: 'Staff count'),
                        ),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: _reraNumber,
                    decoration: const InputDecoration(labelText: 'RERA number (optional)'),
                  ),
                  TextFormField(
                    controller: _gstNumber,
                    decoration: const InputDecoration(labelText: 'GST number (optional)'),
                  ),
                  TextFormField(
                    controller: _referredByAgentCode,
                    decoration:
                        const InputDecoration(labelText: 'Referral channel partner code (optional)'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.xl),
              AppButton(
                label: 'Submit application',
                expand: true,
                loading: _submitting,
                onPressed: _submit,
              ),
              const SizedBox(height: AppSpacing.md),
              Center(
                child: TextButton(
                  onPressed: () => context.go(RoutePaths.agentLogin),
                  child: const Text('Already a channel partner? Log in'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

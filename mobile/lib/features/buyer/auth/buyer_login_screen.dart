import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/auth_header.dart';
import '../../../core/widgets/form_error_banner.dart';
import '../../../core/widgets/form_section.dart';
import '../../../providers/customer_auth_provider.dart';

class BuyerLoginScreen extends StatefulWidget {
  const BuyerLoginScreen({super.key});

  @override
  State<BuyerLoginScreen> createState() => _BuyerLoginScreenState();
}

class _BuyerLoginScreenState extends State<BuyerLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _identifierController = TextEditingController();
  bool _submitting = false;
  String? _errorMessage;

  @override
  void dispose() {
    _identifierController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _submitting = true;
      _errorMessage = null;
    });
    try {
      final customerAuth = context.read<CustomerAuthProvider>();
      final result = await customerAuth.requestOtp(
        forInvestor: false,
        identifier: _identifierController.text.trim(),
      );
      if (!mounted) return;
      final from = GoRouterState.of(context).uri.queryParameters['from'];
      context.push(
        '${RoutePaths.buyerVerify}?identifier=${Uri.encodeComponent(result.identifier)}'
        '&channel=${result.channel}'
        '${from != null ? '&from=${Uri.encodeComponent(from)}' : ''}',
      );
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _submitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: ListView(
              children: [
                const SizedBox(height: AppSpacing.sm),
                const AuthHeader(
                  title: 'Buyer login',
                  subtitle:
                      'No password needed — we\'ll send a one-time code on WhatsApp (or email).',
                ),
                const SizedBox(height: AppSpacing.xl),
                if (_errorMessage != null) ...[
                  FormErrorBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                FormSection(
                  title: 'Sign in',
                  children: [
                    TextFormField(
                      controller: _identifierController,
                      decoration: const InputDecoration(
                        labelText: 'Phone or email',
                        prefixIcon: Icon(Icons.person_outline),
                      ),
                      validator: (v) => Validators.required(v, label: 'Phone or email'),
                      onFieldSubmitted: (_) => _submit(),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.xl),
                AppButton(
                  label: 'Send code',
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

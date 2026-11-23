import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_exception.dart';
import '../../core/router/route_paths.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/error_messages.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/auth_header.dart';
import '../../core/widgets/form_error_banner.dart';
import '../../providers/customer_auth_provider.dart';

/// Owner login with the email and password chosen when listing the property.
class OwnerLoginScreen extends StatefulWidget {
  const OwnerLoginScreen({super.key});

  @override
  State<OwnerLoginScreen> createState() => _OwnerLoginScreenState();
}

class _OwnerLoginScreenState extends State<OwnerLoginScreen> {
  final _formKey = GlobalKey<FormState>();
  final _email = TextEditingController();
  final _password = TextEditingController();
  bool _busy = false;
  String? _error;

  @override
  void dispose() {
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final auth = context.read<CustomerAuthProvider>();
      await auth.loginWithPassword(email: _email.text.trim(), password: _password.text);
      if (!mounted) return;
      if (auth.isOwner) {
        context.go(RoutePaths.ownerStatus);
      } else {
        await auth.logout();
        setState(() { _error = 'This login is for property owners. Use the agent, buyer or investor login for other accounts.'; });
      }
    } on ApiException catch (e) {
      setState(() { _error = errorMessageFor(e); });
    } finally {
      if (mounted) setState(() { _busy = false; });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              const AuthHeader(title: 'Owner login', subtitle: 'Track your property and its verification.'),
              const SizedBox(height: AppSpacing.lg),
              if (_error != null) ...[FormErrorBanner(message: _error!), const SizedBox(height: AppSpacing.md)],
              TextFormField(
                controller: _email,
                keyboardType: TextInputType.emailAddress,
                decoration: const InputDecoration(labelText: 'Email'),
                validator: Validators.email,
              ),
              const SizedBox(height: AppSpacing.md),
              TextFormField(
                controller: _password,
                obscureText: true,
                decoration: const InputDecoration(labelText: 'Password'),
                validator: (v) => Validators.required(v, label: 'Password'),
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(label: 'Log in', loading: _busy, expand: true, onPressed: _busy ? null : _submit),
              const SizedBox(height: AppSpacing.sm),
              TextButton(
                onPressed: () => context.push(RoutePaths.ownerStart),
                child: const Text('New here? List your property'),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

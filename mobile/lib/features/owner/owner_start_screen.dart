import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';

import '../../core/network/api_client.dart';
import '../../core/payments/razorpay_checkout.dart';
import '../../core/router/route_paths.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/form_error_banner.dart';
import '../../core/widgets/form_section.dart';
import '../../providers/customer_auth_provider.dart';
import '../../services/owner_service.dart';

const _fallbackPlans = [
  OwnerPlan(id: 'BASIC', name: 'Basic', price: 299, months: 1),
  OwnerPlan(id: 'GOLD', name: 'Pro', price: 499, months: 3),
];

const _planFeatures = {
  'BASIC': [
    'Listed for 30 days',
    'Property verified on site by a partner',
    'Verified badge on your listing',
    'Buyer enquiries on your phone',
  ],
  'GOLD': [
    'Listed for 90 days (3 months)',
    'Property verified on site by a partner',
    'Verified badge on your listing',
    'Buyer enquiries on your phone',
    'Best value: lowest cost per month',
  ],
};

/// Owner step 1: choose rent/sell and a plan, verify the number with a WhatsApp
/// OTP, create the account and pay with Razorpay. Then the property form opens.
class OwnerStartScreen extends StatefulWidget {
  const OwnerStartScreen({super.key});

  @override
  State<OwnerStartScreen> createState() => _OwnerStartScreenState();
}

class _OwnerStartScreenState extends State<OwnerStartScreen> {
  final _formKey = GlobalKey<FormState>();
  final _name = TextEditingController();
  final _phone = TextEditingController();
  final _otp = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _city = TextEditingController();
  final _locality = TextEditingController();
  final _partnerCode = TextEditingController();

  late final OwnerService _service = OwnerService(ApiClient.instance.dio);
  List<OwnerPlan> _plans = _fallbackPlans;
  String _plan = 'BASIC';
  String _purpose = 'RENT';
  bool _otpSent = false;
  bool _otpBusy = false;
  bool _busy = false;
  bool _account = false; // signed in already: no OTP / password needed
  String? _error;

  @override
  void initState() {
    super.initState();
    final auth = context.read<CustomerAuthProvider>();
    _account = auth.isOwner;
    if (_account) {
      _name.text = auth.name ?? '';
      _phone.text = auth.phone ?? '';
      _email.text = auth.email ?? '';
    }
    _service.plans().then((p) {
      if (mounted && p.isNotEmpty) setState(() => _plans = p);
    }).catchError((_) {});
  }

  @override
  void dispose() {
    for (final c in [_name, _phone, _otp, _email, _password, _city, _locality, _partnerCode]) {
      c.dispose();
    }
    super.dispose();
  }

  OwnerPlan get _selected => _plans.firstWhere((p) => p.id == _plan, orElse: () => _plans.first);

  Future<void> _sendOtp() async {
    setState(() {
      _error = null;
      _otpBusy = true;
    });
    try {
      await _service.sendOtp(_phone.text.trim());
      setState(() => _otpSent = true);
    } catch (e) {
      setState(() => _error = ownerErrorMessage(e));
    } finally {
      if (mounted) setState(() => _otpBusy = false);
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() {
      _busy = true;
      _error = null;
    });
    final auth = context.read<CustomerAuthProvider>();
    try {
      final result = await _service.start({
        'ownerName': _name.text.trim(),
        'ownerPhone': _phone.text.trim(),
        'ownerEmail': _email.text.trim(),
        'password': _password.text,
        'otp': _otp.text.trim(),
        'city': _city.text.trim(),
        'locality': _locality.text.trim(),
        'plan': _plan,
        'purpose': _purpose,
        'referredByAgentCode': _partnerCode.text.trim(),
      });
      // The account now exists and the server signed the owner in.
      await auth.restoreSession();
      if (mounted) setState(() => _account = true);

      final paid = await openRazorpayCheckout(
        keyId: result.keyId,
        orderId: result.orderId,
        amountPaise: result.orderAmount,
        description: '${_selected.name} listing plan',
        name: _name.text.trim(),
        phone: _phone.text.trim(),
        email: _email.text.trim(),
      );
      if (paid == null) {
        if (mounted) setState(() => _busy = false);
        return;
      }
      final formToken = await _service.verifyPayment(
        requestId: result.requestId,
        statusToken: result.statusToken,
        orderId: paid.orderId,
        paymentId: paid.paymentId,
        signature: paid.signature,
      );
      if (!mounted) return;
      if (formToken != null) {
        context.go(RoutePaths.ownerDetailsPath(formToken));
      } else {
        context.go(RoutePaths.ownerStatus);
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _error = ownerErrorMessage(e);
          _busy = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('List your property'),
        actions: [
          if (!_account)
            TextButton(onPressed: () => context.push(RoutePaths.ownerLogin), child: const Text('Log in')),
        ],
      ),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              if (_error != null) ...[FormErrorBanner(message: _error!), const SizedBox(height: AppSpacing.md)],
              FormSection(
                stepNumber: 1,
                title: 'What do you want to do?',
                children: [
                  IntrinsicHeight(
                    child: Row(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                      Expanded(child: _choice('RENT', 'Rent out', 'A nearby partner verifies it', _purpose, (v) => setState(() => _purpose = v))),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(child: _choice('SELL', 'Sell', 'Handled by our team', _purpose, (v) => setState(() => _purpose = v))),
                      ],
                    ),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              FormSection(
                stepNumber: 2,
                title: 'Choose a plan',
                children: [for (final p in _plans) _planCard(p)],
              ),
              const SizedBox(height: AppSpacing.md),
              FormSection(
                stepNumber: 3,
                title: 'Your details',
                children: [
                  TextFormField(
                    controller: _name,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Your name'),
                    validator: (v) => Validators.required(v, label: 'Name'),
                  ),
                  TextFormField(
                    controller: _phone,
                    readOnly: _account,
                    keyboardType: TextInputType.phone,
                    decoration: const InputDecoration(labelText: 'Mobile number (WhatsApp)'),
                    validator: Validators.phone,
                  ),
                  if (!_account) ...[
                    Align(
                      alignment: Alignment.centerLeft,
                      child: AppButton(
                        label: _otpSent ? 'Resend WhatsApp OTP' : 'Send WhatsApp OTP',
                        icon: Icons.chat_outlined,
                        loading: _otpBusy,
                        variant: AppButtonVariant.secondary,
                        onPressed: _phone.text.replaceAll(RegExp(r'\D'), '').length < 10 ? null : _sendOtp,
                      ),
                    ),
                    TextFormField(
                      controller: _otp,
                      keyboardType: TextInputType.number,
                      maxLength: 6,
                      decoration: InputDecoration(
                        labelText: 'WhatsApp OTP',
                        hintText: _otpSent ? '6-digit OTP' : 'Send the OTP first',
                        counterText: '',
                      ),
                      validator: (v) => Validators.required(v, label: 'OTP'),
                    ),
                    TextFormField(
                      controller: _email,
                      keyboardType: TextInputType.emailAddress,
                      decoration: const InputDecoration(labelText: 'Email'),
                      validator: Validators.email,
                    ),
                    TextFormField(
                      controller: _password,
                      obscureText: true,
                      decoration: const InputDecoration(labelText: 'Create a password', helperText: 'At least 8 characters'),
                      validator: (v) => (v == null || v.length < 8) ? 'At least 8 characters' : null,
                    ),
                  ],
                  TextFormField(
                    controller: _city,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'City'),
                    validator: (v) => Validators.required(v, label: 'City'),
                  ),
                  TextFormField(
                    controller: _locality,
                    textCapitalization: TextCapitalization.words,
                    decoration: const InputDecoration(labelText: 'Area / locality'),
                  ),
                  TextFormField(
                    controller: _partnerCode,
                    decoration: const InputDecoration(labelText: 'Partner code (optional)'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              Container(
                padding: const EdgeInsets.all(AppSpacing.md),
                decoration: BoxDecoration(color: AppColors.surfaceAlt, borderRadius: BorderRadius.circular(AppRadius.md)),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.verified_user_outlined, size: 18, color: AppColors.success),
                    const SizedBox(width: AppSpacing.sm),
                    Expanded(
                      child: Text(
                        _purpose == 'RENT'
                            ? 'After payment you add your property details (keep your location ON). A verified partner within 5 km is alerted, visits your property within 48 hours and verifies it with your OTP. Then your listing goes live.'
                            : 'Sell requests are handled directly by our team. After payment our team calls you and takes your property details and documents.',
                        style: Theme.of(context).textTheme.bodySmall,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: AppSpacing.md),
              AppButton(
                label: 'Verify & pay ₹${_selected.price}',
                icon: Icons.lock_outline,
                loading: _busy,
                expand: true,
                onPressed: _busy ? null : _submit,
              ),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _choice(String value, String title, String sub, String group, ValueChanged<String> onTap) {
    final active = group == value;
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () => onTap(value),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: active ? AppColors.surfaceAlt : Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: active ? AppColors.gold : AppColors.divider, width: active ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontWeight: FontWeight.w800, color: AppColors.textPrimary)),
            const SizedBox(height: 2),
            Text(sub, style: Theme.of(context).textTheme.bodySmall),
          ],
        ),
      ),
    );
  }

  Widget _planCard(OwnerPlan p) {
    final active = _plan == p.id;
    final pro = p.id == 'GOLD';
    return InkWell(
      borderRadius: BorderRadius.circular(AppRadius.md),
      onTap: () => setState(() => _plan = p.id),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.md),
        decoration: BoxDecoration(
          color: active ? AppColors.surfaceAlt : Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.md),
          border: Border.all(color: active ? AppColors.gold : AppColors.divider, width: active ? 2 : 1),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Text(p.name, style: const TextStyle(fontWeight: FontWeight.w800, fontSize: 15, color: AppColors.textPrimary)),
                const Spacer(),
                if (pro)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(color: AppColors.accentGold, borderRadius: BorderRadius.circular(AppRadius.pill)),
                    child: const Text('BEST VALUE', style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: AppColors.primaryNavy)),
                  ),
              ],
            ),
            Text('₹${p.price}', style: Theme.of(context).textTheme.displayLarge),
            Text(p.months == 1 ? 'Live for 1 month' : 'Live for ${p.months} months',
                style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w700)),
            const SizedBox(height: AppSpacing.sm),
            for (final f in _planFeatures[p.id] ?? const <String>[])
              Padding(
                padding: const EdgeInsets.only(bottom: 4),
                child: Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Icon(Icons.check, size: 15, color: AppColors.success),
                    const SizedBox(width: 6),
                    Expanded(child: Text(f, style: Theme.of(context).textTheme.bodySmall)),
                  ],
                ),
              ),
          ],
        ),
      ),
    );
  }
}

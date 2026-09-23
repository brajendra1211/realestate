import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/form_section.dart';
import '../../../services/rating_service.dart';

const _ratingLabels = {
  1: 'Not great',
  2: 'Could be better',
  3: 'Good',
  4: 'Very good',
  5: 'Excellent!',
};

class RateAgentScreen extends StatefulWidget {
  const RateAgentScreen({super.key, required this.agentCode});

  final String agentCode;

  @override
  State<RateAgentScreen> createState() => _RateAgentScreenState();
}

class _RateAgentScreenState extends State<RateAgentScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _reviewController = TextEditingController();
  late final RatingService _service;
  int _stars = 5;
  bool _submitting = false;

  @override
  void initState() {
    super.initState();
    _service = RatingService(ApiClient.instance.dio);
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _reviewController.dispose();
    super.dispose();
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    setState(() => _submitting = true);
    try {
      await _service.submitRating(
        agentCode: widget.agentCode,
        customerPhone: _phoneController.text.trim(),
        stars: _stars,
        review: _reviewController.text.trim(),
      );
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Thanks for your rating!')),
      );
      Navigator.of(context).maybePop();
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
      appBar: AppBar(title: Text('Rate ${widget.agentCode}')),
      body: SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(AppSpacing.lg),
          child: Form(
            key: _formKey,
            child: ListView(
              children: [
                Text(
                  'How was your experience?',
                  style: Theme.of(context).textTheme.headlineMedium,
                ),
                const SizedBox(height: AppSpacing.lg),
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.symmetric(vertical: AppSpacing.lg),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(AppRadius.lg),
                    border: Border.all(color: AppColors.divider),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: List.generate(5, (index) {
                          final starValue = index + 1;
                          return IconButton(
                            onPressed: () => setState(() => _stars = starValue),
                            icon: Icon(
                              starValue <= _stars ? Icons.star_rounded : Icons.star_outline_rounded,
                              color: AppColors.gold,
                              size: 34,
                            ),
                          );
                        }),
                      ),
                      const SizedBox(height: AppSpacing.xs),
                      Text(
                        _ratingLabels[_stars]!,
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: AppSpacing.lg),
                FormSection(
                  title: 'A few details',
                  children: [
                    TextFormField(
                      controller: _phoneController,
                      keyboardType: TextInputType.phone,
                      decoration: const InputDecoration(
                        labelText: 'Your phone number',
                        prefixIcon: Icon(Icons.call_outlined),
                      ),
                      validator: Validators.phone,
                    ),
                    TextFormField(
                      controller: _reviewController,
                      maxLines: 4,
                      decoration: const InputDecoration(
                        labelText: 'Review (optional)',
                        alignLabelWithHint: true,
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: AppSpacing.lg),
                AppButton(
                  label: 'Submit rating',
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

import 'dart:io';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/validators.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/form_error_banner.dart';
import '../../../core/widgets/form_section.dart';
import '../../../core/widgets/location_picker_field.dart';
import '../../../models/geo_option.dart';
import '../../../services/agent_service.dart';
import '../../../services/geo_service.dart';
import '../../../services/gold_listing_submission_service.dart';

/// Customer self-service "Gold" listing: a buyer lists their own property
/// (₹500 pass, 90-day validity, admin anti-fake moderation before it goes
/// live) — see `GoldListingSubmissionService` for why this hits the
/// simulated payment path.
class GoldListingScreen extends StatefulWidget {
  const GoldListingScreen({super.key});

  @override
  State<GoldListingScreen> createState() => _GoldListingScreenState();
}

class _GoldListingScreenState extends State<GoldListingScreen> {
  late final GeoService _geoService;
  late final AgentService _agentService;
  late final GoldListingSubmissionService _service;
  String? _referralStatus;

  final _addressFormKey = GlobalKey<FormState>();
  final _detailsFormKey = GlobalKey<FormState>();

  GeoOption? _selectedCity;
  GeoOption? _selectedLocality;
  final _addressController = TextEditingController();

  final _titleController = TextEditingController();
  final _descriptionController = TextEditingController();
  final _bedroomsController = TextEditingController();
  final _bathroomsController = TextEditingController();
  final _areaController = TextEditingController();
  final _priceController = TextEditingController();
  final _amenitiesController = TextEditingController();
  final _referralController = TextEditingController();

  String _listingType = 'SALE';
  String _propertyType = 'APARTMENT';

  final List<XFile> _pickedImages = [];
  bool _uploadingImages = false;
  bool _submitting = false;
  String? _errorMessage;
  String? _submittedSlug;
  int _step = 0;

  static const _propertyTypes = [
    'APARTMENT',
    'VILLA',
    'INDEPENDENT_HOUSE',
    'PLOT',
    'COMMERCIAL',
    'OFFICE',
  ];

  @override
  void initState() {
    super.initState();
    _geoService = GeoService(ApiClient.instance.dio);
    _agentService = AgentService(ApiClient.instance.dio);
    _service = GoldListingSubmissionService(ApiClient.instance.dio);
  }

  Future<void> _verifyReferral() async {
    final code = _referralController.text.trim();
    if (code.isEmpty) return;
    setState(() => _referralStatus = 'Checking…');
    try {
      final agent = await _agentService.lookupByCode(code);
      if (!mounted) return;
      setState(() => _referralStatus = 'Found: ${agent.name}${agent.shopName != null ? ' · ${agent.shopName}' : ''}');
    } on ApiException {
      if (!mounted) return;
      setState(() => _referralStatus = 'No channel partner found with that code.');
    }
  }

  @override
  void dispose() {
    _addressController.dispose();
    _titleController.dispose();
    _descriptionController.dispose();
    _bedroomsController.dispose();
    _bathroomsController.dispose();
    _areaController.dispose();
    _priceController.dispose();
    _amenitiesController.dispose();
    _referralController.dispose();
    super.dispose();
  }

  void _continueToDetails() {
    if (!_addressFormKey.currentState!.validate()) return;
    setState(() => _step = 1);
  }

  Future<void> _pickImages() async {
    final images = await ImagePicker().pickMultiImage(imageQuality: 85);
    if (images.isEmpty) return;
    setState(() => _pickedImages.addAll(images));
  }

  Future<void> _submit() async {
    if (!_detailsFormKey.currentState!.validate()) return;

    setState(() {
      _submitting = true;
      _uploadingImages = true;
      _errorMessage = null;
    });
    try {
      final imageUrls = <String>[];
      for (final image in _pickedImages) {
        imageUrls.add(await _service.uploadImage(image.path));
      }
      setState(() => _uploadingImages = false);

      final referral = _referralController.text.trim();
      final slug = await _service.submit(
        address: _addressController.text.trim(),
        city: _selectedCity!.name,
        locality: _selectedLocality?.name,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        listingType: _listingType,
        propertyType: _propertyType,
        bedrooms: int.tryParse(_bedroomsController.text.trim()),
        bathrooms: int.tryParse(_bathroomsController.text.trim()),
        areaSqft: int.tryParse(_areaController.text.trim()),
        price: int.parse(_priceController.text.trim()),
        amenities: _amenitiesController.text.trim().isEmpty
            ? null
            : _amenitiesController.text.trim(),
        images: imageUrls,
        referredByAgentCode: referral.isEmpty ? null : referral,
      );

      if (!mounted) return;
      setState(() {
        _submittedSlug = slug;
        _step = 2;
      });
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) {
        setState(() {
          _submitting = false;
          _uploadingImages = false;
        });
      }
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('List your property — Gold')),
      body: SafeArea(
        child: ListView(
          padding: const EdgeInsets.all(AppSpacing.lg),
          children: [
            if (_errorMessage != null) ...[
              FormErrorBanner(message: _errorMessage!),
              const SizedBox(height: AppSpacing.md),
            ],
            if (_step == 0) _buildAddressStep(),
            if (_step == 1) _buildDetailsStep(),
            if (_step == 2) _buildSuccessStep(),
          ],
        ),
      ),
    );
  }

  Widget _buildAddressStep() {
    return Form(
      key: _addressFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FormSection(
            title: 'Property address',
            subtitle: '₹500 Gold pass — 90-day listing, reviewed by our team before it goes live.',
            stepNumber: 1,
            children: [
              CityPickerField(
                geoService: _geoService,
                initialValue: _selectedCity,
                onChanged: (city) => setState(() {
                  _selectedCity = city;
                  _selectedLocality = null;
                }),
                validator: (v) => v == null ? 'City is required' : null,
              ),
              LocalityPickerField(
                key: ValueKey(_selectedCity?.id),
                geoService: _geoService,
                cityId: _selectedCity?.id,
                initialValue: _selectedLocality,
                onChanged: (locality) => setState(() => _selectedLocality = locality),
              ),
              TextFormField(
                controller: _addressController,
                maxLines: 2,
                decoration: const InputDecoration(labelText: 'Exact address'),
                validator: (v) => Validators.required(v, label: 'Address'),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          AppButton(label: 'Continue', expand: true, onPressed: _continueToDetails),
        ],
      ),
    );
  }

  Widget _buildDetailsStep() {
    return Form(
      key: _detailsFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FormSection(
            title: 'Listing details',
            stepNumber: 2,
            children: [
              TextFormField(
                controller: _titleController,
                decoration: const InputDecoration(labelText: 'Title'),
                validator: (v) => Validators.required(v, label: 'Title'),
              ),
              TextFormField(
                controller: _descriptionController,
                maxLines: 3,
                decoration: const InputDecoration(labelText: 'Description'),
                validator: (v) => Validators.required(v, label: 'Description'),
              ),
              Row(
                children: [
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _listingType,
                      decoration: const InputDecoration(labelText: 'Listing type'),
                      items: const [
                        DropdownMenuItem(value: 'SALE', child: Text('For Sale')),
                        DropdownMenuItem(value: 'RENT', child: Text('For Rent')),
                      ],
                      onChanged: (v) => setState(() => _listingType = v!),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: DropdownButtonFormField<String>(
                      initialValue: _propertyType,
                      decoration: const InputDecoration(labelText: 'Property type'),
                      items: _propertyTypes
                          .map((t) => DropdownMenuItem(value: t, child: Text(t)))
                          .toList(),
                      onChanged: (v) => setState(() => _propertyType = v!),
                    ),
                  ),
                ],
              ),
              Row(
                children: [
                  Expanded(
                    child: TextFormField(
                      controller: _bedroomsController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Beds'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextFormField(
                      controller: _bathroomsController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Baths'),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Expanded(
                    child: TextFormField(
                      controller: _areaController,
                      keyboardType: TextInputType.number,
                      decoration: const InputDecoration(labelText: 'Sqft'),
                    ),
                  ),
                ],
              ),
              TextFormField(
                controller: _priceController,
                keyboardType: TextInputType.number,
                decoration: const InputDecoration(
                  labelText: 'Price (INR)',
                  prefixIcon: Icon(Icons.currency_rupee),
                ),
                validator: (v) => Validators.required(v, label: 'Price'),
              ),
              TextFormField(
                controller: _amenitiesController,
                decoration:
                    const InputDecoration(labelText: 'Amenities (comma separated, optional)'),
              ),
              TextFormField(
                controller: _referralController,
                decoration: InputDecoration(
                  labelText: 'Referring channel partner code (optional)',
                  helperText: _referralStatus ?? "Half the ₹500 fee goes to this channel partner's wallet.",
                  suffixIcon: TextButton(
                    onPressed: _verifyReferral,
                    child: const Text('Verify'),
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.lg),
          FormSection(
            title: 'Photos',
            stepNumber: 3,
            children: [
              Wrap(
                spacing: AppSpacing.sm,
                runSpacing: AppSpacing.sm,
                children: [
                  ..._pickedImages.map((img) => ClipRRect(
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        child:
                            SizedBox(width: 72, height: 72, child: Image.file(File(img.path))),
                      )),
                  InkWell(
                    onTap: _pickImages,
                    borderRadius: BorderRadius.circular(AppRadius.sm),
                    child: Container(
                      width: 72,
                      height: 72,
                      decoration: BoxDecoration(
                        color: AppColors.surfaceAlt,
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.divider),
                      ),
                      child:
                          const Icon(Icons.add_a_photo_outlined, color: AppColors.textSecondary),
                    ),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.xl),
          AppButton(
            label: _uploadingImages ? 'Uploading photos...' : 'Submit listing',
            expand: true,
            loading: _submitting,
            onPressed: _submit,
          ),
        ],
      ),
    );
  }

  Widget _buildSuccessStep() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const SizedBox(height: AppSpacing.xl),
        const Icon(Icons.check_circle, color: AppColors.success, size: 56),
        const SizedBox(height: AppSpacing.md),
        Text(
          'Listing submitted',
          style: Theme.of(context).textTheme.headlineMedium,
        ),
        const SizedBox(height: AppSpacing.sm),
        Text(
          'Your property "$_submittedSlug" is pending our anti-fake moderation review. '
          "You'll be notified once it's approved and live.",
          style: Theme.of(context).textTheme.bodyMedium,
        ),
        const SizedBox(height: AppSpacing.xl),
        AppButton(
          label: 'Done',
          expand: true,
          onPressed: () => Navigator.of(context).pop(true),
        ),
      ],
    );
  }
}

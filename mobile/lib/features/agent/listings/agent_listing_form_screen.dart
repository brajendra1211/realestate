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
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/form_error_banner.dart';
import '../../../core/widgets/form_section.dart';
import '../../../core/widgets/location_picker_field.dart';
import '../../../models/agent_profile.dart';
import '../../../models/geo_option.dart';
import '../../../services/agent_listings_service.dart';
import '../../../services/agent_service.dart';
import '../../../services/geo_service.dart';

class AgentListingFormScreen extends StatefulWidget {
  const AgentListingFormScreen({super.key});

  @override
  State<AgentListingFormScreen> createState() => _AgentListingFormScreenState();
}

class _AgentListingFormScreenState extends State<AgentListingFormScreen> {
  late final AgentService _agentService;
  late final AgentListingsService _listingsService;
  late final GeoService _geoService;
  late Future<AgentProfile> _profileFuture;

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

  String _listingType = 'SALE';
  String _propertyType = 'APARTMENT';

  DedupSearchResult? _dedupResult;
  String? _selectedMasterId;
  bool _searchingDuplicates = false;

  final List<XFile> _pickedImages = [];
  bool _uploadingImages = false;
  bool _submitting = false;
  String? _errorMessage;
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
    _agentService = AgentService(ApiClient.instance.dio);
    _listingsService = AgentListingsService(ApiClient.instance.dio);
    _geoService = GeoService(ApiClient.instance.dio);
    _profileFuture = _agentService.me();
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
    super.dispose();
  }

  Future<void> _searchDuplicates() async {
    if (!_addressFormKey.currentState!.validate()) return;
    setState(() {
      _searchingDuplicates = true;
      _errorMessage = null;
    });
    try {
      final result = await _listingsService.dedupSearch(
        city: _selectedCity!.name,
        locality: _selectedLocality?.name ?? '',
        address: _addressController.text.trim(),
      );
      setState(() {
        _dedupResult = result;
        _step = 1;
      });
    } on ApiException catch (e) {
      setState(() => _errorMessage = errorMessageFor(e));
    } finally {
      if (mounted) setState(() => _searchingDuplicates = false);
    }
  }

  Future<void> _pickImages() async {
    final images = await ImagePicker().pickMultiImage(imageQuality: 85);
    if (images.isEmpty) return;
    setState(() => _pickedImages.addAll(images));
  }

  Future<void> _submit() async {
    if (!_detailsFormKey.currentState!.validate()) return;
    if (_dedupResult == null) return;

    setState(() {
      _submitting = true;
      _uploadingImages = true;
      _errorMessage = null;
    });
    try {
      final imageUrls = <String>[];
      for (final image in _pickedImages) {
        imageUrls.add(await _listingsService.uploadImage(image.path));
      }
      setState(() => _uploadingImages = false);

      await _listingsService.createListing(
        masterPropertyId: _selectedMasterId,
        city: _selectedCity!.name,
        locality: _selectedLocality?.name,
        latitude: _dedupResult!.latitude,
        longitude: _dedupResult!.longitude,
        title: _titleController.text.trim(),
        description: _descriptionController.text.trim(),
        listingType: _listingType,
        propertyType: _propertyType,
        bedrooms: int.tryParse(_bedroomsController.text.trim()),
        bathrooms: int.tryParse(_bathroomsController.text.trim()),
        areaSqft: int.tryParse(_areaController.text.trim()),
        price: int.parse(_priceController.text.trim()),
        exactAddress: _addressController.text.trim(),
        amenities: _amenitiesController.text.trim().isEmpty
            ? null
            : _amenitiesController.text.trim(),
        images: imageUrls,
      );

      if (!mounted) return;
      Navigator.of(context).pop(true);
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
      appBar: AppBar(title: const Text('New Listing')),
      body: FutureBuilder<AgentProfile>(
        future: _profileFuture,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator(color: AppColors.gold));
          }
          if (snapshot.hasError) {
            return ErrorView(
              message: 'Could not verify your account status.',
              onRetry: () => setState(() => _profileFuture = _agentService.me()),
            );
          }
          final profile = snapshot.data!;
          if (!profile.canCreateListings) {
            return Padding(
              padding: const EdgeInsets.all(AppSpacing.lg),
              child: Center(
                child: Text(
                  profile.status != 'APPROVED'
                      ? 'Your channel partner application is still pending admin approval. '
                          'You\'ll be able to create listings once approved.'
                      : 'Activate Prime membership to start creating listings.',
                  textAlign: TextAlign.center,
                  style: Theme.of(context).textTheme.bodyMedium,
                ),
              ),
            );
          }

          return SafeArea(
            child: ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                if (_errorMessage != null) ...[
                  FormErrorBanner(message: _errorMessage!),
                  const SizedBox(height: AppSpacing.md),
                ],
                if (_step == 0) _buildAddressStep(context),
                if (_step == 1) _buildDetailsStep(context),
              ],
            ),
          );
        },
      ),
    );
  }

  Widget _buildAddressStep(BuildContext context) {
    return Form(
      key: _addressFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          FormSection(
            title: 'Property address',
            subtitle: 'We check this against nearby listings to avoid duplicates.',
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
          AppButton(
            label: 'Check for duplicates',
            expand: true,
            loading: _searchingDuplicates,
            onPressed: _searchDuplicates,
          ),
        ],
      ),
    );
  }

  Widget _buildDetailsStep(BuildContext context) {
    final candidates = _dedupResult?.candidates ?? [];
    return Form(
      key: _detailsFormKey,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (candidates.isNotEmpty) ...[
            Container(
              padding: const EdgeInsets.all(AppSpacing.md),
              decoration: BoxDecoration(
                color: AppColors.warning.withValues(alpha: 0.08),
                borderRadius: BorderRadius.circular(AppRadius.md),
                border: Border.all(color: AppColors.warning.withValues(alpha: 0.2)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Similar properties found nearby. Select one if this is the '
                    'same property, or leave unselected to register it as new.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                  const SizedBox(height: AppSpacing.sm),
                  RadioGroup<String?>(
                    groupValue: _selectedMasterId,
                    onChanged: (v) => setState(() => _selectedMasterId = v),
                    child: Column(
                      children: [
                        ...candidates.map((c) => RadioListTile<String?>(
                              dense: true,
                              contentPadding: EdgeInsets.zero,
                              title: Text('${c.city}${c.locality != null ? ", ${c.locality}" : ""}'),
                              subtitle: Text('${c.distanceKm.toStringAsFixed(2)} km away'),
                              value: c.masterId,
                            )),
                        const RadioListTile<String?>(
                          dense: true,
                          contentPadding: EdgeInsets.zero,
                          title: Text('None of these — new property'),
                          value: null,
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: AppSpacing.lg),
          ],
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
}

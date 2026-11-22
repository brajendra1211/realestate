import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/network/api_client.dart';
import '../../core/router/route_paths.dart';
import '../../core/theme/app_colors.dart';
import '../../core/theme/app_spacing.dart';
import '../../core/utils/location_helper.dart';
import '../../core/utils/validators.dart';
import '../../core/widgets/app_button.dart';
import '../../core/widgets/form_error_banner.dart';
import '../../core/widgets/form_section.dart';
import '../../services/owner_service.dart';

const _types = [
  'APARTMENT',
  'PENTHOUSE',
  'DUPLEX',
  'VILLA',
  'INDEPENDENT_HOUSE',
  'PLOT',
  'COMMERCIAL',
  'OFFICE',
  'SHOP',
  'WAREHOUSE',
  'PG',
];

/// Owner step 2: the property details. Location is mandatory (the buzzer finds
/// partners within 5 km of it) and at least one photo is required.
class OwnerDetailsScreen extends StatefulWidget {
  const OwnerDetailsScreen({super.key, required this.token});
  final String token;

  @override
  State<OwnerDetailsScreen> createState() => _OwnerDetailsScreenState();
}

class _OwnerDetailsScreenState extends State<OwnerDetailsScreen> {
  final _formKey = GlobalKey<FormState>();
  final _title = TextEditingController();
  final _desc = TextEditingController();
  final _address = TextEditingController();
  final _society = TextEditingController();
  final _locality = TextEditingController();
  final _rent = TextEditingController();
  final _deposit = TextEditingController();
  final _maintenance = TextEditingController();
  final _area = TextEditingController();
  final _amenities = TextEditingController();

  late final OwnerService _service = OwnerService(ApiClient.instance.dio);
  String _type = 'APARTMENT';
  int? _bedrooms;
  int? _bathrooms;
  String? _furnishing;
  bool _bachelor = false;
  final List<String> _photos = [];
  double? _lat;
  double? _lng;
  bool _locating = false;
  bool _uploading = false;
  bool _busy = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _askLocation();
  }

  @override
  void dispose() {
    for (final c in [_title, _desc, _address, _society, _locality, _rent, _deposit, _maintenance, _area, _amenities]) {
      c.dispose();
    }
    super.dispose();
  }

  Future<void> _askLocation() async {
    setState(() => _locating = true);
    final pos = await getCurrentLocation();
    if (!mounted) return;
    setState(() {
      _locating = false;
      if (pos != null) {
        _lat = pos.latitude;
        _lng = pos.longitude;
      }
    });
  }

  Future<void> _addPhotos() async {
    final picked = await ImagePicker().pickMultiImage(imageQuality: 80);
    if (picked.isEmpty) return;
    setState(() {
      _uploading = true;
      _error = null;
    });
    try {
      for (final f in picked) {
        if (_photos.length >= 12) break;
        _photos.add(await _service.uploadPhoto(widget.token, f.path));
      }
    } catch (e) {
      _error = ownerErrorMessage(e);
    } finally {
      if (mounted) setState(() => _uploading = false);
    }
  }

  int? _int(TextEditingController c) => int.tryParse(c.text.trim().replaceAll(',', ''));
  String? _txt(String s) => s.trim().isEmpty ? null : s.trim();

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;
    if (_lat == null || _lng == null) {
      setState(() => _error = 'Please turn on your location and stand at the property. We need it so a nearby partner can verify.');
      return;
    }
    if (_photos.isEmpty) {
      setState(() => _error = 'Please add at least one photo of the property.');
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      await _service.submitDetails(widget.token, {
        'title': _title.text.trim(),
        'description': _desc.text.trim(),
        'propertyType': _type,
        'bedrooms': _bedrooms,
        'bathrooms': _bathrooms,
        'areaSqft': _int(_area),
        'price': _int(_rent) ?? 0,
        'securityDeposit': _int(_deposit),
        'maintenanceCharges': _int(_maintenance),
        'furnishing': _furnishing,
        'societyName': _txt(_society.text),
        'locality': _txt(_locality.text),
        'exactAddress': _address.text.trim(),
        'amenities': _txt(_amenities.text),
        'latitude': _lat,
        'longitude': _lng,
        'videoUrl': null,
        'bachelorFriendly': _bachelor,
        'images': _photos,
      });
      if (mounted) context.go(RoutePaths.ownerStatus);
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
      appBar: AppBar(title: const Text('Property details')),
      body: SafeArea(
        child: Form(
          key: _formKey,
          child: ListView(
            padding: const EdgeInsets.all(AppSpacing.md),
            children: [
              if (_error != null) ...[FormErrorBanner(message: _error!), const SizedBox(height: AppSpacing.md)],
              _locationCard(),
              const SizedBox(height: AppSpacing.md),
              FormSection(
                title: 'About the property',
                children: [
                  TextFormField(
                    controller: _title,
                    decoration: const InputDecoration(labelText: 'Title', hintText: 'e.g. 2 BHK in Sector 62'),
                    validator: (v) => Validators.required(v, label: 'Title'),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: _type,
                    decoration: const InputDecoration(labelText: 'Property type'),
                    items: [for (final t in _types) DropdownMenuItem(value: t, child: Text(t.replaceAll('_', ' ')))],
                    onChanged: (v) => setState(() => _type = v!),
                  ),
                  Row(
                    children: [
                      Expanded(
                        child: DropdownButtonFormField<int>(
                          initialValue: _bedrooms,
                          decoration: const InputDecoration(labelText: 'Bedrooms'),
                          items: [for (var i = 0; i <= 8; i++) DropdownMenuItem(value: i, child: Text('$i'))],
                          onChanged: (v) => setState(() => _bedrooms = v),
                        ),
                      ),
                      const SizedBox(width: AppSpacing.sm),
                      Expanded(
                        child: DropdownButtonFormField<int>(
                          initialValue: _bathrooms,
                          decoration: const InputDecoration(labelText: 'Bathrooms'),
                          items: [for (var i = 0; i <= 8; i++) DropdownMenuItem(value: i, child: Text('$i'))],
                          onChanged: (v) => setState(() => _bathrooms = v),
                        ),
                      ),
                    ],
                  ),
                  TextFormField(
                    controller: _area,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Area (sqft)'),
                  ),
                  DropdownButtonFormField<String>(
                    initialValue: _furnishing,
                    decoration: const InputDecoration(labelText: 'Furnishing'),
                    items: const [
                      DropdownMenuItem(value: 'UNFURNISHED', child: Text('Unfurnished')),
                      DropdownMenuItem(value: 'SEMI_FURNISHED', child: Text('Semi furnished')),
                      DropdownMenuItem(value: 'FURNISHED', child: Text('Furnished')),
                    ],
                    onChanged: (v) => setState(() => _furnishing = v),
                  ),
                  TextFormField(
                    controller: _desc,
                    maxLines: 4,
                    decoration: const InputDecoration(labelText: 'Description'),
                    validator: (v) => Validators.required(v, label: 'Description'),
                  ),
                  SwitchListTile(
                    contentPadding: EdgeInsets.zero,
                    title: const Text('Bachelor friendly'),
                    value: _bachelor,
                    onChanged: (v) => setState(() => _bachelor = v),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              FormSection(
                title: 'Rent',
                children: [
                  TextFormField(
                    controller: _rent,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Monthly rent (₹)'),
                    validator: (v) => (_int(_rent) ?? 0) > 0 ? null : 'Enter the monthly rent',
                  ),
                  TextFormField(
                    controller: _deposit,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Security deposit (₹)'),
                  ),
                  TextFormField(
                    controller: _maintenance,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Maintenance (₹ / month)'),
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              FormSection(
                title: 'Address',
                subtitle: 'Only the partner who verifies sees the full address.',
                children: [
                  TextFormField(
                    controller: _address,
                    maxLines: 2,
                    decoration: const InputDecoration(labelText: 'Full address (house no., street)'),
                    validator: (v) => Validators.required(v, label: 'Address'),
                  ),
                  TextFormField(controller: _society, decoration: const InputDecoration(labelText: 'Society / building (optional)')),
                  TextFormField(controller: _locality, decoration: const InputDecoration(labelText: 'Area / locality')),
                  TextFormField(controller: _amenities, decoration: const InputDecoration(labelText: 'Amenities', hintText: 'Lift, Parking, Gym')),
                ],
              ),
              const SizedBox(height: AppSpacing.md),
              FormSection(
                title: 'Photos',
                subtitle: 'Clear photos of every room. The partner checks them on site.',
                children: [
                  Wrap(
                    spacing: AppSpacing.sm,
                    runSpacing: AppSpacing.sm,
                    children: [
                      for (final url in _photos)
                        Stack(
                          children: [
                            ClipRRect(
                              borderRadius: BorderRadius.circular(AppRadius.sm),
                              child: Image.network(
                                url.startsWith('http') ? url : '${ApiClient.baseUrl}$url',
                                width: 84,
                                height: 84,
                                fit: BoxFit.cover,
                              ),
                            ),
                            Positioned(
                              right: 0,
                              top: 0,
                              child: InkWell(
                                onTap: () => setState(() => _photos.remove(url)),
                                child: const CircleAvatar(radius: 10, backgroundColor: Colors.black54, child: Icon(Icons.close, size: 12, color: Colors.white)),
                              ),
                            ),
                          ],
                        ),
                    ],
                  ),
                  AppButton(
                    label: _photos.isEmpty ? 'Add photos' : 'Add more photos',
                    icon: Icons.add_a_photo_outlined,
                    variant: AppButtonVariant.secondary,
                    loading: _uploading,
                    onPressed: _uploading ? null : _addPhotos,
                  ),
                ],
              ),
              const SizedBox(height: AppSpacing.lg),
              AppButton(label: 'Submit for verification', icon: Icons.send_outlined, loading: _busy, expand: true, onPressed: _busy ? null : _submit),
              const SizedBox(height: AppSpacing.lg),
            ],
          ),
        ),
      ),
    );
  }

  Widget _locationCard() {
    final ok = _lat != null && _lng != null;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: ok ? AppColors.success.withValues(alpha: 0.08) : AppColors.warning.withValues(alpha: 0.10),
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: ok ? AppColors.success.withValues(alpha: 0.3) : AppColors.warning.withValues(alpha: 0.3)),
      ),
      child: Row(
        children: [
          Icon(ok ? Icons.location_on : Icons.location_off_outlined, color: ok ? AppColors.success : AppColors.warning),
          const SizedBox(width: AppSpacing.sm),
          Expanded(
            child: Text(
              _locating
                  ? 'Getting your location…'
                  : ok
                      ? 'Location captured. A partner within 5 km will be alerted.'
                      : 'Location is OFF. Turn it on and stand at the property so we can find a partner near you.',
              style: Theme.of(context).textTheme.bodySmall?.copyWith(fontWeight: FontWeight.w600),
            ),
          ),
          if (!ok && !_locating) TextButton(onPressed: _askLocation, child: const Text('Turn on')),
        ],
      ),
    );
  }
}

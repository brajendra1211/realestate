import 'package:flutter/material.dart';

import '../../models/geo_option.dart';
import '../../services/geo_service.dart';
import '../network/api_exception.dart';
import '../theme/app_colors.dart';
import '../theme/app_spacing.dart';
import '../utils/error_messages.dart';
import 'empty_state.dart';
import 'error_view.dart';

/// Tappable field (styled like a [TextFormField]) that opens a bottom sheet
/// to pick a real city via a country -> state -> city cascade fed by
/// [GeoService]. `/api/geo/*` requires a logged-in session of any role, so
/// only use this on screens reached after a buyer/agent/investor login —
/// never on pre-auth screens like registration or public search.
class CityPickerField extends FormField<GeoOption> {
  CityPickerField({
    super.key,
    required GeoService geoService,
    String labelText = 'City',
    ValueChanged<GeoOption>? onChanged,
    super.initialValue,
    super.validator,
    super.onSaved,
  }) : super(
          builder: (field) => _PickerTile(
            labelText: labelText,
            prefixIcon: Icons.location_city_outlined,
            value: field.value?.name,
            errorText: field.errorText,
            onTap: () async {
              final picked = await showStateCityPicker(field.context, geoService);
              if (picked != null) {
                field.didChange(picked);
                onChanged?.call(picked);
              }
            },
          ),
        );
}

/// Companion field for picking a locality within a previously-picked city
/// (disabled until [cityId] is set).
class LocalityPickerField extends FormField<GeoOption> {
  LocalityPickerField({
    super.key,
    required GeoService geoService,
    required String? cityId,
    String labelText = 'Locality (optional)',
    ValueChanged<GeoOption>? onChanged,
    super.initialValue,
    super.onSaved,
  }) : super(
          builder: (field) => _PickerTile(
            labelText: labelText,
            prefixIcon: Icons.pin_drop_outlined,
            value: field.value?.name,
            errorText: field.errorText,
            enabled: cityId != null,
            onTap: cityId == null
                ? null
                : () async {
                    final picked = await showSingleLevelPicker(
                      field.context,
                      title: 'Select locality',
                      fetcher: () => geoService.getLocalities(cityId),
                    );
                    if (picked != null) {
                      field.didChange(picked);
                      onChanged?.call(picked);
                    }
                  },
          ),
        );
}

/// Country -> state -> city cascade. The platform is India-only today (the
/// backend "defaults to India" per docs), so the first country is picked
/// automatically without prompting.
Future<GeoOption?> showStateCityPicker(
  BuildContext context,
  GeoService geoService,
) async {
  final countries = await _fetchWithLoadingDialog(context, geoService.getCountries());
  if (countries == null || countries.isEmpty || !context.mounted) return null;
  final country = countries.first;

  final state = await showSingleLevelPicker(
    context,
    title: 'Select state',
    fetcher: () => geoService.getStates(country.id),
  );
  if (state == null || !context.mounted) return null;

  return showSingleLevelPicker(
    context,
    title: 'Select city',
    fetcher: () => geoService.getCities(state.id),
  );
}

/// Fetches a flat list and lets the user search/pick one entry from it.
Future<GeoOption?> showSingleLevelPicker(
  BuildContext context, {
  required String title,
  required Future<List<GeoOption>> Function() fetcher,
}) {
  return showModalBottomSheet<GeoOption>(
    context: context,
    isScrollControlled: true,
    backgroundColor: Colors.white,
    shape: const RoundedRectangleBorder(
      borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
    ),
    builder: (context) => _GeoListSheet(title: title, fetcher: fetcher),
  );
}

Future<List<GeoOption>?> _fetchWithLoadingDialog(
  BuildContext context,
  Future<List<GeoOption>> future,
) async {
  showDialog<void>(
    context: context,
    barrierDismissible: false,
    builder: (_) => const Center(child: CircularProgressIndicator(color: AppColors.gold)),
  );
  try {
    final result = await future;
    if (context.mounted) Navigator.of(context, rootNavigator: true).pop();
    return result;
  } on ApiException catch (e) {
    if (context.mounted) {
      Navigator.of(context, rootNavigator: true).pop();
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
    return null;
  }
}

class _PickerTile extends StatelessWidget {
  const _PickerTile({
    required this.labelText,
    required this.prefixIcon,
    required this.value,
    required this.onTap,
    this.errorText,
    this.enabled = true,
  });

  final String labelText;
  final IconData prefixIcon;
  final String? value;
  final VoidCallback? onTap;
  final String? errorText;
  final bool enabled;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.sm),
      child: InputDecorator(
        decoration: InputDecoration(
          labelText: labelText,
          prefixIcon: Icon(prefixIcon),
          suffixIcon: const Icon(Icons.expand_more),
          errorText: errorText,
          enabled: enabled,
        ),
        child: Text(
          value ?? 'Tap to select',
          style: TextStyle(
            color: value == null ? AppColors.textMuted : AppColors.textPrimary,
          ),
        ),
      ),
    );
  }
}

class _GeoListSheet extends StatefulWidget {
  const _GeoListSheet({required this.title, required this.fetcher});

  final String title;
  final Future<List<GeoOption>> Function() fetcher;

  @override
  State<_GeoListSheet> createState() => _GeoListSheetState();
}

class _GeoListSheetState extends State<_GeoListSheet> {
  late Future<List<GeoOption>> _future;
  final _searchController = TextEditingController();
  String _query = '';

  @override
  void initState() {
    super.initState();
    _future = widget.fetcher();
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return DraggableScrollableSheet(
      initialChildSize: 0.6,
      minChildSize: 0.4,
      maxChildSize: 0.9,
      expand: false,
      builder: (context, scrollController) => Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.md, AppSpacing.lg, AppSpacing.lg,
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Center(
              child: Container(
                width: 36,
                height: 4,
                margin: const EdgeInsets.only(bottom: AppSpacing.md),
                decoration: BoxDecoration(
                  color: AppColors.divider,
                  borderRadius: BorderRadius.circular(2),
                ),
              ),
            ),
            Text(widget.title, style: Theme.of(context).textTheme.titleMedium),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: _searchController,
              decoration: const InputDecoration(
                hintText: 'Search...',
                prefixIcon: Icon(Icons.search),
              ),
              onChanged: (v) => setState(() => _query = v.trim().toLowerCase()),
            ),
            const SizedBox(height: AppSpacing.sm),
            Expanded(
              child: FutureBuilder<List<GeoOption>>(
                future: _future,
                builder: (context, snapshot) {
                  if (snapshot.connectionState != ConnectionState.done) {
                    return const Center(
                      child: CircularProgressIndicator(color: AppColors.gold),
                    );
                  }
                  if (snapshot.hasError) {
                    final message = snapshot.error is ApiException
                        ? errorMessageFor(snapshot.error as ApiException)
                        : 'Something went wrong.';
                    return ErrorView(
                      message: message,
                      onRetry: () => setState(() => _future = widget.fetcher()),
                    );
                  }
                  final options = (snapshot.data ?? [])
                      .where((o) => o.name.toLowerCase().contains(_query))
                      .toList();
                  if (options.isEmpty) {
                    return const EmptyState(message: 'No matches.');
                  }
                  return ListView.separated(
                    controller: scrollController,
                    itemCount: options.length,
                    separatorBuilder: (_, _) =>
                        const Divider(height: 1, color: AppColors.divider),
                    itemBuilder: (context, index) {
                      final option = options[index];
                      return ListTile(
                        title: Text(option.name),
                        onTap: () => Navigator.of(context).pop(option),
                      );
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }
}

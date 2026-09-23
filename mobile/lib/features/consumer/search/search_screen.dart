import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/enum_labels.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../core/widgets/search_pill_field.dart';
import '../../../models/public_listing.dart';
import '../../../services/public_listings_service.dart';
import 'widgets/listing_card.dart';

const _propertyTypes = [
  'APARTMENT',
  'VILLA',
  'INDEPENDENT_HOUSE',
  'PLOT',
  'COMMERCIAL',
  'OFFICE',
];

class SearchScreen extends StatefulWidget {
  const SearchScreen({super.key});

  @override
  State<SearchScreen> createState() => _SearchScreenState();
}

class _SearchScreenState extends State<SearchScreen> {
  late final PublicListingsService _service;
  final _cityController = TextEditingController();
  String? _listingType; // null = any, else SALE/RENT
  Future<List<PublicListingSummary>>? _future;
  bool _initialized = false;

  // The backend's public /api/listings only accepts city/listingType (see
  // `PublicListingsService`), but the website's own /properties page filters
  // by propertyType/bedrooms/price too via a direct server-side query — we
  // replicate that here client-side over the same full result set, same
  // pattern already used for Home's "Verified agents"/"New this week" chips.
  String? _propertyType;
  int? _minBedrooms;
  int? _minPrice;
  int? _maxPrice;

  bool get _hasExtraFilters =>
      _propertyType != null || _minBedrooms != null || _minPrice != null || _maxPrice != null;

  @override
  void initState() {
    super.initState();
    _service = PublicListingsService(ApiClient.instance.dio);
  }

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    // GoRouterState.of(context) depends on an InheritedWidget, which isn't
    // resolvable yet in initState() — this is the first safe place to read
    // the initial ?city= query param passed in from Home.
    if (_initialized) return;
    _initialized = true;
    final params = GoRouterState.of(context).uri.queryParameters;
    final initialCity = params['city'];
    if (initialCity != null) _cityController.text = initialCity;
    final initialListingType = params['listingType'];
    if (initialListingType == 'SALE' || initialListingType == 'RENT') {
      _listingType = initialListingType;
    }
    _search();
  }

  void _search() {
    setState(() {
      _future = _service
          .getListings(city: _cityController.text.trim(), listingType: _listingType)
          .then((listings) => listings.where(_matchesExtraFilters).toList());
    });
  }

  bool _matchesExtraFilters(PublicListingSummary listing) {
    if (_propertyType != null && listing.propertyType != _propertyType) return false;
    if (_minBedrooms != null && (listing.bedrooms ?? 0) < _minBedrooms!) return false;
    if (_minPrice != null && listing.price < _minPrice!) return false;
    if (_maxPrice != null && listing.price > _maxPrice!) return false;
    return true;
  }

  Future<void> _openFilterSheet() async {
    final result = await showModalBottomSheet<_ExtraFilters>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _FilterSheet(
        initial: _ExtraFilters(
          propertyType: _propertyType,
          minBedrooms: _minBedrooms,
          minPrice: _minPrice,
          maxPrice: _maxPrice,
        ),
      ),
    );
    if (result == null) return;
    setState(() {
      _propertyType = result.propertyType;
      _minBedrooms = result.minBedrooms;
      _minPrice = result.minPrice;
      _maxPrice = result.maxPrice;
    });
    _search();
  }

  @override
  void dispose() {
    _cityController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Explore'),
        actions: [
          IconButton(
            icon: Icon(_hasExtraFilters ? Icons.tune : Icons.tune_outlined),
            color: _hasExtraFilters ? AppColors.gold : null,
            tooltip: 'Filters',
            onPressed: _openFilterSheet,
          ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.fromLTRB(
          AppSpacing.lg, AppSpacing.sm, AppSpacing.lg, AppSpacing.lg,
        ),
        child: Column(
          children: [
            SearchPillField(
              controller: _cityController,
              hintText: 'City (e.g. Mumbai)',
              onSubmitted: (_) => _search(),
            ),
            const SizedBox(height: AppSpacing.md),
            Row(
              children: [
                _FilterChip(
                  label: 'Any',
                  selected: _listingType == null,
                  onTap: () => setState(() {
                    _listingType = null;
                    _search();
                  }),
                ),
                const SizedBox(width: AppSpacing.sm),
                _FilterChip(
                  label: 'For Sale',
                  selected: _listingType == 'SALE',
                  onTap: () => setState(() {
                    _listingType = 'SALE';
                    _search();
                  }),
                ),
                const SizedBox(width: AppSpacing.sm),
                _FilterChip(
                  label: 'For Rent',
                  selected: _listingType == 'RENT',
                  onTap: () => setState(() {
                    _listingType = 'RENT';
                    _search();
                  }),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Expanded(
              child: FutureBuilder<List<PublicListingSummary>>(
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
                    return ErrorView(message: message, onRetry: _search);
                  }
                  final listings = snapshot.data ?? [];
                  if (listings.isEmpty) {
                    return const EmptyState(message: 'No listings match your search.');
                  }
                  return GridView.builder(
                    itemCount: listings.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: AppSpacing.sm,
                      crossAxisSpacing: AppSpacing.sm,
                      childAspectRatio: 0.62,
                    ),
                    itemBuilder: (context, index) {
                      final listing = listings[index];
                      return ListingCard(
                        listing: listing,
                        onTap: () => context.push(
                          RoutePaths.listingDetailPath(listing.slug),
                        ),
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

class _ExtraFilters {
  const _ExtraFilters({this.propertyType, this.minBedrooms, this.minPrice, this.maxPrice});

  final String? propertyType;
  final int? minBedrooms;
  final int? minPrice;
  final int? maxPrice;
}

class _FilterSheet extends StatefulWidget {
  const _FilterSheet({required this.initial});

  final _ExtraFilters initial;

  @override
  State<_FilterSheet> createState() => _FilterSheetState();
}

class _FilterSheetState extends State<_FilterSheet> {
  late String? _propertyType = widget.initial.propertyType;
  late int? _minBedrooms = widget.initial.minBedrooms;
  late final _minPriceController =
      TextEditingController(text: widget.initial.minPrice?.toString() ?? '');
  late final _maxPriceController =
      TextEditingController(text: widget.initial.maxPrice?.toString() ?? '');

  @override
  void dispose() {
    _minPriceController.dispose();
    _maxPriceController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return SafeArea(
      child: Container(
        padding: EdgeInsets.fromLTRB(
          AppSpacing.lg,
          AppSpacing.lg,
          AppSpacing.lg,
          AppSpacing.lg + MediaQuery.viewInsetsOf(context).bottom,
        ),
        decoration: const BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.vertical(top: Radius.circular(AppRadius.lg)),
        ),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Filters', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String?>(
              initialValue: _propertyType,
              decoration: const InputDecoration(labelText: 'Property type'),
              items: [
                const DropdownMenuItem(value: null, child: Text('Any')),
                ..._propertyTypes.map(
                  (t) => DropdownMenuItem(value: t, child: Text(EnumLabels.propertyType(t))),
                ),
              ],
              onChanged: (v) => setState(() => _propertyType = v),
            ),
            const SizedBox(height: AppSpacing.sm),
            DropdownButtonFormField<int?>(
              initialValue: _minBedrooms,
              decoration: const InputDecoration(labelText: 'Bedrooms'),
              items: const [
                DropdownMenuItem(value: null, child: Text('Any')),
                DropdownMenuItem(value: 1, child: Text('1+')),
                DropdownMenuItem(value: 2, child: Text('2+')),
                DropdownMenuItem(value: 3, child: Text('3+')),
                DropdownMenuItem(value: 4, child: Text('4+')),
              ],
              onChanged: (v) => setState(() => _minBedrooms = v),
            ),
            const SizedBox(height: AppSpacing.sm),
            Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _minPriceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Min price'),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: TextField(
                    controller: _maxPriceController,
                    keyboardType: TextInputType.number,
                    decoration: const InputDecoration(labelText: 'Max price'),
                  ),
                ),
              ],
            ),
            const SizedBox(height: AppSpacing.lg),
            Row(
              children: [
                Expanded(
                  child: AppButton(
                    label: 'Clear',
                    variant: AppButtonVariant.secondary,
                    expand: true,
                    onPressed: () => Navigator.of(context).pop(const _ExtraFilters()),
                  ),
                ),
                const SizedBox(width: AppSpacing.sm),
                Expanded(
                  child: AppButton(
                    label: 'Apply',
                    expand: true,
                    onPressed: () => Navigator.of(context).pop(
                      _ExtraFilters(
                        propertyType: _propertyType,
                        minBedrooms: _minBedrooms,
                        minPrice: int.tryParse(_minPriceController.text.trim()),
                        maxPrice: int.tryParse(_maxPriceController.text.trim()),
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({required this.label, required this.selected, required this.onTap});

  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onTap,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 10),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryNavy : Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.pill),
          border: Border.all(
            color: selected ? AppColors.primaryNavy : AppColors.divider,
          ),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.w600,
            color: selected ? AppColors.goldLight : AppColors.textSecondary,
          ),
        ),
      ),
    );
  }
}

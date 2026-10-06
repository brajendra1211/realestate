import 'dart:math';

import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/agreement_urgency.dart';
import '../../../core/utils/enum_labels.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/media.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/public_listing.dart';
import '../../../services/public_listings_service.dart';

const _chipLabels = ['For Sale', 'For Rent', 'Verified channel partners', 'New this week', 'Hot Deals'];

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen>
    with SingleTickerProviderStateMixin {
  late final PublicListingsService _service;
  late Future<List<PublicListingSummary>> _future;
  late final AnimationController _skylineController;
  int _activeChip = 0;
  final Set<String> _favorites = {};
  final _heroSearchController = TextEditingController();
  int _heroTab = 0; // 0: Buy, 1: Rent, 2: Commercial, 3: Plots
  int? _selectedBhk;
  String? _selectedBudgetLabel;
  double? _selectedMinPrice;
  double? _selectedMaxPrice;

  @override
  void initState() {
    super.initState();
    _service = PublicListingsService(ApiClient.instance.dio);
    _future = _load();
    _skylineController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 9),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _skylineController.dispose();
    _heroSearchController.dispose();
    super.dispose();
  }

  // The backend's GET /api/listings only accepts city/listingType — "For
  // Sale"/"For Rent" use that directly, but "Verified agents"/"New this
  // week" have no server-side equivalent, so they filter the same full
  // list client-side using real fields (agentVerified/createdAt) instead of
  // sending query params the backend would just ignore.
  Future<List<PublicListingSummary>> _load() async {
    switch (_activeChip) {
      case 0:
        return _service.getListings(listingType: 'SALE');
      case 1:
        return _service.getListings(listingType: 'RENT');
      case 2:
        final all = await _service.getListings();
        return all.where((l) => l.agentVerified).toList();
      case 3:
        final all = await _service.getListings();
        final cutoff = DateTime.now().subtract(const Duration(days: 7));
        return all.where((l) => l.createdAt.isAfter(cutoff)).toList();
      case 4:
        return _service.getHotDeals();
      default:
        return _service.getListings();
    }
  }

  void _goSearch({
    String? city,
    String? listingType,
    String? propertyType,
    int? bedrooms,
    double? minPrice,
    double? maxPrice,
  }) {
    final params = <String, String>{
      if (city != null && city.isNotEmpty) 'city': city,
      if (listingType != null && listingType.isNotEmpty) 'listingType': listingType,
      if (propertyType != null && propertyType.isNotEmpty) 'propertyType': propertyType,
      if (bedrooms != null) 'bedrooms': bedrooms.toString(),
      if (minPrice != null) 'minPrice': minPrice.toString(),
      if (maxPrice != null) 'maxPrice': maxPrice.toString(),
    };
    context.push(
      params.isEmpty
          ? RoutePaths.search
          : '${RoutePaths.search}?${Uri(queryParameters: params).query}',
    );
  }

  void _executeHeroSearch() {
    String? listingType;
    String? propertyType;
    if (_heroTab == 0) {
      listingType = 'SALE';
    } else if (_heroTab == 1) {
      listingType = 'RENT';
    } else if (_heroTab == 2) {
      propertyType = 'COMMERCIAL';
    } else if (_heroTab == 3) {
      propertyType = 'PLOT';
    }
    _goSearch(
      city: _heroSearchController.text.trim(),
      listingType: listingType,
      propertyType: propertyType,
      bedrooms: _selectedBhk,
      minPrice: _selectedMinPrice,
      maxPrice: _selectedMaxPrice,
    );
  }

  Future<void> _pickHeroBudget() async {
    final budgets = [
      {'label': 'Any Budget', 'min': null, 'max': null},
      {'label': 'Under ₹50 Lac', 'min': 0.0, 'max': 5000000.0},
      {'label': '₹50 Lac - ₹1 Cr', 'min': 5000000.0, 'max': 10000000.0},
      {'label': '₹1 Cr - ₹2 Cr', 'min': 10000000.0, 'max': 20000000.0},
      {'label': '₹2 Cr - ₹5 Cr', 'min': 20000000.0, 'max': 50000000.0},
      {'label': '₹5 Cr+', 'min': 50000000.0, 'max': null},
    ];

    final selected = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 18, 20, 10),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Select Budget', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
            ...budgets.map((b) {
              final isCur = _selectedBudgetLabel == b['label'] || (_selectedBudgetLabel == null && b['label'] == 'Any Budget');
              return ListTile(
                title: Text(b['label'] as String, style: GoogleFonts.inter(fontSize: 14)),
                trailing: isCur ? const Icon(Icons.check, color: AppColors.gold) : null,
                onTap: () => Navigator.of(context).pop(b),
              );
            }),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
    if (selected != null && mounted) {
      setState(() {
        if (selected['label'] == 'Any Budget') {
          _selectedBudgetLabel = null;
          _selectedMinPrice = null;
          _selectedMaxPrice = null;
        } else {
          _selectedBudgetLabel = selected['label'] as String?;
          _selectedMinPrice = selected['min'] as double?;
          _selectedMaxPrice = selected['max'] as double?;
        }
      });
    }
  }

  Future<void> _pickHeroBhk() async {
    final bhks = [
      {'label': 'Any BHK', 'value': null},
      {'label': '1 BHK', 'value': 1},
      {'label': '2 BHK', 'value': 2},
      {'label': '3 BHK', 'value': 3},
      {'label': '4+ BHK', 'value': 4},
    ];

    final selected = await showModalBottomSheet<Map<String, dynamic>>(
      context: context,
      backgroundColor: Colors.white,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(20)),
      ),
      builder: (context) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.fromLTRB(20, 18, 20, 10),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Select BHK', style: TextStyle(fontWeight: FontWeight.w700, fontSize: 16)),
              ),
            ),
            ...bhks.map((b) {
              final isCur = _selectedBhk == b['value'];
              return ListTile(
                title: Text(b['label'] as String, style: GoogleFonts.inter(fontSize: 14)),
                trailing: isCur ? const Icon(Icons.check, color: AppColors.gold) : null,
                onTap: () => Navigator.of(context).pop(b),
              );
            }),
            const SizedBox(height: 12),
          ],
        ),
      ),
    );
    if (selected != null && mounted) {
      setState(() {
        _selectedBhk = selected['value'] as int?;
      });
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(() => _future = _load()),
        child: CustomScrollView(
          slivers: [
            SliverToBoxAdapter(child: _heroWithSearch(context)),
            SliverToBoxAdapter(child: _scanQrPromoCard(context)),
            SliverToBoxAdapter(child: _ownerCalloutBanner(context)),
            SliverToBoxAdapter(child: _categoryGrid(context)),
            SliverToBoxAdapter(child: _chips()),
            SliverToBoxAdapter(child: _sectionHead()),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              sliver: SliverToBoxAdapter(child: _listings()),
            ),
            const SliverToBoxAdapter(child: _HomeEmiCalculatorWidget()),
            SliverToBoxAdapter(child: _priceTrendsWidget(context)),
            SliverToBoxAdapter(child: _topCitiesWidget(context)),
            SliverToBoxAdapter(child: _trustBadgesWidget(context)),
            const SliverToBoxAdapter(child: SizedBox(height: 36)),
          ],
        ),
      ),
    );
  }

  Widget _scanQrPromoCard(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 14),
      child: InkWell(
        onTap: () => context.push(RoutePaths.qrScanner),
        borderRadius: BorderRadius.circular(18),
        child: Container(
          padding: const EdgeInsets.all(16),
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
            ),
            borderRadius: BorderRadius.circular(18),
            border: Border.all(color: AppColors.gold.withValues(alpha: 0.35)),
            boxShadow: [
              BoxShadow(
                color: Colors.black.withValues(alpha: 0.08),
                blurRadius: 10,
                offset: const Offset(0, 4),
              ),
            ],
          ),
          child: Row(
            children: [
              Container(
                width: 50,
                height: 50,
                decoration: BoxDecoration(
                  color: AppColors.gold.withValues(alpha: 0.15),
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: AppColors.gold.withValues(alpha: 0.5)),
                ),
                child: const Icon(
                  Icons.qr_code_scanner_rounded,
                  color: AppColors.goldLight,
                  size: 28,
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Flexible(
                          child: Text(
                            'Scan Channel Partner QR Code',
                            style: GoogleFonts.inter(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white,
                            ),
                            overflow: TextOverflow.ellipsis,
                          ),
                        ),
                        const SizedBox(width: 6),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                          decoration: BoxDecoration(
                            color: AppColors.gold,
                            borderRadius: BorderRadius.circular(6),
                          ),
                          child: Text(
                            '₹50 Unlock',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.w800,
                              color: const Color(0xFF0F172A),
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 3),
                    Text(
                      'Pay ₹50 to unlock channel partner profile & all verified listings',
                      style: GoogleFonts.inter(
                        fontSize: 11.5,
                        color: const Color(0xFF94A3B8),
                        height: 1.3,
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 8),
              Container(
                width: 32,
                height: 32,
                decoration: BoxDecoration(
                  color: Colors.white.withValues(alpha: 0.1),
                  shape: BoxShape.circle,
                ),
                child: const Icon(
                  Icons.arrow_forward_rounded,
                  color: AppColors.goldLight,
                  size: 18,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _heroWithSearch(BuildContext context) {
    final topInset = MediaQuery.paddingOf(context).top;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        _heroStack(context, topInset),
        // Real layout offset (not Positioned+overflow) so the search bar
        // stays hit-testable: a Positioned child that overflows its Stack's
        // bounds paints there via `Clip.none`, but RenderBox hit-testing is
        // still bounded by the Stack's own (unclipped) layout size, so taps
        // landing in the overflow area were silently swallowed — that was
        // the actual "search bar doesn't work" bug. Transform.translate
        // moves both paint AND hit-test region together, so this stays
        // tappable/typeable while still visually overlapping the hero.
        Transform.translate(
          offset: const Offset(0, -40),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 20),
            child: _RiseIn(
              delay: const Duration(milliseconds: 340),
              offset: 16,
              child: _heroSearchBar(),
            ),
          ),
        ),
        const SizedBox(height: 8),
      ],
    );
  }

  Widget _heroStack(BuildContext context, double topInset) {
    return Stack(
      clipBehavior: Clip.none,
      children: [
        Container(
          width: double.infinity,
          padding: EdgeInsets.fromLTRB(26, topInset + 18, 26, 70),
          decoration: const BoxDecoration(
            gradient: LinearGradient(
              begin: Alignment(-0.6, -1),
              end: Alignment(0.8, 0.6),
              colors: [AppColors.navyLight, AppColors.primaryNavy],
              stops: [0, 0.85],
            ),
          ),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _RiseIn(
                delay: const Duration(milliseconds: 100),
                child: RichText(
                  text: TextSpan(
                    style: GoogleFonts.fraunces(
                      fontSize: 34,
                      fontWeight: FontWeight.w600,
                      color: AppColors.background,
                      letterSpacing: -0.2,
                    ),
                    children: [
                      const TextSpan(text: 'Baya'),
                      TextSpan(
                        text: 'Estate',
                        style: GoogleFonts.fraunces(
                          fontSize: 34,
                          fontWeight: FontWeight.w500,
                          fontStyle: FontStyle.italic,
                          color: AppColors.goldLight,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(height: 8),
              _RiseIn(
                delay: const Duration(milliseconds: 220),
                child: SizedBox(
                  width: 230,
                  child: Text(
                    'Curated, verified listings from channel partners who show up.',
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      color: const Color(0xFFC6CEDB),
                      height: 1.5,
                    ),
                  ),
                ),
              ),
            ],
          ),
        ),
        Positioned(
          right: 20,
          top: topInset + 18,
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              GestureDetector(
                onTap: () => context.push(RoutePaths.qrScanner),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                  decoration: BoxDecoration(
                    color: AppColors.gold.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: AppColors.goldLight.withValues(alpha: 0.4)),
                  ),
                  child: Row(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.qr_code_scanner_rounded, color: AppColors.goldLight, size: 16),
                      const SizedBox(width: 4),
                      Text(
                        'Scan QR',
                        style: GoogleFonts.inter(
                          color: AppColors.goldLight,
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              GestureDetector(
                onTap: () => context.push(RoutePaths.account),
                child: Container(
                  width: 36,
                  height: 36,
                  alignment: Alignment.center,
                  decoration: BoxDecoration(
                    color: Colors.white.withValues(alpha: 0.12),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.person_outline, color: AppColors.background, size: 19),
                ),
              ),
            ],
          ),
        ),
        Positioned(
          right: -20,
          top: topInset + 26,
          child: IgnorePointer(
            child: AnimatedBuilder(
              animation: _skylineController,
              builder: (context, _) => Opacity(
                opacity: .35,
                child: Transform.translate(
                  offset: Offset(
                    0,
                    -8 * Curves.easeInOut.transform(_skylineController.value),
                  ),
                  child: CustomPaint(
                    size: const Size(200, 82),
                    painter: const _SkylinePainter(),
                  ),
                ),
              ),
            ),
          ),
        ),
      ],
    );
  }

  Widget _heroSearchBar() {
    final tabs = ['Buy', 'Rent', 'Commercial', 'Plots'];

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryNavy.withValues(alpha: 0.16),
            blurRadius: 32,
            offset: const Offset(0, 14),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          // Top Tabs
          Container(
            padding: const EdgeInsets.fromLTRB(8, 8, 8, 4),
            decoration: const BoxDecoration(
              border: Border(bottom: BorderSide(color: Color(0xFFF1F5F9))),
            ),
            child: Row(
              children: List.generate(tabs.length, (i) {
                final active = _heroTab == i;
                return Expanded(
                  child: GestureDetector(
                    onTap: () => setState(() => _heroTab = i),
                    child: Container(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      decoration: BoxDecoration(
                        color: active ? AppColors.primaryNavy : Colors.transparent,
                        borderRadius: BorderRadius.circular(10),
                      ),
                      alignment: Alignment.center,
                      child: Text(
                        tabs[i],
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: active ? FontWeight.w700 : FontWeight.w500,
                          color: active ? AppColors.goldLight : AppColors.textSecondary,
                        ),
                      ),
                    ),
                  ),
                );
              }),
            ),
          ),
          // Search Input Row
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 4),
            child: Row(
              children: [
                const Icon(Icons.location_on_outlined, size: 20, color: AppColors.gold),
                const SizedBox(width: 10),
                Expanded(
                  child: TextField(
                    controller: _heroSearchController,
                    textInputAction: TextInputAction.search,
                    style: GoogleFonts.inter(fontSize: 14.5, color: AppColors.charcoal),
                    decoration: InputDecoration(
                      isDense: true,
                      border: InputBorder.none,
                      contentPadding: const EdgeInsets.symmetric(vertical: 12),
                      hintText: 'Search city, locality, project…',
                      hintStyle: GoogleFonts.inter(fontSize: 14, color: AppColors.textMuted),
                    ),
                    onSubmitted: (_) => _executeHeroSearch(),
                  ),
                ),
                if (_heroSearchController.text.isNotEmpty)
                  GestureDetector(
                    onTap: () {
                      _heroSearchController.clear();
                      setState(() {});
                    },
                    child: const Icon(Icons.close_rounded, size: 18, color: Colors.grey),
                  ),
              ],
            ),
          ),
          // Filter Chips & Search Action Row
          Container(
            padding: const EdgeInsets.fromLTRB(12, 4, 12, 12),
            child: Row(
              children: [
                // Budget Chip
                Expanded(
                  child: GestureDetector(
                    onTap: _pickHeroBudget,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _selectedBudgetLabel != null ? AppColors.gold : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.currency_rupee_rounded,
                            size: 14,
                            color: _selectedBudgetLabel != null ? AppColors.gold : AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _selectedBudgetLabel ?? 'Budget',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: _selectedBudgetLabel != null ? FontWeight.w600 : FontWeight.normal,
                                color: _selectedBudgetLabel != null ? AppColors.charcoal : AppColors.textSecondary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.textMuted),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // BHK Chip
                Expanded(
                  child: GestureDetector(
                    onTap: _pickHeroBhk,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 8),
                      decoration: BoxDecoration(
                        color: const Color(0xFFF8FAFC),
                        borderRadius: BorderRadius.circular(10),
                        border: Border.all(
                          color: _selectedBhk != null ? AppColors.gold : const Color(0xFFE2E8F0),
                        ),
                      ),
                      child: Row(
                        children: [
                          Icon(
                            Icons.bed_rounded,
                            size: 14,
                            color: _selectedBhk != null ? AppColors.gold : AppColors.textMuted,
                          ),
                          const SizedBox(width: 4),
                          Expanded(
                            child: Text(
                              _selectedBhk != null ? '$_selectedBhk BHK' : 'BHK',
                              style: GoogleFonts.inter(
                                fontSize: 11.5,
                                fontWeight: _selectedBhk != null ? FontWeight.w600 : FontWeight.normal,
                                color: _selectedBhk != null ? AppColors.charcoal : AppColors.textSecondary,
                              ),
                              overflow: TextOverflow.ellipsis,
                            ),
                          ),
                          const Icon(Icons.arrow_drop_down, size: 16, color: AppColors.textMuted),
                        ],
                      ),
                    ),
                  ),
                ),
                const SizedBox(width: 8),
                // Search Submit Button
                GestureDetector(
                  onTap: _executeHeroSearch,
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFFD4AF37), Color(0xFFAA8010)],
                      ),
                      borderRadius: BorderRadius.circular(10),
                      boxShadow: [
                        BoxShadow(
                          color: AppColors.gold.withValues(alpha: 0.3),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.search, size: 16, color: Colors.white),
                        const SizedBox(width: 4),
                        Text(
                          'Search',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w700,
                            color: Colors.white,
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _ownerCalloutBanner(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Container(
        decoration: BoxDecoration(
          gradient: const LinearGradient(
            colors: [Color(0xFF1E293B), Color(0xFF0F172A)],
            begin: Alignment.topLeft,
            end: Alignment.bottomRight,
          ),
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: AppColors.gold.withValues(alpha: 0.3)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.08),
              blurRadius: 12,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: AppColors.gold.withValues(alpha: 0.2),
                    borderRadius: BorderRadius.circular(6),
                    border: Border.all(color: AppColors.goldLight.withValues(alpha: 0.5)),
                  ),
                  child: Text(
                    'ZERO BROKERAGE',
                    style: GoogleFonts.inter(
                      fontSize: 10,
                      fontWeight: FontWeight.w800,
                      color: AppColors.goldLight,
                      letterSpacing: 0.5,
                    ),
                  ),
                ),
                const Spacer(),
                const Icon(Icons.verified_outlined, size: 18, color: AppColors.goldLight),
              ],
            ),
            const SizedBox(height: 10),
            Text(
              'Are you a Property Owner?',
              style: GoogleFonts.fraunces(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: Colors.white,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Sell or rent your property directly with zero brokerage. Connect with genuine verified buyers.',
              style: GoogleFonts.inter(
                fontSize: 12,
                color: const Color(0xFF94A3B8),
                height: 1.4,
              ),
            ),
            const SizedBox(height: 14),
            ElevatedButton.icon(
              onPressed: () => context.push(RoutePaths.buyerGoldListing),
              icon: const Icon(Icons.add_home_work_rounded, size: 16),
              label: const Text('Post Property Free'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.gold,
                foregroundColor: const Color(0xFF0F172A),
                elevation: 0,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                ),
                textStyle: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w700,
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _categoryGrid(BuildContext context) {
    final categories = [
      {'title': 'Apartments', 'subtitle': 'Flats & High-rise', 'type': 'APARTMENT', 'icon': Icons.apartment_rounded},
      {'title': 'Villas', 'subtitle': 'Luxury & Independent', 'type': 'VILLA', 'icon': Icons.villa_rounded},
      {'title': 'Commercial', 'subtitle': 'Shops & Showrooms', 'type': 'COMMERCIAL', 'icon': Icons.storefront_rounded},
      {'title': 'Plots & Land', 'subtitle': 'Gated & Open', 'type': 'PLOT', 'icon': Icons.landscape_rounded},
      {'title': 'Builder Floors', 'subtitle': 'Independent Floors', 'type': 'BUILDER_FLOOR', 'icon': Icons.layers_rounded},
      {'title': 'Office Space', 'subtitle': 'Workspaces & Co-work', 'type': 'OFFICE', 'icon': Icons.business_center_rounded},
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'Explore Property Types',
                style: GoogleFonts.fraunces(
                  fontSize: 19,
                  fontWeight: FontWeight.w600,
                  color: AppColors.charcoal,
                ),
              ),
              GestureDetector(
                onTap: () => _goSearch(),
                child: Text(
                  'All Types',
                  style: GoogleFonts.inter(
                    fontSize: 12,
                    fontWeight: FontWeight.w600,
                    color: AppColors.gold,
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          GridView.builder(
            shrinkWrap: true,
            physics: const NeverScrollableScrollPhysics(),
            itemCount: categories.length,
            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
              crossAxisCount: 3,
              crossAxisSpacing: 10,
              mainAxisSpacing: 10,
              childAspectRatio: 0.95,
            ),
            itemBuilder: (context, index) {
              final cat = categories[index];
              return InkWell(
                onTap: () => _goSearch(propertyType: cat['type'] as String),
                borderRadius: BorderRadius.circular(14),
                child: Container(
                  padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.03),
                        blurRadius: 6,
                        offset: const Offset(0, 2),
                      ),
                    ],
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Container(
                        width: 38,
                        height: 38,
                        decoration: const BoxDecoration(
                          color: AppColors.surfaceAlt,
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          cat['icon'] as IconData,
                          size: 20,
                          color: AppColors.primaryNavy,
                        ),
                      ),
                      const SizedBox(height: 8),
                      Text(
                        cat['title'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 11.5,
                          fontWeight: FontWeight.w700,
                          color: AppColors.charcoal,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        cat['subtitle'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 9.5,
                          color: AppColors.textMuted,
                        ),
                        textAlign: TextAlign.center,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Widget _chips() {
    return SizedBox(
      height: 40,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        itemCount: _chipLabels.length,
        separatorBuilder: (_, _) => const SizedBox(width: 9),
        itemBuilder: (context, i) {
          final active = i == _activeChip;
          return GestureDetector(
            onTap: () => setState(() {
              _activeChip = i;
              _future = _load();
            }),
            child: AnimatedContainer(
              duration: const Duration(milliseconds: 200),
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 9),
              decoration: BoxDecoration(
                color: active ? AppColors.primaryNavy : Colors.white,
                borderRadius: BorderRadius.circular(999),
                border: Border.all(
                  color: active ? AppColors.primaryNavy : const Color(0xFFE4DDCD),
                ),
              ),
              alignment: Alignment.center,
              child: Text(
                _chipLabels[i],
                style: GoogleFonts.inter(
                  fontSize: 13,
                  fontWeight: FontWeight.w500,
                  color: active ? AppColors.goldLight : AppColors.textSecondary,
                ),
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _sectionHead() {
    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 26, 20, 14),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.end,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(
            'Featured listings',
            style: GoogleFonts.fraunces(
              fontSize: 22,
              fontWeight: FontWeight.w600,
              color: AppColors.charcoal,
            ),
          ),
          GestureDetector(
            onTap: () => _goSearch(),
            child: Text(
              'View all',
              style: GoogleFonts.inter(
                fontSize: 12.5,
                fontWeight: FontWeight.w600,
                color: AppColors.gold,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _listings() {
    return FutureBuilder<List<PublicListingSummary>>(
      future: _future,
      builder: (context, snapshot) {
        if (snapshot.connectionState != ConnectionState.done) {
          return const Padding(
            padding: EdgeInsets.symmetric(vertical: 48),
            child: Center(child: CircularProgressIndicator(color: AppColors.gold)),
          );
        }
        if (snapshot.hasError) {
          final message = snapshot.error is ApiException
              ? errorMessageFor(snapshot.error as ApiException)
              : 'Something went wrong.';
          return ErrorView(
            message: message,
            onRetry: () => setState(() => _future = _load()),
          );
        }
        final listings = snapshot.data ?? [];
        if (listings.isEmpty) {
          return const EmptyState(message: 'No listings available yet.');
        }
        final shown = listings.length > 6 ? listings.sublist(0, 6) : listings;
        return Column(
          children: [
            for (var i = 0; i < shown.length; i++)
              Padding(
                padding: const EdgeInsets.only(bottom: 18),
                child: _RiseIn(
                  delay: Duration(milliseconds: 80 + i * 140),
                  child: _HomeListingCard(
                    listing: shown[i],
                    liked: _favorites.contains(shown[i].id),
                    onToggleFavorite: () => setState(() {
                      _favorites.contains(shown[i].id)
                          ? _favorites.remove(shown[i].id)
                          : _favorites.add(shown[i].id);
                    }),
                    onTap: () => context.push(
                      RoutePaths.listingDetailPath(shown[i].slug),
                    ),
                  ),
                ),
              ),
          ],
        );
      },
    );
  }

  Widget _priceTrendsWidget(BuildContext context) {
    final trends = [
      {'city': 'Delhi NCR', 'rate': '₹8,450', 'change': '+12.4%'},
      {'city': 'Mumbai', 'rate': '₹21,800', 'change': '+8.2%'},
      {'city': 'Bengaluru', 'rate': '₹9,650', 'change': '+14.1%'},
      {'city': 'Gurugram', 'rate': '₹11,200', 'change': '+18.5%'},
      {'city': 'Pune', 'rate': '₹7,900', 'change': '+9.7%'},
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Market Price Trends',
                    style: GoogleFonts.fraunces(
                      fontSize: 19,
                      fontWeight: FontWeight.w600,
                      color: AppColors.charcoal,
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Average residential rates / sq.ft',
                    style: GoogleFonts.inter(
                      fontSize: 12,
                      color: AppColors.textMuted,
                    ),
                  ),
                ],
              ),
              const Icon(Icons.trending_up_rounded, color: AppColors.gold, size: 24),
            ],
          ),
          const SizedBox(height: 12),
          SizedBox(
            height: 96,
            child: ListView.separated(
              scrollDirection: Axis.horizontal,
              itemCount: trends.length,
              separatorBuilder: (_, _) => const SizedBox(width: 10),
              itemBuilder: (context, i) {
                final t = trends[i];
                return InkWell(
                  onTap: () => _goSearch(city: t['city']),
                  borderRadius: BorderRadius.circular(14),
                  child: Container(
                    width: 140,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withValues(alpha: 0.03),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Expanded(
                              child: Text(
                                t['city']!,
                                style: GoogleFonts.inter(
                                  fontSize: 12,
                                  fontWeight: FontWeight.w700,
                                  color: AppColors.charcoal,
                                ),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 4, vertical: 1.5),
                              decoration: BoxDecoration(
                                color: const Color(0xFFDCFCE7),
                                borderRadius: BorderRadius.circular(4),
                              ),
                              child: Text(
                                t['change']!,
                                style: GoogleFonts.inter(
                                  fontSize: 9.5,
                                  fontWeight: FontWeight.bold,
                                  color: const Color(0xFF16A34A),
                                ),
                              ),
                            ),
                          ],
                        ),
                        Text(
                          t['rate']!,
                          style: GoogleFonts.fraunces(
                            fontSize: 16,
                            fontWeight: FontWeight.w700,
                            color: AppColors.primaryNavy,
                          ),
                        ),
                        Text(
                          'per sq.ft • Explore >',
                          style: GoogleFonts.inter(
                            fontSize: 10,
                            fontWeight: FontWeight.w500,
                            color: AppColors.gold,
                          ),
                        ),
                      ],
                    ),
                  ),
                );
              },
            ),
          ),
        ],
      ),
    );
  }

  Widget _topCitiesWidget(BuildContext context) {
    final cities = [
      {'name': 'Delhi NCR', 'icon': Icons.location_city_rounded},
      {'name': 'Mumbai', 'icon': Icons.apartment_rounded},
      {'name': 'Bengaluru', 'icon': Icons.domain_rounded},
      {'name': 'Gurugram', 'icon': Icons.business_rounded},
      {'name': 'Pune', 'icon': Icons.holiday_village_rounded},
      {'name': 'Hyderabad', 'icon': Icons.corporate_fare_rounded},
      {'name': 'Noida', 'icon': Icons.location_city_outlined},
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 20),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Top Real Estate Hubs',
            style: GoogleFonts.fraunces(
              fontSize: 19,
              fontWeight: FontWeight.w600,
              color: AppColors.charcoal,
            ),
          ),
          const SizedBox(height: 12),
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: cities.map((c) {
              return ActionChip(
                avatar: Icon(c['icon'] as IconData, size: 16, color: AppColors.primaryNavy),
                label: Text(c['name'] as String),
                labelStyle: GoogleFonts.inter(
                  fontSize: 12,
                  fontWeight: FontWeight.w600,
                  color: AppColors.charcoal,
                ),
                backgroundColor: Colors.white,
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(10),
                  side: const BorderSide(color: const Color(0xFFE2E8F0)),
                ),
                onPressed: () => _goSearch(city: c['name'] as String),
              );
            }).toList(),
          ),
        ],
      ),
    );
  }

  Widget _trustBadgesWidget(BuildContext context) {
    final badges = [
      {
        'title': '100% Verified Partners',
        'desc': 'All channel partners RERA registered & verified',
        'icon': Icons.verified_user_rounded,
      },
      {
        'title': 'Zero Hidden Charges',
        'desc': 'Transparent listings with direct pricing',
        'icon': Icons.price_check_rounded,
      },
      {
        'title': 'Direct Partner Connect',
        'desc': 'Direct contact with verified referral partners',
        'icon': Icons.support_agent_rounded,
      },
      {
        'title': 'Curated Video Tours',
        'desc': 'Real YouTube & drone walkthrough videos',
        'icon': Icons.play_circle_filled_rounded,
      },
    ];

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
      child: Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(18),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Why Baya Estate?',
              style: GoogleFonts.fraunces(
                fontSize: 18,
                fontWeight: FontWeight.w700,
                color: AppColors.charcoal,
              ),
            ),
            const SizedBox(height: 12),
            GridView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              itemCount: badges.length,
              gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                crossAxisCount: 2,
                crossAxisSpacing: 10,
                mainAxisSpacing: 10,
                childAspectRatio: 1.45,
              ),
              itemBuilder: (context, i) {
                final b = badges[i];
                return Container(
                  padding: const EdgeInsets.all(10),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(b['icon'] as IconData, size: 20, color: AppColors.gold),
                      const SizedBox(height: 6),
                      Text(
                        b['title'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 11,
                          fontWeight: FontWeight.w700,
                          color: AppColors.charcoal,
                        ),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                      const SizedBox(height: 2),
                      Text(
                        b['desc'] as String,
                        style: GoogleFonts.inter(
                          fontSize: 9.5,
                          color: AppColors.textMuted,
                        ),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ],
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }
}

class _HomeEmiCalculatorWidget extends StatefulWidget {
  const _HomeEmiCalculatorWidget();

  @override
  State<_HomeEmiCalculatorWidget> createState() => _HomeEmiCalculatorWidgetState();
}

class _HomeEmiCalculatorWidgetState extends State<_HomeEmiCalculatorWidget> {
  double _loanAmountLakhs = 50.0; // ₹50 Lakhs
  double _interestRate = 8.5; // 8.5%
  double _tenureYears = 20.0; // 20 years

  @override
  Widget build(BuildContext context) {
    final principal = _loanAmountLakhs * 100000;
    final r = (_interestRate / 12) / 100;
    final n = _tenureYears * 12;

    double emi = 0;
    if (r > 0 && n > 0) {
      emi = (principal * r * pow(1 + r, n)) / (pow(1 + r, n) - 1);
    }
    final totalAmount = emi * n;
    final totalInterest = totalAmount > principal ? totalAmount - principal : 0.0;
    final principalRatio = totalAmount > 0 ? (principal / totalAmount).clamp(0.05, 0.95) : 0.5;

    return Padding(
      padding: const EdgeInsets.fromLTRB(20, 10, 20, 20),
      child: Container(
        padding: const EdgeInsets.all(18),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFE2E8F0)),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.04),
              blurRadius: 14,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      'Home Loan EMI Calculator',
                      style: GoogleFonts.fraunces(
                        fontSize: 18,
                        fontWeight: FontWeight.w700,
                        color: AppColors.charcoal,
                      ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      'Plan your property purchase budget',
                      style: GoogleFonts.inter(
                        fontSize: 12,
                        color: AppColors.textMuted,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: const BoxDecoration(
                    color: AppColors.surfaceAlt,
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(Icons.calculate_outlined, color: AppColors.primaryNavy, size: 20),
                ),
              ],
            ),
            const SizedBox(height: 16),
            // Monthly EMI display card
            Container(
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [Color(0xFF0F172A), Color(0xFF1E293B)],
                ),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        'Monthly EMI',
                        style: GoogleFonts.inter(fontSize: 12, color: const Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        Formatters.price(emi.round()),
                        style: GoogleFonts.fraunces(
                          fontSize: 22,
                          fontWeight: FontWeight.bold,
                          color: AppColors.goldLight,
                        ),
                      ),
                    ],
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        'Total Interest',
                        style: GoogleFonts.inter(fontSize: 11, color: const Color(0xFF94A3B8)),
                      ),
                      const SizedBox(height: 2),
                      Text(
                        Formatters.price(totalInterest.round()),
                        style: GoogleFonts.inter(
                          fontSize: 13,
                          fontWeight: FontWeight.w700,
                          color: Colors.white,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            // Loan Amount Slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Loan Amount',
                  style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.charcoal),
                ),
                Text(
                  _loanAmountLakhs >= 100
                      ? '₹${(_loanAmountLakhs / 100).toStringAsFixed(2)} Cr'
                      : '₹${_loanAmountLakhs.toStringAsFixed(0)} Lac',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryNavy),
                ),
              ],
            ),
            Slider(
              value: _loanAmountLakhs,
              min: 5.0,
              max: 300.0,
              divisions: 59,
              activeColor: AppColors.primaryNavy,
              inactiveColor: const Color(0xFFE2E8F0),
              onChanged: (val) => setState(() => _loanAmountLakhs = val),
            ),
            // Interest Rate Slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Interest Rate (p.a.)',
                  style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.charcoal),
                ),
                Text(
                  '${_interestRate.toStringAsFixed(1)}%',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryNavy),
                ),
              ],
            ),
            Slider(
              value: _interestRate,
              min: 6.0,
              max: 15.0,
              divisions: 90,
              activeColor: AppColors.gold,
              inactiveColor: const Color(0xFFE2E8F0),
              onChanged: (val) => setState(() => _interestRate = val),
            ),
            // Tenure Slider
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Text(
                  'Loan Tenure',
                  style: GoogleFonts.inter(fontSize: 12.5, fontWeight: FontWeight.w600, color: AppColors.charcoal),
                ),
                Text(
                  '${_tenureYears.toStringAsFixed(0)} Years',
                  style: GoogleFonts.inter(fontSize: 13, fontWeight: FontWeight.bold, color: AppColors.primaryNavy),
                ),
              ],
            ),
            Slider(
              value: _tenureYears,
              min: 1.0,
              max: 30.0,
              divisions: 29,
              activeColor: AppColors.primaryNavy,
              inactiveColor: const Color(0xFFE2E8F0),
              onChanged: (val) => setState(() => _tenureYears = val),
            ),
            const SizedBox(height: 6),
            // Ratio Breakdown Bar
            ClipRRect(
              borderRadius: BorderRadius.circular(6),
              child: SizedBox(
                height: 8,
                child: Row(
                  children: [
                    Expanded(
                      flex: (principalRatio * 100).toInt(),
                      child: Container(color: AppColors.primaryNavy),
                    ),
                    Expanded(
                      flex: ((1 - principalRatio) * 100).toInt(),
                      child: Container(color: AppColors.gold),
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 8),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.primaryNavy, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text('Principal (${(principalRatio * 100).toStringAsFixed(0)}%)', style: GoogleFonts.inter(fontSize: 10.5, color: AppColors.textMuted)),
                  ],
                ),
                Row(
                  children: [
                    Container(width: 8, height: 8, decoration: const BoxDecoration(color: AppColors.gold, shape: BoxShape.circle)),
                    const SizedBox(width: 4),
                    Text('Interest (${((1 - principalRatio) * 100).toStringAsFixed(0)}%)', style: GoogleFonts.inter(fontSize: 10.5, color: AppColors.textMuted)),
                  ],
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}


/// Fades and rises a child into place after [delay] — mirrors the mockup's
/// staggered CSS entrance keyframes.
class _RiseIn extends StatefulWidget {
  const _RiseIn({required this.delay, required this.child, this.offset = 10});

  final Duration delay;
  final Widget child;
  final double offset;

  @override
  State<_RiseIn> createState() => _RiseInState();
}

class _RiseInState extends State<_RiseIn> with SingleTickerProviderStateMixin {
  late final AnimationController _controller = AnimationController(
    vsync: this,
    duration: const Duration(milliseconds: 700),
  );
  late final Animation<double> _curve =
      CurvedAnimation(parent: _controller, curve: Curves.easeOutCubic);

  @override
  void initState() {
    super.initState();
    Future.delayed(widget.delay, () {
      if (mounted) _controller.forward();
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return AnimatedBuilder(
      animation: _curve,
      builder: (context, child) => Opacity(
        opacity: _curve.value,
        child: Transform.translate(
          offset: Offset(0, (1 - _curve.value) * widget.offset),
          child: child,
        ),
      ),
      child: widget.child,
    );
  }
}

class _SkylinePainter extends CustomPainter {
  const _SkylinePainter();

  static const _bars = [
    [10.0, 40.0, 18.0, 50.0],
    [34.0, 20.0, 22.0, 70.0],
    [62.0, 55.0, 16.0, 35.0],
    [84.0, 8.0, 26.0, 82.0],
    [116.0, 35.0, 18.0, 55.0],
    [140.0, 25.0, 22.0, 65.0],
    [168.0, 48.0, 16.0, 42.0],
  ];

  @override
  void paint(Canvas canvas, Size size) {
    canvas.save();
    canvas.scale(size.width / 220);
    final paint = Paint()
      ..style = PaintingStyle.stroke
      ..strokeWidth = 1
      ..color = AppColors.goldLight;
    for (final b in _bars) {
      canvas.drawRect(Rect.fromLTWH(b[0], b[1], b[2], b[3]), paint);
    }
    canvas.restore();
  }

  @override
  bool shouldRepaint(covariant _SkylinePainter oldDelegate) => false;
}

class _RibbonClipper extends CustomClipper<Path> {
  const _RibbonClipper();

  @override
  Path getClip(Size size) {
    final w = size.width, h = size.height;
    return Path()
      ..moveTo(0, 0)
      ..lineTo(w, 0)
      ..lineTo(w * 0.9, h / 2)
      ..lineTo(w, h)
      ..lineTo(0, h)
      ..close();
  }

  @override
  bool shouldReclip(covariant CustomClipper<Path> oldClipper) => false;
}

class _HomeListingCard extends StatelessWidget {
  const _HomeListingCard({
    required this.listing,
    required this.liked,
    required this.onToggleFavorite,
    required this.onTap,
  });

  final PublicListingSummary listing;
  final bool liked;
  final VoidCallback onToggleFavorite;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isRent = listing.listingType == 'RENT';
    final areaSqft = listing.areaSqft;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        clipBehavior: Clip.antiAlias,
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: const Color(0xFFEFE8D9)),
          boxShadow: [
            BoxShadow(
              color: AppColors.primaryNavy.withValues(alpha: .10),
              blurRadius: 30,
              offset: const Offset(0, 12),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            SizedBox(
              height: 190,
              child: Stack(
                fit: StackFit.expand,
                children: [
                  listing.coverImageUrl.isNotEmpty
                      ? CachedNetworkImage(
                          imageUrl: resolveMediaUrl(listing.coverImageUrl),
                          fit: BoxFit.cover,
                          placeholder: (context, url) =>
                              Container(color: AppColors.surfaceAlt),
                          errorWidget: (context, url, error) => Container(
                            color: AppColors.surfaceAlt,
                            child: const Icon(Icons.home_outlined,
                                color: AppColors.textMuted, size: 32),
                          ),
                        )
                      : Container(
                          color: AppColors.surfaceAlt,
                          child: const Icon(Icons.home_outlined,
                              color: AppColors.textMuted, size: 32),
                        ),
                  Positioned(
                    top: 14,
                    left: 0,
                    child: ClipPath(
                      clipper: const _RibbonClipper(),
                      child: Container(
                        color: AppColors.primaryNavy,
                        padding: const EdgeInsets.fromLTRB(14, 7, 22, 7),
                        child: Text(
                          EnumLabels.listingType(listing.listingType),
                          style: GoogleFonts.inter(
                            fontSize: 11.5,
                            fontWeight: FontWeight.w600,
                            color: AppColors.goldLight,
                            letterSpacing: .2,
                          ),
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 12,
                    right: 12,
                    child: GestureDetector(
                      onTap: onToggleFavorite,
                      child: Container(
                        width: 34,
                        height: 34,
                        decoration: BoxDecoration(
                          color: AppColors.primaryNavy.withValues(alpha: .55),
                          shape: BoxShape.circle,
                        ),
                        child: Icon(
                          liked ? Icons.favorite : Icons.favorite_border,
                          size: 16,
                          color: liked ? AppColors.goldLight : AppColors.surfaceAlt,
                        ),
                      ),
                    ),
                  ),
                  if (computeAgreementUrgency(listing.agreementExpiryDate) != null)
                    Positioned(
                      top: 52,
                      right: 12,
                      child: Builder(builder: (context) {
                        final urgency = computeAgreementUrgency(listing.agreementExpiryDate)!;
                        final isHot = urgency.tier == AgreementTier.hotDeal;
                        return Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
                          decoration: BoxDecoration(
                            color: isHot ? const Color(0xFFDC2626) : const Color(0xFFD97706),
                            borderRadius: BorderRadius.circular(999),
                          ),
                          child: Text(
                            isHot ? '🔥 Hot Deal' : '⚡ Priority',
                            style: const TextStyle(
                              fontSize: 10.5,
                              fontWeight: FontWeight.w700,
                              color: Colors.white,
                            ),
                          ),
                        );
                      }),
                    ),
                ],
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 16, 18, 18),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.baseline,
                    textBaseline: TextBaseline.alphabetic,
                    children: [
                      Text(
                        Formatters.price(listing.price, perMonth: isRent),
                        style: GoogleFonts.fraunces(
                          fontSize: 23,
                          fontWeight: FontWeight.w600,
                          color: AppColors.primaryNavy,
                        ),
                      ),
                      if (!isRent && areaSqft != null && areaSqft > 0) ...[
                        const SizedBox(width: 4),
                        Text(
                          '· ₹${(listing.price / areaSqft).round()}/sqft',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            fontWeight: FontWeight.w500,
                            color: AppColors.textMuted,
                          ),
                        ),
                      ],
                    ],
                  ),
                  const SizedBox(height: 5),
                  Text(
                    listing.title,
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: GoogleFonts.inter(
                      fontSize: 15,
                      fontWeight: FontWeight.w600,
                      color: AppColors.charcoal,
                    ),
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      const Icon(Icons.place_outlined, size: 13, color: AppColors.textSecondary),
                      const SizedBox(width: 5),
                      Expanded(
                        child: Text(
                          listing.locationLabel,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style: GoogleFonts.inter(fontSize: 13, color: AppColors.textSecondary),
                        ),
                      ),
                    ],
                  ),
                  Container(
                    margin: const EdgeInsets.only(top: 12),
                    padding: const EdgeInsets.only(top: 12),
                    decoration: const BoxDecoration(
                      border: Border(top: BorderSide(color: Color(0xFFF1ECE1))),
                    ),
                    child: Row(
                      children: [
                        if (listing.bedrooms != null)
                          _metaItem(Icons.bed_outlined, '${listing.bedrooms} beds'),
                        if (listing.bathrooms != null)
                          _metaItem(
                              Icons.bathtub_outlined, '${listing.bathrooms} baths'),
                        if (areaSqft != null)
                          _metaItem(Icons.straighten, '$areaSqft sqft'),
                      ],
                    ),
                  ),
                  if (listing.agentVerified)
                    Padding(
                      padding: const EdgeInsets.only(top: 12),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          const Icon(Icons.verified_outlined,
                              size: 13, color: AppColors.gold),
                          const SizedBox(width: 5),
                          Text(
                            'Listed by verified channel partner',
                            style: GoogleFonts.inter(
                              fontSize: 11.5,
                              fontWeight: FontWeight.w600,
                              color: AppColors.gold,
                            ),
                          ),
                        ],
                      ),
                    ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _metaItem(IconData icon, String label) => Padding(
        padding: const EdgeInsets.only(right: 16),
        child: Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(icon, size: 14, color: AppColors.textSecondary),
            const SizedBox(width: 6),
            Text(label,
                style: GoogleFonts.inter(
                  fontSize: 12.5,
                  fontWeight: FontWeight.w500,
                  color: AppColors.textSecondary,
                )),
          ],
        ),
      );
}

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

const _chipLabels = ['For Sale', 'For Rent', 'Verified agents', 'New this week', 'Hot Deals'];

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
  String? _heroListingType; // null = any, else SALE/RENT — mirrors the website's SearchBar select

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

  void _goSearch({String? city, String? listingType}) {
    final params = <String, String>{
      'city': ?(city != null && city.isNotEmpty ? city : null),
      'listingType': ?listingType,
    };
    context.push(
      params.isEmpty
          ? RoutePaths.search
          : '${RoutePaths.search}?${Uri(queryParameters: params).query}',
    );
  }

  Future<void> _pickHeroListingType() async {
    final selected = await showModalBottomSheet<String?>(
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
              padding: EdgeInsets.fromLTRB(20, 18, 20, 6),
              child: Align(
                alignment: Alignment.centerLeft,
                child: Text('Buy or Rent', style: TextStyle(fontWeight: FontWeight.w700)),
              ),
            ),
            ListTile(
              title: const Text('Any'),
              trailing: _heroListingType == null ? const Icon(Icons.check, color: AppColors.gold) : null,
              onTap: () => Navigator.of(context).pop(null),
            ),
            ListTile(
              title: const Text('Buy'),
              trailing:
                  _heroListingType == 'SALE' ? const Icon(Icons.check, color: AppColors.gold) : null,
              onTap: () => Navigator.of(context).pop('SALE'),
            ),
            ListTile(
              title: const Text('Rent'),
              trailing:
                  _heroListingType == 'RENT' ? const Icon(Icons.check, color: AppColors.gold) : null,
              onTap: () => Navigator.of(context).pop('RENT'),
            ),
            const SizedBox(height: 8),
          ],
        ),
      ),
    );
    if (!mounted) return;
    setState(() => _heroListingType = selected);
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
            SliverToBoxAdapter(child: _chips()),
            SliverToBoxAdapter(child: _sectionHead()),
            SliverPadding(
              padding: const EdgeInsets.fromLTRB(20, 0, 20, 16),
              sliver: SliverToBoxAdapter(child: _listings()),
            ),
          ],
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
                    'Curated, verified listings from agents who show up.',
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
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.background,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: Colors.black.withValues(alpha: 0.05)),
        boxShadow: [
          BoxShadow(
            color: AppColors.primaryNavy.withValues(alpha: .18),
            blurRadius: 40,
            offset: const Offset(0, 18),
          ),
        ],
      ),
      child: Row(
        children: [
          GestureDetector(
            onTap: () => _goSearch(
              city: _heroSearchController.text.trim(),
              listingType: _heroListingType,
            ),
            child: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: AppColors.surfaceAlt,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.search, size: 17, color: AppColors.navyLight),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: TextField(
              controller: _heroSearchController,
              textInputAction: TextInputAction.search,
              style: GoogleFonts.inter(fontSize: 15, color: AppColors.charcoal),
              decoration: InputDecoration(
                isDense: true,
                border: InputBorder.none,
                enabledBorder: InputBorder.none,
                focusedBorder: InputBorder.none,
                filled: false,
                contentPadding: const EdgeInsets.symmetric(vertical: 13),
                hintText: 'Search by city, locality…',
                hintStyle: GoogleFonts.inter(fontSize: 15, color: AppColors.textMuted),
              ),
              onSubmitted: (value) => _goSearch(
                city: value.trim(),
                listingType: _heroListingType,
              ),
            ),
          ),
          const SizedBox(width: 10),
          GestureDetector(
            onTap: _pickHeroListingType,
            child: Container(
              width: 34,
              height: 34,
              decoration: BoxDecoration(
                color: AppColors.primaryNavy,
                borderRadius: BorderRadius.circular(10),
              ),
              child: const Icon(Icons.tune, size: 16, color: AppColors.goldLight),
            ),
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
                            'Listed by verified agent',
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

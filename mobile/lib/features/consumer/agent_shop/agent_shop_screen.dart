import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/media.dart';
import '../../../models/agent_shop.dart';
import '../../../models/public_listing.dart';
import '../../../services/agent_shop_service.dart';

class AgentShopScreen extends StatefulWidget {
  const AgentShopScreen({super.key, required this.agentCode});

  final String agentCode;

  @override
  State<AgentShopScreen> createState() => _AgentShopScreenState();
}

class _AgentShopScreenState extends State<AgentShopScreen> {
  late final AgentShopService _service;
  late Future<AgentShopResponse> _future;
  String _filterType = 'ALL'; // 'ALL', 'RENT', 'SALE'

  @override
  void initState() {
    super.initState();
    _service = AgentShopService(ApiClient.instance.dio);
    _future = _service.getAgentShop(widget.agentCode);
  }

  void _reload() {
    setState(() {
      _future = _service.getAgentShop(widget.agentCode);
    });
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppColors.background,
      appBar: AppBar(
        title: Text(
          'Agent Shop (${widget.agentCode})',
          style: GoogleFonts.inter(fontWeight: FontWeight.w700),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _reload,
            tooltip: 'Refresh',
          ),
        ],
      ),
      body: FutureBuilder<AgentShopResponse>(
        future: _future,
        builder: (context, snapshot) {
          if (snapshot.connectionState != ConnectionState.done) {
            return const Center(child: CircularProgressIndicator(color: AppColors.gold));
          }

          if (snapshot.hasError) {
            final message = snapshot.error is ApiException
                ? errorMessageFor(snapshot.error as ApiException)
                : snapshot.error.toString();
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const Icon(Icons.error_outline_rounded, color: Colors.red, size: 48),
                    const SizedBox(height: 12),
                    Text(message, textAlign: TextAlign.center),
                    const SizedBox(height: 16),
                    ElevatedButton(onPressed: _reload, child: const Text('Retry')),
                  ],
                ),
              ),
            );
          }

          final data = snapshot.data!;
          final agent = data.agent;
          final allListings = data.listings;

          final filtered = allListings.where((l) {
            if (_filterType == 'RENT') return l.listingType.toUpperCase() == 'RENT';
            if (_filterType == 'SALE') return l.listingType.toUpperCase() == 'SALE';
            return true;
          }).toList();

          return CustomScrollView(
            slivers: [
              // --- SECTION 1 (TOP): AGENT DETAILS CARD ---
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
                  child: _AgentHeaderCard(agent: agent, isUnlocked: data.isUnlocked),
                ),
              ),

              // --- SECTION 2 (MIDDLE): UNLOCKED STATUS / PAYWALL BANNER ---
              if (!data.isUnlocked)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                    child: Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: Colors.amber.shade50,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.amber.shade300),
                      ),
                      child: Row(
                        children: [
                          const Icon(Icons.lock_rounded, color: Colors.amber, size: 30),
                          const SizedBox(width: 12),
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  'Access Locked (₹50 Required)',
                                  style: GoogleFonts.inter(
                                    fontWeight: FontWeight.bold,
                                    fontSize: 14,
                                    color: Colors.amber.shade900,
                                  ),
                                ),
                                Text(
                                  'Complete ₹50 payment to view agent phone & direct addresses.',
                                  style: GoogleFonts.inter(
                                    fontSize: 12,
                                    color: Colors.amber.shade800,
                                  ),
                                ),
                              ],
                            ),
                          ),
                          TextButton(
                            onPressed: () => context.push(RoutePaths.qrScanner),
                            style: TextButton.styleFrom(
                              backgroundColor: AppColors.primaryNavy,
                              foregroundColor: Colors.white,
                            ),
                            child: const Text('Pay ₹50'),
                          ),
                        ],
                      ),
                    ),
                  ),
                ),

              // --- SECTION 3: FILTER TABS & COUNT ---
              SliverToBoxAdapter(
                child: Padding(
                  padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
                  child: Row(
                    children: [
                      Text(
                        'Properties (${filtered.length})',
                        style: GoogleFonts.fraunces(
                          fontSize: 18,
                          fontWeight: FontWeight.bold,
                          color: AppColors.primaryNavy,
                        ),
                      ),
                      const Spacer(),
                      _FilterChip(
                        label: 'All',
                        selected: _filterType == 'ALL',
                        onSelected: () => setState(() => _filterType = 'ALL'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip(
                        label: 'Rent',
                        selected: _filterType == 'RENT',
                        onSelected: () => setState(() => _filterType = 'RENT'),
                      ),
                      const SizedBox(width: 6),
                      _FilterChip(
                        label: 'Sale',
                        selected: _filterType == 'SALE',
                        onSelected: () => setState(() => _filterType = 'SALE'),
                      ),
                    ],
                  ),
                ),
              ),

              // --- SECTION 4 (BOTTOM): LIST OF PROPERTIES ---
              if (filtered.isEmpty)
                SliverToBoxAdapter(
                  child: Padding(
                    padding: const EdgeInsets.all(40),
                    child: Center(
                      child: Text(
                        'No properties available under this filter.',
                        style: GoogleFonts.inter(color: Colors.grey.shade600),
                      ),
                    ),
                  ),
                )
              else
                SliverPadding(
                  padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
                  sliver: SliverList(
                    delegate: SliverChildBuilderDelegate(
                      (context, index) {
                        final listing = filtered[index];
                        return _AgentPropertyCard(
                          listing: listing,
                          isUnlocked: data.isUnlocked,
                          agentName: agent.name,
                          onTap: () => context.push(RoutePaths.listingDetailPath(listing.slug)),
                        );
                      },
                      childCount: filtered.length,
                    ),
                  ),
                ),
            ],
          );
        },
      ),
    );
  }
}

class _AgentHeaderCard extends StatelessWidget {
  const _AgentHeaderCard({required this.agent, required this.isUnlocked});

  final AgentShopDetail agent;
  final bool isUnlocked;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: Colors.grey.shade200),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.04),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              // Avatar
              Container(
                width: 60,
                height: 60,
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy,
                  borderRadius: BorderRadius.circular(16),
                ),
                alignment: Alignment.center,
                child: agent.logoUrl != null
                    ? ClipRRect(
                        borderRadius: BorderRadius.circular(16),
                        child: CachedNetworkImage(
                          imageUrl: agent.logoUrl!,
                          fit: BoxFit.cover,
                          width: 60,
                          height: 60,
                        ),
                      )
                    : Text(
                        agent.name.isNotEmpty ? agent.name[0].toUpperCase() : 'A',
                        style: GoogleFonts.fraunces(
                          fontSize: 26,
                          fontWeight: FontWeight.bold,
                          color: Colors.white,
                        ),
                      ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                          decoration: BoxDecoration(
                            color: Colors.green.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.green.shade300),
                          ),
                          child: Text(
                            'Verified Partner',
                            style: GoogleFonts.inter(
                              fontSize: 10,
                              fontWeight: FontWeight.bold,
                              color: Colors.green.shade800,
                            ),
                          ),
                        ),
                        const SizedBox(width: 6),
                        Text(
                          agent.agentCode,
                          style: GoogleFonts.inter(
                            fontSize: 11,
                            fontWeight: FontWeight.w700,
                            color: Colors.grey.shade600,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      agent.shopName ?? agent.name,
                      style: GoogleFonts.inter(
                        fontSize: 17,
                        fontWeight: FontWeight.w800,
                        color: AppColors.primaryNavy,
                      ),
                    ),
                    if (agent.shopName != null)
                      Text(
                        'Managed by ${agent.name}',
                        style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
                      ),
                    const SizedBox(height: 4),
                    Row(
                      children: [
                        const Icon(Icons.star_rounded, color: Colors.amber, size: 16),
                        const SizedBox(width: 2),
                        Text(
                          agent.ratingAvg?.toStringAsFixed(1) ?? '5.0',
                          style: GoogleFonts.inter(fontSize: 12, fontWeight: FontWeight.bold),
                        ),
                        if (agent.yearsExperience != null) ...[
                          const SizedBox(width: 10),
                          Text(
                            '•  ${agent.yearsExperience}+ yrs exp',
                            style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ],
                    ),
                  ],
                ),
              ),
            ],
          ),

          const SizedBox(height: 14),
          if (agent.shopAddress != null || agent.city != null) ...[
            Row(
              children: [
                Icon(Icons.location_on_outlined, size: 15, color: Colors.grey.shade600),
                const SizedBox(width: 4),
                Expanded(
                  child: Text(
                    agent.shopAddress ?? agent.city ?? 'NCR',
                    style: GoogleFonts.inter(fontSize: 12, color: Colors.grey.shade700),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
          ],

          // Direct Call & WhatsApp Contact Buttons
          Row(
            children: [
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isUnlocked
                      ? () {
                          // Launch phone call
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('Calling: ${agent.phone}')),
                          );
                        }
                      : null,
                  icon: const Icon(Icons.call_rounded, size: 16),
                  label: Text(
                    isUnlocked ? 'Call ${agent.phone}' : 'Call (Locked)',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: AppColors.primaryNavy,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
              const SizedBox(width: 10),
              Expanded(
                child: ElevatedButton.icon(
                  onPressed: isUnlocked
                      ? () {
                          // Launch WhatsApp
                          ScaffoldMessenger.of(context).showSnackBar(
                            SnackBar(content: Text('WhatsApp: ${agent.whatsappNumber ?? agent.phone}')),
                          );
                        }
                      : null,
                  icon: const Icon(Icons.chat_rounded, size: 16),
                  label: Text(
                    isUnlocked ? 'WhatsApp' : 'WhatsApp (Locked)',
                    style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                  style: ElevatedButton.styleFrom(
                    backgroundColor: Colors.green.shade600,
                    foregroundColor: Colors.white,
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    padding: const EdgeInsets.symmetric(vertical: 12),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _AgentPropertyCard extends StatelessWidget {
  const _AgentPropertyCard({
    required this.listing,
    required this.isUnlocked,
    required this.agentName,
    required this.onTap,
  });

  final PublicListingSummary listing;
  final bool isUnlocked;
  final String agentName;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final isRent = listing.listingType.toUpperCase() == 'RENT';
    final photo = listing.primaryImageUrl ?? fallbackPropertyImage;

    return GestureDetector(
      onTap: onTap,
      child: Container(
        margin: const EdgeInsets.only(bottom: 14),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(20),
          border: Border.all(color: Colors.grey.shade200),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.03),
              blurRadius: 8,
              offset: const Offset(0, 3),
            ),
          ],
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            // Image with tag & price
            ClipRRect(
              borderRadius: const BorderRadius.vertical(top: Radius.circular(20)),
              child: Stack(
                children: [
                  AspectRatio(
                    aspectRatio: 16 / 9,
                    child: CachedNetworkImage(
                      imageUrl: photo,
                      fit: BoxFit.cover,
                      errorWidget: (_, __, ___) => Container(color: Colors.grey.shade200),
                    ),
                  ),
                  Positioned(
                    top: 10,
                    left: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      decoration: BoxDecoration(
                        color: isRent ? Colors.indigo.shade600 : Colors.emerald.shade600,
                        borderRadius: BorderRadius.circular(20),
                      ),
                      child: Text(
                        isRent ? 'For Rent' : 'For Sale',
                        style: GoogleFonts.inter(
                          color: Colors.white,
                          fontSize: 10.5,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 10,
                    right: 10,
                    child: Container(
                      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                      decoration: BoxDecoration(
                        color: Colors.black.withValues(alpha: 0.75),
                        borderRadius: BorderRadius.circular(12),
                      ),
                      child: Text(
                        formatPrice(listing.price, listing.listingType),
                        style: GoogleFonts.fraunces(
                          color: Colors.white,
                          fontSize: 14,
                          fontWeight: FontWeight.bold,
                        ),
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Specs and Address
            Padding(
              padding: const EdgeInsets.all(14),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    listing.title,
                    style: GoogleFonts.inter(
                      fontSize: 14.5,
                      fontWeight: FontWeight.bold,
                      color: AppColors.primaryNavy,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  const SizedBox(height: 4),
                  Row(
                    children: [
                      Icon(Icons.location_on_outlined, size: 14, color: Colors.grey.shade600),
                      const SizedBox(width: 4),
                      Expanded(
                        child: Text(
                          isUnlocked
                              ? '${listing.locality ?? ''}, ${listing.city}'
                              : '${listing.locality ?? 'Verified Sector'}, ${listing.city} (Exact Address Locked)',
                          style: GoogleFonts.inter(
                            fontSize: 12,
                            color: isUnlocked ? Colors.grey.shade700 : Colors.amber.shade900,
                            fontWeight: isUnlocked ? FontWeight.normal : FontWeight.w600,
                          ),
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      if (listing.bedrooms != null) ...[
                        _SpecTag(icon: Icons.bed_outlined, text: '${listing.bedrooms} BHK'),
                        const SizedBox(width: 8),
                      ],
                      if (listing.bathrooms != null) ...[
                        _SpecTag(icon: Icons.shower_outlined, text: '${listing.bathrooms} Bath'),
                        const SizedBox(width: 8),
                      ],
                      if (listing.areaSqft != null) ...[
                        _SpecTag(icon: Icons.square_foot_rounded, text: '${listing.areaSqft} sqft'),
                      ],
                      const Spacer(),
                      Text(
                        'View Details →',
                        style: GoogleFonts.inter(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: AppColors.goldDark,
                        ),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _FilterChip extends StatelessWidget {
  const _FilterChip({
    required this.label,
    required this.selected,
    required this.onSelected,
  });

  final String label;
  final bool selected;
  final VoidCallback onSelected;

  @override
  Widget build(BuildContext context) {
    return GestureDetector(
      onTap: onSelected,
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
        decoration: BoxDecoration(
          color: selected ? AppColors.primaryNavy : Colors.grey.shade200,
          borderRadius: BorderRadius.circular(10),
        ),
        child: Text(
          label,
          style: GoogleFonts.inter(
            fontSize: 11,
            fontWeight: FontWeight.bold,
            color: selected ? Colors.white : Colors.grey.shade800,
          ),
        ),
      ),
    );
  }
}

class _SpecTag extends StatelessWidget {
  const _SpecTag({required this.icon, required this.text});

  final IconData icon;
  final String text;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 7, vertical: 3),
      decoration: BoxDecoration(
        color: AppColors.surface,
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: Colors.grey.shade200),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon, size: 12, color: Colors.grey.shade700),
          const SizedBox(width: 3),
          Text(
            text,
            style: GoogleFonts.inter(fontSize: 11, color: Colors.grey.shade800),
          ),
        ],
      ),
    );
  }
}

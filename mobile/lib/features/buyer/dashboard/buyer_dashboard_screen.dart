import 'package:cached_network_image/cached_network_image.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:provider/provider.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/router/route_paths.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../core/utils/formatters.dart';
import '../../../core/utils/media.dart';
import '../../../core/widgets/app_button.dart';
import '../../../core/widgets/empty_state.dart';
import '../../../core/widgets/error_view.dart';
import '../../../models/buyer_appointment.dart';
import '../../../models/buyer_profile.dart';
import '../../../models/property.dart';
import '../../../providers/customer_auth_provider.dart';
import '../../../services/buyer_service.dart';

const _switchReasons = ['Unresponsive', 'No-show', 'Unprofessional', 'Other'];

class BuyerDashboardScreen extends StatefulWidget {
  const BuyerDashboardScreen({super.key});

  @override
  State<BuyerDashboardScreen> createState() => _BuyerDashboardScreenState();
}

class _BuyerDashboardScreenState extends State<BuyerDashboardScreen> {
  late final BuyerService _service;
  late Future<BuyerMe> _meFuture;
  late Future<List<BuyerAppointment>> _appointmentsFuture;

  @override
  void initState() {
    super.initState();
    _service = BuyerService(ApiClient.instance.dio);
    _reload();
  }

  void _reload() {
    _meFuture = _service.getMe();
    _appointmentsFuture = _service.getAppointments();
  }

  Future<void> _logout() async {
    await context.read<CustomerAuthProvider>().logout();
    if (!mounted) return;
    context.go(RoutePaths.home);
  }

  Future<void> _saveProfile(String name, String? email, String? phone) async {
    try {
      await _service.updateProfile(name: name, email: email, phone: phone);
      if (!mounted) return;
      setState(_reload);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Profile saved.')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  Future<void> _toggleSaved(String propertyId) async {
    try {
      await _service.toggleSavedProperty(propertyId);
      if (!mounted) return;
      setState(_reload);
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  Future<void> _markNoShow(String appointmentId) async {
    try {
      await _service.markNoShow(appointmentId);
      if (!mounted) return;
      setState(_reload);
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Reported — new agents are being notified.')),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  Future<void> _openSwitchAgent(CurrentAgent agent) async {
    final result = await showModalBottomSheet<({String reason, bool isComplaint})>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) => _SwitchAgentSheet(agent: agent),
    );
    if (result == null || !mounted) return;

    try {
      await _service.switchAgent(
        fromAgentId: agent.id,
        reason: result.reason,
        isComplaint: result.isComplaint,
        latitude: agent.latitude,
        longitude: agent.longitude,
      );
      if (!mounted) return;
      setState(_reload);
      ScaffoldMessenger.of(context)
          .showSnackBar(const SnackBar(content: Text('Switch request submitted.')));
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('My Account'),
        actions: [
          IconButton(icon: const Icon(Icons.logout), onPressed: _logout),
        ],
      ),
      body: RefreshIndicator(
        color: AppColors.gold,
        onRefresh: () async => setState(_reload),
        child: FutureBuilder<BuyerMe>(
          future: _meFuture,
          builder: (context, snapshot) {
            if (snapshot.connectionState != ConnectionState.done) {
              return const Center(child: CircularProgressIndicator(color: AppColors.gold));
            }
            if (snapshot.hasError) {
              final message = snapshot.error is ApiException
                  ? errorMessageFor(snapshot.error as ApiException)
                  : 'Something went wrong.';
              return ErrorView(message: message, onRetry: () => setState(_reload));
            }

            final me = snapshot.data!;
            return ListView(
              padding: const EdgeInsets.all(AppSpacing.lg),
              children: [
                _SectionLabel('My profile'),
                const SizedBox(height: AppSpacing.sm),
                _ProfileCard(user: me.user, onSave: _saveProfile),
                if (me.currentAgent != null) ...[
                  const SizedBox(height: AppSpacing.xl),
                  _SectionLabel('Your current agent'),
                  const SizedBox(height: AppSpacing.sm),
                  _CurrentAgentCard(
                    agent: me.currentAgent!,
                    switchGate: me.switchGate,
                    onSwitch: () => _openSwitchAgent(me.currentAgent!),
                  ),
                ],
                const SizedBox(height: AppSpacing.xl),
                _DispatchCard(
                  onTap: () => context.push(RoutePaths.buyerDispatch),
                ),
                const SizedBox(height: AppSpacing.md),
                _GoldListingCard(
                  onTap: () => context.push(RoutePaths.buyerGoldListing),
                ),
                const SizedBox(height: AppSpacing.xl),
                _SectionLabel('Scheduled visits'),
                const SizedBox(height: AppSpacing.sm),
                FutureBuilder<List<BuyerAppointment>>(
                  future: _appointmentsFuture,
                  builder: (context, apptSnapshot) {
                    if (apptSnapshot.connectionState != ConnectionState.done) {
                      return const Padding(
                        padding: EdgeInsets.symmetric(vertical: AppSpacing.lg),
                        child: Center(child: CircularProgressIndicator(color: AppColors.gold)),
                      );
                    }
                    final appointments = apptSnapshot.data ?? [];
                    if (appointments.isEmpty) {
                      return const EmptyState(
                        message: 'No scheduled visits yet.',
                        icon: Icons.event_available_outlined,
                      );
                    }
                    return Column(
                      children: appointments
                          .map((a) => Padding(
                                padding: const EdgeInsets.only(bottom: AppSpacing.sm),
                                child: _AppointmentCard(
                                  appointment: a,
                                  onNoShow: () => _markNoShow(a.id),
                                ),
                              ))
                          .toList(),
                    );
                  },
                ),
                const SizedBox(height: AppSpacing.xl),
                _SectionLabel('Saved properties (${me.savedProperties.length})'),
                const SizedBox(height: AppSpacing.sm),
                if (me.savedProperties.isEmpty)
                  const EmptyState(
                    message: 'Nothing saved yet.',
                    icon: Icons.favorite_border,
                  )
                else
                  GridView.builder(
                    shrinkWrap: true,
                    physics: const NeverScrollableScrollPhysics(),
                    itemCount: me.savedProperties.length,
                    gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                      crossAxisCount: 2,
                      mainAxisSpacing: AppSpacing.sm,
                      crossAxisSpacing: AppSpacing.sm,
                      childAspectRatio: 0.66,
                    ),
                    itemBuilder: (context, i) {
                      final property = me.savedProperties[i];
                      return _SavedPropertyCard(
                        property: property,
                        onUnsave: () => _toggleSaved(property.id),
                      );
                    },
                  ),
                const SizedBox(height: AppSpacing.xl),
                _SectionLabel('My enquiries (${me.enquiries.length})'),
                const SizedBox(height: AppSpacing.sm),
                if (me.enquiries.isEmpty)
                  const EmptyState(
                    message: 'No enquiries sent yet.',
                    icon: Icons.forum_outlined,
                  )
                else
                  ...me.enquiries.map((e) => Container(
                        margin: const EdgeInsets.only(bottom: AppSpacing.sm),
                        padding: const EdgeInsets.all(AppSpacing.md),
                        decoration: BoxDecoration(
                          color: Colors.white,
                          borderRadius: BorderRadius.circular(AppRadius.md),
                          border: Border.all(color: AppColors.divider),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              e.propertyTitle ?? 'General enquiry',
                              style: const TextStyle(fontWeight: FontWeight.w600),
                            ),
                            if ((e.message ?? '').isNotEmpty) ...[
                              const SizedBox(height: 4),
                              Text(e.message!, style: Theme.of(context).textTheme.bodySmall),
                            ],
                            const SizedBox(height: 4),
                            Text(
                              '${e.createdAt.toLocal()}'.split(' ').first,
                              style: Theme.of(context).textTheme.bodySmall,
                            ),
                          ],
                        ),
                      )),
              ],
            );
          },
        ),
      ),
    );
  }
}

class _DispatchCard extends StatelessWidget {
  const _DispatchCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(AppRadius.lg),
          border: Border.all(color: AppColors.divider),
        ),
        child: Row(
          children: [
            Container(
              width: 40,
              height: 40,
              alignment: Alignment.center,
              decoration: BoxDecoration(
                color: AppColors.primaryNavy,
                borderRadius: BorderRadius.circular(AppRadius.sm),
              ),
              child: const Icon(Icons.travel_explore, color: AppColors.goldLight, size: 20),
            ),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'Find an agent now',
                    style: Theme.of(context)
                        .textTheme
                        .titleMedium
                        ?.copyWith(fontWeight: FontWeight.w600),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'Get matched with the nearest available agent instantly.',
                    style: Theme.of(context).textTheme.bodySmall,
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.textSecondary),
          ],
        ),
      ),
    );
  }
}

class _GoldListingCard extends StatelessWidget {
  const _GoldListingCard({required this.onTap});

  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(AppRadius.lg),
      child: Container(
        padding: const EdgeInsets.all(AppSpacing.lg),
        decoration: BoxDecoration(
          color: AppColors.primaryNavy,
          borderRadius: BorderRadius.circular(AppRadius.lg),
        ),
        child: Row(
          children: [
            const Icon(Icons.workspace_premium_outlined, color: AppColors.goldLight, size: 28),
            const SizedBox(width: AppSpacing.md),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'List your property — Gold',
                    style: Theme.of(context).textTheme.titleMedium?.copyWith(
                          color: Colors.white,
                        ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    '₹500 pass, 90-day listing, reviewed before it goes live.',
                    style: Theme.of(context).textTheme.bodySmall?.copyWith(
                          color: const Color(0xFFC6CEDB),
                        ),
                  ),
                ],
              ),
            ),
            const Icon(Icons.chevron_right, color: AppColors.goldLight),
          ],
        ),
      ),
    );
  }
}

class _SectionLabel extends StatelessWidget {
  const _SectionLabel(this.text);
  final String text;

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: GoogleFonts.fraunces(
        fontSize: 18,
        fontWeight: FontWeight.w600,
        color: AppColors.textPrimary,
      ),
    );
  }
}

class _ProfileCard extends StatefulWidget {
  const _ProfileCard({required this.user, required this.onSave});

  final BuyerUser user;
  final Future<void> Function(String name, String? email, String? phone) onSave;

  @override
  State<_ProfileCard> createState() => _ProfileCardState();
}

class _ProfileCardState extends State<_ProfileCard> {
  late final _nameController = TextEditingController(text: widget.user.name);
  late final _emailController = TextEditingController(text: widget.user.email ?? '');
  late final _phoneController = TextEditingController(text: widget.user.phone ?? '');
  bool _saving = false;

  @override
  void dispose() {
    _nameController.dispose();
    _emailController.dispose();
    _phoneController.dispose();
    super.dispose();
  }

  Future<void> _save() async {
    setState(() => _saving = true);
    await widget.onSave(
      _nameController.text.trim(),
      _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      _phoneController.text.trim().isEmpty ? null : _phoneController.text.trim(),
    );
    if (mounted) setState(() => _saving = false);
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextFormField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Name',
              prefixIcon: Icon(Icons.person_outline),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextFormField(
            controller: _phoneController,
            keyboardType: TextInputType.phone,
            decoration: const InputDecoration(
              labelText: 'Phone',
              prefixIcon: Icon(Icons.call_outlined),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          TextFormField(
            controller: _emailController,
            keyboardType: TextInputType.emailAddress,
            decoration: const InputDecoration(
              labelText: 'Email',
              prefixIcon: Icon(Icons.mail_outline),
            ),
          ),
          const SizedBox(height: AppSpacing.md),
          AppButton(label: 'Save profile', loading: _saving, onPressed: _save),
        ],
      ),
    );
  }
}

class _CurrentAgentCard extends StatelessWidget {
  const _CurrentAgentCard({required this.agent, required this.switchGate, required this.onSwitch});

  final CurrentAgent agent;
  final SwitchGate? switchGate;
  final VoidCallback onSwitch;

  @override
  Widget build(BuildContext context) {
    final blocked = switchGate != null && !switchGate!.allowed;
    return Container(
      padding: const EdgeInsets.all(AppSpacing.lg),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.lg),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Container(
                width: 40,
                height: 40,
                alignment: Alignment.center,
                decoration: BoxDecoration(
                  color: AppColors.primaryNavy,
                  borderRadius: BorderRadius.circular(AppRadius.sm),
                ),
                child: const Icon(Icons.badge_outlined, color: AppColors.goldLight, size: 20),
              ),
              const SizedBox(width: AppSpacing.sm),
              Expanded(
                child: Text(
                  [agent.agentCode, agent.shopName].where((s) => s != null).join(' — '),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ),
            ],
          ),
          const SizedBox(height: AppSpacing.md),
          if (blocked)
            Text(
              switchGate!.reason == 'dailyLimitReached'
                  ? 'You\'ve used all 3 switches allowed today.'
                  : switchGate!.nextAllowedAt != null
                      ? 'You can switch again after ${switchGate!.nextAllowedAt!.toLocal().hour}:${switchGate!.nextAllowedAt!.toLocal().minute.toString().padLeft(2, '0')}.'
                      : 'You can\'t switch right now.',
              style: Theme.of(context).textTheme.bodySmall,
            )
          else
            AppButton(
              label: 'Switch agent',
              variant: AppButtonVariant.secondary,
              onPressed: onSwitch,
            ),
        ],
      ),
    );
  }
}

class _SwitchAgentSheet extends StatefulWidget {
  const _SwitchAgentSheet({required this.agent});
  final CurrentAgent agent;

  @override
  State<_SwitchAgentSheet> createState() => _SwitchAgentSheetState();
}

class _SwitchAgentSheetState extends State<_SwitchAgentSheet> {
  String? _reason;
  bool _isComplaint = false;

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
            Text('Switch agent', style: Theme.of(context).textTheme.headlineMedium),
            const SizedBox(height: AppSpacing.md),
            DropdownButtonFormField<String>(
              initialValue: _reason,
              decoration: const InputDecoration(labelText: 'Reason (required)'),
              items: _switchReasons
                  .map((r) => DropdownMenuItem(value: r, child: Text(r)))
                  .toList(),
              onChanged: (v) => setState(() => _reason = v),
            ),
            const SizedBox(height: AppSpacing.sm),
            CheckboxListTile(
              value: _isComplaint,
              onChanged: (v) => setState(() => _isComplaint = v ?? false),
              controlAffinity: ListTileControlAffinity.leading,
              contentPadding: EdgeInsets.zero,
              title: const Text(
                'File this as a formal complaint',
                style: TextStyle(fontSize: 13),
              ),
            ),
            const SizedBox(height: AppSpacing.md),
            AppButton(
              label: 'Confirm switch',
              expand: true,
              onPressed: _reason == null
                  ? null
                  : () => Navigator.of(context)
                      .pop((reason: _reason!, isComplaint: _isComplaint)),
            ),
          ],
        ),
      ),
    );
  }
}

class _AppointmentCard extends StatelessWidget {
  const _AppointmentCard({required this.appointment, required this.onNoShow});

  final BuyerAppointment appointment;
  final VoidCallback onNoShow;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(AppSpacing.md),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Row(
        children: [
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  [appointment.agentCode, appointment.masterId]
                      .where((s) => s != null)
                      .join(' · '),
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
                Text(
                  '${appointment.scheduledAt.toLocal()}'.split('.').first,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
                Text(appointment.status, style: Theme.of(context).textTheme.bodySmall),
              ],
            ),
          ),
          if (appointment.status == 'SCHEDULED' && appointment.isDue)
            TextButton(
              onPressed: onNoShow,
              child: const Text('Agent didn\'t show'),
            ),
        ],
      ),
    );
  }
}

class _SavedPropertyCard extends StatelessWidget {
  const _SavedPropertyCard({required this.property, required this.onUnsave});

  final Property property;
  final VoidCallback onUnsave;

  @override
  Widget build(BuildContext context) {
    final isRent = property.listingType == 'RENT';
    return Container(
      clipBehavior: Clip.antiAlias,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(AppRadius.md),
        border: Border.all(color: AppColors.divider),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Stack(
            children: [
              AspectRatio(
                aspectRatio: 4 / 3,
                child: property.coverImageUrl.isNotEmpty
                    ? CachedNetworkImage(
                        imageUrl: resolveMediaUrl(property.coverImageUrl),
                        fit: BoxFit.cover,
                        placeholder: (context, url) => Container(color: AppColors.surfaceAlt),
                        errorWidget: (context, url, error) =>
                            Container(color: AppColors.surfaceAlt),
                      )
                    : Container(
                        color: AppColors.surfaceAlt,
                        child: const Icon(Icons.home_outlined, color: AppColors.textSecondary),
                      ),
              ),
              Positioned(
                top: 6,
                right: 6,
                child: GestureDetector(
                  onTap: onUnsave,
                  child: Container(
                    width: 28,
                    height: 28,
                    decoration: BoxDecoration(
                      color: AppColors.primaryNavy.withValues(alpha: 0.55),
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.favorite, size: 14, color: AppColors.goldLight),
                  ),
                ),
              ),
            ],
          ),
          Padding(
            padding: const EdgeInsets.all(AppSpacing.sm),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  Formatters.price(property.price, perMonth: isRent),
                  style: const TextStyle(fontWeight: FontWeight.w700, color: AppColors.gold),
                ),
                const SizedBox(height: 2),
                Text(
                  property.title,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13),
                ),
                Text(
                  property.locationLabel,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

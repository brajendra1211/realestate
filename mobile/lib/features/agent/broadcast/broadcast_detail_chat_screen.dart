import 'dart:async';

import 'package:flutter/material.dart';

import '../../../core/network/api_client.dart';
import '../../../core/network/api_exception.dart';
import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_spacing.dart';
import '../../../core/utils/error_messages.dart';
import '../../../models/broadcast.dart';
import '../../../services/agent_broadcast_service.dart';
import '../../../services/agent_deals_service.dart';
import '../../../services/agent_service.dart';
import '../deals/agent_deal_detail_screen.dart';

/// Polls the chat thread every 4s while open — a lightweight REST-only
/// stand-in for the backend's Socket.io realtime chat, which isn't wired
/// into this app (see plan: a socket client is a stretch goal, not
/// required for the first pass).
class BroadcastDetailChatScreen extends StatefulWidget {
  const BroadcastDetailChatScreen({
    super.key,
    required this.broadcastId,
    required this.otherAgentId,
    required this.otherAgentLabel,
  });

  final String broadcastId;
  final String otherAgentId;
  final String otherAgentLabel;

  @override
  State<BroadcastDetailChatScreen> createState() => _BroadcastDetailChatScreenState();
}

class _BroadcastDetailChatScreenState extends State<BroadcastDetailChatScreen> {
  late final AgentBroadcastService _service;
  final _messageController = TextEditingController();
  final _scrollController = ScrollController();
  List<AgentChatMessage> _messages = [];
  Timer? _pollTimer;
  bool _loading = true;
  bool _sending = false;
  // AgentChatMessage.fromAgentId is an AgentProfile.id, not the User.id that
  // AgentAuthProvider carries from the session — fetched once here so
  // "isMine" bubble alignment actually matches the right record.
  String? _myAgentProfileId;

  @override
  void initState() {
    super.initState();
    _service = AgentBroadcastService(ApiClient.instance.dio);
    AgentService(ApiClient.instance.dio).me().then((profile) {
      if (mounted) setState(() => _myAgentProfileId = profile.id);
    });
    _loadMessages();
    _pollTimer = Timer.periodic(const Duration(seconds: 4), (_) => _loadMessages(silent: true));
  }

  @override
  void dispose() {
    _pollTimer?.cancel();
    _messageController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  Future<void> _loadMessages({bool silent = false}) async {
    try {
      final messages = await _service.getChat(widget.broadcastId, widget.otherAgentId);
      if (!mounted) return;
      setState(() {
        _messages = messages;
        _loading = false;
      });
    } catch (_) {
      if (!silent && mounted) setState(() => _loading = false);
    }
  }

  Future<void> _startDeal() async {
    final dealValueController = TextEditingController();
    final propertyTitleController = TextEditingController();
    final result = await showDialog<bool>(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Start B2B deal'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            TextField(
              controller: propertyTitleController,
              decoration: const InputDecoration(labelText: 'Property title (optional)'),
            ),
            const SizedBox(height: AppSpacing.sm),
            TextField(
              controller: dealValueController,
              keyboardType: TextInputType.number,
              decoration: const InputDecoration(labelText: 'Agreed deal value (INR)'),
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.of(context).pop(false),
            child: const Text('Cancel'),
          ),
          TextButton(
            onPressed: () => Navigator.of(context).pop(true),
            child: const Text('Create deal'),
          ),
        ],
      ),
    );
    final dealValue = int.tryParse(dealValueController.text.trim());
    if (result != true || dealValue == null || dealValue <= 0 || !mounted) return;

    try {
      final deal = await AgentDealsService(ApiClient.instance.dio).createDeal(
        dealValue: dealValue,
        sellerAgentId: widget.otherAgentId,
        broadcastId: widget.broadcastId,
        propertyTitle: propertyTitleController.text.trim().isEmpty
            ? null
            : propertyTitleController.text.trim(),
      );
      if (!mounted) return;
      await Navigator.of(context).push(
        MaterialPageRoute(
          builder: (_) => AgentDealDetailScreen(dealId: deal.id, initial: deal),
        ),
      );
    } on ApiException catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context)
          .showSnackBar(SnackBar(content: Text(errorMessageFor(e))));
    }
  }

  Future<void> _send() async {
    final text = _messageController.text.trim();
    if (text.isEmpty) return;
    setState(() => _sending = true);
    try {
      await _service.sendChatMessage(widget.broadcastId, widget.otherAgentId, text);
      _messageController.clear();
      await _loadMessages(silent: true);
    } catch (_) {
      // Silently retried by the poll loop; the send box keeps the typed text.
    } finally {
      if (mounted) setState(() => _sending = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Chat · ${widget.otherAgentLabel}'),
        actions: [
          IconButton(
            icon: const Icon(Icons.handshake_outlined),
            tooltip: 'Start deal',
            onPressed: _startDeal,
          ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: AppColors.gold))
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(AppSpacing.lg),
                    itemCount: _messages.length,
                    itemBuilder: (context, index) {
                      final message = _messages[index];
                      final isMine = message.fromAgentId == _myAgentProfileId;
                      return Align(
                        alignment: isMine ? Alignment.centerRight : Alignment.centerLeft,
                        child: Container(
                          constraints: BoxConstraints(
                            maxWidth: MediaQuery.sizeOf(context).width * 0.75,
                          ),
                          margin: const EdgeInsets.symmetric(vertical: 4),
                          padding: const EdgeInsets.symmetric(
                              horizontal: AppSpacing.md, vertical: AppSpacing.sm),
                          decoration: BoxDecoration(
                            color: isMine ? AppColors.primaryNavy : Colors.white,
                            border: isMine ? null : Border.all(color: AppColors.divider),
                            borderRadius: BorderRadius.only(
                              topLeft: const Radius.circular(AppRadius.md),
                              topRight: const Radius.circular(AppRadius.md),
                              bottomLeft: Radius.circular(isMine ? AppRadius.md : 2),
                              bottomRight: Radius.circular(isMine ? 2 : AppRadius.md),
                            ),
                          ),
                          child: Text(
                            message.message,
                            style: TextStyle(
                              color: isMine ? AppColors.goldLight : AppColors.textPrimary,
                            ),
                          ),
                        ),
                      );
                    },
                  ),
          ),
          SafeArea(
            child: Container(
              padding: const EdgeInsets.all(AppSpacing.sm),
              decoration: const BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: AppColors.divider)),
              ),
              child: Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _messageController,
                      decoration: const InputDecoration(
                        hintText: 'Message',
                        filled: true,
                        fillColor: AppColors.surfaceAlt,
                      ),
                      onSubmitted: (_) => _send(),
                    ),
                  ),
                  const SizedBox(width: AppSpacing.sm),
                  Material(
                    color: AppColors.primaryNavy,
                    shape: const CircleBorder(),
                    child: InkWell(
                      customBorder: const CircleBorder(),
                      onTap: _sending ? null : _send,
                      child: const Padding(
                        padding: EdgeInsets.all(10),
                        child: Icon(Icons.send_rounded, color: AppColors.goldLight, size: 20),
                      ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

import 'payout.dart';

class CommissionEntry {
  const CommissionEntry({
    required this.id,
    required this.type,
    required this.amount,
    this.note,
    this.refId,
    required this.createdAt,
  });

  final String id;
  final String type;
  final int amount;
  final String? note;
  final String? refId;
  final DateTime createdAt;

  factory CommissionEntry.fromJson(Map<String, dynamic> json) {
    return CommissionEntry(
      id: json['id'] as String,
      type: json['type'] as String,
      amount: (json['amount'] as num).toInt(),
      note: json['note'] as String?,
      refId: json['refId'] as String?,
      createdAt: DateTime.parse(json['createdAt'] as String),
    );
  }

  String get displayTitle => switch (type) {
        'UNLOCK_SPLIT' => 'Property Unlock Split (₹50)',
        'GOLD_SPLIT' => 'Gold Direct Listing Split',
        'DEAL_PROFIT_SHARE' => '5-Stage Deal Profit Split',
        'BROKERAGE' => 'Property Brokerage',
        'REGISTRATION_REFERRAL' => 'Referral Partner Registration',
        'AGENT_REFERRAL' => 'Sub-Partner Referral',
        'CUSTOMER_PROPERTY_UPDATE' => 'Direct Property Update',
        'REFERRAL_CUSTOMER_RENEWAL' => 'Partner Renewal Cut',
        'COMPANY_FIVE_STAR_REWARD' => '5-Star Rating Reward',
        _ => type.replaceAll('_', ' '),
      };
}

class AgentPaymentHistory {
  const AgentPaymentHistory({
    required this.walletBalance,
    required this.totalEarned,
    required this.totalWithdrawn,
    required this.pendingWithdrawn,
    required this.earnings,
    required this.payouts,
  });

  final int walletBalance;
  final int totalEarned;
  final int totalWithdrawn;
  final int pendingWithdrawn;
  final List<CommissionEntry> earnings;
  final List<Payout> payouts;

  factory AgentPaymentHistory.fromJson(Map<String, dynamic> json) {
    return AgentPaymentHistory(
      walletBalance: (json['walletBalance'] as num?)?.toInt() ?? 0,
      totalEarned: (json['totalEarned'] as num?)?.toInt() ?? 0,
      totalWithdrawn: (json['totalWithdrawn'] as num?)?.toInt() ?? 0,
      pendingWithdrawn: (json['pendingWithdrawn'] as num?)?.toInt() ?? 0,
      earnings: (json['earnings'] as List<dynamic>?)
              ?.map((e) => CommissionEntry.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      payouts: (json['payouts'] as List<dynamic>?)
              ?.map((e) => Payout.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}

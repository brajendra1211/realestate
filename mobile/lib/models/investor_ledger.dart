/// Matches `GET /api/investor/ledger`'s response.
class InvestorLedgerEntry {
  const InvestorLedgerEntry({
    required this.id,
    required this.amount,
    this.note,
    required this.createdAt,
    this.customerTransactionRef,
    this.holdDurationDays,
  });

  final String id;
  final int amount;
  final String? note;
  final DateTime createdAt;
  final String? customerTransactionRef;
  final int? holdDurationDays;

  factory InvestorLedgerEntry.fromJson(Map<String, dynamic> json) => InvestorLedgerEntry(
        id: json['id'] as String,
        amount: (json['amount'] as num).toInt(),
        note: json['note'] as String?,
        createdAt: DateTime.parse(json['createdAt'] as String),
        customerTransactionRef: json['customerTransactionRef'] as String?,
        holdDurationDays: (json['holdDurationDays'] as num?)?.toInt(),
      );
}

const paymentModeLabels = {
  'BANK_TRANSFER': 'Bank transfer',
  'CHEQUE': 'Cheque',
  'CASH': 'Cash',
  'UPI': 'UPI',
  'NETBANKING': 'Net banking',
};

class ProfitDistribution {
  const ProfitDistribution({
    required this.id,
    required this.totalProfit,
    required this.investorShare,
    required this.paymentMode,
    required this.distributedAt,
  });

  final String id;
  final int totalProfit;
  final int investorShare;
  final String paymentMode;
  final DateTime distributedAt;

  String get paymentModeLabel => paymentModeLabels[paymentMode] ?? paymentMode;

  factory ProfitDistribution.fromJson(Map<String, dynamic> json) => ProfitDistribution(
        id: json['id'] as String,
        totalProfit: (json['totalProfit'] as num).toInt(),
        investorShare: (json['investorShare'] as num).toInt(),
        paymentMode: json['paymentMode'] as String,
        distributedAt: DateTime.parse(json['distributedAt'] as String),
      );
}

class InvestorLedger {
  const InvestorLedger({
    required this.entries,
    required this.distributions,
    required this.totalProfit,
  });

  final List<InvestorLedgerEntry> entries;
  final List<ProfitDistribution> distributions;
  final int totalProfit;

  factory InvestorLedger.fromJson(Map<String, dynamic> json) => InvestorLedger(
        entries: (json['entries'] as List<dynamic>? ?? [])
            .map((e) => InvestorLedgerEntry.fromJson(e as Map<String, dynamic>))
            .toList(),
        distributions: (json['distributions'] as List<dynamic>? ?? [])
            .map((e) => ProfitDistribution.fromJson(e as Map<String, dynamic>))
            .toList(),
        totalProfit: (json['totalProfit'] as num?)?.toInt() ?? 0,
      );
}

/// Matches `GET /api/investor/documents`'s response.
class InvestorDocument {
  const InvestorDocument({
    required this.id,
    required this.type,
    required this.title,
    required this.url,
    required this.createdAt,
  });

  final String id;
  final String type;
  final String title;
  final String url;
  final DateTime createdAt;

  factory InvestorDocument.fromJson(Map<String, dynamic> json) => InvestorDocument(
        id: json['id'] as String,
        type: json['type'] as String,
        title: json['title'] as String,
        url: json['url'] as String,
        createdAt: DateTime.parse(json['createdAt'] as String),
      );
}

class InvestorAgreement {
  const InvestorAgreement({
    required this.id,
    required this.customerName,
    required this.customerPhone,
    required this.agreementDate,
    this.flatUnitNumber,
    this.paymentAmount,
  });

  final String id;
  final String customerName;
  final String customerPhone;
  final DateTime agreementDate;
  final String? flatUnitNumber;
  final int? paymentAmount;

  factory InvestorAgreement.fromJson(Map<String, dynamic> json) => InvestorAgreement(
        id: json['id'] as String,
        customerName: json['customerName'] as String,
        customerPhone: json['customerPhone'] as String,
        agreementDate: DateTime.parse(json['agreementDate'] as String),
        flatUnitNumber: json['flatUnitNumber'] as String?,
        paymentAmount: (json['paymentAmount'] as num?)?.toInt(),
      );
}

class InvestorDocuments {
  const InvestorDocuments({required this.documents, required this.agreements});

  final List<InvestorDocument> documents;
  final List<InvestorAgreement> agreements;

  factory InvestorDocuments.fromJson(Map<String, dynamic> json) => InvestorDocuments(
        documents: (json['documents'] as List<dynamic>? ?? [])
            .map((e) => InvestorDocument.fromJson(e as Map<String, dynamic>))
            .toList(),
        agreements: (json['agreements'] as List<dynamic>? ?? [])
            .map((e) => InvestorAgreement.fromJson(e as Map<String, dynamic>))
            .toList(),
      );
}

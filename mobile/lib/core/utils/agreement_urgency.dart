/// Dart port of the backend's `getAgreementUrgency()`
/// (src/lib/listingDelist.ts) — the 6-month listing-agreement urgency tier.
/// Pure date arithmetic, safe to duplicate client-side; the backend's list
/// endpoint sends the raw `agreementExpiryDate` but not a precomputed tier.
enum AgreementTier { hotDeal, priority }

class AgreementUrgency {
  const AgreementUrgency({required this.tier, required this.daysRemaining});

  final AgreementTier tier;
  final int daysRemaining;

  String get badge => tier == AgreementTier.hotDeal ? 'Hot Deal' : 'Priority';
}

/// Returns null for NORMAL/EXPIRED tiers or a missing date — the website's
/// listing feed only ever badges HOT_DEAL/PRIORITY, nothing else.
AgreementUrgency? computeAgreementUrgency(DateTime? agreementExpiryDate) {
  if (agreementExpiryDate == null) return null;

  final daysRemaining = agreementExpiryDate.difference(DateTime.now()).inDays;
  if (daysRemaining <= 0) return null;
  if (daysRemaining <= 30) {
    return AgreementUrgency(tier: AgreementTier.hotDeal, daysRemaining: daysRemaining);
  }
  if (daysRemaining <= 90) {
    return AgreementUrgency(tier: AgreementTier.priority, daysRemaining: daysRemaining);
  }
  return null;
}

// Money-math for Phase 3 ("Money Automation" — docs/platform-requirements.md §7).
// Kept as pure functions so the calculator's math is independently testable and
// every ledger-writing lib (deal.ts, investor.ts, payout.ts) rounds the same way.
//
// Rates are passed in (from SiteSettings, admin-editable at /admin/settings)
// rather than hardcoded, so the client can tune every commission % without a
// code change.

export function computeBrokerage(dealValue: number, brokeragePercent: number) {
  return Math.round(dealValue * (brokeragePercent / 100));
}

export type ProfitSplit = {
  agentShare: number;
  expenseShare: number;
  investorShare: number;
  companyShare: number;
};

export type ProfitSplitRates = {
  agentPercent: number;
  expensePercent: number;
  investorPercent: number;
};

// Rounds the first three shares, then assigns the remainder to companyShare
// so the four parts always sum exactly to totalProfit (no paise lost/gained
// to independent rounding of each line).
export function computeProfitSplit(totalProfit: number, rates: ProfitSplitRates): ProfitSplit {
  const agentShare = Math.round(totalProfit * (rates.agentPercent / 100));
  const expenseShare = Math.round(totalProfit * (rates.expensePercent / 100));
  const investorShare = Math.round(totalProfit * (rates.investorPercent / 100));
  const companyShare = totalProfit - agentShare - expenseShare - investorShare;
  return { agentShare, expenseShare, investorShare, companyShare };
}

export type TdsBreakdown = {
  grossAmount: number;
  tdsPercent: number;
  tdsAmount: number;
  netAmount: number;
};

export function computeTds(grossAmount: number, tdsPercent: number): TdsBreakdown {
  const tdsAmount = Math.round(grossAmount * (tdsPercent / 100));
  return { grossAmount, tdsPercent, tdsAmount, netAmount: grossAmount - tdsAmount };
}

// amount * percent/100, rounded — the shared shape behind every 50/50-style
// wallet split (unlock pass, Gold listing, dispatch fee).
export function computeSplit(amount: number, agentSplitPercent: number) {
  const agentSplit = Math.round(amount * (agentSplitPercent / 100));
  return { agentSplit, companySplit: amount - agentSplit };
}

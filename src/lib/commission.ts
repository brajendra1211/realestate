// Money-math for Phase 3 ("Money Automation" — docs/platform-requirements.md §7).
// Kept as pure functions so the calculator's math is independently testable and
// every ledger-writing lib (deal.ts, investor.ts, payout.ts) rounds the same way.

const BROKERAGE_RATE = 0.01; // 1% each side — §3.12. 100% to the agent, no company cut.

const PROFIT_AGENT_SHARE_RATE = 0.1; // §3.13 — companyShare is the remainder (also 40%), see below
const PROFIT_EXPENSE_SHARE_RATE = 0.1;
const PROFIT_INVESTOR_SHARE_RATE = 0.4;

export function computeBrokerage(dealValue: number) {
  return Math.round(dealValue * BROKERAGE_RATE);
}

export type ProfitSplit = {
  agentShare: number;
  expenseShare: number;
  investorShare: number;
  companyShare: number;
};

// Rounds the first three shares, then assigns the remainder to companyShare
// so the four parts always sum exactly to totalProfit (no paise lost/gained
// to independent rounding of each line).
export function computeProfitSplit(totalProfit: number): ProfitSplit {
  const agentShare = Math.round(totalProfit * PROFIT_AGENT_SHARE_RATE);
  const expenseShare = Math.round(totalProfit * PROFIT_EXPENSE_SHARE_RATE);
  const investorShare = Math.round(totalProfit * PROFIT_INVESTOR_SHARE_RATE);
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

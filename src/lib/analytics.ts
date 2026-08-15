import { prisma } from "@/lib/prisma";
import { REGISTRATION_REFERRAL_SHARE } from "@/lib/investor";

// Live financial analytics — §3.14 Admin Panel: net profit, total investor
// returns, agent payouts, operating expenses. Company revenue is only the
// lines that are actually the company's money (profit-distribution company
// share, the unlock-pass company split, and the non-referral part of the
// investor registration fee) — agent commissions (brokerage, referral,
// unlock split) were never company money in the first place, so agent
// payouts are reported separately as a cash-out metric, not subtracted from
// net profit.
export async function getFinancialAnalytics() {
  const [profitAgg, unlockAgg, paidInvestors, investorReturnsAgg, paidPayoutsAgg] =
    await Promise.all([
      prisma.profitDistribution.aggregate({
        _sum: { companyShare: true, expenseShare: true, totalProfit: true },
      }),
      prisma.propertyUnlock.aggregate({ _sum: { companySplit: true } }),
      prisma.investorProfile.aggregate({
        where: { feeStatus: "PAID" },
        _sum: { registrationFee: true },
        _count: true,
      }),
      prisma.investorLedgerEntry.aggregate({ _sum: { amount: true } }),
      prisma.payoutRequest.aggregate({
        where: { status: "PAID" },
        _sum: { netAmount: true, tdsAmount: true },
      }),
    ]);

  const profitDistributionCompanyRevenue = profitAgg._sum.companyShare ?? 0;
  const unlockCompanyRevenue = unlockAgg._sum.companySplit ?? 0;
  const investorRegistrationCompanyRevenue =
    (paidInvestors._sum.registrationFee ?? 0) - paidInvestors._count * REGISTRATION_REFERRAL_SHARE;

  const companyRevenue =
    profitDistributionCompanyRevenue + unlockCompanyRevenue + investorRegistrationCompanyRevenue;
  const operatingExpense = profitAgg._sum.expenseShare ?? 0;
  const netProfit = companyRevenue - operatingExpense;

  return {
    companyRevenue,
    operatingExpense,
    netProfit,
    totalInvestorReturns: investorReturnsAgg._sum.amount ?? 0,
    totalAgentPayouts: paidPayoutsAgg._sum.netAmount ?? 0,
    totalTdsCollected: paidPayoutsAgg._sum.tdsAmount ?? 0,
    totalDealProfitCycled: profitAgg._sum.totalProfit ?? 0,
    breakdown: {
      profitDistributionCompanyRevenue,
      unlockCompanyRevenue,
      investorRegistrationCompanyRevenue,
    },
  };
}

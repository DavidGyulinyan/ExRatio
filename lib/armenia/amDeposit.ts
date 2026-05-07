import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";

export type DepositInput = {
  principal: number;
  annualRatePercent: number;
  /** Total term length in months. */
  months: number;
  compoundMonthly: boolean;
  monthlyContribution: number;
  taxOnProfit: boolean;
};

export type DepositResult = {
  finalAmount: number;
  totalContributions: number;
  earnedInterestBeforeTax: number;
  interestTax: number;
  netProfitAfterTax: number;
  /** Balance at end of each month (length months + 1). */
  balanceSeries: number[];
};

function futureValueCompound(
  principal: number,
  monthlyRate: number,
  months: number,
  payment: number
): { final: number; series: number[] } {
  const series: number[] = [principal];
  let balance = principal;
  if (monthlyRate === 0) {
    for (let i = 0; i < months; i++) {
      balance += payment;
      series.push(balance);
    }
    return { final: balance, series };
  }
  const factor = 1 + monthlyRate;
  for (let i = 0; i < months; i++) {
    balance = balance * factor + payment;
    series.push(balance);
  }
  return { final: balance, series };
}

function futureValueSimple(
  principal: number,
  annualRate: number,
  months: number,
  payment: number
): { final: number; series: number[] } {
  const series: number[] = [principal];
  let balance = principal;
  for (let i = 0; i < months; i++) {
    const elapsedYears = (i + 1) / 12;
    const interestOnPrincipal = principal * (annualRate / 100) * elapsedYears;
    balance = principal + interestOnPrincipal + payment * (i + 1);
    series.push(balance);
  }
  return { final: balance, series };
}

/**
 * Term deposit with optional monthly contribution and tax on interest income.
 */
export function calculateDeposit(input: DepositInput): DepositResult | null {
  if (!Number.isFinite(input.principal) || input.principal < 0) return null;
  if (!Number.isFinite(input.annualRatePercent) || input.annualRatePercent < 0) return null;
  const months = Math.max(0, Math.floor(input.months));
  const payment = Math.max(0, input.monthlyContribution);
  const monthlyRate = input.annualRatePercent / 100 / 12;

  const { final, series } = input.compoundMonthly
    ? futureValueCompound(input.principal, monthlyRate, months, payment)
    : futureValueSimple(input.principal, input.annualRatePercent, months, payment);

  const totalContributions = input.principal + payment * months;
  const earnedInterestBeforeTax = Math.max(0, final - totalContributions);
  const interestTax = input.taxOnProfit
    ? earnedInterestBeforeTax * C.DEPOSIT_INTEREST_INCOME_TAX_RATE
    : 0;
  const netProfitAfterTax = earnedInterestBeforeTax - interestTax;

  return {
    finalAmount: final - interestTax,
    totalContributions,
    earnedInterestBeforeTax,
    interestTax,
    netProfitAfterTax,
    balanceSeries: series,
  };
}

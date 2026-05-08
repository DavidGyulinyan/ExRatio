import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";
import { estimateGrossFromNet, payrollBreakdownFromGross } from "./amPayroll";

export type MaternityInput = {
  monthlyAmount: number;
  isGross: boolean;
  pregnancyDays: number;
  childbirthDays: number;
};

export type MaternityResult = {
  monthlyGross: number;
  monthlyBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
  dailyAverageGross: number;
  totalLeaveDays: number;
  estimatedBenefitGross: number;
  estimatedBenefitNet: number;
  benefitBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
  /** Benefit scaled to a 30-day month (illustrative). */
  monthlyEquivalentGross: number;
};

/**
 * Illustrative maternity / pregnancy leave benefit calculator.
 * Official Armenian social insurance uses benefit caps and employment history — replace when integrating exact rules.
 */
export function calculateMaternity(input: MaternityInput): MaternityResult | null {
  if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount <= 0) {
    return null;
  }
  const pregnancyDays = Math.max(0, input.pregnancyDays);
  const childbirthDays = Math.max(0, input.childbirthDays);
  const totalLeaveDays = pregnancyDays + childbirthDays;
  if (totalLeaveDays <= 0) return null;

  const monthlyGross = input.isGross
    ? input.monthlyAmount
    : estimateGrossFromNet(input.monthlyAmount);
  const monthlyBreakdown = payrollBreakdownFromGross(monthlyGross);
  const dailyAverageGross = monthlyGross / C.CALENDAR_DAYS_PER_MONTH;
  const estimatedBenefitGross =
    dailyAverageGross * totalLeaveDays * C.MATERNITY_BENEFIT_RATE_OF_DAILY_GROSS;
  const benefitBreakdown = payrollBreakdownFromGross(estimatedBenefitGross);
  const monthFraction = totalLeaveDays / C.CALENDAR_DAYS_PER_MONTH;
  const monthlyEquivalentGross =
    monthFraction > 0 ? estimatedBenefitGross / monthFraction : estimatedBenefitGross;

  return {
    monthlyGross,
    monthlyBreakdown,
    dailyAverageGross,
    totalLeaveDays,
    estimatedBenefitGross,
    estimatedBenefitNet: benefitBreakdown.netSalary,
    benefitBreakdown,
    monthlyEquivalentGross,
  };
}

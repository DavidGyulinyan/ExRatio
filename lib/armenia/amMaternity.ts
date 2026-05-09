import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";
import { estimateGrossFromNet, payrollBreakdownFromGross } from "./amPayroll";

export type MaternityInput = {
  monthlyAmount: number;
  isGross: boolean;
  pregnancyDays: number;
  childbirthDays: number;
  /** Complicated delivery — adds illustrative extra days to the childbirth segment. */
  complicatedBirth: boolean;
  /** Children born in one delivery (minimum 1). */
  childrenCount: number;
};

export type MaternityResult = {
  monthlyGross: number;
  monthlyBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
  dailyAverageGross: number;
  pregnancyDays: number;
  /** User-entered childbirth days (before options). */
  baseChildbirthDays: number;
  /** Extra days from complicated birth / multiple birth options. */
  extraChildbirthDays: number;
  effectiveChildbirthDays: number;
  totalLeaveDays: number;
  complicatedBirth: boolean;
  childrenCount: number;
  estimatedBenefitGross: number;
  estimatedBenefitNet: number;
  benefitBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
  /** Benefit scaled to a 30-day month (illustrative). */
  monthlyEquivalentGross: number;
};

/** Illustrative extra postnatal-style days from UI options (see AM_TAX_CONSTANTS). */
export function maternityExtraChildbirthDays(
  complicatedBirth: boolean,
  childrenCount: number
): number {
  let extra = 0;
  if (complicatedBirth) {
    extra += C.MATERNITY_COMPLICATED_BIRTH_EXTRA_CHILDBIRTH_DAYS;
  }
  const n = Math.max(1, Math.floor(childrenCount));
  if (n > 1) {
    extra += (n - 1) * C.MATERNITY_EACH_ADDITIONAL_CHILD_EXTRA_CHILDBIRTH_DAYS;
  }
  return extra;
}

/**
 * Illustrative maternity / pregnancy leave benefit calculator.
 * Official Armenian social insurance uses benefit caps and employment history — replace when integrating exact rules.
 */
export function calculateMaternity(input: MaternityInput): MaternityResult | null {
  if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount <= 0) {
    return null;
  }
  const pregnancyDays = Math.max(0, input.pregnancyDays);
  const baseChildbirthDays = Math.max(0, input.childbirthDays);
  const childrenCount = Math.min(
    20,
    Math.max(1, Math.floor(Number.isFinite(input.childrenCount) ? input.childrenCount : 1))
  );
  const complicatedBirth = Boolean(input.complicatedBirth);
  const extraChildbirthDays = maternityExtraChildbirthDays(complicatedBirth, childrenCount);
  const effectiveChildbirthDays = baseChildbirthDays + extraChildbirthDays;
  const totalLeaveDays = pregnancyDays + effectiveChildbirthDays;
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
    pregnancyDays,
    baseChildbirthDays,
    extraChildbirthDays,
    effectiveChildbirthDays,
    totalLeaveDays,
    complicatedBirth,
    childrenCount,
    estimatedBenefitGross,
    estimatedBenefitNet: benefitBreakdown.netSalary,
    benefitBreakdown,
    monthlyEquivalentGross,
  };
}

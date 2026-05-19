import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";
import { estimateGrossFromNet } from "./amPayroll";

/** RA Labor Code Art. 195 — five- or six-day workweek for average daily pay. */
export type WorkWeekSchedule = "fiveDay" | "sixDay";

export type AverageSalaryInput = {
  /** Total gross remuneration in the lookback (salary + bonuses + premiums). */
  totalRemunerationGross: number;
  /**
   * Months used as divisor for average monthly pay.
   * 12 when a full qualifying year exists; fewer in the first year of employment.
   */
  monthsForAverage: number;
  workWeek: WorkWeekSchedule;
};

export type AverageSalaryResult = {
  averageMonthlyGross: number;
  averageDailyGross: number;
  dailyDivisor: number;
  monthsForAverage: number;
};

export function leaveDailyDivisor(workWeek: WorkWeekSchedule): number {
  return workWeek === "sixDay"
    ? C.LEAVE_AVG_DAILY_DIVISOR_SIX_DAY
    : C.LEAVE_AVG_DAILY_DIVISOR_FIVE_DAY;
}

/**
 * Divisor for average monthly salary (Art. 195 §2–3).
 * Full lookback uses 12; shorter tenure uses months actually worked.
 */
export function monthsForAverageSalary(countingMonths: number): number {
  const months = Math.min(12, Math.max(1, Math.floor(countingMonths)));
  return months >= 12 ? 12 : months;
}

/** Gross pay in lookback: recurring salary × months + lump variable pay (bonuses, awards). */
export function buildLookbackRemunerationGross(params: {
  monthlyGross: number;
  countingMonths: number;
  variablePayGross: number;
}): number {
  const months = Math.min(12, Math.max(1, Math.floor(params.countingMonths)));
  return params.monthlyGross * months + Math.max(0, params.variablePayGross);
}

/**
 * Average monthly & daily salary for annual leave (Art. 167, 195).
 * Vacation pay = average daily × leave days.
 */
export type AverageSalaryBasisMode = "twelveMonth" | "singleMonth";

export type ResolveAverageDailyInput = {
  monthlyAmount: number;
  isGross: boolean;
  basisMode: AverageSalaryBasisMode;
  variablePayGross: number;
  countingMonths: number;
  workWeek: WorkWeekSchedule;
};

/** Shared 12-month / last-month average for vacation pay and disability benefits (Art. 195). */
export function resolveAverageDailyGross(
  input: ResolveAverageDailyInput
): (AverageSalaryResult & { totalRemunerationGross: number; monthlyGross: number }) | null {
  if (!Number.isFinite(input.monthlyAmount) || input.monthlyAmount <= 0) {
    return null;
  }
  const monthlyGross = input.isGross
    ? input.monthlyAmount
    : estimateGrossFromNet(input.monthlyAmount);

  let totalRemunerationGross: number;
  let monthsForAverage: number;

  if (input.basisMode === "twelveMonth") {
    const countingMonths = Math.min(12, Math.max(1, Math.floor(input.countingMonths)));
    totalRemunerationGross = buildLookbackRemunerationGross({
      monthlyGross,
      countingMonths,
      variablePayGross: input.variablePayGross,
    });
    monthsForAverage = monthsForAverageSalary(countingMonths);
  } else {
    totalRemunerationGross = monthlyGross;
    monthsForAverage = 1;
  }

  const average = calculateAverageSalary({
    totalRemunerationGross,
    monthsForAverage,
    workWeek: input.workWeek,
  });
  if (!average) return null;

  return { ...average, totalRemunerationGross, monthlyGross };
}

export function calculateAverageSalary(
  input: AverageSalaryInput
): AverageSalaryResult | null {
  if (
    !Number.isFinite(input.totalRemunerationGross) ||
    input.totalRemunerationGross <= 0
  ) {
    return null;
  }
  const monthsForAverage = monthsForAverageSalary(input.monthsForAverage);
  const averageMonthlyGross = input.totalRemunerationGross / monthsForAverage;
  const dailyDivisor = leaveDailyDivisor(input.workWeek);
  const averageDailyGross = averageMonthlyGross / dailyDivisor;
  return {
    averageMonthlyGross,
    averageDailyGross,
    dailyDivisor,
    monthsForAverage,
  };
}

import {
  resolveAverageDailyGross,
  type AverageSalaryBasisMode,
  type WorkWeekSchedule,
} from "./amAverageSalary";
import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";

export type { AverageSalaryBasisMode, WorkWeekSchedule };

export type TemporaryDisabilityInput = {
  monthlyAmount: number;
  isGross: boolean;
  /** Total working days on sick leave (per disability certificate). */
  sickLeaveWorkingDays: number;
  workWeek: WorkWeekSchedule;
  basisMode: AverageSalaryBasisMode;
  variablePayGross: number;
  countingMonths: number;
};

export type TemporaryDisabilityResult = {
  basisMode: AverageSalaryBasisMode;
  workWeek: WorkWeekSchedule;
  monthlyGross: number;
  totalRemunerationGross: number;
  monthsForAverage: number;
  averageMonthlyGross: number;
  averageDailyGross: number;
  dailyDivisor: number;
  sickLeaveWorkingDays: number;
  /** First working day of disability — not paid (Art. 6). */
  unpaidDays: number;
  /** Working days that receive benefit (from day 2 onward). */
  paidWorkingDays: number;
  /** Days 2–4 paid by employer (not reimbursed). */
  employerPaidDays: number;
  /** Remaining paid days covered from state budget. */
  statePaidDays: number;
  totalBenefitGross: number;
  employerBenefitGross: number;
  stateBenefitGross: number;
};

/**
 * Sick-leave benefit (հիվանդության / ժամանակավոր անաշխատունակության նպաստ).
 * Law on Temporary Disability Benefits: average daily × paid days from day 2;
 * days 2–4 employer, remainder state (Art. 6, 22).
 */
export function calculateTemporaryDisability(
  input: TemporaryDisabilityInput
): TemporaryDisabilityResult | null {
  if (
    !Number.isFinite(input.monthlyAmount) ||
    !Number.isFinite(input.sickLeaveWorkingDays) ||
    input.monthlyAmount <= 0 ||
    input.sickLeaveWorkingDays <= 0
  ) {
    return null;
  }

  const average = resolveAverageDailyGross({
    monthlyAmount: input.monthlyAmount,
    isGross: input.isGross,
    basisMode: input.basisMode,
    variablePayGross: input.variablePayGross,
    countingMonths: input.countingMonths,
    workWeek: input.workWeek,
  });
  if (!average) return null;

  const sickLeaveWorkingDays = Math.floor(input.sickLeaveWorkingDays);
  const unpaidDays = sickLeaveWorkingDays >= 1 ? 1 : 0;
  const paidWorkingDays = Math.max(0, sickLeaveWorkingDays - unpaidDays);
  const employerPaidDays = Math.min(
    C.DISABILITY_EMPLOYER_PAID_WORKING_DAYS,
    paidWorkingDays
  );
  const statePaidDays = Math.max(0, paidWorkingDays - employerPaidDays);

  const daily = average.averageDailyGross;
  const employerBenefitGross = daily * employerPaidDays;
  const stateBenefitGross = daily * statePaidDays;
  const totalBenefitGross = employerBenefitGross + stateBenefitGross;

  return {
    basisMode: input.basisMode,
    workWeek: input.workWeek,
    monthlyGross: average.monthlyGross,
    totalRemunerationGross: average.totalRemunerationGross,
    monthsForAverage: average.monthsForAverage,
    averageMonthlyGross: average.averageMonthlyGross,
    averageDailyGross: daily,
    dailyDivisor: average.dailyDivisor,
    sickLeaveWorkingDays,
    unpaidDays,
    paidWorkingDays,
    employerPaidDays,
    statePaidDays,
    totalBenefitGross,
    employerBenefitGross,
    stateBenefitGross,
  };
}

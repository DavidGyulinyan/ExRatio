import {
  resolveAverageDailyGross,
  type AverageSalaryBasisMode,
  type WorkWeekSchedule,
} from "./amAverageSalary";
import { estimateGrossFromNet, payrollBreakdownFromGross } from "./amPayroll";

export type { WorkWeekSchedule } from "./amAverageSalary";
export type PaidLeaveBasisMode = AverageSalaryBasisMode;

export type PaidLeaveInput = {
  monthlyAmount: number;
  isGross: boolean;
  leaveDays: number;
  workWeek: WorkWeekSchedule;
  basisMode: PaidLeaveBasisMode;
  variablePayGross: number;
  countingMonths: number;
};

export type PaidLeaveResult = {
  basisMode: PaidLeaveBasisMode;
  workWeek: WorkWeekSchedule;
  monthlyGross: number;
  monthlyNet: number;
  monthlyBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
  totalRemunerationGross: number;
  monthsForAverage: number;
  averageMonthlyGross: number;
  averageDailyGross: number;
  averageDailyNet: number;
  dailyDivisor: number;
  leaveGross: number;
  leaveNet: number;
  leaveBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
};

/**
 * Annual leave pay (արձակուրդային վճար) per RA Labor Code Art. 167: average daily × leave days.
 */
export function calculatePaidLeave(input: PaidLeaveInput): PaidLeaveResult | null {
  if (
    !Number.isFinite(input.monthlyAmount) ||
    !Number.isFinite(input.leaveDays) ||
    input.monthlyAmount <= 0 ||
    input.leaveDays <= 0
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

  const monthlyBreakdown = payrollBreakdownFromGross(average.monthlyGross);
  const averageDailyNet =
    (monthlyBreakdown.netSalary / average.monthlyGross) * average.averageDailyGross;

  const leaveGross = average.averageDailyGross * input.leaveDays;
  const leaveBreakdown = payrollBreakdownFromGross(leaveGross);

  return {
    basisMode: input.basisMode,
    workWeek: input.workWeek,
    monthlyGross: average.monthlyGross,
    monthlyNet: monthlyBreakdown.netSalary,
    monthlyBreakdown,
    totalRemunerationGross: average.totalRemunerationGross,
    monthsForAverage: average.monthsForAverage,
    averageMonthlyGross: average.averageMonthlyGross,
    averageDailyGross: average.averageDailyGross,
    averageDailyNet,
    dailyDivisor: average.dailyDivisor,
    leaveGross,
    leaveNet: leaveBreakdown.netSalary,
    leaveBreakdown,
  };
}

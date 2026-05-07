import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";
import { estimateGrossFromNet, payrollBreakdownFromGross } from "./amPayroll";

export type PaidLeaveInput = {
  monthlyAmount: number;
  isGross: boolean;
  leaveDays: number;
  useWorkingDayBasis: boolean;
};

export type PaidLeaveResult = {
  monthlyGross: number;
  monthlyNet: number;
  monthlyBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
  averageDailyGross: number;
  averageDailyNet: number;
  leaveGross: number;
  leaveNet: number;
  leaveBreakdown: ReturnType<typeof payrollBreakdownFromGross>;
};

/**
 * Standard paid leave (ֆիզ արձակուրդ): approximate daily rate × leave days.
 * Vacation pay is then modeled as a one-time gross using the same withholding stack (illustrative).
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
  const monthlyGross = input.isGross
    ? input.monthlyAmount
    : estimateGrossFromNet(input.monthlyAmount);
  const monthlyBreakdown = payrollBreakdownFromGross(monthlyGross);
  const divisor = input.useWorkingDayBasis
    ? C.WORKING_DAYS_PER_MONTH_FOR_LEAVE
    : C.CALENDAR_DAYS_PER_MONTH;
  const averageDailyGross = monthlyGross / divisor;
  const averageDailyNet = monthlyBreakdown.netSalary / divisor;
  const leaveGross = averageDailyGross * input.leaveDays;
  const leaveBreakdown = payrollBreakdownFromGross(leaveGross);
  return {
    monthlyGross,
    monthlyNet: monthlyBreakdown.netSalary,
    monthlyBreakdown,
    averageDailyGross,
    averageDailyNet,
    leaveGross,
    leaveNet: leaveBreakdown.netSalary,
    leaveBreakdown,
  };
}

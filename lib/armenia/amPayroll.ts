import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";

export type PayrollBreakdown = {
  grossSalary: number;
  pensionEmployee: number;
  militaryStamp: number;
  mandatoryHealth: number;
  /** PIT base for monthly withholding (20% of gross per typical RA payslip practice). */
  taxableIncomeForIncomeTax: number;
  incomeTax: number;
  totalEmployeeDeductions: number;
  netSalary: number;
};

export function employeePensionMonthly(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  let contribution: number;
  if (gross <= C.PENSION_LOW_THRESHOLD_AMD) {
    contribution = gross * C.PENSION_LOW_RATE;
  } else {
    contribution = gross * C.PENSION_HIGH_RATE - C.PENSION_HIGH_LINEAR_DEDUCTION_AMD;
  }
  contribution = Math.max(0, contribution);
  return Math.min(C.PENSION_MONTHLY_CAP_AMD, contribution);
}

export function militaryStampMonthly(gross: number): number {
  if (!Number.isFinite(gross) || gross <= 0) return 0;
  return gross <= C.MILITARY_LOW_THRESHOLD_AMD
    ? C.MILITARY_LOW_AMOUNT_AMD
    : C.MILITARY_HIGH_AMOUNT_AMD;
}

export function mandatoryHealthMonthly(gross: number): number {
  if (!Number.isFinite(gross) || gross <= C.HEALTH_EXEMPT_THRESHOLD_AMD) return 0;
  return gross <= C.HEALTH_SECOND_THRESHOLD_AMD ? C.HEALTH_LOW_AMD : C.HEALTH_HIGH_AMD;
}

/**
 * Employee-side deductions from monthly gross (private-sector style model).
 */
export function payrollBreakdownFromGross(grossSalary: number): PayrollBreakdown {
  const g = Math.max(0, grossSalary);
  const pensionEmployee = employeePensionMonthly(g);
  const militaryStamp = militaryStampMonthly(g);
  const mandatoryHealth = mandatoryHealthMonthly(g);
  // RA payroll sheets commonly withhold 20% PIT on full gross (pension is separate).
  const taxableIncomeForIncomeTax = g;
  const incomeTax = taxableIncomeForIncomeTax * C.INCOME_TAX_RATE;
  const totalEmployeeDeductions = pensionEmployee + militaryStamp + mandatoryHealth + incomeTax;
  const netSalary = Math.max(0, g - totalEmployeeDeductions);
  return {
    grossSalary: g,
    pensionEmployee,
    militaryStamp,
    mandatoryHealth,
    taxableIncomeForIncomeTax,
    incomeTax,
    totalEmployeeDeductions,
    netSalary,
  };
}

/**
 * Invert net → gross using monotonic binary search (same deduction functions).
 */
export function estimateGrossFromNet(targetNet: number): number {
  if (!Number.isFinite(targetNet) || targetNet <= 0) return 0;
  let low = targetNet;
  let high = Math.max(targetNet * 2.8, targetNet + 500_000);
  let best = low;
  for (let i = 0; i < C.GROSS_NET_MAX_ITER; i++) {
    const mid = (low + high) / 2;
    const { netSalary } = payrollBreakdownFromGross(mid);
    if (Math.abs(netSalary - targetNet) < C.GROSS_NET_TOLERANCE_AMD) {
      return mid;
    }
    if (netSalary < targetNet) {
      low = mid;
    } else {
      high = mid;
    }
    best = mid;
  }
  return best;
}

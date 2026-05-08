import {
  AM_FREELANCE_TAX_CONSTANTS,
  type SoleProprietorRegimeId,
} from "./amFreelanceTaxConstants";

export type MoneyInput = {
  /** Raw amount in AMD or chosen currency (UI defines). */
  amount: number;
};

export type SoleProprietorTaxInput = {
  monthlyIncome: number;
  /** Optional deductible expenses (simplified model). */
  monthlyExpenses?: number;
  regimeId: SoleProprietorRegimeId;
  /** If true, `monthlyIncome` is gross revenue; otherwise it is net after tax+expenses. */
  incomeIsGross: boolean;
};

export type SoleProprietorTaxResult = {
  regimeId: SoleProprietorRegimeId;
  taxRate: number;
  monthly: {
    grossIncome: number;
    expenses: number;
    taxableBase: number;
    estimatedTax: number;
    netAfterTaxAndExpenses: number;
  };
  yearly: {
    grossIncome: number;
    expenses: number;
    taxableBase: number;
    estimatedTax: number;
    netAfterTaxAndExpenses: number;
  };
};

export function calculateSoleProprietorTax(
  input: SoleProprietorTaxInput
): SoleProprietorTaxResult | null {
  const regime = AM_FREELANCE_TAX_CONSTANTS.SOLE_PROPRIETOR_REGIMES[input.regimeId];
  const taxRate = regime?.taxRate;
  if (!Number.isFinite(taxRate)) return null;

  const expenses = Math.max(0, input.monthlyExpenses ?? 0);
  if (!Number.isFinite(expenses)) return null;

  const income = input.monthlyIncome;
  if (!Number.isFinite(income) || income < 0) return null;

  // Simplified assumption: tax applies to (income - expenses) at a flat rate.
  // Inversion for net input:
  // net = gross - expenses - rate * max(0, gross - expenses)
  // If gross <= expenses => tax=0 => net = gross - expenses (<=0). We ignore that edge for inversion.
  const grossIncome = input.incomeIsGross
    ? income
    : Math.max(
        0,
        // gross = (net + expenses*(1-rate)) / (1-rate)
        (income + expenses * (1 - taxRate)) / Math.max(1e-9, 1 - taxRate)
      );

  const taxableBase = Math.max(0, grossIncome - expenses);
  const estimatedTax = taxableBase * taxRate;
  const netAfterTaxAndExpenses = Math.max(0, grossIncome - expenses - estimatedTax);

  const monthly = {
    grossIncome,
    expenses,
    taxableBase,
    estimatedTax,
    netAfterTaxAndExpenses,
  };
  const yearly = {
    grossIncome: monthly.grossIncome * 12,
    expenses: monthly.expenses * 12,
    taxableBase: monthly.taxableBase * 12,
    estimatedTax: monthly.estimatedTax * 12,
    netAfterTaxAndExpenses: monthly.netAfterTaxAndExpenses * 12,
  };

  return { regimeId: input.regimeId, taxRate, monthly, yearly };
}

export type TurnoverTaxInput = {
  revenue: number;
  taxRate: number;
  expenses?: number;
};

export type TurnoverTaxResult = {
  revenue: number;
  expenses: number;
  taxRate: number;
  taxAmount: number;
  remainingProfit: number;
  effectiveRate: number;
};

export function calculateTurnoverTax(
  input: TurnoverTaxInput
): TurnoverTaxResult | null {
  const revenue = input.revenue;
  const taxRate = input.taxRate;
  const expenses = Math.max(0, input.expenses ?? 0);
  if (!Number.isFinite(revenue) || revenue < 0) return null;
  if (!Number.isFinite(taxRate) || taxRate < 0) return null;
  if (!Number.isFinite(expenses)) return null;

  const taxAmount = revenue * taxRate;
  const remainingProfit = Math.max(0, revenue - expenses - taxAmount);
  const effectiveRate = revenue > 0 ? taxAmount / revenue : 0;

  return {
    revenue,
    expenses,
    taxRate,
    taxAmount,
    remainingProfit,
    effectiveRate,
  };
}

export type ProfitTaxInput = {
  revenue: number;
  expenses: number;
  profitTaxRate?: number;
};

export type ProfitTaxResult = {
  revenue: number;
  expenses: number;
  profit: number;
  profitTaxRate: number;
  estimatedProfitTax: number;
  netRemaining: number;
};

export function calculateProfitTax(
  input: ProfitTaxInput
): ProfitTaxResult | null {
  const revenue = input.revenue;
  const expenses = input.expenses;
  const profitTaxRate = input.profitTaxRate ?? AM_FREELANCE_TAX_CONSTANTS.PROFIT_TAX_RATE;

  if (!Number.isFinite(revenue) || revenue < 0) return null;
  if (!Number.isFinite(expenses) || expenses < 0) return null;
  if (!Number.isFinite(profitTaxRate) || profitTaxRate < 0) return null;

  const profit = revenue - expenses;
  const taxableProfit = Math.max(0, profit);
  const estimatedProfitTax = taxableProfit * profitTaxRate;
  const netRemaining = Math.max(0, taxableProfit - estimatedProfitTax);

  return {
    revenue,
    expenses,
    profit,
    profitTaxRate,
    estimatedProfitTax,
    netRemaining,
  };
}

export type VatMode = "includesVat" | "excludesVat";

export type VatInput = {
  amount: number;
  vatRate?: number;
  mode: VatMode;
};

export type VatResult = {
  vatRate: number;
  mode: VatMode;
  originalAmount: number;
  vatAmount: number;
  finalAmount: number;
};

export function calculateVat(input: VatInput): VatResult | null {
  const vatRate = input.vatRate ?? AM_FREELANCE_TAX_CONSTANTS.VAT_RATE;
  if (!Number.isFinite(vatRate) || vatRate < 0) return null;
  if (!Number.isFinite(input.amount) || input.amount < 0) return null;

  if (input.mode === "includesVat") {
    const finalAmount = input.amount;
    const originalAmount = vatRate === 0 ? finalAmount : finalAmount / (1 + vatRate);
    const vatAmount = Math.max(0, finalAmount - originalAmount);
    return { vatRate, mode: input.mode, originalAmount, vatAmount, finalAmount };
  }

  const originalAmount = input.amount;
  const vatAmount = originalAmount * vatRate;
  const finalAmount = originalAmount + vatAmount;
  return { vatRate, mode: input.mode, originalAmount, vatAmount, finalAmount };
}


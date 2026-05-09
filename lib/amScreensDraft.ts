import type { SoleProprietorRegimeId, VatMode } from "@/lib/armenia";
import type { InvoiceCurrency } from "@/lib/invoices";
import { getAsyncStorage } from "@/lib/storage";

const AM_FINANCE_KEY = "capital.amFinance.forms.v1";
const AM_FREELANCE_KEY = "capital.amFreelance.forms.v1";
const LOAN_CALCULATOR_KEY = "capital.loanCalculator.v1";

export type AmFinanceFormsDraft = {
  paidLeave: {
    salaryStr: string;
    leaveStr: string;
    isGross: boolean;
    workingDayBasis: boolean;
  };
  maternity: {
    salaryStr: string;
    pregStr: string;
    birthStr: string;
    isGross: boolean;
    complicatedBirth: boolean;
    /** Children in one delivery (string for shared Field UX). */
    childrenCountStr: string;
  };
  salary: {
    amountStr: string;
    knowGross: boolean;
  };
  deposit: {
    principalStr: string;
    rateStr: string;
    monthsStr: string;
    yearsMode: boolean;
    yearsStr: string;
    compound: boolean;
    contribStr: string;
    taxOnProfit: boolean;
  };
};

export type AmFreelanceFormsDraft = {
  soleProp: {
    incomeStr: string;
    expensesStr: string;
    regimeId: SoleProprietorRegimeId;
    incomeIsGross: boolean;
  };
  turnover: {
    revenueStr: string;
    expensesStr: string;
    rateStr: string;
  };
  profitTax: {
    revenueStr: string;
    expensesStr: string;
  };
  vat: {
    amountStr: string;
    mode: VatMode;
  };
  invoice: {
    sellerName: string;
    clientName: string;
    serviceDescription: string;
    amountStr: string;
    currency: InvoiceCurrency;
    vatOn: boolean;
    invoiceNumber: string;
    draftId: string;
  };
  dashboard: {
    selectedCurrency: InvoiceCurrency;
  };
};

export function defaultAmFinanceDraft(): AmFinanceFormsDraft {
  return {
    paidLeave: {
      salaryStr: "",
      leaveStr: "",
      isGross: false,
      workingDayBasis: true,
    },
    maternity: {
      salaryStr: "",
      pregStr: "",
      birthStr: "",
      isGross: false,
      complicatedBirth: false,
      childrenCountStr: "1",
    },
    salary: {
      amountStr: "",
      knowGross: false,
    },
    deposit: {
      principalStr: "",
      rateStr: "",
      monthsStr: "",
      yearsMode: false,
      yearsStr: "",
      compound: true,
      contribStr: "",
      taxOnProfit: true,
    },
  };
}

export function defaultAmFreelanceDraft(): AmFreelanceFormsDraft {
  return {
    soleProp: {
      incomeStr: "",
      expensesStr: "",
      regimeId: "turnover_5",
      incomeIsGross: true,
    },
    turnover: {
      revenueStr: "",
      expensesStr: "",
      rateStr: "",
    },
    profitTax: {
      revenueStr: "",
      expensesStr: "",
    },
    vat: {
      amountStr: "",
      mode: "includesVat",
    },
    invoice: {
      sellerName: "",
      clientName: "",
      serviceDescription: "",
      amountStr: "",
      currency: "USD",
      vatOn: false,
      invoiceNumber: "",
      draftId: "",
    },
    dashboard: {
      selectedCurrency: "USD",
    },
  };
}

function mergeFinance(
  base: AmFinanceFormsDraft,
  raw: unknown
): AmFinanceFormsDraft {
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<AmFinanceFormsDraft>;
  const mRaw = { ...base.maternity, ...o.maternity };
  return {
    paidLeave: { ...base.paidLeave, ...o.paidLeave },
    maternity: {
      ...mRaw,
      complicatedBirth:
        typeof mRaw.complicatedBirth === "boolean" ? mRaw.complicatedBirth : false,
      childrenCountStr:
        mRaw.childrenCountStr !== undefined && mRaw.childrenCountStr !== null
          ? String(mRaw.childrenCountStr)
          : "1",
    },
    salary: { ...base.salary, ...o.salary },
    deposit: { ...base.deposit, ...o.deposit },
  };
}

function mergeFreelance(
  base: AmFreelanceFormsDraft,
  raw: unknown
): AmFreelanceFormsDraft {
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<AmFreelanceFormsDraft>;
  return {
    soleProp: { ...base.soleProp, ...o.soleProp },
    turnover: { ...base.turnover, ...o.turnover },
    profitTax: { ...base.profitTax, ...o.profitTax },
    vat: { ...base.vat, ...o.vat },
    invoice: { ...base.invoice, ...o.invoice },
    dashboard: { ...base.dashboard, ...o.dashboard },
  };
}

export async function loadAmFinanceDraft(): Promise<AmFinanceFormsDraft> {
  const raw = await getAsyncStorage().getItem(AM_FINANCE_KEY);
  if (!raw) return defaultAmFinanceDraft();
  try {
    return mergeFinance(defaultAmFinanceDraft(), JSON.parse(raw));
  } catch {
    return defaultAmFinanceDraft();
  }
}

export async function saveAmFinanceDraft(draft: AmFinanceFormsDraft): Promise<void> {
  await getAsyncStorage().setItem(AM_FINANCE_KEY, JSON.stringify(draft));
}

export async function loadAmFreelanceDraft(): Promise<AmFreelanceFormsDraft> {
  const raw = await getAsyncStorage().getItem(AM_FREELANCE_KEY);
  if (!raw) return defaultAmFreelanceDraft();
  try {
    return mergeFreelance(defaultAmFreelanceDraft(), JSON.parse(raw));
  } catch {
    return defaultAmFreelanceDraft();
  }
}

export async function saveAmFreelanceDraft(
  draft: AmFreelanceFormsDraft
): Promise<void> {
  await getAsyncStorage().setItem(AM_FREELANCE_KEY, JSON.stringify(draft));
}

/** Standalone loan modal — same term UX as deposit (months vs years). */
export type LoanCalculatorDraft = {
  principalStr: string;
  rateStr: string;
  monthsStr: string;
  yearsMode: boolean;
  yearsStr: string;
};

export function defaultLoanCalculatorDraft(): LoanCalculatorDraft {
  return {
    principalStr: "",
    rateStr: "",
    monthsStr: "",
    yearsMode: false,
    yearsStr: "",
  };
}

function mergeLoanDraft(
  base: LoanCalculatorDraft,
  raw: unknown
): LoanCalculatorDraft {
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<LoanCalculatorDraft>;
  return {
    principalStr: o.principalStr ?? base.principalStr,
    rateStr: o.rateStr ?? base.rateStr,
    monthsStr: o.monthsStr ?? base.monthsStr,
    yearsMode: typeof o.yearsMode === "boolean" ? o.yearsMode : base.yearsMode,
    yearsStr: o.yearsStr ?? base.yearsStr,
  };
}

export async function loadLoanCalculatorDraft(): Promise<LoanCalculatorDraft> {
  const raw = await getAsyncStorage().getItem(LOAN_CALCULATOR_KEY);
  if (!raw) return defaultLoanCalculatorDraft();
  try {
    return mergeLoanDraft(defaultLoanCalculatorDraft(), JSON.parse(raw));
  } catch {
    return defaultLoanCalculatorDraft();
  }
}

export async function saveLoanCalculatorDraft(
  draft: LoanCalculatorDraft
): Promise<void> {
  await getAsyncStorage().setItem(LOAN_CALCULATOR_KEY, JSON.stringify(draft));
}

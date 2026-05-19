import type { SoleProprietorRegimeId, VatMode } from "@/lib/armenia";
import { INVOICES_STORAGE_KEY, type InvoiceCurrency } from "@/lib/invoices";
import { FREELANCE_REMINDERS_STORAGE_KEY } from "@/lib/freelanceReminders";
import { getAsyncStorage } from "@/lib/storage";

const AM_FINANCE_KEY = "capital.amFinance.forms.v1";
const AM_FREELANCE_KEY = "capital.amFreelance.forms.v1";
const LOAN_CALCULATOR_KEY = "capital.loanCalculator.v1";

export type AmFinanceFormsDraft = {
  /** Shared income basis + annual leave days + sick-leave working days. */
  paidLeave: {
    salaryStr: string;
    leaveStr: string;
    sickDaysStr: string;
    isGross: boolean;
    workWeek: "fiveDay" | "sixDay";
    basisMode: "twelveMonth" | "singleMonth";
    variablePayStr: string;
    countingMonthsStr: string;
    /** @deprecated Migrated to workWeek. */
    workingDayBasis?: boolean;
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
  vehicleCustoms: {
    valueStr: string;
    engineCcStr: string;
    /** Model / release calendar year (e.g. 2019). */
    releaseYearStr: string;
    isElectric: boolean;
  };
  /** Vehicle sale — income tax worksheet (AMD, years, power). */
  vehicleDeal: {
    acquisitionYearStr: string;
    saleYearStr: string;
    acquisitionStr: string;
    importStr: string;
    salePriceStr: string;
    powerStr: string;
    powerUnit: "hp" | "kw";
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
      sickDaysStr: "",
      isGross: false,
      workWeek: "fiveDay",
      basisMode: "twelveMonth",
      variablePayStr: "",
      countingMonthsStr: "12",
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
    vehicleCustoms: {
      valueStr: "",
      engineCcStr: "2",
      releaseYearStr: String(new Date().getFullYear()),
      isElectric: false,
    },
    vehicleDeal: {
      acquisitionYearStr: "",
      saleYearStr: String(new Date().getFullYear()),
      acquisitionStr: "",
      importStr: "",
      salePriceStr: "",
      powerStr: "",
      powerUnit: "hp",
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

type IncomeBasisDraft = {
  salaryStr: string;
  isGross: boolean;
  workWeek: "fiveDay" | "sixDay";
  basisMode: "twelveMonth" | "singleMonth";
  variablePayStr: string;
  countingMonthsStr: string;
  workingDayBasis?: boolean;
};

function mergeIncomeBasisDraft<T extends IncomeBasisDraft>(
  base: T,
  raw: Partial<T> | undefined,
  daysKey: keyof T
): T {
  const pl = { ...base, ...raw };
  let workWeek = pl.workWeek;
  if (workWeek !== "fiveDay" && workWeek !== "sixDay") {
    workWeek = pl.workingDayBasis === false ? "sixDay" : "fiveDay";
  }
  const basisMode =
    pl.basisMode === "singleMonth" || pl.basisMode === "twelveMonth"
      ? pl.basisMode
      : "twelveMonth";
  return {
    ...pl,
    salaryStr: pl.salaryStr ?? "",
    [daysKey]: (pl[daysKey] as string) ?? "",
    isGross: typeof pl.isGross === "boolean" ? pl.isGross : false,
    workWeek,
    basisMode,
    variablePayStr: pl.variablePayStr ?? "",
    countingMonthsStr: pl.countingMonthsStr ?? "12",
  } as T;
}

function mergeFinance(
  base: AmFinanceFormsDraft,
  raw: unknown
): AmFinanceFormsDraft {
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<AmFinanceFormsDraft>;
  const mRaw = { ...base.maternity, ...o.maternity };
  return {
    paidLeave: (() => {
      const dis = (o as { disabilityBenefit?: Partial<AmFinanceFormsDraft["paidLeave"]> })
        .disabilityBenefit;
      const raw = { ...base.paidLeave, ...o.paidLeave };
      if (dis) {
        if (!raw.salaryStr && dis.salaryStr) raw.salaryStr = dis.salaryStr;
        if (!raw.sickDaysStr && dis.sickDaysStr) raw.sickDaysStr = dis.sickDaysStr;
        if (!raw.variablePayStr && dis.variablePayStr) raw.variablePayStr = dis.variablePayStr;
        if (raw.isGross === base.paidLeave.isGross && typeof dis.isGross === "boolean") {
          raw.isGross = dis.isGross;
        }
        if (raw.workWeek === base.paidLeave.workWeek && dis.workWeek) raw.workWeek = dis.workWeek;
        if (raw.basisMode === base.paidLeave.basisMode && dis.basisMode) {
          raw.basisMode = dis.basisMode;
        }
        if (raw.countingMonthsStr === "12" && dis.countingMonthsStr) {
          raw.countingMonthsStr = dis.countingMonthsStr;
        }
      }
      const merged = mergeIncomeBasisDraft(
        { ...base.paidLeave, sickDaysStr: "" },
        raw,
        "leaveStr"
      );
      return { ...merged, sickDaysStr: raw.sickDaysStr ?? "" };
    })(),
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
    vehicleCustoms: {
      ...base.vehicleCustoms,
      ...o.vehicleCustoms,
      isElectric:
        typeof o.vehicleCustoms?.isElectric === "boolean"
          ? o.vehicleCustoms.isElectric
          : base.vehicleCustoms.isElectric,
      engineCcStr:
        o.vehicleCustoms?.engineCcStr !== undefined && o.vehicleCustoms?.engineCcStr !== null
          ? String(o.vehicleCustoms.engineCcStr)
          : base.vehicleCustoms.engineCcStr,
      releaseYearStr:
        o.vehicleCustoms?.releaseYearStr !== undefined && o.vehicleCustoms?.releaseYearStr !== null
          ? String(o.vehicleCustoms.releaseYearStr)
          : base.vehicleCustoms.releaseYearStr,
    },
    vehicleDeal: {
      ...base.vehicleDeal,
      ...o.vehicleDeal,
      acquisitionYearStr:
        o.vehicleDeal?.acquisitionYearStr !== undefined &&
        o.vehicleDeal?.acquisitionYearStr !== null
          ? String(o.vehicleDeal.acquisitionYearStr)
          : base.vehicleDeal.acquisitionYearStr,
      saleYearStr:
        o.vehicleDeal?.saleYearStr !== undefined && o.vehicleDeal?.saleYearStr !== null
          ? String(o.vehicleDeal.saleYearStr)
          : base.vehicleDeal.saleYearStr,
      acquisitionStr:
        o.vehicleDeal?.acquisitionStr !== undefined && o.vehicleDeal?.acquisitionStr !== null
          ? String(o.vehicleDeal.acquisitionStr)
          : base.vehicleDeal.acquisitionStr,
      importStr:
        o.vehicleDeal?.importStr !== undefined && o.vehicleDeal?.importStr !== null
          ? String(o.vehicleDeal.importStr)
          : base.vehicleDeal.importStr,
      salePriceStr:
        o.vehicleDeal?.salePriceStr !== undefined && o.vehicleDeal?.salePriceStr !== null
          ? String(o.vehicleDeal.salePriceStr)
          : base.vehicleDeal.salePriceStr,
      powerStr:
        o.vehicleDeal?.powerStr !== undefined && o.vehicleDeal?.powerStr !== null
          ? String(o.vehicleDeal.powerStr)
          : base.vehicleDeal.powerStr,
      powerUnit:
        o.vehicleDeal?.powerUnit === "kw" || o.vehicleDeal?.powerUnit === "hp"
          ? o.vehicleDeal.powerUnit
          : base.vehicleDeal.powerUnit,
    },
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

/**
 * AsyncStorage keys cleared on sign-out (sensitive numbers & PII in forms,
 * invoices, reminders, share-related converter state).
 */
const SIGN_OUT_FORM_STORAGE_KEYS: string[] = [
  AM_FINANCE_KEY,
  AM_FREELANCE_KEY,
  LOAN_CALCULATOR_KEY,
  INVOICES_STORAGE_KEY,
  FREELANCE_REMINDERS_STORAGE_KEY,
  "multiCurrencyConverterState",
  "multiCurrencyConverterState.ts",
  "touristCalc.amount",
  "touristCalc.discountPct",
  "touristCalc.tipPct",
  "touristCalc.fromCurrency",
  "touristCalc.manualRate",
  "touristCalc.useManualRate",
  "selectedFromCurrency",
  "selectedToCurrency",
  "lastConversion",
  "currencyHistory",
];

/**
 * Remove persisted drafts and locally stored financial/sensitive form data
 * after sign-out (device should not keep salary, deposits, vacation inputs, etc.).
 */
export async function clearPersistedFormDraftsAfterSignOut(): Promise<void> {
  const storage = getAsyncStorage();
  if (typeof storage.multiRemove === "function") {
    await storage.multiRemove(SIGN_OUT_FORM_STORAGE_KEYS);
    return;
  }
  await Promise.all(
    SIGN_OUT_FORM_STORAGE_KEYS.map((k) => storage.removeItem(k))
  );
}

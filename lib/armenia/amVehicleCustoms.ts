import { parseGroupedNumericInput } from "@/lib/numberFormat";

import { AM_TAX_CONSTANTS as C } from "./amTaxConstants";

/**
 * Draft field: liters with decimals (e.g. 1,6 → 1600 cm³), or legacy whole cm³ (e.g. 2000).
 * Whole numbers ≥ 100 are treated as cm³ for backward compatibility with older saved forms.
 */
export function engineDisplacementCcFromFormInput(raw: string): number {
  const n = parseGroupedNumericInput(raw);
  if (n === null || !Number.isFinite(n) || n < 0) return 0;
  if (Number.isInteger(n) && n >= 100) return Math.floor(n);
  return Math.max(0, Math.round(n * 1000));
}

export type VehicleCustomsInput = {
  /** Customs / statistical value in AMD (illustrative CIF-style base). */
  customsValueAmd: number;
  /** Engine displacement in cm³; ignored for electric preset. */
  engineDisplacementCc: number;
  /** Model / release calendar year (e.g. first registration year). */
  modelYear: number;
  isElectric: boolean;
};

export type VehicleCustomsResult = {
  customsValueAmd: number;
  engineDisplacementCc: number;
  modelYear: number;
  vehicleAgeYears: number;
  isElectric: boolean;
  /** ICE duty rate from engine tier only (before age multiplier). */
  baseDutyRateBeforeAge: number;
  /** Factor applied to base duty rate for vehicle age (1 for electric). */
  dutyAgeMultiplier: number;
  dutyRateApplied: number;
  customsDutyAmd: number;
  exciseAmd: number;
  vatBaseAmd: number;
  vatAmd: number;
  fixedFeesAmd: number;
  totalClearanceAmd: number;
};

function iceDutyRate(cc: number): number {
  const c = Math.max(0, cc);
  if (c <= 2000) return C.VEHICLE_CUSTOMS_DUTY_RATE_CC_UP_TO_2000;
  if (c <= 3000) return C.VEHICLE_CUSTOMS_DUTY_RATE_CC_UP_TO_3000;
  return C.VEHICLE_CUSTOMS_DUTY_RATE_CC_OVER_3000;
}

function iceDutyAgeMultiplier(ageYears: number): number {
  const y = Math.max(0, ageYears);
  if (y <= 2) return C.VEHICLE_CUSTOMS_DUTY_AGE_MULT_LE2Y;
  if (y <= 5) return C.VEHICLE_CUSTOMS_DUTY_AGE_MULT_3_TO_5Y;
  if (y <= 10) return C.VEHICLE_CUSTOMS_DUTY_AGE_MULT_6_TO_10Y;
  return C.VEHICLE_CUSTOMS_DUTY_AGE_MULT_OVER_10Y;
}

/**
 * Illustrative passenger-vehicle customs clearance estimate for Armenia.
 * Real clearance uses official rates, HS codes, preferences, and customs decisions — verify with the SRC.
 */
export function calculateVehicleCustoms(input: VehicleCustomsInput): VehicleCustomsResult | null {
  if (!Number.isFinite(input.customsValueAmd) || input.customsValueAmd <= 0) {
    return null;
  }
  const value = input.customsValueAmd;
  const cc = Math.max(0, Math.floor(Number.isFinite(input.engineDisplacementCc) ? input.engineDisplacementCc : 0));
  const isElectric = Boolean(input.isElectric);

  const currentYear = new Date().getFullYear();
  let modelYear = Math.floor(input.modelYear);
  if (!Number.isFinite(modelYear) || modelYear < 1980 || modelYear > currentYear + 1) {
    return null;
  }
  const vehicleAgeYears = Math.max(0, Math.min(80, currentYear - modelYear));

  const baseDutyRateBeforeAge = isElectric ? C.VEHICLE_CUSTOMS_DUTY_RATE_ELECTRIC : iceDutyRate(cc);
  const dutyAgeMultiplier = isElectric ? 1 : iceDutyAgeMultiplier(vehicleAgeYears);
  const dutyRate = isElectric
    ? C.VEHICLE_CUSTOMS_DUTY_RATE_ELECTRIC
    : Math.min(
        C.VEHICLE_CUSTOMS_DUTY_RATE_CEILING,
        baseDutyRateBeforeAge * dutyAgeMultiplier
      );
  const customsDutyAmd = Math.round(value * dutyRate);

  const exciseAmd = isElectric
    ? 0
    : Math.round(
        Math.max(0, cc - C.VEHICLE_CUSTOMS_EXCISE_CC_THRESHOLD) *
          C.VEHICLE_CUSTOMS_EXCISE_AMD_PER_CC_ABOVE_THRESHOLD
      );

  const vatBaseAmd = value + customsDutyAmd + exciseAmd;
  const vatAmd = Math.round(vatBaseAmd * C.VEHICLE_CUSTOMS_VAT_RATE);
  const fixedFeesAmd = C.VEHICLE_CUSTOMS_FIXED_ADMIN_FEE_AMD;
  const totalClearanceAmd = customsDutyAmd + exciseAmd + vatAmd + fixedFeesAmd;

  return {
    customsValueAmd: value,
    engineDisplacementCc: cc,
    modelYear,
    vehicleAgeYears,
    isElectric,
    baseDutyRateBeforeAge,
    dutyAgeMultiplier,
    dutyRateApplied: dutyRate,
    customsDutyAmd,
    exciseAmd,
    vatBaseAmd,
    vatAmd,
    fixedFeesAmd,
    totalClearanceAmd,
  };
}

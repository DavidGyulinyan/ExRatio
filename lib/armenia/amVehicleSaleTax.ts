/**
 * Simplified model for individuals selling a personal-use vehicle in Armenia.
 *
 * Common reading of the Tax Code (see e.g. counsel.am “Sale of personal property”):
 * — Income from selling personal property is generally not subject to personal income tax.
 * — Exception: if the vehicle is disposed of **within one year** of acquisition, tax is
 *   **1%** of the relevant amount, **but not less than AMD 150 per horsepower**.
 * — If the vehicle is held **more than one year**, this personal income tax usually does not apply.
 *
 * We only have **calendar years** in the app, not exact dates:
 * — Same purchase & sale year → treated as **likely within 1 year** (taxable scenario).
 * — Consecutive years (e.g. 2023 → 2024) → **uncertain** (could be < or > 365 days).
 * — Two or more calendar years apart → **likely exempt** (&gt; 1 year in almost all cases).
 *
 * Always confirm with the State Revenue Committee or a tax advisor.
 */

export const RA_VEHICLE_QUICK_SALE_INCOME_TAX_RATE = 0.01;
export const RA_VEHICLE_QUICK_SALE_MIN_AMD_PER_HP = 150;

export type VehicleHoldingBucket = "likely_taxable" | "uncertain" | "likely_exempt";

export type VehicleSaleIncomeTaxInput = {
  salePriceAmd: number;
  /** For gain / loss display only; does not change the statutory 1% formula here. */
  totalCostAmd: number | null;
  acquisitionYear: number | null;
  saleYear: number | null;
  /** Engine power in **horsepower** (after converting from kW if needed). */
  horsePower: number | null;
};

export type VehicleSaleIncomeTaxEstimate = {
  holdingBucket: VehicleHoldingBucket;
  /** saleYear − acquisitionYear when both set and valid. */
  calendarYearDelta: number | null;
  holdingYears: number | null;
  sameCalendarYearSale: boolean;
  invalidYearOrder: boolean;
  /** True when holding > 1 year is likely — no quick-sale income tax in this model. */
  exemptNoIncomeTax: boolean;
  /** max(1%×sale, 150×hp) when taxable/uncertain; 0 when exempt; null when invalid year order. */
  taxIfQuickSaleAmd: number | null;
  taxOnePercentAmd: number | null;
  taxMinHpFloorAmd: number | null;
  gainAmd: number | null;
};

function classifyYears(
  acq: number | null,
  sale: number | null
): {
  bucket: VehicleHoldingBucket;
  delta: number | null;
  invalid: boolean;
  sameYear: boolean;
} {
  if (acq === null || sale === null) {
    return { bucket: "likely_taxable", delta: null, invalid: false, sameYear: false };
  }
  if (sale < acq) return { bucket: "likely_taxable", delta: null, invalid: true, sameYear: false };
  const delta = sale - acq;
  if (delta === 0) return { bucket: "likely_taxable", delta: 0, invalid: false, sameYear: true };
  if (delta === 1) return { bucket: "uncertain", delta: 1, invalid: false, sameYear: false };
  return { bucket: "likely_exempt", delta, invalid: false, sameYear: false };
}

function computeQuickSaleTaxAmd(saleRounded: number, horsePower: number | null): {
  total: number;
  onePct: number;
  hpFloor: number | null;
} {
  const onePct = Math.round(saleRounded * RA_VEHICLE_QUICK_SALE_INCOME_TAX_RATE);
  if (horsePower !== null && Number.isFinite(horsePower) && horsePower > 0) {
    const hpFloor = Math.round(horsePower * RA_VEHICLE_QUICK_SALE_MIN_AMD_PER_HP);
    return { total: Math.max(onePct, hpFloor), onePct, hpFloor };
  }
  return { total: onePct, onePct, hpFloor: null };
}

export function estimateVehicleSaleIncomeTax(
  input: VehicleSaleIncomeTaxInput
): VehicleSaleIncomeTaxEstimate | null {
  if (!Number.isFinite(input.salePriceAmd) || input.salePriceAmd <= 0) return null;

  const sale = Math.round(input.salePriceAmd);

  let gainAmd: number | null = null;
  if (input.totalCostAmd !== null && Number.isFinite(input.totalCostAmd)) {
    gainAmd = sale - Math.round(input.totalCostAmd);
  }

  const { bucket, delta, invalid, sameYear } = classifyYears(
    input.acquisitionYear,
    input.saleYear
  );

  if (invalid) {
    return {
      holdingBucket: "likely_taxable",
      calendarYearDelta: null,
      holdingYears: null,
      sameCalendarYearSale: false,
      invalidYearOrder: true,
      exemptNoIncomeTax: false,
      taxIfQuickSaleAmd: null,
      taxOnePercentAmd: null,
      taxMinHpFloorAmd: null,
      gainAmd,
    };
  }

  if (bucket === "likely_exempt") {
    return {
      holdingBucket: bucket,
      calendarYearDelta: delta,
      holdingYears: delta,
      sameCalendarYearSale: false,
      invalidYearOrder: false,
      exemptNoIncomeTax: true,
      taxIfQuickSaleAmd: 0,
      taxOnePercentAmd: null,
      taxMinHpFloorAmd: null,
      gainAmd,
    };
  }

  const { total, onePct, hpFloor } = computeQuickSaleTaxAmd(sale, input.horsePower);

  return {
    holdingBucket: bucket,
    calendarYearDelta: delta,
    holdingYears: delta,
    sameCalendarYearSale: sameYear,
    invalidYearOrder: false,
    exemptNoIncomeTax: false,
    taxIfQuickSaleAmd: total,
    taxOnePercentAmd: onePct,
    taxMinHpFloorAmd: hpFloor,
    gainAmd,
  };
}

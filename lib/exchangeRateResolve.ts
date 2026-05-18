import { isCbaAppForeignCurrency } from "@/lib/cbaExchangeRates";
import type { CachedExchangeRates } from "@/lib/liveExchangeRates";

export function pairInvolvesAmd(fromCurrency: string, toCurrency: string): boolean {
  const from = fromCurrency.toUpperCase();
  const to = toCurrency.toUpperCase();
  return from === "AMD" || to === "AMD";
}

export function cbaHasCurrency(
  cba: Record<string, number> | undefined,
  currency: string
): boolean {
  if (!cba) return false;
  const n = cba[currency.toUpperCase()];
  return n != null && Number.isFinite(n) && n > 0;
}

/**
 * For AMD pairs: use CBA when that ISO is published by CBA; otherwise primary API.
 */
export function resolveConversionRate(
  currency: string,
  primary: Record<string, number>,
  cba: Record<string, number> | undefined,
  amdPair: boolean
): number | undefined {
  const code = currency.toUpperCase();
  if (amdPair && isCbaAppForeignCurrency(code) && cbaHasCurrency(cba, code)) {
    return cba![code];
  }
  const n = primary[code];
  return n != null && Number.isFinite(n) && n > 0 ? n : undefined;
}

export function resolveRatesForPair(
  fromCurrency: string,
  toCurrency: string,
  data: Pick<CachedExchangeRates, "conversion_rates" | "cba_conversion_rates">
): { fromRate: number; toRate: number } | null {
  const primary = data.conversion_rates;
  const cba = data.cba_conversion_rates;
  const amdPair = pairInvolvesAmd(fromCurrency, toCurrency);

  const fromRate = resolveConversionRate(
    fromCurrency,
    primary,
    cba,
    amdPair
  );
  const toRate = resolveConversionRate(toCurrency, primary, cba, amdPair);

  if (
    fromRate == null ||
    toRate == null ||
    !Number.isFinite(fromRate) ||
    !Number.isFinite(toRate)
  ) {
    return null;
  }

  return { fromRate, toRate };
}

export function crossRateForPair(
  fromCurrency: string,
  toCurrency: string,
  data: Pick<CachedExchangeRates, "conversion_rates" | "cba_conversion_rates">
): number | null {
  const resolved = resolveRatesForPair(fromCurrency, toCurrency, data);
  if (!resolved || resolved.fromRate === 0) return null;
  return resolved.toRate / resolved.fromRate;
}

export type CbaAttribution =
  | { kind: "none" }
  | { kind: "cba"; cbaCurrencies: string[] };

/** True when this leg uses CBA (mirrors {@link resolveConversionRate}). AMD is never attributed to CBA in UI. */
export function currencyRateFromCba(
  currency: string,
  data: Pick<CachedExchangeRates, "conversion_rates" | "cba_conversion_rates">,
  amdPair: boolean
): boolean {
  const code = currency.toUpperCase();
  if (code === "AMD") return false;
  if (!amdPair) return false;
  if (!isCbaAppForeignCurrency(code)) return false;
  return cbaHasCurrency(data.cba_conversion_rates, code);
}

/** Whether the UI should show a CBA source notice for this pair. */
export function getCbaAttributionForPair(
  fromCurrency: string,
  toCurrency: string,
  data: Pick<CachedExchangeRates, "conversion_rates" | "cba_conversion_rates">
): CbaAttribution {
  const amdPair = pairInvolvesAmd(fromCurrency, toCurrency);
  if (!amdPair) return { kind: "none" };

  const cbaCurrencies: string[] = [];
  for (const code of [fromCurrency, toCurrency]) {
    const upper = code.toUpperCase();
    if (cbaCurrencies.includes(upper)) continue;
    if (currencyRateFromCba(code, data, amdPair)) {
      cbaCurrencies.push(upper);
    }
  }

  if (cbaCurrencies.length === 0) return { kind: "none" };
  return { kind: "cba", cbaCurrencies };
}

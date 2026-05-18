import Constants from "expo-constants";
import {
  cbaRowsToUsdConversionRates,
  fetchCbaLatestRates,
  filterCbaRowsForApp,
  sanitizeCbaConversionRates,
} from "@/lib/cbaExchangeRates";
import {
  buildLiveRatesRequestUrl,
  parseLiveRatesApiResponse,
} from "@/lib/liveExchangeRatesParse";

export {
  buildLiveRatesRequestUrl,
  isExchangeRateApiUrl,
  parseLiveRatesApiResponse,
} from "@/lib/liveExchangeRatesParse";

export type CachedExchangeRates = {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  /** Primary API (full currency list). */
  conversion_rates: Record<string, number>;
  /** Central Bank of Armenia official rates (subset of ISO codes). */
  cba_conversion_rates?: Record<string, number>;
};

export type ExchangeRateApiConfig = {
  apiUrl: string;
  apiKey: string;
};

export function getExchangeRateApiConfig(): ExchangeRateApiConfig | null {
  const apiUrl =
    Constants.expoConfig?.extra?.apiUrl?.trim() ||
    process.env.EXPO_PUBLIC_API_URL?.trim() ||
    "";
  const apiKey =
    Constants.expoConfig?.extra?.apiKey?.trim() ||
    process.env.EXPO_PUBLIC_API_KEY?.trim() ||
    "";

  if (!apiUrl || !apiKey) return null;
  return { apiUrl, apiKey };
}

export function buildCachedExchangeRatesPayload(
  base_code: string,
  conversion_rates: Record<string, number>,
  cba_conversion_rates?: Record<string, number>
): CachedExchangeRates {
  const rates = { ...conversion_rates };
  if (!rates.USD) rates.USD = 1;

  const now = Math.floor(Date.now() / 1000);
  return {
    result: "success",
    documentation: "https://www.exchangerate-api.com/docs",
    terms_of_use: "https://www.exchangerate-api.com/terms",
    time_last_update_unix: now,
    time_last_update_utc: new Date().toUTCString(),
    time_next_update_unix: now + 3600,
    time_next_update_utc: new Date(Date.now() + 3600000).toUTCString(),
    base_code,
    conversion_rates: rates,
    ...(cba_conversion_rates ? { cba_conversion_rates } : {}),
  };
}

async function fetchFromConfiguredApi(
  base: string
): Promise<CachedExchangeRates> {
  const config = getExchangeRateApiConfig();
  if (!config) {
    throw new Error("Missing EXPO_PUBLIC_API_URL or EXPO_PUBLIC_API_KEY");
  }

  const url = buildLiveRatesRequestUrl(config.apiUrl, config.apiKey, base);
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`HTTP error! status: ${response.status}`);
  }

  const apiData = await response.json();
  const parsed = parseLiveRatesApiResponse(apiData);
  if (!parsed) {
    throw new Error("Invalid API response structure");
  }

  return buildCachedExchangeRatesPayload(parsed.base_code, parsed.conversion_rates);
}

/** Official CBA AMD fixings — no API key. */
export async function fetchCbaExchangeRates(): Promise<CachedExchangeRates> {
  const { rows, currentDate } = await fetchCbaLatestRates();
  const conversion_rates = cbaRowsToUsdConversionRates(filterCbaRowsForApp(rows));
  const payload = buildCachedExchangeRatesPayload(
    "USD",
    conversion_rates,
    conversion_rates
  );
  payload.documentation = "https://api.cba.am/exchangerates.asmx";
  payload.terms_of_use = "https://www.cba.am/";
  if (currentDate) {
    const parsed = Date.parse(currentDate);
    if (Number.isFinite(parsed)) {
      payload.time_last_update_unix = Math.floor(parsed / 1000);
      payload.time_last_update_utc = new Date(parsed).toUTCString();
    }
  }
  return payload;
}

async function fetchCbaRatesMap(): Promise<Record<string, number>> {
  const { rows } = await fetchCbaLatestRates();
  return cbaRowsToUsdConversionRates(filterCbaRowsForApp(rows));
}

/** Attach CBA table alongside primary (used for AMD conversions per currency). */
export async function attachCbaRates(
  payload: CachedExchangeRates
): Promise<CachedExchangeRates> {
  try {
    const cba_conversion_rates = await fetchCbaRatesMap();
    return {
      ...payload,
      cba_conversion_rates: sanitizeCbaConversionRates(cba_conversion_rates),
    };
  } catch (error) {
    console.warn("CBA rates unavailable:", error);
    return payload;
  }
}

export async function ensureCbaRatesOnPayload(
  payload: CachedExchangeRates
): Promise<CachedExchangeRates> {
  const sanitized = sanitizeCbaConversionRates(payload.cba_conversion_rates);
  let next: CachedExchangeRates =
    sanitized !== payload.cba_conversion_rates
      ? { ...payload, cba_conversion_rates: sanitized }
      : payload;

  if (
    next.cba_conversion_rates &&
    Object.keys(next.cba_conversion_rates).length > 0
  ) {
    return next;
  }
  return attachCbaRates(next);
}

/** @deprecated Use attachCbaRates — kept for imports during migration. */
export const enrichExchangeRatesForUserRegion = ensureCbaRatesOnPayload;

export async function fetchLiveExchangeRates(
  base = "USD"
): Promise<CachedExchangeRates> {
  const config = getExchangeRateApiConfig();
  if (config) {
    try {
      const primary = await fetchFromConfiguredApi(base);
      return attachCbaRates(primary);
    } catch (error) {
      console.warn("Primary exchange rate API failed, using CBA:", error);
    }
  }

  try {
    return await fetchCbaExchangeRates();
  } catch (cbaError) {
    console.error("CBA exchange rate fetch failed:", cbaError);
    throw new Error("Unable to load exchange rates");
  }
}

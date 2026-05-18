import Constants from "expo-constants";
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
  conversion_rates: Record<string, number>;
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
  conversion_rates: Record<string, number>
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
  };
}

export async function fetchLiveExchangeRates(
  base = "USD"
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

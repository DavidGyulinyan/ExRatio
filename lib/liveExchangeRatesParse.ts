export function isExchangeRateApiUrl(apiUrl: string): boolean {
  return apiUrl.includes("exchangerate-api.com");
}

/** Build request URL for ExchangeRate-API v6 or query-param providers (e.g. CurrencyFreaks). */
export function buildLiveRatesRequestUrl(
  apiUrl: string,
  apiKey: string,
  base = "USD"
): string {
  const trimmedUrl = apiUrl.replace(/\/+$/, "");

  if (isExchangeRateApiUrl(trimmedUrl)) {
    return `${trimmedUrl}/${encodeURIComponent(apiKey)}/latest/${encodeURIComponent(base)}`;
  }

  const separator = trimmedUrl.includes("?") ? "&" : "?";
  return `${trimmedUrl}${separator}apikey=${encodeURIComponent(apiKey)}`;
}

function parseRatesRecord(raw: Record<string, unknown>): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [code, value] of Object.entries(raw)) {
    const n = typeof value === "number" ? value : Number(value);
    if (Number.isFinite(n)) out[code] = n;
  }
  return out;
}

/**
 * Normalize ExchangeRate-API, CurrencyFreaks, and similar live-rate payloads.
 */
export function parseLiveRatesApiResponse(
  data: unknown
): { base_code: string; conversion_rates: Record<string, number> } | null {
  if (!data || typeof data !== "object") return null;

  const body = data as Record<string, unknown>;
  if (body.result === "error") return null;

  if (body.conversion_rates && typeof body.conversion_rates === "object") {
    const rates = parseRatesRecord(body.conversion_rates as Record<string, unknown>);
    if (Object.keys(rates).length === 0) return null;
    return {
      base_code: String(body.base_code || "USD"),
      conversion_rates: rates,
    };
  }

  if (body.rates && typeof body.rates === "object") {
    const rates = parseRatesRecord(body.rates as Record<string, unknown>);
    if (Object.keys(rates).length === 0) return null;
    return {
      base_code: String(body.base || body.base_code || "USD"),
      conversion_rates: rates,
    };
  }

  return null;
}

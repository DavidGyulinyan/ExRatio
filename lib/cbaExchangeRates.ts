/**
 * Central Bank of Armenia official exchange rates (SOAP).
 * @see https://api.cba.am/exchangerates.asmx — `ExchangeRatesLatest` is recommended for apps.
 */

const CBA_SOAP_URL = "https://api.cba.am/exchangerates.asmx";
const CBA_NS = "http://www.cba.am/";

/** Currencies commonly used in Armenia (CBA + app defaults). */
export const ARMENIA_POPULAR_ISO_CODES = [
  "AMD",
  "USD",
  "EUR",
  "RUB",
  "GEL",
  "GBP",
  "CHF",
  "CAD",
  "AUD",
  "CNY",
  "JPY",
  "IRR",
  "AED",
  "TRY",
] as const;

/** Foreign ISO codes we treat as official CBA rates in the app (excludes AMD). */
export const CBA_APP_FOREIGN_ISO_CODES: ReadonlySet<string> = new Set(
  ARMENIA_POPULAR_ISO_CODES.filter((c) => c !== "AMD")
);

export function isCbaAppForeignCurrency(code: string): boolean {
  return CBA_APP_FOREIGN_ISO_CODES.has(code.trim().toUpperCase());
}

/** Drop CBA table entries we do not use (e.g. BRL from full CBA feed in old cache). */
export function sanitizeCbaConversionRates(
  cba: Record<string, number> | undefined
): Record<string, number> | undefined {
  if (!cba) return undefined;
  const out: Record<string, number> = {};
  for (const [code, rate] of Object.entries(cba)) {
    const upper = code.toUpperCase();
    if (upper !== "AMD" && !isCbaAppForeignCurrency(upper)) continue;
    if (rate != null && Number.isFinite(rate) && rate > 0) {
      out[upper] = rate;
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

export type CbaExchangeRateRow = {
  ISO: string;
  Amount: number;
  Rate: number;
  Difference: number | null;
};

const ENVELOPE_LATEST = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ExchangeRatesLatest xmlns="${CBA_NS}" />
  </soap:Body>
</soap:Envelope>`;

function envelopeLatestByIso(iso: string): string {
  return `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema" xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ExchangeRatesLatestByISO xmlns="${CBA_NS}">
      <ISO>${iso}</ISO>
    </ExchangeRatesLatestByISO>
  </soap:Body>
</soap:Envelope>`;
}

function readTag(block: string, tag: string): string | null {
  const re = new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, "i");
  const m = block.match(re);
  return m?.[1]?.trim() ?? null;
}

/** Parse `ExchangeRatesLatest` / `ExchangeRatesLatestByISO` SOAP XML body. */
export function parseCbaExchangeRatesXml(xml: string): CbaExchangeRateRow[] {
  const rows: CbaExchangeRateRow[] = [];
  const re = /<ExchangeRate>([\s\S]*?)<\/ExchangeRate>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml)) !== null) {
    const block = m[1];
    const iso = readTag(block, "ISO");
    const amountRaw = readTag(block, "Amount");
    const rateRaw = readTag(block, "Rate");
    if (!iso || amountRaw == null || rateRaw == null) continue;

    const Amount = Number(amountRaw);
    const Rate = Number(rateRaw);
    if (!Number.isFinite(Amount) || Amount <= 0 || !Number.isFinite(Rate)) continue;

    const diffRaw = readTag(block, "Difference");
    const Difference =
      diffRaw != null && diffRaw !== "" && Number.isFinite(Number(diffRaw))
        ? Number(diffRaw)
        : null;

    rows.push({ ISO: iso.toUpperCase(), Amount, Rate, Difference });
  }
  return rows;
}

/** AMD per 1 unit of foreign currency (respects CBA `Amount` e.g. 10 JPY). */
export function amdPerCurrencyUnit(row: CbaExchangeRateRow): number {
  return row.Rate / row.Amount;
}

/**
 * Build app-style `conversion_rates` (USD base, USD=1) from CBA AMD fixings.
 */
export function cbaRowsToUsdConversionRates(
  rows: CbaExchangeRateRow[]
): Record<string, number> {
  const usdRow = rows.find((r) => r.ISO === "USD");
  if (!usdRow) {
    throw new Error("CBA rates missing USD");
  }

  const amdPerUsd = amdPerCurrencyUnit(usdRow);
  const rates: Record<string, number> = {
    USD: 1,
    AMD: amdPerUsd,
  };

  for (const row of rows) {
    if (row.ISO === "USD") continue;
    const amdPerUnit = amdPerCurrencyUnit(row);
    if (amdPerUnit <= 0) continue;
    rates[row.ISO] = amdPerUsd / amdPerUnit;
  }

  return rates;
}

export function filterCbaRowsToPopular(
  rows: CbaExchangeRateRow[],
  codes: readonly string[] = ARMENIA_POPULAR_ISO_CODES
): CbaExchangeRateRow[] {
  const want = new Set(codes.map((c) => c.toUpperCase()));
  return rows.filter((r) => want.has(r.ISO));
}

async function postCbaSoap(
  soapAction: string,
  body: string
): Promise<string> {
  const response = await fetch(CBA_SOAP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: `"${soapAction}"`,
    },
    body,
  });

  if (!response.ok) {
    throw new Error(`CBA HTTP ${response.status}`);
  }

  return response.text();
}

/** Rows limited to currencies the app uses for CBA-sourced AMD conversions. */
export function filterCbaRowsForApp(
  rows: CbaExchangeRateRow[]
): CbaExchangeRateRow[] {
  return filterCbaRowsToPopular(rows, ARMENIA_POPULAR_ISO_CODES);
}

/** All latest CBA rates (recommended integration). */
export async function fetchCbaLatestRates(): Promise<{
  rows: CbaExchangeRateRow[];
  currentDate: string | null;
}> {
  const xml = await postCbaSoap(
    `${CBA_NS}ExchangeRatesLatest`,
    ENVELOPE_LATEST
  );
  const rows = parseCbaExchangeRatesXml(xml);
  if (rows.length === 0) {
    throw new Error("CBA returned no exchange rates");
  }
  const dateMatch = xml.match(/<CurrentDate>([^<]+)<\/CurrentDate>/i);
  return {
    rows,
    currentDate: dateMatch?.[1]?.trim() ?? null,
  };
}

/** Single currency — same as ExchangeRatesLatestByISO on the gateway. */
export async function fetchCbaLatestRateByIso(
  iso: string
): Promise<CbaExchangeRateRow | null> {
  const code = iso.trim().toUpperCase();
  const xml = await postCbaSoap(
    `${CBA_NS}ExchangeRatesLatestByISO`,
    envelopeLatestByIso(code)
  );
  return parseCbaExchangeRatesXml(xml).find((r) => r.ISO === code) ?? null;
}

/** One-off: compare USD→AMD from CBA vs open.er-api (primary-style). */

const CBA_BODY = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ExchangeRatesLatest xmlns="http://www.cba.am/" />
  </soap:Body>
</soap:Envelope>`;

async function fetchCbaUsdAmd() {
  const res = await fetch("https://api.cba.am/exchangerates.asmx", {
    method: "POST",
    headers: {
      "Content-Type": "text/xml; charset=utf-8",
      SOAPAction: '"http://www.cba.am/ExchangeRatesLatest"',
    },
    body: CBA_BODY,
  });
  const xml = await res.text();
  const usd = xml.match(/<ISO>USD<\/ISO>[\s\S]*?<Rate>([\d.]+)<\/Rate>/i);
  return {
    amdPer1Usd: usd ? Number(usd[1]) : null,
    date: (xml.match(/<CurrentDate>([^<]+)<\/CurrentDate>/i) || [])[1],
  };
}

async function fetchPrimaryUsdAmd() {
  const res = await fetch("https://open.er-api.com/v6/latest/USD");
  const j = await res.json();
  return {
    amdPer1Usd: j.conversion_rates?.AMD ?? null,
    date: j.time_last_update_utc,
  };
}

const cba = await fetchCbaUsdAmd();
const primary = await fetchPrimaryUsdAmd();

console.log("USD → AMD comparison\n");
console.log("CBA (Central Bank of Armenia):");
console.log(`  1 USD = ${cba.amdPer1Usd} AMD`);
console.log(`  Updated: ${cba.date ?? "—"}\n`);

console.log("Primary API sample (open.er-api.com, USD base):");
console.log(`  1 USD = ${primary.amdPer1Usd} AMD`);
console.log(`  Updated: ${primary.date ?? "—"}\n`);

if (cba.amdPer1Usd && primary.amdPer1Usd) {
  const diff = primary.amdPer1Usd - cba.amdPer1Usd;
  const pct = ((diff / cba.amdPer1Usd) * 100).toFixed(2);
  console.log(`Difference (primary − CBA): ${diff.toFixed(2)} AMD (${pct}%)`);
}

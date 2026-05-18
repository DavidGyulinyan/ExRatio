import {
  amdPerCurrencyUnit,
  cbaRowsToUsdConversionRates,
  parseCbaExchangeRatesXml,
} from "../lib/cbaExchangeRates";

const SAMPLE_XML = `<?xml version="1.0" encoding="utf-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <ExchangeRatesLatestResponse xmlns="http://www.cba.am/">
      <ExchangeRatesLatestResult>
        <CurrentDate>2026-05-18T00:00:00</CurrentDate>
        <Rates>
          <ExchangeRate><ISO>USD</ISO><Amount>1</Amount><Rate>368.04</Rate><Difference>-0.19</Difference></ExchangeRate>
          <ExchangeRate><ISO>EUR</ISO><Amount>1</Amount><Rate>427.96</Rate><Difference>-0.99</Difference></ExchangeRate>
          <ExchangeRate><ISO>JPY</ISO><Amount>10</Amount><Rate>23.159</Rate><Difference>-0.091</Difference></ExchangeRate>
        </Rates>
      </ExchangeRatesLatestResult>
    </ExchangeRatesLatestResponse>
  </soap:Body>
</soap:Envelope>`;

describe("cbaExchangeRates", () => {
  it("parses SOAP XML rows", () => {
    const rows = parseCbaExchangeRatesXml(SAMPLE_XML);
    expect(rows).toHaveLength(3);
    expect(rows[0].ISO).toBe("USD");
    expect(rows[2].Amount).toBe(10);
  });

  it("converts CBA AMD fixings to USD-based conversion_rates", () => {
    const rows = parseCbaExchangeRatesXml(SAMPLE_XML);
    const rates = cbaRowsToUsdConversionRates(rows);
    expect(rates.USD).toBe(1);
    expect(rates.AMD).toBeCloseTo(368.04, 2);
    expect(rates.EUR).toBeCloseTo(368.04 / 427.96, 4);
    expect(amdPerCurrencyUnit(rows[2])).toBeCloseTo(23.159 / 10, 4);
  });
});

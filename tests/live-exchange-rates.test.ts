import {
  buildLiveRatesRequestUrl,
  parseLiveRatesApiResponse,
} from "../lib/liveExchangeRatesParse";

describe("liveExchangeRates", () => {
  it("builds ExchangeRate-API v6 URL", () => {
    expect(
      buildLiveRatesRequestUrl(
        "https://v6.exchangerate-api.com/v6/",
        "test-key",
        "USD"
      )
    ).toBe("https://v6.exchangerate-api.com/v6/test-key/latest/USD");
  });

  it("builds query-param provider URL", () => {
    expect(
      buildLiveRatesRequestUrl("https://api.currencyfreaks.com/latest", "abc123")
    ).toBe("https://api.currencyfreaks.com/latest?apikey=abc123");
  });

  it("parses ExchangeRate-API response", () => {
    const parsed = parseLiveRatesApiResponse({
      result: "success",
      base_code: "USD",
      conversion_rates: { USD: 1, EUR: 0.92 },
    });
    expect(parsed).toEqual({
      base_code: "USD",
      conversion_rates: { USD: 1, EUR: 0.92 },
    });
  });

  it("parses CurrencyFreaks-style response", () => {
    const parsed = parseLiveRatesApiResponse({
      base: "USD",
      rates: { USD: "1", EUR: "0.92" },
    });
    expect(parsed).toEqual({
      base_code: "USD",
      conversion_rates: { USD: 1, EUR: 0.92 },
    });
  });

  it("rejects error responses", () => {
    expect(
      parseLiveRatesApiResponse({ result: "error", "error-type": "invalid-key" })
    ).toBeNull();
  });
});

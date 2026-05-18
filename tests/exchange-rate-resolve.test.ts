import {
  crossRateForPair,
  currencyRateFromCba,
  getCbaAttributionForPair,
  resolveConversionRate,
  resolveRatesForPair,
} from "../lib/exchangeRateResolve";

const primary = {
  USD: 1,
  EUR: 0.9,
  AMD: 400,
  NZD: 1.6,
  BRL: 0.19,
};

const cba = {
  USD: 1,
  EUR: 368.04 / 427.96,
  AMD: 368.04,
  RUB: 368.04 / 5.0736,
  BRL: 0.18,
};

describe("exchangeRateResolve", () => {
  it("uses CBA per currency when AMD is in the pair and CBA has the code", () => {
    const data = { conversion_rates: primary, cba_conversion_rates: cba };
    const usdAmd = resolveRatesForPair("USD", "AMD", data);
    expect(usdAmd?.fromRate).toBe(1);
    expect(usdAmd?.toRate).toBe(368.04);

    const nzdAmd = resolveRatesForPair("NZD", "AMD", data);
    expect(nzdAmd?.fromRate).toBe(1.6);
    expect(nzdAmd?.toRate).toBe(368.04);
  });

  it("uses primary when AMD pair but currency not on CBA", () => {
    expect(
      resolveConversionRate("NZD", primary, cba, true)
    ).toBe(1.6);
  });

  it("uses primary when pair does not involve AMD", () => {
    const data = { conversion_rates: primary, cba_conversion_rates: cba };
    const usdEur = resolveRatesForPair("USD", "EUR", data);
    expect(usdEur?.fromRate).toBe(1);
    expect(usdEur?.toRate).toBe(0.9);
  });

  it("computes cross rate", () => {
    const data = { conversion_rates: primary, cba_conversion_rates: cba };
    const rate = crossRateForPair("USD", "AMD", data);
    expect(rate).toBeCloseTo(368.04, 2);
  });

  it("does not use CBA or show attribution for BRL even if present in cba table", () => {
    const data = { conversion_rates: primary, cba_conversion_rates: cba };
    expect(resolveConversionRate("BRL", primary, cba, true)).toBe(
      primary.BRL
    );
    expect(currencyRateFromCba("BRL", data, true)).toBe(false);
    expect(getCbaAttributionForPair("BRL", "AMD", data).kind).toBe("none");
  });
});

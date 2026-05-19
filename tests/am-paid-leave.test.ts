import {
  buildLookbackRemunerationGross,
  calculateAverageSalary,
  calculatePaidLeave,
} from "@/lib/armenia";

describe("calculateAverageSalary", () => {
  it("uses ÷21 for five-day workweek", () => {
    const r = calculateAverageSalary({
      totalRemunerationGross: 6_000_000,
      monthsForAverage: 12,
      workWeek: "fiveDay",
    });
    expect(r?.averageMonthlyGross).toBe(500_000);
    expect(r?.averageDailyGross).toBeCloseTo(500_000 / 21, 2);
    expect(r?.dailyDivisor).toBe(21);
  });

  it("uses ÷25 for six-day workweek", () => {
    const r = calculateAverageSalary({
      totalRemunerationGross: 6_000_000,
      monthsForAverage: 12,
      workWeek: "sixDay",
    });
    expect(r?.averageDailyGross).toBeCloseTo(500_000 / 25, 2);
    expect(r?.dailyDivisor).toBe(25);
  });
});

describe("calculatePaidLeave", () => {
  it("12-month average with bonus increases vacation pay", () => {
    const base = calculatePaidLeave({
      monthlyAmount: 500_000,
      isGross: true,
      leaveDays: 20,
      workWeek: "fiveDay",
      basisMode: "twelveMonth",
      variablePayGross: 600_000,
      countingMonths: 12,
    });
    const noBonus = calculatePaidLeave({
      monthlyAmount: 500_000,
      isGross: true,
      leaveDays: 20,
      workWeek: "fiveDay",
      basisMode: "twelveMonth",
      variablePayGross: 0,
      countingMonths: 12,
    });
    expect(base?.averageMonthlyGross).toBe(550_000);
    expect(base!.leaveGross).toBeGreaterThan(noBonus!.leaveGross);
    expect(base?.leaveGross).toBeCloseTo((550_000 / 21) * 20, 0);
  });

  it("first-year divisor uses months worked", () => {
    const r = calculatePaidLeave({
      monthlyAmount: 400_000,
      isGross: true,
      leaveDays: 10,
      workWeek: "fiveDay",
      basisMode: "twelveMonth",
      variablePayGross: 0,
      countingMonths: 6,
    });
    expect(r?.monthsForAverage).toBe(6);
    expect(r?.averageMonthlyGross).toBe(400_000);
    expect(r?.leaveGross).toBeCloseTo((400_000 / 21) * 10, 0);
  });

  it("single-month mode matches last salary only", () => {
    const r = calculatePaidLeave({
      monthlyAmount: 300_000,
      isGross: true,
      leaveDays: 20,
      workWeek: "sixDay",
      basisMode: "singleMonth",
      variablePayGross: 1_000_000,
      countingMonths: 12,
    });
    expect(r?.averageMonthlyGross).toBe(300_000);
    expect(r?.leaveGross).toBeCloseTo((300_000 / 25) * 20, 0);
  });
});

describe("buildLookbackRemunerationGross", () => {
  it("sums salary months and variable pay", () => {
    expect(
      buildLookbackRemunerationGross({
        monthlyGross: 100_000,
        countingMonths: 12,
        variablePayGross: 50_000,
      })
    ).toBe(1_250_000);
  });
});

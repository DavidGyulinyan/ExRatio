import { calculateTemporaryDisability } from "@/lib/armenia";

describe("calculateTemporaryDisability", () => {
  const base = {
    monthlyAmount: 420_000,
    isGross: true,
    workWeek: "fiveDay" as const,
    basisMode: "twelveMonth" as const,
    variablePayGross: 0,
    countingMonths: 12,
  };

  it("pays nothing for a single sick day (first day unpaid)", () => {
    const r = calculateTemporaryDisability({
      ...base,
      sickLeaveWorkingDays: 1,
    });
    expect(r?.totalBenefitGross).toBe(0);
    expect(r?.unpaidDays).toBe(1);
    expect(r?.paidWorkingDays).toBe(0);
  });

  it("employer pays days 2–4 at full average daily rate", () => {
    const r = calculateTemporaryDisability({
      ...base,
      sickLeaveWorkingDays: 4,
    });
    const daily = 420_000 / 21;
    expect(r?.employerPaidDays).toBe(3);
    expect(r?.statePaidDays).toBe(0);
    expect(r?.totalBenefitGross).toBeCloseTo(daily * 3, 0);
  });

  it("splits employer and state from day 5 onward", () => {
    const r = calculateTemporaryDisability({
      ...base,
      sickLeaveWorkingDays: 10,
    });
    const daily = 420_000 / 21;
    expect(r?.employerPaidDays).toBe(3);
    expect(r?.statePaidDays).toBe(6);
    expect(r?.totalBenefitGross).toBeCloseTo(daily * 9, 0);
  });
});

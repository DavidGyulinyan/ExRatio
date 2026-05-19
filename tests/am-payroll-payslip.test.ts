import { payrollBreakdownFromGross } from "@/lib/armenia/amPayroll";

/** DIGISECURITY payslip, April 2026 — Գյուլինյան Դավիթ (calculated gross with overtime). */
describe("payrollBreakdownFromGross payslip April 2026", () => {
  const gross = 402_313;

  it("matches stated deductions and net", () => {
    const b = payrollBreakdownFromGross(gross);
    expect(b.pensionEmployee).toBeCloseTo(20_116, 0);
    expect(b.militaryStamp).toBe(1_000);
    expect(b.mandatoryHealth).toBe(4_800);
    expect(b.incomeTax).toBeCloseTo(80_463, 0);
    expect(b.totalEmployeeDeductions).toBeCloseTo(106_379, 0);
    expect(b.netSalary).toBeCloseTo(295_934, 0);
  });
});

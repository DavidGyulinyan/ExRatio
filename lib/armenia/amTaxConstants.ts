/**
 * Configurable constants for Armenian payroll-related calculations (AMD).
 * Update when the Tax Code, social/military/health rules, or contribution caps change.
 * This is not legal advice — verify against official legislation before production use.
 */
export const AM_TAX_CONSTANTS = {
  /** Personal income tax on employment income (flat rate as commonly applied). */
  INCOME_TAX_RATE: 0.2,

  /** Employee pension: lower tier applies up to this monthly gross (AMD). */
  PENSION_LOW_THRESHOLD_AMD: 500_000,
  PENSION_LOW_RATE: 0.05,
  PENSION_HIGH_RATE: 0.1,
  /** High-tier formula: rate * gross − deduction (AMD). */
  PENSION_HIGH_LINEAR_DEDUCTION_AMD: 25_000,
  PENSION_MONTHLY_CAP_AMD: 87_500,

  MILITARY_LOW_THRESHOLD_AMD: 1_000_000,
  MILITARY_LOW_AMOUNT_AMD: 1_000,
  MILITARY_HIGH_AMOUNT_AMD: 15_000,

  /** Mandatory health: no contribution at or below exempt gross; stepped amounts above. */
  HEALTH_EXEMPT_THRESHOLD_AMD: 200_000,
  HEALTH_SECOND_THRESHOLD_AMD: 500_000,
  HEALTH_LOW_AMD: 4_800,
  HEALTH_HIGH_AMD: 10_800,

  /** Divisor for average daily pay from monthly (working-day basis — common for leave). */
  WORKING_DAYS_PER_MONTH_FOR_LEAVE: 21.75,
  /** Calendar-day divisor sometimes used for benefits. */
  CALENDAR_DAYS_PER_MONTH: 30,

  /** Withholding tax on bank deposit interest for individuals (verify annually). */
  DEPOSIT_INTEREST_INCOME_TAX_RATE: 0.1,

  /**
   * Illustrative maternity / pregnancy-benefit model only.
   * Real state benefits use caps, seniority, and fund rules — replace with official formulas when available.
   */
  MATERNITY_BENEFIT_RATE_OF_DAILY_GROSS: 1,

  GROSS_NET_TOLERANCE_AMD: 1,
  GROSS_NET_MAX_ITER: 80,
} as const;

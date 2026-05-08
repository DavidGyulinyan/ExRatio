/**
 * Configurable constants for Armenian freelancer / small-business tax helpers.
 *
 * Important:
 * - This app provides estimates only (not legal/tax advice).
 * - Armenian tax rules and rates can change; keep these values centralized and editable.
 */
export const AM_FREELANCE_TAX_CONSTANTS = {
  /** Default Armenian VAT rate (ԱԱՀ). */
  VAT_RATE: 0.2,

  /**
   * Profit tax (Շահութահարկ) — commonly 18% for corporate profit.
   * This is a simplified estimate: taxable base may differ based on accounting rules.
   */
  PROFIT_TAX_RATE: 0.18,

  /**
   * Sole proprietor (ԱՁ) regimes as simplified presets.
   * NOTE: Real eligibility depends on activity, turnover, and registration.
   */
  SOLE_PROPRIETOR_REGIMES: {
    /** Turnover-style simplified regime preset (example). */
    turnover_5: {
      labelKey: "amFreelance.regime.turnover5",
      taxRate: 0.05,
    },
    /** Turnover-style simplified regime preset (example). */
    turnover_3_5: {
      labelKey: "amFreelance.regime.turnover35",
      taxRate: 0.035,
    },
    /** Turnover-style simplified regime preset (example). */
    turnover_1_5: {
      labelKey: "amFreelance.regime.turnover15",
      taxRate: 0.015,
    },
  },

  /**
   * Turnover tax quick presets.
   * Users can still enter any percentage; these are convenience buttons.
   */
  TURNOVER_TAX_PRESETS: [
    { labelKey: "amFreelance.turnoverPreset.15", rate: 0.015 },
    { labelKey: "amFreelance.turnoverPreset.35", rate: 0.035 },
    { labelKey: "amFreelance.turnoverPreset.5", rate: 0.05 },
  ],
} as const;

export type SoleProprietorRegimeId = keyof typeof AM_FREELANCE_TAX_CONSTANTS.SOLE_PROPRIETOR_REGIMES;


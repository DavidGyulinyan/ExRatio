/** Armenian-style grouping: `.` every 3 digits; `,` as decimal separator in composed strings. */

const GROUP_LOCALE = "de-DE";

export function formatGroupedNumber(value: number, maxFractionDigits = 2): string {
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(GROUP_LOCALE, {
    minimumFractionDigits: 0,
    maximumFractionDigits: maxFractionDigits,
  }).format(value);
}

export function formatAmdSuffix(value: number): string {
  if (!Number.isFinite(value)) return "— ֏";
  return `${formatGroupedNumber(value, 0)} ֏`;
}

export function sanitizeIntegerDigits(text: string, maxLen = 20): string {
  return text.replace(/\D/g, "").slice(0, maxLen);
}

/** `digits` must contain digits only (no sign). */
export function addThousandsDotsFromDigitString(digits: string): string {
  if (!digits) return "";
  const core = digits.replace(/^0+(?=\d)/, "") || (digits.includes("0") ? "0" : "");
  if (!core) return "";
  return core.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

function isThousandGroupedInteger(s: string): boolean {
  return /^\d{1,3}(\.\d{3})+$/.test(s);
}

/** e.g. "1.500", "1.5000…", "12.500" — EU grouping while typing extra digits */
function isThousandGroupedWithOptionalTail(s: string): boolean {
  return /^(?!0\.)\d{1,3}(\.\d{3})+\d*$/.test(s);
}

/** Canonical storage: optional leading `-`, integer digits, optional `.` + fractional digits (ASCII). */
export function canonicalDecimalToDisplay(canonical: string): string {
  if (!canonical || canonical === "-") return canonical === "-" ? "-" : "";
  const neg = canonical.startsWith("-");
  const body = neg ? canonical.slice(1) : canonical;
  if (!body) return neg ? "-" : "";

  const dot = body.indexOf(".");
  const intRaw = dot === -1 ? body : body.slice(0, dot);
  const frac = dot === -1 ? "" : body.slice(dot + 1).replace(/\D/g, "").slice(0, 8);
  const intDigits = sanitizeIntegerDigits(intRaw);
  let intDisplay =
    intDigits === "" && frac.length > 0 ? "0" : addThousandsDotsFromDigitString(intDigits);

  if (dot !== -1 && frac.length === 0) {
    intDisplay = intDisplay || "0";
    return `${neg ? "-" : ""}${intDisplay},`;
  }
  if (frac.length > 0) {
    intDisplay = intDisplay || "0";
    return `${neg ? "-" : ""}${intDisplay},${frac}`;
  }
  return `${neg ? "-" : ""}${intDisplay}`;
}

/**
 * Parses formatted or raw input into canonical decimal string (`.` decimal, no thousand seps).
 */
export function displayDecimalToCanonical(display: string): string {
  const trimmed = display.replace(/\s/g, "");
  if (!trimmed || trimmed === "-") return trimmed === "-" ? "-" : "";

  const neg = trimmed.startsWith("-");
  const work = neg ? trimmed.slice(1) : trimmed;
  if (!work) return "";

  const lc = work.lastIndexOf(",");
  const ld = work.lastIndexOf(".");

  if (lc !== -1 && lc > ld) {
    const intPartRaw = work.slice(0, lc);
    const intDigits = sanitizeIntegerDigits(intPartRaw.replace(/\./g, ""));
    let frac = work.slice(lc + 1).replace(/\D/g, "").slice(0, 8);
    if (!intDigits && !frac) {
      if (work === ",") return `${neg ? "-" : ""}0.`;
      return "";
    }
    // Keep trailing decimal separator while user is typing (e.g. "12," → canonical "12.").
    if (!frac && work.endsWith(",")) {
      return `${neg ? "-" : ""}${intDigits || "0"}.`;
    }
    if (!frac) return `${neg ? "-" : ""}${intDigits}`;
    const core = intDigits ? `${intDigits}.${frac}` : `0.${frac}`;
    return `${neg ? "-" : ""}${core}`;
  }

  if (ld !== -1 && lc === -1) {
    // "12." while typing a decimal (mobile `.` key)
    if (work.endsWith(".")) {
      const intPartRaw = work.slice(0, -1);
      const intDigits = sanitizeIntegerDigits(intPartRaw.replace(/\./g, ""));
      return `${neg ? "-" : ""}${intDigits || "0"}.`;
    }

    const dotCount = (work.match(/\./g) || []).length;
    if (
      dotCount >= 2 ||
      isThousandGroupedInteger(work) ||
      isThousandGroupedWithOptionalTail(work)
    ) {
      return `${neg ? "-" : ""}${sanitizeIntegerDigits(work.replace(/\./g, ""))}`;
    }

    // Single `.`, no `,`: EU display uses `,` for decimals — treat as US-style
    // decimal only if the part after `.` has at most 2 digits (e.g. 12.34, 1.5).
    // Longer runs (1.500, 1.5000) are thousand grouping + extra digit, not "1.5…".
    const intPartRaw = work.slice(0, ld);
    const intDigits = sanitizeIntegerDigits(intPartRaw.replace(/\./g, ""));
    const frac = work.slice(ld + 1).replace(/\D/g, "").slice(0, 8);
    if (!intDigits && !frac) return "";
    if (!frac) return `${neg ? "-" : ""}${intDigits}`;
    if (frac.length <= 2) {
      const core = intDigits ? `${intDigits}.${frac}` : `0.${frac}`;
      return `${neg ? "-" : ""}${core}`;
    }
    return `${neg ? "-" : ""}${sanitizeIntegerDigits(work.replace(/\./g, ""))}`;
  }

  return `${neg ? "-" : ""}${sanitizeIntegerDigits(work.replace(/\./g, ""))}`;
}

/**
 * Parse user/form text into a number (draft fields, pasted values).
 */
export function parseGroupedNumericInput(raw: string): number | null {
  const c = displayDecimalToCanonical(raw);
  if (c === "" || c === "-") return null;
  const n = Number(c);
  return Number.isFinite(n) ? n : null;
}

/** Parse canonical amount string stored by converters (`12.5`, optional trailing `.`). */
export function parseCanonicalDecimalAmount(canonical: string): number | null {
  if (!canonical || canonical === "-") return null;
  const normalized = canonical.endsWith(".")
    ? canonical.slice(0, -1)
    : canonical;
  if (!normalized || normalized === "-") return null;
  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Math calculator main line: internal uses `.` decimal; show grouped with `,` decimal. */
export function formatCalculatorMainDisplay(internal: string): string {
  if (internal === "" || internal === "-") return internal === "-" ? "-" : "0";
  const neg = internal.startsWith("-");
  const body = neg ? internal.slice(1) : internal;
  if (body === "") return "0";

  const hasDot = body.includes(".");
  const parts = body.split(".");
  const intDigits = sanitizeIntegerDigits(parts[0] ?? "");
  let frac = parts[1] !== undefined ? parts[1].replace(/\D/g, "") : "";

  if (intDigits === "" && !hasDot) return neg ? "-0" : "0";

  let intFmt = intDigits === "" ? "0" : addThousandsDotsFromDigitString(intDigits);

  if (hasDot && frac === "" && parts.length === 2) {
    intFmt = intFmt || "0";
    return `${neg ? "-" : ""}${intFmt},`;
  }
  if (frac.length > 0) {
    intFmt = intFmt || "0";
    return `${neg ? "-" : ""}${intFmt},${frac}`;
  }
  return `${neg ? "-" : ""}${intFmt}`;
}

/** Reformat numeric tokens in a calculator equation / history line for display. */
export function formatEmbeddedNumericTokens(s: string, maxFractionDigits: number): string {
  return s.replace(/-?\d+\.?\d*/g, (m) => {
    const n = Number(m);
    if (!Number.isFinite(n)) return m;
    return formatGroupedNumber(n, maxFractionDigits);
  });
}

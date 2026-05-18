/** Minimum length when complexity rules apply (signup, password reset). */
export const MIN_PASSWORD_LENGTH = 8;

export type PasswordPolicyFailure =
  | "too_short"
  | "missing_upper"
  | "missing_lower"
  | "missing_number"
  | "missing_special";

export function getPasswordPolicyFailures(password: string): PasswordPolicyFailure[] {
  const failures: PasswordPolicyFailure[] = [];
  if (password.length < MIN_PASSWORD_LENGTH) failures.push("too_short");
  if (!/[A-Z]/.test(password)) failures.push("missing_upper");
  if (!/[a-z]/.test(password)) failures.push("missing_lower");
  if (!/[0-9]/.test(password)) failures.push("missing_number");
  if (!/[^A-Za-z0-9]/.test(password)) failures.push("missing_special");
  return failures;
}

export function isPasswordPolicyValid(password: string): boolean {
  return getPasswordPolicyFailures(password).length === 0;
}

/** Fallback i18n key when password does not meet policy. */
export const PASSWORD_POLICY_MESSAGE_KEY = "signup.passwordRequirements";

const FAILURE_MESSAGE_KEYS: Record<PasswordPolicyFailure, string> = {
  too_short: "signup.passwordTooShort",
  missing_upper: "signup.passwordMissingUpper",
  missing_lower: "signup.passwordMissingLower",
  missing_number: "signup.passwordMissingNumber",
  missing_special: "signup.passwordMissingSpecial",
};

/** Most specific i18n key for the first failed rule (better than a generic wall of text). */
export function getPasswordPolicyFailureMessageKey(password: string): string {
  const failures = getPasswordPolicyFailures(password);
  if (failures.length === 0) return PASSWORD_POLICY_MESSAGE_KEY;
  return FAILURE_MESSAGE_KEYS[failures[0]];
}

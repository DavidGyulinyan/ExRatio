import {
  getPasswordPolicyFailureMessageKey,
  getPasswordPolicyFailures,
  isPasswordPolicyValid,
} from "../lib/passwordPolicy";

describe("passwordPolicy", () => {
  it("accepts a strong password", () => {
    expect(isPasswordPolicyValid("Abcd1234!")).toBe(true);
    expect(isPasswordPolicyValid("Abc123!")).toBe(false);
    expect(isPasswordPolicyValid("Abc1234!")).toBe(true);
    expect(getPasswordPolicyFailures("Abcd1234!")).toEqual([]);
  });

  it("rejects missing character classes", () => {
    expect(getPasswordPolicyFailures("abcdefgh1!")).toContain("missing_upper");
    expect(getPasswordPolicyFailures("ABCDEFGH1!")).toContain("missing_lower");
    expect(getPasswordPolicyFailures("Abcdefgh!")).toContain("missing_number");
    expect(getPasswordPolicyFailures("Abcdefgh1")).toContain("missing_special");
    expect(getPasswordPolicyFailures("Ab1!")).toContain("too_short");
  });

  it("returns specific message keys", () => {
    expect(getPasswordPolicyFailureMessageKey("abc123")).toBe(
      "signup.passwordMissingUpper"
    );
    expect(getPasswordPolicyFailureMessageKey("Abc123")).toBe(
      "signup.passwordMissingSpecial"
    );
  });
});

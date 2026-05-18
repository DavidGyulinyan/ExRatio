/**
 * Returned in AuthError.message when Supabase signUp obfuscates duplicate emails
 * (user present but identities empty → no verification email sent).
 */
export const SIGNUP_NO_VERIFICATION_EMAIL = "SIGNUP_NO_VERIFICATION_EMAIL";

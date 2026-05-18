import * as Linking from "expo-linking";

const CALLBACK_SEGMENT = "auth/callback";

/**
 * OAuth return URL for Supabase (Google, password reset, etc.).
 *
 * Expo Go dev:
 * - `npx expo start` → `exp://<LAN-IP>:8081/--/auth/callback`
 * - `npx expo start --tunnel` → `exp://…exp.direct…/--/auth/callback`
 * These are **different strings**. Supabase → Auth → Redirect URLs must list **every**
 * variant you use, or OAuth works only in the mode whose URL you added.
 *
 * Production / dev build: uses `scheme` from app.json (e.g. `exratio-mobile://auth/callback`).
 */
export function getSupabaseOAuthRedirectUrl(): string {
  return Linking.createURL(CALLBACK_SEGMENT);
}

/**
 * Redirect URL embedded in signup / confirmation emails (magic link).
 * Must appear in Supabase Dashboard → Authentication → URL configuration → Redirect URLs.
 *
 * If Expo Go keeps changing `exp://…` (LAN vs tunnel), set a stable allow-listed URL via
 * `EXPO_PUBLIC_AUTH_EMAIL_REDIRECT` (e.g. `https://your-site.com/auth/callback` or your app scheme URL).
 */
export function getEmailAuthRedirectUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_AUTH_EMAIL_REDIRECT;
  if (fromEnv && String(fromEnv).trim().length > 0) {
    return String(fromEnv).trim();
  }
  return getSupabaseOAuthRedirectUrl();
}

/** One clear dev log so LAN vs tunnel mismatches are obvious. */
export function logDevExpoOAuthRedirectHint(redirectTo: string): void {
  if (!__DEV__) return;
  console.log(
    "[Auth redirect] Add EXACTLY to Supabase → Authentication → URL configuration → Redirect URLs:\n" +
      `  ${redirectTo}\n` +
      "  Used for OAuth, password reset links, and signup confirmation links.\n" +
      "  LAN (`expo start`) and tunnel (`expo start --tunnel`) use different exp:// URLs — add both, or set EXPO_PUBLIC_AUTH_EMAIL_REDIRECT to a stable HTTPS URL."
  );
}

export type OAuthReturnParsed = {
  code?: string;
  error?: string;
  errorDescription?: string;
  access_token?: string;
  refresh_token?: string;
};

/**
 * Parse Supabase OAuth return URL from WebBrowser.openAuthSessionAsync.
 * Supports ?code= (PKCE) and #access_token= / #refresh_token= (implicit) without relying on AuthSession.parse.
 */
export function parseOAuthReturnUrl(url: string): OAuthReturnParsed {
  const out: OAuthReturnParsed = {};
  if (!url || typeof url !== "string") return out;

  try {
    const hashIndex = url.indexOf("#");
    const beforeHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;
    const qIndex = beforeHash.indexOf("?");
    const queryString = qIndex >= 0 ? beforeHash.slice(qIndex + 1) : "";

    if (queryString) {
      const qs = new URLSearchParams(queryString);
      const code = qs.get("code");
      if (code) out.code = code;
      const err = qs.get("error");
      if (err) out.error = err;
      const ed = qs.get("error_description");
      if (ed) out.errorDescription = ed;
    }

    if (hashIndex >= 0) {
      const hp = new URLSearchParams(url.slice(hashIndex + 1));
      const code = hp.get("code");
      if (code && !out.code) out.code = code;
      const at = hp.get("access_token");
      const rt = hp.get("refresh_token");
      if (at) out.access_token = at;
      if (rt) out.refresh_token = rt;
      const err = hp.get("error");
      if (err) out.error = err;
      const ed = hp.get("error_description");
      if (ed) out.errorDescription = ed;
    }
  } catch (e) {
    console.warn("parseOAuthReturnUrl:", e);
  }

  return out;
}

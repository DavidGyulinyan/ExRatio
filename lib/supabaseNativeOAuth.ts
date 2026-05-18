import type { AuthError, SupabaseClient } from "@supabase/supabase-js";
import * as WebBrowser from "expo-web-browser";
import {
  getSupabaseOAuthRedirectUrl,
  logDevExpoOAuthRedirectHint,
  parseOAuthReturnUrl,
} from "@/lib/oauthRedirect";

/**
 * Native (Expo) OAuth: open browser session, exchange code/tokens for Supabase session.
 * Same flow for Google and Apple when using PKCE + WebBrowser.
 */
export async function completeNativeOAuthExchange(
  supabase: SupabaseClient,
  provider: "google" | "apple"
): Promise<{ error?: AuthError }> {
  const redirectTo = getSupabaseOAuthRedirectUrl();
  if (provider === "google") {
    logDevExpoOAuthRedirectHint(redirectTo);
  }

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider,
    options: {
      redirectTo,
      skipBrowserRedirect: true,
    },
  });

  if (error) {
    return { error };
  }

  if (!data?.url) {
    return {
      error: {
        message: "Unable to start sign-in flow.",
        name: "OAuthStartError",
      } as AuthError,
    };
  }

  const authResult = await WebBrowser.openAuthSessionAsync(data.url, redirectTo);

  if (authResult.type !== "success" || !authResult.url) {
    return {
      error: {
        message:
          authResult.type === "cancel"
            ? "Sign-in was cancelled."
            : "Sign-in did not complete. Please try again.",
        name: "OAuthCancelled",
      } as AuthError,
    };
  }

  const parsed = parseOAuthReturnUrl(authResult.url);
  if (parsed.error) {
    return {
      error: {
        message:
          parsed.errorDescription?.replace(/\+/g, " ") ??
          `Sign-in failed: ${parsed.error}`,
        name: "OAuthError",
      } as AuthError,
    };
  }

  if (parsed.access_token && parsed.refresh_token) {
    const { error: sessionError } = await supabase.auth.setSession({
      access_token: parsed.access_token,
      refresh_token: parsed.refresh_token,
    });
    if (sessionError) {
      return { error: sessionError };
    }
    return {};
  }

  if (parsed.code) {
    const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(
      parsed.code
    );
    if (exchangeError) {
      const msg = exchangeError.message ?? "";
      const { data: existing } = await supabase.auth.getSession();
      if (
        existing.session &&
        (msg.includes("code verifier") || msg.includes("auth code"))
      ) {
        return {};
      }
      return { error: exchangeError };
    }
    return {};
  }

  return {
    error: {
      message:
        "Sign-in did not return a code or session. Check Supabase Redirect URLs include: " +
        redirectTo,
      name: "OAuthCodeMissing",
    } as AuthError,
  };
}

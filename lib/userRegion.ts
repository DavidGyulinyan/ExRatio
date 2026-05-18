import * as Location from "expo-location";
import { COUNTRY_NAME_TO_ISO } from "@/constants/countryNameToIso";

const COUNTRY_TO_CURRENCY: Record<string, string> = {
  AM: "AMD",
  GE: "GEL",
  AZ: "AZN",
  US: "USD",
};

const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: "GB",
};

function normalizeCountryCode(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== "string") return null;
  const upper = iso.trim().toUpperCase();
  const resolved = COUNTRY_CODE_ALIASES[upper] ?? upper;
  return /^[A-Z]{2}$/.test(resolved) ? resolved : null;
}

function normalizeCountryNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function isoFromCountryName(country: string | null | undefined): string | null {
  if (country == null || typeof country !== "string") return null;
  return COUNTRY_NAME_TO_ISO[normalizeCountryNameKey(country)] ?? null;
}

async function countryCodeFromNetworkIp(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch("http://ip-api.com/json/?fields=countryCode", {
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = (await response.json()) as { countryCode?: string };
    return normalizeCountryCode(data.countryCode);
  } catch {
    return null;
  }
}

async function countryCodeFromGeocode(): Promise<string | null> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== "granted") return null;
    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const address = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    if (address.length === 0) return null;
    const code = normalizeCountryCode(address[0]?.isoCountryCode);
    if (code) return code;
    return isoFromCountryName(address[0]?.country);
  } catch {
    return null;
  }
}

/** Best-effort ISO country: IP → Caucasus timezone → GPS. */
export async function detectUserCountryCode(): Promise<string | null> {
  const fromIp = await countryCodeFromNetworkIp();
  if (fromIp) return fromIp;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === "Asia/Yerevan") return "AM";
  if (tz === "Asia/Tbilisi") return "GE";
  if (tz === "Asia/Baku") return "AZ";

  return countryCodeFromGeocode();
}

export async function isUserInArmenia(): Promise<boolean> {
  const code = await detectUserCountryCode();
  if (code === "AM") return true;

  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
  if (tz === "Asia/Yerevan") return true;

  const fromIp = await countryCodeFromNetworkIp();
  if (fromIp && COUNTRY_TO_CURRENCY[fromIp] === "AMD") return true;

  return false;
}

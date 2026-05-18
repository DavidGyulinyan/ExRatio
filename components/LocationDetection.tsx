import React, { useState, useEffect } from 'react';
import { View, TouchableOpacity } from 'react-native';
import * as Location from 'expo-location';
import { COUNTRY_NAME_TO_ISO } from '@/constants/countryNameToIso';
import { ThemedText } from './themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';

// Mapping of country codes to currency codes (common ones)
export const countryToCurrency: { [key: string]: string } = {
  'US': 'USD',
  'GB': 'GBP',
  'EU': 'EUR', // For EU countries
  'CA': 'CAD',
  'AU': 'AUD',
  'JP': 'JPY',
  'CN': 'CNY',
  'IN': 'INR',
  'BR': 'BRL',
  'MX': 'MXN',
  'AR': 'ARS',
  'CL': 'CLP',
  'CO': 'COP',
  'PE': 'PEN',
  'VE': 'VES',
  'UY': 'UYU',
  'PY': 'PYG',
  'BO': 'BOB',
  'EC': 'USD', // Ecuador uses USD
  'GY': 'GYD',
  'SR': 'SRD',
  'FK': 'FKP',
  'GS': 'GBP', // South Georgia
  'AQ': 'USD', // Antarctica, but unlikely
  'RU': 'RUB',
  'UA': 'UAH',
  'BY': 'BYN',
  'KZ': 'KZT',
  'UZ': 'UZS',
  'TJ': 'TJS',
  'KG': 'KGS',
  'TM': 'TMT',
  'AZ': 'AZN',
  'GE': 'GEL',
  'AM': 'AMD',
  'TR': 'TRY',
  'IR': 'IRR',
  'IQ': 'IQD',
  'SY': 'SYP',
  'LB': 'LBP',
  'JO': 'JOD',
  'SA': 'SAR',
  'YE': 'YER',
  'OM': 'OMR',
  'AE': 'AED',
  'KW': 'KWD',
  'BH': 'BHD',
  'QA': 'QAR',
  'IL': 'ILS',
  'EG': 'EGP',
  'LY': 'LYD',
  'TN': 'TND',
  'DZ': 'DZD',
  'MA': 'MAD',
  'ZA': 'ZAR',
  'ZW': 'ZWL',
  'BW': 'BWP',
  'MZ': 'MZN',
  'AO': 'AOA',
  'NA': 'NAD',
  'ZM': 'ZMW',
  'TZ': 'TZS',
  'KE': 'KES',
  'UG': 'UGX',
  'RW': 'RWF',
  'BI': 'BIF',
  'CD': 'CDF',
  'CG': 'XAF',
  'GA': 'XAF',
  'CM': 'XAF',
  'TD': 'XAF',
  'CF': 'XAF',
  'GQ': 'XAF',
  'SN': 'XOF',
  'ML': 'XOF',
  'GN': 'GNF',
  'SL': 'SLL',
  'LR': 'LRD',
  'CI': 'XOF',
  'BF': 'XOF',
  'TG': 'XOF',
  'BJ': 'XOF',
  'NE': 'XOF',
  'NG': 'NGN',
  'GH': 'GHS',
  'ET': 'ETB',
  'DJ': 'DJF',
  'ER': 'ERN',
  'SD': 'SDG',
  'SS': 'SSP',
  'SO': 'SOS',
  'MG': 'MGA',
  'MW': 'MWK',
  'LS': 'LSL',
  'SZ': 'SZL',
  'KM': 'KMF',
  'SC': 'SCR',
  'MU': 'MUR',
  'RE': 'EUR', // Reunion
  'YT': 'EUR', // Mayotte
  'TH': 'THB',
  'VN': 'VND',
  'MY': 'MYR',
  'SG': 'SGD',
  'ID': 'IDR',
  'PH': 'PHP',
  'BN': 'BND',
  'KH': 'KHR',
  'LA': 'LAK',
  'MM': 'MMK',
  'KR': 'KRW',
  'KP': 'KPW',
  'TW': 'TWD',
  'HK': 'HKD',
  'MO': 'MOP',
  'MN': 'MNT',
  'AF': 'AFN',
  'PK': 'PKR',
  'BD': 'BDT',
  'NP': 'NPR',
  'LK': 'LKR',
  'MV': 'MVR',
  'BT': 'BTN',
  'NZ': 'NZD',
  'FJ': 'FJD',
  'PG': 'PGK',
  'SB': 'SBD',
  'VU': 'VUV',
  'NC': 'XPF',
  'PF': 'XPF',
  'WS': 'WST',
  'TO': 'TOP',
  'TV': 'AUD', // Tuvalu
  'KI': 'AUD', // Kiribati
  'NR': 'AUD', // Nauru
  'MH': 'USD', // Marshall Islands
  'FM': 'USD', // Micronesia
  'PW': 'USD', // Palau
  'MP': 'USD', // Northern Mariana Islands
  'GU': 'USD', // Guam
  'AS': 'USD', // American Samoa
  'VI': 'USD', // US Virgin Islands
  'PR': 'USD', // Puerto Rico
  'DO': 'DOP',
  'HT': 'HTG',
  'JM': 'JMD',
  'TT': 'TTD',
  'BB': 'BBD',
  'LC': 'XCD',
  'VC': 'XCD',
  'GD': 'XCD',
  'AG': 'XCD',
  'DM': 'XCD',
  'KN': 'XCD',
  'MS': 'XCD',
  'BZ': 'BZD',
  'GT': 'GTQ',
  'SV': 'SVC',
  'HN': 'HNL',
  'NI': 'NIO',
  'CR': 'CRC',
  'PA': 'PAB',
  'CU': 'CUP',
  'BS': 'BSD',
  'KY': 'KYD',
  'TC': 'USD', // Turks and Caicos
  'VG': 'USD', // British Virgin Islands
  'AI': 'XCD', // Anguilla
  'BM': 'BMD',
  'GL': 'DKK', // Greenland
  'IS': 'ISK',
  'NO': 'NOK',
  'SE': 'SEK',
  'DK': 'DKK',
  'FI': 'EUR',
  'EE': 'EUR',
  'LV': 'EUR',
  'LT': 'EUR',
  'PL': 'PLN',
  'DE': 'EUR',
  'NL': 'EUR',
  'BE': 'EUR',
  'LU': 'EUR',
  'FR': 'EUR',
  'CH': 'CHF',
  'AT': 'EUR',
  'IT': 'EUR',
  'MT': 'EUR',
  'CY': 'EUR',
  'GR': 'EUR',
  'PT': 'EUR',
  'ES': 'EUR',
  'SI': 'EUR',
  'HR': 'EUR',
  'BA': 'BAM',
  'ME': 'EUR',
  'RS': 'RSD',
  'MK': 'MKD',
  'AL': 'ALL',
  'XK': 'EUR', // Kosovo
  'RO': 'RON',
  'BG': 'BGN',
  'HU': 'HUF',
  'SK': 'EUR',
  'CZ': 'CZK',
  'MD': 'MDL',
  'IE': 'EUR',
  'JE': 'GBP', // Jersey
  'GG': 'GBP', // Guernsey
  'IM': 'GBP', // Isle of Man
  'FO': 'DKK', // Faroe Islands
  'SJ': 'NOK', // Svalbard
  'AX': 'EUR', // Aland Islands
  'SM': 'EUR', // San Marino
  'VA': 'EUR', // Vatican
  'MC': 'EUR', // Monaco
  'LI': 'CHF', // Liechtenstein
  'AD': 'EUR', // Andorra
  'GI': 'GIP',
};

/** Non-standard codes occasionally returned by platform geocoders → ISO 3166-1 alpha-2. */
const COUNTRY_CODE_ALIASES: Record<string, string> = {
  UK: 'GB',
};

/** Normalize ISO 3166-1 alpha-2 (expo sometimes returns lowercase or aliases). */
function normalizeCountryCode(iso: string | null | undefined): string | null {
  if (iso == null || typeof iso !== 'string') return null;
  const upper = iso.trim().toUpperCase();
  const resolved = COUNTRY_CODE_ALIASES[upper] ?? upper;
  return /^[A-Z]{2}$/.test(resolved) ? resolved : null;
}

function normalizeCountryNameKey(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function isoFromCountryName(country: string | null | undefined): string | null {
  if (country == null || typeof country !== 'string') return null;
  const key = normalizeCountryNameKey(country);
  return COUNTRY_NAME_TO_ISO[key] ?? null;
}

/** Higher = more local / specific placemark (prefer over coarse or wrong first hits). */
function placemarkSpecificity(p: Location.LocationGeocodedAddress): number {
  let s = 0;
  if (p.name) s += 1;
  if (p.street || p.streetNumber) s += 5;
  if (p.city || p.district) s += 4;
  if (p.subregion) s += 2;
  if (p.region) s += 1;
  if (p.postalCode) s += 1;
  return s;
}

/**
 * Pick currency from reverse-geocode results. The first placemark is often
 * coarse or wrong (e.g. wrong isoCountryCode); combine iso + country name
 * with weights so the local row (e.g. country "Armenia") can override.
 */
function currencyFromReverseGeocode(
  placemarks: Location.LocationGeocodedAddress[],
): string {
  const scoreByCode = new Map<string, number>();

  for (const p of placemarks) {
    const spec = Math.max(1, placemarkSpecificity(p));
    const code = normalizeCountryCode(p.isoCountryCode);
    if (code && countryToCurrency[code]) {
      scoreByCode.set(code, (scoreByCode.get(code) ?? 0) + spec);
    }
    const nameIso = isoFromCountryName(p.country);
    if (nameIso && countryToCurrency[nameIso]) {
      scoreByCode.set(nameIso, (scoreByCode.get(nameIso) ?? 0) + spec * 1.25);
    }
  }

  if (scoreByCode.size === 0) return 'USD';

  let bestCode: string | null = null;
  let bestScore = -1;
  for (const [code, score] of scoreByCode) {
    if (score > bestScore) {
      bestScore = score;
      bestCode = code;
    }
  }
  return bestCode ? countryToCurrency[bestCode] : 'USD';
}

/** GPS reverse geocode only; returns USD if permission denied or on error. */
export async function detectCurrencyFromReverseGeocodeAsync(): Promise<string> {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') {
      return 'USD';
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.Balanced,
    });
    const address = await Location.reverseGeocodeAsync({
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
    });
    if (address.length > 0) {
      return currencyFromReverseGeocode(address);
    }
  } catch (err) {
    console.error('Location detection error:', err);
  }
  return 'USD';
}

const CAUCASUS_TIMEZONE_TO_CURRENCY: Record<string, string> = {
  'Asia/Yerevan': 'AMD',
  'Asia/Tbilisi': 'GEL',
  'Asia/Baku': 'AZN',
};

function currencyFromCaucasusTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    if (!tz) return null;
    return CAUCASUS_TIMEZONE_TO_CURRENCY[tz] ?? null;
  } catch {
    return null;
  }
}

async function countryCodeFromNetworkIp(): Promise<string | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    const response = await fetch(
      'http://ip-api.com/json/?fields=countryCode',
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);
    if (!response.ok) return null;
    const data = (await response.json()) as { countryCode?: string };
    return normalizeCountryCode(data.countryCode);
  } catch {
    return null;
  }
}

async function currencyFromNetworkIp(): Promise<string | null> {
  const code = await countryCodeFromNetworkIp();
  if (!code || !countryToCurrency[code]) return null;
  return countryToCurrency[code];
}

export {
  detectUserCountryCode,
  isUserInArmenia,
} from '@/lib/userRegion';

/**
 * Best-effort local fiat: IP country (same approach as CurrencyConverter),
 * then Caucasus timezones, then GPS reverse geocode.
 */
export async function detectPreferredLocalCurrency(): Promise<string> {
  const fromIp = await currencyFromNetworkIp();
  if (fromIp) return fromIp;

  const fromTz = currencyFromCaucasusTimezone();
  if (fromTz) return fromTz;

  return detectCurrencyFromReverseGeocodeAsync();
}

interface LocationDetectionProps {
  onCurrencyDetected?: (currency: string) => void;
  visible?: boolean;
}

export default function LocationDetection({ onCurrencyDetected, visible = true }: LocationDetectionProps) {
  const [detectedCurrency, setDetectedCurrency] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const textColor = useThemeColor({}, 'text');

  const detectLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      // Request location permissions
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setError('Location permission denied');
        setLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      const { latitude, longitude } = location.coords;

      // Note: reverseGeocodeAsync is deprecated in SDK 49+, consider using Google Places API for production
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address.length > 0) {
        const currency = currencyFromReverseGeocode(address);

        setDetectedCurrency(currency);
        if (onCurrencyDetected) {
          onCurrencyDetected(currency);
        }
      } else {
        setError('Could not determine location');
      }
    } catch (err) {
      console.error('Location detection error:', err);
      setError('Failed to detect location');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (visible) {
      detectLocation();
    }
  }, [visible]);

  if (!visible) return null;

  return (
    <View style={{ padding: 10, alignItems: 'center' }}>
      {loading && <ThemedText style={{ color: textColor }}>Detecting location...</ThemedText>}
      {error && (
        <View style={{ alignItems: 'center' }}>
          <ThemedText style={{ color: 'red', marginBottom: 10 }}>{error}</ThemedText>
          <TouchableOpacity onPress={detectLocation}>
            <ThemedText style={{ color: textColor, textDecorationLine: 'underline' }}>Try Again</ThemedText>
          </TouchableOpacity>
        </View>
      )}
      {detectedCurrency && !loading && !error && (
        <ThemedText style={{ color: textColor }}>
          Detected currency: {detectedCurrency}
        </ThemedText>
      )}
    </View>
  );
}

/** GPS reverse geocode only (legacy). Prefer {@link usePreferredLocalCurrency} for app defaults. */
export const useLocationCurrency = () => {
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(false);

  const detectCurrency = async () => {
    setLoading(true);
    try {
      const c = await detectCurrencyFromReverseGeocodeAsync();
      setCurrency(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    detectCurrency();
  }, []);

  return { currency, loading, detectCurrency };
};

/**
 * IP country + Caucasus timezone + GPS geocode (matches CurrencyConverter-style detection).
 */
export const usePreferredLocalCurrency = () => {
  const [currency, setCurrency] = useState<string>('USD');
  const [loading, setLoading] = useState(true);

  const detectCurrency = async () => {
    setLoading(true);
    try {
      const c = await detectPreferredLocalCurrency();
      setCurrency(c);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const c = await detectPreferredLocalCurrency();
        if (!cancelled) setCurrency(c);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return { currency, loading, detectCurrency };
};
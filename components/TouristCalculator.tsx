import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Switch, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import CurrencyFlag from "@/components/CurrencyFlag";
import CurrencyPicker from "@/components/CurrencyPicker";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { fiatKeysFromConversionRates } from "@/constants/fiatCurrencyCodes";
import { crossRateForPair } from "@/lib/exchangeRateResolve";
import type { CachedExchangeRates } from "@/lib/liveExchangeRates";
import { getAsyncStorage } from "@/lib/storage";
import {
  canonicalDecimalToDisplay,
  displayDecimalToCanonical,
  formatGroupedNumber,
  parseGroupedNumericInput,
} from "@/lib/numberFormat";

function parseNum(raw: string): number | null {
  return parseGroupedNumericInput(raw);
}

function fmt2(n: number | null | undefined): string {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return formatGroupedNumber(n, 2);
}

export default function TouristCalculator({
  onShareableMessageChange,
  currenciesData,
}: {
  onShareableMessageChange?: (message: string | null) => void;
  currenciesData?: any;
}) {
  const { formDraftResetEpoch } = useAuth();
  const { t } = useLanguage();
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");

  // Keep initial values empty so "0" is shown only as placeholder.
  const [amountStr, setAmountStr] = useState("");
  const [fromCurrency, setFromCurrency] = useState("USD");
  const [showCurrencyPicker, setShowCurrencyPicker] = useState(false);
  const [useManualRate, setUseManualRate] = useState(false);
  const [manualRateStr, setManualRateStr] = useState("");
  const [tipPctStr, setTipPctStr] = useState("");
  const [discountPctStr, setDiscountPctStr] = useState("");
  const [cachedRates, setCachedRates] = useState<any>(null);
  const [prefsHydrated, setPrefsHydrated] = useState(false);

  const clearAllInputs = () => {
    setAmountStr("");
    setDiscountPctStr("");
    setTipPctStr("");
    setManualRateStr("");
  };

  useEffect(() => {
    let alive = true;
    setPrefsHydrated(false);
    (async () => {
      try {
        const storage = getAsyncStorage();
        const [savedAmount, savedDiscount, savedTip, savedCurrency, savedManualRate, savedUseManual] =
          await Promise.all([
            storage.getItem("touristCalc.amount"),
            storage.getItem("touristCalc.discountPct"),
            storage.getItem("touristCalc.tipPct"),
            storage.getItem("touristCalc.fromCurrency"),
            storage.getItem("touristCalc.manualRate"),
            storage.getItem("touristCalc.useManualRate"),
          ]);

        if (!alive) return;

        setAmountStr(
          typeof savedAmount === "string" && savedAmount !== "0" ? savedAmount : ""
        );
        setDiscountPctStr(
          typeof savedDiscount === "string" && savedDiscount !== "0" ? savedDiscount : ""
        );
        setTipPctStr(
          typeof savedTip === "string" && savedTip !== "0" ? savedTip : ""
        );
        setManualRateStr(
          typeof savedManualRate === "string" && savedManualRate !== "0"
            ? savedManualRate
            : ""
        );
        setFromCurrency(
          typeof savedCurrency === "string" && savedCurrency ? savedCurrency : "USD"
        );
        setUseManualRate(typeof savedUseManual === "string" && savedUseManual === "1");
      } catch {
        // ignore
      } finally {
        if (alive) setPrefsHydrated(true);
      }
    })();
    return () => {
      alive = false;
    };
  }, [formDraftResetEpoch]);

  useEffect(() => {
    if (!prefsHydrated) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        await storage.setItem("touristCalc.fromCurrency", fromCurrency);
      } catch {
        // ignore
      }
    })();
  }, [fromCurrency, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        await storage.setItem("touristCalc.amount", amountStr);
      } catch {
        // ignore
      }
    })();
  }, [amountStr, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        await storage.setItem("touristCalc.discountPct", discountPctStr);
      } catch {
        // ignore
      }
    })();
  }, [discountPctStr, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        await storage.setItem("touristCalc.tipPct", tipPctStr);
      } catch {
        // ignore
      }
    })();
  }, [tipPctStr, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        await storage.setItem("touristCalc.manualRate", manualRateStr);
      } catch {
        // ignore
      }
    })();
  }, [manualRateStr, prefsHydrated]);

  useEffect(() => {
    if (!prefsHydrated) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        await storage.setItem("touristCalc.useManualRate", useManualRate ? "1" : "0");
      } catch {
        // ignore
      }
    })();
  }, [useManualRate, prefsHydrated]);

  useEffect(() => {
    let alive = true;
    if (currenciesData?.conversion_rates) return;
    (async () => {
      try {
        const storage = getAsyncStorage();
        const raw = await storage.getItem("cachedExchangeRates");
        if (!alive) return;
        if (!raw) return;
        const parsed = JSON.parse(raw);
        setCachedRates(parsed);
      } catch {
        // ignore – fallback will be unavailable
      }
    })();
    return () => {
      alive = false;
    };
  }, [currenciesData]);

  const rateData = useMemo((): Pick<
    CachedExchangeRates,
    "conversion_rates" | "cba_conversion_rates"
  > | null => {
    const raw = currenciesData ?? cachedRates;
    if (!raw?.conversion_rates) return null;
    return raw as Pick<CachedExchangeRates, "conversion_rates" | "cba_conversion_rates">;
  }, [cachedRates, currenciesData]);

  const rates = rateData?.conversion_rates ?? null;

  const currencies = useMemo(() => {
    if (!rates) return ["USD", "EUR", "RUB", "GEL", "AMD"];
    const list = fiatKeysFromConversionRates(rates);
    return list.includes("AMD") ? list : ["AMD", ...list];
  }, [rates]);

  const autoRateToAmd = useMemo(() => {
    if (!rateData) return null;
    return crossRateForPair(fromCurrency, "AMD", rateData);
  }, [rateData, fromCurrency]);

  const hasAutoRate = autoRateToAmd !== null && Number.isFinite(autoRateToAmd) && (autoRateToAmd as number) > 0;
  const rateDisplay = useMemo(() => {
    if (!hasAutoRate) return "—";
    const r = autoRateToAmd as number;
    const trimmed = r.toFixed(6).replace(/0+$/, "").replace(/\.$/, "");
    const n = Number(trimmed);
    return Number.isFinite(n) ? formatGroupedNumber(n, 6) : "—";
  }, [autoRateToAmd, hasAutoRate]);

  const effectiveRate = useMemo(() => {
    if (useManualRate) {
      const r = parseNum(manualRateStr);
      return r !== null && r > 0 ? r : null;
    }
    return hasAutoRate ? (autoRateToAmd as number) : null;
  }, [useManualRate, manualRateStr, hasAutoRate, autoRateToAmd]);

  const missingReason = useMemo(() => {
    if (useManualRate) {
      const r = parseNum(manualRateStr);
      if (r === null || r <= 0) return t("touristCalc.rate.manualHint");
      return null;
    }
    if (!hasAutoRate) return t("touristCalc.rate.unavailable");
    return null;
  }, [useManualRate, manualRateStr, hasAutoRate, t]);

  const result = useMemo(() => {
    const amount = parseNum(amountStr);
    const rate = effectiveRate;
    const discountPct = Math.max(0, parseNum(discountPctStr) ?? 0);
    const tipPct = Math.max(0, parseNum(tipPctStr) ?? 0);
    if (amount === null) return null;
    if (amount < 0 || rate === null || rate <= 0) return null;
    const discount = (amount * discountPct) / 100;
    const subtotal = Math.max(0, amount - discount);
    const tip = (subtotal * tipPct) / 100;
    const total = subtotal + tip;
    const received = total * rate;
    return {
      amount,
      rate,
      discountPct,
      discount,
      subtotal,
      tipPct,
      tip,
      total,
      received,
    };
  }, [amountStr, discountPctStr, tipPctStr, effectiveRate]);

  React.useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("touristCalc.share.title"),
        `${t("touristCalc.field.amount")}: ${formatGroupedNumber(result.amount, 2)} ${fromCurrency}`,
        `${t("touristCalc.field.rate")}: ${formatGroupedNumber(result.rate, 6)}`,
        `${t("touristCalc.result.received")}: ${formatGroupedNumber(result.received, 2)}`,
      ].join("\n")
    );
  }, [result, onShareableMessageChange, t, fromCurrency]);

  return (
    <ScrollView
      style={{ flex: 1, backgroundColor: "transparent" }}
      contentContainerStyle={styles.scroll}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.titleRow}>
          <View style={[styles.iconWrap, { backgroundColor: surfaceSecondaryColor, borderColor }]}>
            <Ionicons name="airplane-outline" size={18} color={primaryColor} />
          </View>
          <ThemedText type="defaultSemiBold" style={{ color: textColor, flex: 1 }}>
            {t("quick.action.touristCalc")}
          </ThemedText>
        </View>

        <Field
          label={t("touristCalc.field.amount")}
          value={amountStr}
          onChangeText={setAmountStr}
          surfaceColor={surfaceSecondaryColor}
          borderColor={borderColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          numberGrouping="decimal"
        />

        <TouchableOpacity
          activeOpacity={0.85}
          onPress={clearAllInputs}
          style={[
            styles.clearBtn,
            { backgroundColor: surfaceSecondaryColor, borderColor },
          ]}
          accessibilityRole="button"
        >
          <Ionicons name="trash-outline" size={18} color={textSecondaryColor} />
          <ThemedText type="defaultSemiBold" style={{ color: textSecondaryColor }}>
            Մաքրել բոլորը
          </ThemedText>
        </TouchableOpacity>

        <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 6 }}>
          {t("touristCalc.field.currency")}
        </ThemedText>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => setShowCurrencyPicker(true)}
          style={[
            styles.currencyBtn,
            { backgroundColor: surfaceSecondaryColor, borderColor },
          ]}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: 10, flex: 1 }}>
            <CurrencyFlag currency={fromCurrency} size={20} />
            <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
              {fromCurrency} → AMD
            </ThemedText>
          </View>
          <Ionicons name="chevron-down" size={18} color={textSecondaryColor} />
        </TouchableOpacity>

        <Field
          label={t("touristCalc.field.rate")}
          value={useManualRate ? manualRateStr : rateDisplay}
          onChangeText={useManualRate ? setManualRateStr : () => {}}
          surfaceColor={surfaceSecondaryColor}
          borderColor={borderColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          editable={useManualRate}
          numberGrouping={useManualRate ? "decimal" : undefined}
        />
        <ThemedText type="caption" style={{ color: textSecondaryColor, marginTop: -6, marginBottom: 8 }}>
          {useManualRate
            ? t("touristCalc.rate.manualHint")
            : hasAutoRate
              ? t("touristCalc.rate.auto")
              : t("touristCalc.rate.unavailable")}
        </ThemedText>

        <View style={styles.switchRow}>
          <ThemedText style={{ color: textColor, flex: 1 }} numberOfLines={2}>
            {t("touristCalc.rate.manualToggle")}
          </ThemedText>
          <Switch value={useManualRate} onValueChange={setUseManualRate} />
        </View>

        <Field
          label={t("touristCalc.field.discountPct")}
          value={discountPctStr}
          onChangeText={setDiscountPctStr}
          surfaceColor={surfaceSecondaryColor}
          borderColor={borderColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          numberGrouping="decimal"
        />

        <Field
          label={t("touristCalc.field.tipPct")}
          value={tipPctStr}
          onChangeText={setTipPctStr}
          surfaceColor={surfaceSecondaryColor}
          borderColor={borderColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          numberGrouping="decimal"
        />

        <View style={{ gap: 8, marginTop: 10 }}>
          <RowKV label={t("touristCalc.result.discount")} value={fmt2(result?.discount)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          <RowKV label={t("touristCalc.result.subtotal")} value={fmt2(result?.subtotal)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          <RowKV label={t("touristCalc.result.tip")} value={fmt2(result?.tip)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          <RowKV label={t("touristCalc.result.total")} value={fmt2(result?.total)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          <RowKV label={t("touristCalc.result.received")} value={fmt2(result?.received)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
        </View>
        {result ? null : (
          <ThemedText type="caption" style={{ color: textSecondaryColor, marginTop: 10 }}>
            {missingReason ?? t("touristCalc.invalid")}
          </ThemedText>
        )}
      </View>

      <CurrencyPicker
        visible={showCurrencyPicker}
        currencies={currencies}
        selectedCurrency={fromCurrency}
        onSelect={(c) => {
          setFromCurrency(c);
          setShowCurrencyPicker(false);
        }}
        onClose={() => setShowCurrencyPicker(false)}
      />
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  surfaceColor: string;
  borderColor: string;
  textColor: string;
  textSecondaryColor: string;
  editable?: boolean;
  numberGrouping?: "decimal";
}) {
  const {
    label,
    value,
    onChangeText,
    surfaceColor,
    borderColor,
    textColor,
    textSecondaryColor,
    editable,
    numberGrouping,
  } = props;
  const display =
    numberGrouping === "decimal" ? canonicalDecimalToDisplay(value) : value;
  const handleChange =
    numberGrouping === "decimal"
      ? (s: string) => onChangeText(displayDecimalToCanonical(s))
      : onChangeText;
  return (
    <View style={{ marginBottom: 12 }}>
      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 6 }}>
        {label}
      </ThemedText>
      <TextInput
        value={display}
        onChangeText={handleChange}
        keyboardType="decimal-pad"
        editable={editable ?? true}
        placeholder="0"
        placeholderTextColor={textSecondaryColor}
        style={[
          styles.input,
          { backgroundColor: surfaceColor, borderColor, color: textColor },
        ]}
      />
    </View>
  );
}

function RowKV(props: {
  label: string;
  value: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  const { label, value, textColor, textSecondaryColor } = props;
  return (
    <View style={styles.row}>
      <ThemedText style={{ color: textSecondaryColor, flex: 1 }} numberOfLines={2}>
        {label}
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
        {value}
      </ThemedText>
    </View>
  );
}

const styles = StyleSheet.create({
  scroll: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 28,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 16,
  },
  currencyBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 10,
  },
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 12,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  clearBtn: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 12,
  },
});


import React, { useMemo, useState } from "react";
import { ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";

function parseNum(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

export default function TouristCalculator({
  onShareableMessageChange,
}: {
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const { t } = useLanguage();
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");

  const [amountStr, setAmountStr] = useState("1000");
  const [rateStr, setRateStr] = useState("400");
  const [feePctStr, setFeePctStr] = useState("0");
  const [tipPct, setTipPct] = useState(0);
  const [discountPct, setDiscountPct] = useState(0);

  const result = useMemo(() => {
    const amount = parseNum(amountStr);
    const rate = parseNum(rateStr);
    const feePct = parseNum(feePctStr) ?? 0;
    if (amount === null || rate === null) return null;
    if (amount < 0 || rate <= 0 || feePct < 0) return null;
    const discount = (amount * discountPct) / 100;
    const subtotal = Math.max(0, amount - discount);
    const tip = (subtotal * tipPct) / 100;
    const total = subtotal + tip;
    const fee = (total * feePct) / 100;
    const net = Math.max(0, total - fee);
    const received = net * rate;
    return {
      amount,
      rate,
      feePct,
      fee,
      discountPct,
      discount,
      subtotal,
      tipPct,
      tip,
      total,
      net,
      received,
    };
  }, [amountStr, rateStr, feePctStr, tipPct, discountPct]);

  React.useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("touristCalc.share.title"),
        `${t("touristCalc.field.amount")}: ${result.amount}`,
        `${t("touristCalc.field.rate")}: ${result.rate}`,
        `${t("touristCalc.result.received")}: ${result.received.toFixed(2)}`,
      ].join("\n")
    );
  }, [result, onShareableMessageChange, t]);

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
        />
        <Field
          label={t("touristCalc.field.rate")}
          value={rateStr}
          onChangeText={setRateStr}
          surfaceColor={surfaceSecondaryColor}
          borderColor={borderColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />
        <Field
          label={t("touristCalc.field.feePct")}
          value={feePctStr}
          onChangeText={setFeePctStr}
          surfaceColor={surfaceSecondaryColor}
          borderColor={borderColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />

        <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
          {t("touristCalc.field.discountPct")}
        </ThemedText>
        <View style={styles.pillsRow}>
          {[0, 5, 10, 15, 20, 25].map((p) => {
            const active = p === discountPct;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setDiscountPct(p)}
                activeOpacity={0.85}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? primaryColor : surfaceSecondaryColor,
                    borderColor: active ? primaryColor : borderColor,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "800", color: active ? "#fff" : textSecondaryColor }}
                >
                  {p}%
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
          {t("touristCalc.field.tipPct")}
        </ThemedText>
        <View style={styles.pillsRow}>
          {[0, 5, 10, 12, 15].map((p) => {
            const active = p === tipPct;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setTipPct(p)}
                activeOpacity={0.85}
                style={[
                  styles.pill,
                  {
                    backgroundColor: active ? primaryColor : surfaceSecondaryColor,
                    borderColor: active ? primaryColor : borderColor,
                  },
                ]}
              >
                <ThemedText
                  type="caption"
                  style={{ fontWeight: "800", color: active ? "#fff" : textSecondaryColor }}
                >
                  {p}%
                </ThemedText>
              </TouchableOpacity>
            );
          })}
        </View>

        {result ? (
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV label={t("touristCalc.result.discount")} value={result.discount.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("touristCalc.result.subtotal")} value={result.subtotal.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("touristCalc.result.tip")} value={result.tip.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("touristCalc.result.total")} value={result.total.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("touristCalc.result.fee")} value={result.fee.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("touristCalc.result.net")} value={result.net.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("touristCalc.result.received")} value={result.received.toFixed(2)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
        ) : (
          <ThemedText type="caption" style={{ color: textSecondaryColor }}>
            {t("touristCalc.invalid")}
          </ThemedText>
        )}
      </View>
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
}) {
  const { label, value, onChangeText, surfaceColor, borderColor, textColor, textSecondaryColor } = props;
  return (
    <View style={{ marginBottom: 12 }}>
      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 6 }}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
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
});


import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import QuickActionModal, {
  type QuickActionModalMenuItem,
} from "@/components/QuickActionModal";
import { ThemedText } from "@/components/themed-text";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  defaultLoanCalculatorDraft,
  loadLoanCalculatorDraft,
  saveLoanCalculatorDraft,
  type LoanCalculatorDraft,
} from "@/lib/amScreensDraft";
import { shareLines } from "@/lib/shareText";
import {
  addThousandsDotsFromDigitString,
  canonicalDecimalToDisplay,
  displayDecimalToCanonical,
  formatAmdSuffix,
  formatGroupedNumber,
  parseGroupedNumericInput,
  sanitizeIntegerDigits,
} from "@/lib/numberFormat";

function formatAmd(value: number): string {
  return formatAmdSuffix(value);
}

function parseNum(raw: string): number | null {
  return parseGroupedNumericInput(raw);
}

function LoanField({
  label,
  value,
  onChangeText,
  keyboardType,
  borderColor,
  surfaceColor,
  textColor,
  textSecondaryColor,
  accessibilityLabel,
  numberGrouping,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  keyboardType?: "decimal-pad" | "number-pad";
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
  accessibilityLabel?: string;
  numberGrouping?: "integer" | "decimal";
}) {
  const displayValue =
    numberGrouping === "integer"
      ? value === ""
        ? ""
        : addThousandsDotsFromDigitString(sanitizeIntegerDigits(value))
      : numberGrouping === "decimal"
        ? canonicalDecimalToDisplay(value)
        : value;

  const handleChange = (text: string) => {
    if (numberGrouping === "integer") {
      onChangeText(sanitizeIntegerDigits(text));
    } else if (numberGrouping === "decimal") {
      onChangeText(displayDecimalToCanonical(text));
    } else {
      onChangeText(text);
    }
  };

  return (
    <View style={styles.fieldBlock}>
      <ThemedText
        type="caption"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[styles.fieldLabel, { color: textSecondaryColor }]}
      >
        {label}
      </ThemedText>
      <TextInput
        value={displayValue}
        onChangeText={handleChange}
        keyboardType={keyboardType ?? "decimal-pad"}
        placeholder="0"
        placeholderTextColor={textSecondaryColor}
        accessibilityLabel={accessibilityLabel ?? label}
        style={[
          styles.input,
          {
            borderColor,
            backgroundColor: surfaceColor,
            color: textColor,
          },
        ]}
      />
    </View>
  );
}

function LoanRowKV({
  label,
  value,
  textColor,
  textSecondaryColor,
  emphasizeValue,
  primaryColor,
}: {
  label: string;
  value: string;
  textColor: string;
  textSecondaryColor: string;
  emphasizeValue?: boolean;
  primaryColor?: string;
}) {
  return (
    <View style={styles.rowBetween}>
      <ThemedText
        style={[{ color: textSecondaryColor }, styles.rowKVLabel]}
        numberOfLines={4}
        ellipsizeMode="tail"
      >
        {label}
      </ThemedText>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={3}
        ellipsizeMode="tail"
        style={[
          { color: emphasizeValue && primaryColor ? primaryColor : textColor },
          styles.rowKVValue,
        ]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

export interface LoanCalculatorProps {
  visible: boolean;
  onClose: () => void;
  onResult?: (monthlyPayment: number) => void;
  menuItems?: QuickActionModalMenuItem[];
}

export default function LoanCalculator({
  visible,
  onClose,
  onResult,
  menuItems,
}: LoanCalculatorProps) {
  const { t } = useLanguage();
  const surfaceColor = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");

  const [draft, setDraft] = useState<LoanCalculatorDraft>(defaultLoanCalculatorDraft);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void loadLoanCalculatorDraft().then((d) => {
      if (!cancelled) {
        setDraft(d);
        setDraftHydrated(true);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const tm = setTimeout(() => void saveLoanCalculatorDraft(draft), 400);
    return () => clearTimeout(tm);
  }, [draft, draftHydrated]);

  const { principalStr, rateStr, monthsStr, yearsMode, yearsStr } = draft;

  const result = useMemo(() => {
    const principal = parseNum(principalStr);
    const annualPct = parseNum(rateStr);
    if (principal === null || annualPct === null || principal <= 0 || annualPct < 0) {
      return null;
    }

    let months: number;
    if (yearsMode) {
      const y = parseNum(yearsStr);
      if (y === null || y < 0) return null;
      months = Math.max(0, Math.round(y * 12));
      if (months <= 0) return null;
    } else {
      const m = parseNum(monthsStr);
      if (m === null || m <= 0) return null;
      months = Math.floor(m);
      if (months <= 0) return null;
    }

    const monthlyRate = annualPct / 100 / 12;
    let payment: number;
    if (monthlyRate === 0) {
      payment = principal / months;
    } else {
      const factor = Math.pow(1 + monthlyRate, months);
      payment = (principal * monthlyRate * factor) / (factor - 1);
    }

    const totalPaidRaw = payment * months;
    const totalInterestRaw = totalPaidRaw - principal;

    if (!Number.isFinite(payment) || payment <= 0 || !Number.isFinite(totalPaidRaw)) {
      return null;
    }

    return {
      payment,
      totalInterest: totalInterestRaw,
      totalPaid: totalPaidRaw,
      months,
    };
  }, [principalStr, rateStr, monthsStr, yearsMode, yearsStr]);

  useEffect(() => {
    if (result && onResult) onResult(result.payment);
  }, [result, onResult]);

  const loanShareMessage = useMemo(() => {
    if (!result) return null;
    const rateNum = parseNum(rateStr);
    return [
      t("calculator.loanTitle"),
      `${t("calculator.loanPrincipal")}: ${formatAmd(parseNum(principalStr) ?? 0)}`,
      `${t("calculator.loanAnnualRate")}: ${rateNum != null ? formatGroupedNumber(rateNum, 6) : rateStr}%`,
      `${t("calculator.loanTermMonths")}: ${formatGroupedNumber(result.months, 0)}`,
      `${t("calculator.loanMonthlyPayment")}: ${formatAmd(result.payment)}`,
      `${t("calculator.loanTotalInterest")}: ${formatAmd(result.totalInterest)}`,
      `${t("calculator.loanTotalPaid")}: ${formatAmd(result.totalPaid)}`,
    ].join("\n");
  }, [result, principalStr, rateStr, t]);

  const patch = (partial: Partial<LoanCalculatorDraft>) => {
    setDraft((d) => ({ ...d, ...partial }));
  };

  return (
    <QuickActionModal
      visible={visible}
      onClose={onClose}
      title={t("calculator.loanTitle")}
      shareMessage={loanShareMessage}
      menuItems={menuItems}
    >
      <ScrollView
        style={{ flex: 1, backgroundColor: "transparent" }}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[
            styles.card,
            styles.cardClip,
            { backgroundColor: surfaceColor, borderColor },
          ]}
        >
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={3}
            ellipsizeMode="tail"
            style={[styles.cardTitle, { color: textColor }]}
          >
            {t("calculator.loanTitle")}
          </ThemedText>

          <TouchableOpacity
            onPress={() =>
              patch({
                principalStr: "",
                rateStr: "",
                monthsStr: "",
                yearsStr: "",
              })
            }
            style={[styles.clearAllRow, { borderColor }]}
            accessibilityRole="button"
          >
            <Ionicons name="trash-outline" size={18} color={primaryColor} />
            <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
              {t("amFinance.clearAllFields")}
            </ThemedText>
          </TouchableOpacity>

          <LoanField
            label={t("calculator.loanPrincipal")}
            value={principalStr}
            onChangeText={(principalStr) => patch({ principalStr })}
            borderColor={borderColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            keyboardType="decimal-pad"
            accessibilityLabel={t("calculator.loanPrincipal")}
            numberGrouping="integer"
          />
          <LoanField
            label={t("calculator.loanAnnualRate")}
            value={rateStr}
            onChangeText={(rateStr) => patch({ rateStr })}
            borderColor={borderColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            keyboardType="decimal-pad"
            accessibilityLabel={t("calculator.loanAnnualRate")}
            numberGrouping="decimal"
          />

          <View style={styles.switchRow}>
            <ThemedText
              style={[{ color: textColor }, styles.switchLabelText]}
              numberOfLines={4}
              ellipsizeMode="tail"
            >
              {yearsMode ? t("amFinance.deposit.useYears") : t("amFinance.deposit.useMonths")}
            </ThemedText>
            <Switch
              style={styles.switchControl}
              value={yearsMode}
              onValueChange={(yearsMode) => patch({ yearsMode })}
            />
          </View>

          {yearsMode ? (
            <LoanField
              label={t("amFinance.deposit.years")}
              value={yearsStr}
              onChangeText={(yearsStr) => patch({ yearsStr })}
              borderColor={borderColor}
              surfaceColor={surfaceColor}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
              keyboardType="decimal-pad"
              numberGrouping="decimal"
            />
          ) : (
            <LoanField
              label={t("amFinance.deposit.months")}
              value={monthsStr}
              onChangeText={(monthsStr) => patch({ monthsStr })}
              borderColor={borderColor}
              surfaceColor={surfaceColor}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
              keyboardType="number-pad"
              numberGrouping="integer"
            />
          )}

          {result ? (
            <>
              <ThemedText
                type="defaultSemiBold"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={[styles.resultsHeading, { color: textColor }]}
              >
                {t("amFinance.results")}
              </ThemedText>
              <View style={styles.resultsBlock}>
                <LoanRowKV
                  label={t("calculator.loanMonthlyPayment")}
                  value={formatAmd(result.payment)}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                  emphasizeValue
                  primaryColor={primaryColor}
                />
                <LoanRowKV
                  label={t("calculator.loanTotalInterest")}
                  value={formatAmd(result.totalInterest)}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                />
                <LoanRowKV
                  label={t("calculator.loanTotalPaid")}
                  value={formatAmd(result.totalPaid)}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                />
              </View>
              <ThemedText type="caption" style={[styles.footnote, { color: textSecondaryColor }]}>
                {t("calculator.loanFootnote")}
              </ThemedText>
              <TouchableOpacity
                style={[styles.shareRow, { marginTop: 14 }]}
                onPress={() =>
                  void shareLines([
                    t("calculator.loanTitle"),
                    `${t("calculator.loanMonthlyPayment")}: ${formatAmd(result.payment)}`,
                    `${t("calculator.loanTotalPaid")}: ${formatAmd(result.totalPaid)}`,
                  ])
                }
              >
                <Ionicons name="share-outline" size={20} color={primaryColor} />
                <ThemedText
                  numberOfLines={2}
                  ellipsizeMode="tail"
                  style={[styles.shareRowLabel, { color: primaryColor, fontWeight: "600" }]}
                >
                  {t("amFinance.shareSummary")}
                </ThemedText>
              </TouchableOpacity>
            </>
          ) : (
            <ThemedText style={{ color: textSecondaryColor, marginTop: 4 }}>
              {t("amFinance.errors.invalid")}
            </ThemedText>
          )}
        </View>
      </ScrollView>
    </QuickActionModal>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 8,
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  cardClip: {
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
  },
  cardTitle: {
    fontSize: 17,
    marginBottom: 14,
  },
  clearAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
    marginTop: -6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldBlock: {
    marginBottom: 14,
  },
  fieldLabel: {
    marginBottom: 6,
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    gap: 12,
  },
  switchLabelText: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingTop: Platform.OS === "ios" ? 2 : 0,
    paddingRight: 4,
  },
  switchControl: {
    flexShrink: 0,
  },
  resultsHeading: {
    marginTop: 8,
    marginBottom: 10,
    fontSize: 16,
  },
  resultsBlock: {
    gap: 8,
  },
  rowBetween: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  rowKVLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    paddingRight: 8,
  },
  rowKVValue: {
    flexShrink: 0,
    maxWidth: "52%",
    textAlign: "right",
  },
  footnote: {
    marginTop: 12,
    lineHeight: 18,
    fontStyle: "italic",
  },
  shareRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    maxWidth: "100%",
  },
  shareRowLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
  },
});

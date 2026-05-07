import React, { useEffect, useMemo, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import QuickActionModal from "@/components/QuickActionModal";
import { ThemedText } from "@/components/themed-text";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useCalculatorHistory } from "@/hooks/useUserData";
import { useThemeColor } from "@/hooks/use-theme-color";

const LOAN_HISTORY_ARROW = "\u2192";

function formatCalculatorHistoryDisplay(record: {
  expression?: unknown;
  result?: unknown;
  calculation_type?: string | null;
}): string {
  const rawExpr = record?.expression;
  const expression =
    typeof rawExpr === "string"
      ? rawExpr
      : rawExpr != null && rawExpr !== ""
        ? String(rawExpr)
        : "Unknown calculation";
  const trimExpr = expression.trim() || "Unknown calculation";
  const type = record?.calculation_type;

  if (type === "loan" || trimExpr.includes(LOAN_HISTORY_ARROW)) {
    return trimExpr;
  }
  if (trimExpr.includes("=")) {
    return trimExpr;
  }
  const r = record?.result;
  if (r != null && r !== "") {
    return `${trimExpr} = ${String(r)}`;
  }
  return trimExpr;
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
}) {
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
        value={value}
        onChangeText={onChangeText}
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
}

export default function LoanCalculator({ visible, onClose, onResult }: LoanCalculatorProps) {
  const { user } = useAuth();
  const {
    calculatorHistory: supabaseHistory,
    saveCalculation,
    clearAllCalculations,
  } = useCalculatorHistory();
  const { t, tWithParams } = useLanguage();
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");
  const errorColor = useThemeColor({}, "error");
  const loanButtonLabelColor = useThemeColor({}, "textInverse");

  const [loanPrincipal, setLoanPrincipal] = useState("");
  const [loanRateAnnual, setLoanRateAnnual] = useState("");
  const [loanTermMonths, setLoanTermMonths] = useState("");
  const [loanError, setLoanError] = useState<string | null>(null);
  const [loanMonthly, setLoanMonthly] = useState<number | null>(null);
  const [loanTotalInterest, setLoanTotalInterest] = useState<number | null>(null);
  const [loanTotalPaid, setLoanTotalPaid] = useState<number | null>(null);
  const [calculationHistory, setCalculationHistory] = useState<string[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [roundingDecimalPlaces] = useState(2);

  useEffect(() => {
    if (visible && user && supabaseHistory.length > 0) {
      const formattedHistory = supabaseHistory
        .filter((record): record is NonNullable<typeof record> => record != null)
        .map((record) => formatCalculatorHistoryDisplay(record));
      setCalculationHistory((prev) => {
        const merged = [...formattedHistory];
        prev.forEach((localCalc) => {
          if (!merged.includes(localCalc)) {
            merged.push(localCalc);
          }
        });
        return merged.slice(0, 15);
      });
    }
  }, [visible, user, supabaseHistory]);

  const roundForDisplay = (n: number) => parseFloat(n.toFixed(roundingDecimalPlaces));

  const parseLoanNumber = (raw: string) => {
    const s = raw.replace(/\s/g, "").replace(/,/g, "");
    const n = parseFloat(s);
    return Number.isFinite(n) ? n : NaN;
  };

  const parseLoanMonths = (raw: string) => {
    const s = raw.replace(/\s/g, "").replace(/,/g, "");
    const n = parseInt(s, 10);
    return Number.isFinite(n) ? n : NaN;
  };

  const addToHistory = (line: string) => {
    setCalculationHistory((prev) => [line, ...prev.slice(0, 14)]);
  };

  const computeLoan = async () => {
    setLoanError(null);
    const principal = parseLoanNumber(loanPrincipal);
    const annualPct = parseLoanNumber(loanRateAnnual);
    const months = parseLoanMonths(loanTermMonths);

    if (!Number.isFinite(principal) || principal <= 0) {
      setLoanError(t("calculator.loanErrPrincipal"));
      return;
    }
    if (!Number.isFinite(annualPct) || annualPct < 0) {
      setLoanError(t("calculator.loanErrRate"));
      return;
    }
    if (!Number.isFinite(months) || months <= 0) {
      setLoanError(t("calculator.loanErrTerm"));
      return;
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
      setLoanError(t("calculator.loanErrRate"));
      return;
    }

    const paymentR = roundForDisplay(payment);
    const interestR = roundForDisplay(totalInterestRaw);
    const paidR = roundForDisplay(totalPaidRaw);

    setLoanMonthly(paymentR);
    setLoanTotalInterest(interestR);
    setLoanTotalPaid(paidR);

    const historyLine = tWithParams("calculator.loanHistoryLine", {
      principal: String(roundForDisplay(principal)),
      rate: String(roundForDisplay(annualPct)),
      months: String(months),
      payment: String(paymentR),
    });
    addToHistory(historyLine);

    if (user) {
      try {
        await saveCalculation(historyLine, paymentR, "loan", {
          roundingDecimalPlaces,
          principal,
          annualPct,
          months,
        });
      } catch (e) {
        console.error("Error saving loan calculation:", e);
      }
    }

    if (onResult) {
      onResult(paymentR);
    }
  };

  const clearHistory = async () => {
    try {
      const success = await clearAllCalculations();
      if (success) {
        setCalculationHistory([]);
      }
    } catch (error) {
      console.error("Error clearing calculator history:", error);
    }
  };

  const displayHistory =
    user && supabaseHistory.length > 0
      ? supabaseHistory
          .filter((record): record is NonNullable<typeof record> => record != null)
          .map((record) => formatCalculatorHistoryDisplay(record))
      : calculationHistory;

  const loanShareMessage = useMemo(() => {
    if (
      loanMonthly === null ||
      loanTotalInterest === null ||
      loanTotalPaid === null
    ) {
      return null;
    }
    return [
      t("calculator.loanTitle"),
      `${t("calculator.loanPrincipal")}: ${loanPrincipal}`,
      `${t("calculator.loanAnnualRate")}: ${loanRateAnnual}%`,
      `${t("calculator.loanTermMonths")}: ${loanTermMonths}`,
      `${t("calculator.loanMonthlyPayment")}: ${loanMonthly}`,
      `${t("calculator.loanTotalInterest")}: ${loanTotalInterest}`,
      `${t("calculator.loanTotalPaid")}: ${loanTotalPaid}`,
    ].join("\n");
  }, [
    loanMonthly,
    loanTotalInterest,
    loanTotalPaid,
    loanPrincipal,
    loanRateAnnual,
    loanTermMonths,
    t,
  ]);

  const hasResults =
    loanMonthly !== null && loanTotalInterest !== null && loanTotalPaid !== null;

  return (
    <QuickActionModal
      visible={visible}
      onClose={onClose}
      title={t("calculator.loanTitle")}
      shareMessage={loanShareMessage}
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
            { backgroundColor: surfaceSecondaryColor, borderColor },
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

          <LoanField
            label={t("calculator.loanPrincipal")}
            value={loanPrincipal}
            onChangeText={(v) => {
              setLoanPrincipal(v);
              setLoanError(null);
            }}
            borderColor={borderColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            keyboardType="decimal-pad"
            accessibilityLabel={t("calculator.loanPrincipal")}
          />
          <LoanField
            label={t("calculator.loanAnnualRate")}
            value={loanRateAnnual}
            onChangeText={(v) => {
              setLoanRateAnnual(v);
              setLoanError(null);
            }}
            borderColor={borderColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            keyboardType="decimal-pad"
            accessibilityLabel={t("calculator.loanAnnualRate")}
          />
          <LoanField
            label={t("calculator.loanTermMonths")}
            value={loanTermMonths}
            onChangeText={(v) => {
              setLoanTermMonths(v);
              setLoanError(null);
            }}
            borderColor={borderColor}
            surfaceColor={surfaceColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            keyboardType="number-pad"
            accessibilityLabel={t("calculator.loanTermMonths")}
          />

          <ThemedText type="caption" style={[styles.hint, { color: textSecondaryColor }]}>
            {t("calculator.loanDisplayHint")}
          </ThemedText>

          {loanError ? (
            <ThemedText style={[styles.errorText, { color: errorColor }]}>{loanError}</ThemedText>
          ) : null}

          <TouchableOpacity
            style={[styles.calculateButton, { backgroundColor: primaryColor }]}
            onPress={() => void computeLoan()}
            activeOpacity={0.85}
            accessibilityRole="button"
            accessibilityLabel={t("calculator.loanCalculate")}
          >
            <ThemedText
              type="defaultSemiBold"
              style={{ color: loanButtonLabelColor, fontSize: 16 }}
            >
              {t("calculator.loanCalculate")}
            </ThemedText>
          </TouchableOpacity>

          {hasResults ? (
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
                  value={String(loanMonthly)}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                  emphasizeValue
                  primaryColor={primaryColor}
                />
                <LoanRowKV
                  label={t("calculator.loanTotalInterest")}
                  value={String(loanTotalInterest)}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                />
                <LoanRowKV
                  label={t("calculator.loanTotalPaid")}
                  value={String(loanTotalPaid)}
                  textColor={textColor}
                  textSecondaryColor={textSecondaryColor}
                />
              </View>
              <ThemedText type="caption" style={[styles.footnote, { color: textSecondaryColor }]}>
                {t("calculator.loanFootnote")}
              </ThemedText>
            </>
          ) : null}

          <View style={[styles.historyToggleRow, { borderColor }]}>
            <TouchableOpacity
              style={[
                styles.historyIconBtn,
                {
                  backgroundColor: showHistory ? surfaceColor : surfaceSecondaryColor,
                  borderColor: showHistory ? primaryColor : borderColor,
                },
              ]}
              onPress={() => setShowHistory(!showHistory)}
              accessibilityRole="button"
              accessibilityLabel={t("calculator.history")}
            >
              <Ionicons
                name="time-outline"
                size={22}
                color={showHistory ? primaryColor : textSecondaryColor}
              />
            </TouchableOpacity>
            <ThemedText style={[{ color: textColor }, styles.historyToggleLabel]} numberOfLines={2}>
              {t("calculator.calculationHistory")}
            </ThemedText>
          </View>

          {showHistory ? (
            <View
              style={[
                styles.historyPanel,
                {
                  backgroundColor: surfaceColor,
                  borderColor,
                },
              ]}
            >
              <View style={styles.historyHeader}>
                <ThemedText
                  type="caption"
                  style={[{ color: textSecondaryColor }, styles.historyPanelHint]}
                  numberOfLines={3}
                >
                  {t("calculator.history")}
                </ThemedText>
                {displayHistory.length > 0 ? (
                  <TouchableOpacity
                    style={[styles.clearHistoryButton, { backgroundColor: errorColor }]}
                    onPress={() => void clearHistory()}
                  >
                    <ThemedText type="caption" style={styles.clearHistoryButtonText}>
                      {t("calculator.clear")}
                    </ThemedText>
                  </TouchableOpacity>
                ) : null}
              </View>
              <ScrollView style={styles.historyList} nestedScrollEnabled>
                {displayHistory.length === 0 ? (
                  <ThemedText
                    type="caption"
                    style={[styles.historyEmpty, { color: textSecondaryColor }]}
                  >
                    {t("calculator.noCalculations")}
                  </ThemedText>
                ) : (
                  displayHistory.map((calc, index) => (
                    <ThemedText
                      key={index}
                      type="caption"
                      style={[styles.historyItem, { color: textColor, borderBottomColor: borderColor }]}
                    >
                      {typeof calc === "string" ? calc : String(calc ?? "")}
                    </ThemedText>
                  ))
                )}
              </ScrollView>
            </View>
          ) : null}
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
  hint: {
    marginBottom: 12,
    lineHeight: 18,
  },
  errorText: {
    fontSize: 13,
    fontWeight: "600",
    marginBottom: 8,
  },
  calculateButton: {
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginBottom: 8,
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
  historyToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginTop: 16,
    paddingTop: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  historyIconBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  historyToggleLabel: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    fontSize: 15,
    fontWeight: "600",
  },
  historyPanel: {
    marginTop: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    maxHeight: 240,
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 10,
    gap: 8,
  },
  historyPanelHint: {
    flex: 1,
    minWidth: 0,
  },
  clearHistoryButton: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 10,
    flexShrink: 0,
  },
  clearHistoryButtonText: {
    color: "#fff",
    fontWeight: "600",
  },
  historyList: {
    maxHeight: 160,
  },
  historyEmpty: {
    textAlign: "center",
    fontStyle: "italic",
  },
  historyItem: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    lineHeight: 18,
  },
});

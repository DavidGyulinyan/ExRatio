import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  AM_FREELANCE_TAX_CONSTANTS,
  calculateProfitTax,
  calculateSoleProprietorTax,
  calculateTurnoverTax,
  calculateVat,
  type SoleProprietorRegimeId,
  type VatMode,
} from "@/lib/armenia";
import { shareLines } from "@/lib/shareText";
import {
  defaultAmFreelanceDraft,
  loadAmFreelanceDraft,
  saveAmFreelanceDraft,
  type AmFreelanceFormsDraft,
} from "@/lib/amScreensDraft";
import {
  addThousandsDotsFromDigitString,
  canonicalDecimalToDisplay,
  displayDecimalToCanonical,
  formatGroupedNumber,
  parseGroupedNumericInput,
  sanitizeIntegerDigits,
} from "@/lib/numberFormat";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type FreelanceScreen = "menu" | "soleProp" | "turnover" | "profitTax" | "vat";

function parseNum(raw: string): number | null {
  return parseGroupedNumericInput(raw);
}

const AmFreelanceDraftContext = createContext<{
  draft: AmFreelanceFormsDraft;
  setDraft: React.Dispatch<React.SetStateAction<AmFreelanceFormsDraft>>;
} | null>(null);

function useAmFreelanceDraft() {
  const ctx = useContext(AmFreelanceDraftContext);
  if (!ctx) throw new Error("useAmFreelanceDraft must be used within provider");
  return ctx;
}

function formatMoney(_locale: string, value: number, currency: string): string {
  if (!Number.isFinite(value)) return "—";
  return `${formatGroupedNumber(value, 2)} ${currency}`;
}

type Props = {
  initialScreen?: FreelanceScreen;
  onShareableMessageChange?: (message: string | null) => void;
};

export default function ArmeniaFreelanceModal({
  initialScreen = "menu",
  onShareableMessageChange,
}: Props) {
  const { t, language } = useLanguage();
  const primaryColor = useThemeColor({}, "primary");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");

  const [stack, setStack] = useState<FreelanceScreen[]>(() =>
    initialScreen === "menu" ? ["menu"] : ["menu", initialScreen]
  );
  const [draft, setDraft] = useState<AmFreelanceFormsDraft>(defaultAmFreelanceDraft);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    setStack(initialScreen === "menu" ? ["menu"] : ["menu", initialScreen]);
  }, [initialScreen]);

  useEffect(() => {
    let cancelled = false;
    void loadAmFreelanceDraft().then((d) => {
      if (cancelled) return;
      setDraft(d);
      setDraftHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!draftHydrated) return;
    const tm = setTimeout(() => void saveAmFreelanceDraft(draft), 400);
    return () => clearTimeout(tm);
  }, [draft, draftHydrated]);

  const screen = stack[stack.length - 1];

  const pushScreen = useCallback((s: FreelanceScreen) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    if (s === "menu") {
      setStack(["menu"]);
      return;
    }
    setStack((prev) => {
      if (prev[prev.length - 1] === s) return prev;
      return [...prev, s];
    });
  }, []);

  const popScreen = useCallback(() => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setStack((prev) => (prev.length > 1 ? prev.slice(0, -1) : prev));
  }, []);

  return (
    <AmFreelanceDraftContext.Provider value={{ draft, setDraft }}>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={styles.scrollPad}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {screen !== "menu" ? (
          <TouchableOpacity
            onPress={popScreen}
            style={[styles.backRow, { borderColor }]}
            accessibilityRole="button"
          >
            <Ionicons name="chevron-back" size={22} color={primaryColor} />
            <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
              {t("amFreelance.back")}
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {screen === "menu" ? (
          <MenuView
            t={t}
            pushScreen={pushScreen}
            primaryColor={primaryColor}
            surfaceColor={surfaceColor}
            surfaceSecondaryColor={surfaceSecondaryColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
            onShareableMessageChange={onShareableMessageChange}
          />
        ) : null}

      {screen === "soleProp" ? (
        <SolePropView
          t={t}
          locale={language === "hy" ? "hy-AM" : "en-US"}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}

      {screen === "turnover" ? (
        <TurnoverTaxView
          t={t}
          locale={language === "hy" ? "hy-AM" : "en-US"}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}

      {screen === "profitTax" ? (
        <ProfitTaxView
          t={t}
          locale={language === "hy" ? "hy-AM" : "en-US"}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}

      {screen === "vat" ? (
        <VatView
          t={t}
          locale={language === "hy" ? "hy-AM" : "en-US"}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}

        <ThemedText type="caption" style={[styles.disclaimer, { color: textSecondaryColor }]}>
          {t("amFreelance.disclaimer")}
        </ThemedText>
      </ScrollView>
    </AmFreelanceDraftContext.Provider>
  );
}

function MenuView(props: {
  t: (k: string) => string;
  pushScreen: (s: FreelanceScreen) => void;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const {
    t,
    pushScreen,
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  useEffect(() => {
    onShareableMessageChange?.(
      [
        t("amFreelance.sectionTitle"),
        `• ${t("amFreelance.card.soleProp")}`,
        `• ${t("amFreelance.card.turnover")}`,
        `• ${t("amFreelance.card.profitTax")}`,
        `• ${t("amFreelance.card.vat")}`,
      ].join("\n")
    );
  }, [t, onShareableMessageChange]);

  const cards: {
    id: FreelanceScreen;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    desc: string;
  }[] = [
    {
      id: "soleProp",
      icon: "person-outline",
      title: t("amFreelance.card.soleProp"),
      desc: t("amFreelance.card.soleProp.desc"),
    },
    {
      id: "turnover",
      icon: "repeat-outline",
      title: t("amFreelance.card.turnover"),
      desc: t("amFreelance.card.turnover.desc"),
    },
    {
      id: "profitTax",
      icon: "pie-chart-outline",
      title: t("amFreelance.card.profitTax"),
      desc: t("amFreelance.card.profitTax.desc"),
    },
    {
      id: "vat",
      icon: "receipt-outline",
      title: t("amFreelance.card.vat"),
      desc: t("amFreelance.card.vat.desc"),
    },
  ];

  return (
    <View>
      <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={[styles.heroIcon, { backgroundColor: surfaceSecondaryColor }]}>
          <Ionicons name="briefcase-outline" size={26} color={primaryColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={3}
            ellipsizeMode="tail"
            style={[styles.heroTitle, { color: textColor }]}
          >
            {t("amFreelance.sectionTitle")}
          </ThemedText>
          <ThemedText type="caption" style={{ color: textSecondaryColor, marginTop: 4 }}>
            {t("amFreelance.menu.subtitle")}
          </ThemedText>
        </View>
      </View>

      {cards.map((c) => (
        <TouchableOpacity
          key={c.id}
          activeOpacity={0.88}
          onPress={() => pushScreen(c.id)}
          style={[
            styles.menuCard,
            { backgroundColor: surfaceSecondaryColor, borderColor },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: surfaceColor }]}>
            <Ionicons name={c.icon} size={24} color={primaryColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText type="defaultSemiBold" numberOfLines={2} style={{ color: textColor }}>
              {c.title}
            </ThemedText>
            <ThemedText type="caption" numberOfLines={2} style={{ color: textSecondaryColor, marginTop: 2 }}>
              {c.desc}
            </ThemedText>
          </View>
          <Ionicons name="chevron-forward" size={20} color={textSecondaryColor} />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function Segment({
  left,
  right,
  leftActive,
  onLeft,
  onRight,
  borderColor,
  surfaceColor,
  primaryColor,
  textSecondaryColor,
}: {
  left: string;
  right: string;
  leftActive: boolean;
  onLeft: () => void;
  onRight: () => void;
  borderColor: string;
  surfaceColor: string;
  primaryColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={[styles.segment, { borderColor, backgroundColor: surfaceColor }]}>
      <TouchableOpacity
        style={[styles.segmentBtn, leftActive && { backgroundColor: hexToRgba(primaryColor, 0.2) }]}
        onPress={onLeft}
      >
        <ThemedText type="caption" style={{ fontWeight: "700", color: leftActive ? primaryColor : textSecondaryColor }}>
          {left}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.segmentBtn, !leftActive && { backgroundColor: hexToRgba(primaryColor, 0.2) }]}
        onPress={onRight}
      >
        <ThemedText type="caption" style={{ fontWeight: "700", color: !leftActive ? primaryColor : textSecondaryColor }}>
          {right}
        </ThemedText>
      </TouchableOpacity>
    </View>
  );
}

function Field({
  label,
  value,
  onChangeText,
  keyboardType,
  placeholder,
  borderColor,
  surfaceColor,
  textColor,
  textSecondaryColor,
  numberGrouping,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  keyboardType?: "decimal-pad" | "default";
  placeholder?: string;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
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
    <View style={{ marginBottom: 14 }}>
      <ThemedText type="caption" style={[styles.fieldLabel, { color: textSecondaryColor, marginBottom: 6 }]}>
        {label}
      </ThemedText>
      <TextInput
        value={displayValue}
        onChangeText={handleChange}
        keyboardType={keyboardType ?? "decimal-pad"}
        placeholder={placeholder ?? "0"}
        placeholderTextColor={textSecondaryColor}
        style={[styles.input, { borderColor, backgroundColor: surfaceColor, color: textColor }]}
      />
    </View>
  );
}

function RowKV({
  label,
  value,
  textColor,
  textSecondaryColor,
}: {
  label: string;
  value: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={styles.rowBetween}>
      <ThemedText style={[styles.rowKVLabel, { color: textSecondaryColor }]} numberOfLines={3}>
        {label}
      </ThemedText>
      <ThemedText type="defaultSemiBold" style={[styles.rowKVValue, { color: textColor }]} numberOfLines={2}>
        {value}
      </ThemedText>
    </View>
  );
}

function SolePropView(props: {
  t: (k: string) => string;
  locale: string;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const {
    t,
    locale,
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  const { draft, setDraft } = useAmFreelanceDraft();
  const { incomeStr, expensesStr, regimeId, incomeIsGross } = draft.soleProp;

  const result = useMemo(() => {
    const income = parseNum(incomeStr);
    const exp = parseNum(expensesStr) ?? 0;
    if (income === null || income < 0 || exp < 0) return null;
    return calculateSoleProprietorTax({
      monthlyIncome: income,
      monthlyExpenses: exp,
      regimeId,
      incomeIsGross,
    });
  }, [incomeStr, expensesStr, regimeId, incomeIsGross]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("amFreelance.card.soleProp"),
        `${t("amFreelance.soleProp.estimatedTax")}: ${formatMoney(locale, result.monthly.estimatedTax, "AMD")}`,
        `${t("amFreelance.soleProp.netAfter")}: ${formatMoney(locale, result.monthly.netAfterTaxAndExpenses, "AMD")}`,
      ].join("\n")
    );
  }, [result, t, locale, onShareableMessageChange]);

  const regimeButtons = (Object.keys(AM_FREELANCE_TAX_CONSTANTS.SOLE_PROPRIETOR_REGIMES) as SoleProprietorRegimeId[])
    .map((id) => ({
      id,
      labelKey: AM_FREELANCE_TAX_CONSTANTS.SOLE_PROPRIETOR_REGIMES[id].labelKey,
      rate: AM_FREELANCE_TAX_CONSTANTS.SOLE_PROPRIETOR_REGIMES[id].taxRate,
    }));

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor }]}>
        {t("amFreelance.card.soleProp")}
      </ThemedText>

      <TouchableOpacity
        onPress={() =>
          setDraft((d) => ({
            ...d,
            soleProp: { ...d.soleProp, incomeStr: "", expensesStr: "" },
          }))
        }
        style={[styles.clearAllRow, { borderColor }]}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
          {t("amFreelance.clearAllFields")}
        </ThemedText>
      </TouchableOpacity>

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
        {t("amFreelance.soleProp.regime")}
      </ThemedText>
      <View style={styles.pillsRow}>
        {regimeButtons.map((r) => {
          const active = r.id === regimeId;
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() =>
                setDraft((d) => ({ ...d, soleProp: { ...d.soleProp, regimeId: r.id } }))
              }
              style={[
                styles.pill,
                {
                  borderColor: active ? primaryColor : borderColor,
                  backgroundColor: active ? hexToRgba(primaryColor, 0.14) : surfaceColor,
                },
              ]}
            >
              <ThemedText type="caption" style={{ fontWeight: "700", color: active ? primaryColor : textSecondaryColor }}>
                {t(r.labelKey)}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <Segment
        left={t("amFreelance.common.gross")}
        right={t("amFreelance.common.net")}
        leftActive={incomeIsGross}
        onLeft={() =>
          setDraft((d) => ({ ...d, soleProp: { ...d.soleProp, incomeIsGross: true } }))
        }
        onRight={() =>
          setDraft((d) => ({ ...d, soleProp: { ...d.soleProp, incomeIsGross: false } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        primaryColor={primaryColor}
        textSecondaryColor={textSecondaryColor}
      />

      <Field
        label={t("amFreelance.common.monthlyIncome")}
        value={incomeStr}
        onChangeText={(incomeStr) =>
          setDraft((d) => ({ ...d, soleProp: { ...d.soleProp, incomeStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />
      <Field
        label={t("amFreelance.common.monthlyExpenses")}
        value={expensesStr}
        onChangeText={(expensesStr) =>
          setDraft((d) => ({ ...d, soleProp: { ...d.soleProp, expensesStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />

      {result ? (
        <>
          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 4 }}>
            {t("amFreelance.soleProp.monthlyTotals")}
          </ThemedText>
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.soleProp.taxableBase")}
              value={formatMoney(locale, result.monthly.taxableBase, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.soleProp.estimatedTax")}
              value={formatMoney(locale, result.monthly.estimatedTax, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.soleProp.netAfter")}
              value={formatMoney(locale, result.monthly.netAfterTaxAndExpenses, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>

          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 16 }}>
            {t("amFreelance.soleProp.yearlyTotals")}
          </ThemedText>
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.soleProp.estimatedTax")}
              value={formatMoney(locale, result.yearly.estimatedTax, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.soleProp.netAfter")}
              value={formatMoney(locale, result.yearly.netAfterTaxAndExpenses, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>

          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 16 }]}
            onPress={() =>
              void shareLines([
                t("amFreelance.card.soleProp"),
                `${t("amFreelance.soleProp.estimatedTax")}: ${formatMoney(locale, result.monthly.estimatedTax, "AMD")}`,
                `${t("amFreelance.soleProp.netAfter")}: ${formatMoney(locale, result.monthly.netAfterTaxAndExpenses, "AMD")}`,
              ])
            }
          >
            <Ionicons name="share-outline" size={20} color={primaryColor} />
            <ThemedText style={[styles.shareRowLabel, { color: primaryColor, fontWeight: "600" }]}>
              {t("amFinance.shareSummary")}
            </ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFreelance.common.invalid")}</ThemedText>
      )}
    </View>
  );
}

function TurnoverTaxView(props: {
  t: (k: string) => string;
  locale: string;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const {
    t,
    locale,
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  const { draft, setDraft } = useAmFreelanceDraft();
  const { revenueStr, expensesStr, rateStr } = draft.turnover;

  const rate = useMemo(() => {
    const p = parseNum(rateStr);
    if (p === null) return null;
    return p / 100;
  }, [rateStr]);

  const result = useMemo(() => {
    const revenue = parseNum(revenueStr);
    const expenses = parseNum(expensesStr) ?? 0;
    if (revenue === null || revenue < 0 || expenses < 0 || rate === null) return null;
    return calculateTurnoverTax({ revenue, expenses, taxRate: rate });
  }, [revenueStr, expensesStr, rate]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("amFreelance.card.turnover"),
        `${t("amFreelance.turnover.taxAmount")}: ${formatMoney(locale, result.taxAmount, "AMD")}`,
        `${t("amFreelance.turnover.remainingProfit")}: ${formatMoney(locale, result.remainingProfit, "AMD")}`,
      ].join("\n")
    );
  }, [result, t, locale, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor }]}>
        {t("amFreelance.card.turnover")}
      </ThemedText>

      <TouchableOpacity
        onPress={() =>
          setDraft((d) => ({
            ...d,
            turnover: { ...d.turnover, revenueStr: "", expensesStr: "", rateStr: "" },
          }))
        }
        style={[styles.clearAllRow, { borderColor }]}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
          {t("amFreelance.clearAllFields")}
        </ThemedText>
      </TouchableOpacity>

      <Field
        label={t("amFreelance.common.revenue")}
        value={revenueStr}
        onChangeText={(revenueStr) =>
          setDraft((d) => ({ ...d, turnover: { ...d.turnover, revenueStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />
      <Field
        label={t("amFreelance.common.monthlyExpenses")}
        value={expensesStr}
        onChangeText={(expensesStr) =>
          setDraft((d) => ({ ...d, turnover: { ...d.turnover, expensesStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 6 }}>
        {t("amFreelance.common.taxRate")}
      </ThemedText>
      <View style={styles.pillsRow}>
        {AM_FREELANCE_TAX_CONSTANTS.TURNOVER_TAX_PRESETS.map((p) => (
          <TouchableOpacity
            key={p.labelKey}
            style={[styles.pill, { borderColor, backgroundColor: surfaceColor }]}
            onPress={() =>
              setDraft((d) => ({
                ...d,
                turnover: { ...d.turnover, rateStr: String(p.rate * 100) },
              }))
            }
          >
            <ThemedText type="caption" style={{ fontWeight: "700", color: textSecondaryColor }}>
              {t(p.labelKey)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={canonicalDecimalToDisplay(rateStr)}
        onChangeText={(text) =>
          setDraft((d) => ({
            ...d,
            turnover: { ...d.turnover, rateStr: displayDecimalToCanonical(text) },
          }))
        }
        keyboardType="decimal-pad"
        placeholder="0"
        placeholderTextColor={textSecondaryColor}
        style={[styles.input, { borderColor, backgroundColor: surfaceColor, color: textColor, marginBottom: 14 }]}
      />

      {result ? (
        <>
          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 4 }}>
            {t("amFreelance.common.results")}
          </ThemedText>
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.turnover.taxAmount")}
              value={formatMoney(locale, result.taxAmount, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.turnover.remainingProfit")}
              value={formatMoney(locale, result.remainingProfit, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.turnover.effectiveRate")}
              value={`${formatGroupedNumber(result.effectiveRate * 100, 2)}%`}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>
        </>
      ) : (
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFreelance.common.invalid")}</ThemedText>
      )}
    </View>
  );
}

function ProfitTaxView(props: {
  t: (k: string) => string;
  locale: string;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const {
    t,
    locale,
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  const { draft, setDraft } = useAmFreelanceDraft();
  const { revenueStr, expensesStr } = draft.profitTax;

  const result = useMemo(() => {
    const revenue = parseNum(revenueStr);
    const expenses = parseNum(expensesStr);
    if (revenue === null || expenses === null || revenue < 0 || expenses < 0) return null;
    return calculateProfitTax({ revenue, expenses });
  }, [revenueStr, expensesStr]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("amFreelance.card.profitTax"),
        `${t("amFreelance.profitTax.profit")}: ${formatMoney(locale, result.profit, "AMD")}`,
        `${t("amFreelance.profitTax.tax")}: ${formatMoney(locale, result.estimatedProfitTax, "AMD")}`,
      ].join("\n")
    );
  }, [result, t, locale, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor }]}>
        {t("amFreelance.card.profitTax")}
      </ThemedText>

      <TouchableOpacity
        onPress={() =>
          setDraft((d) => ({
            ...d,
            profitTax: { ...d.profitTax, revenueStr: "", expensesStr: "" },
          }))
        }
        style={[styles.clearAllRow, { borderColor }]}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
          {t("amFreelance.clearAllFields")}
        </ThemedText>
      </TouchableOpacity>

      <Field
        label={t("amFreelance.common.revenue")}
        value={revenueStr}
        onChangeText={(revenueStr) =>
          setDraft((d) => ({ ...d, profitTax: { ...d.profitTax, revenueStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />
      <Field
        label={t("amFreelance.common.expenses")}
        value={expensesStr}
        onChangeText={(expensesStr) =>
          setDraft((d) => ({ ...d, profitTax: { ...d.profitTax, expensesStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />

      {result ? (
        <>
          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 4 }}>
            {t("amFreelance.common.results")}
          </ThemedText>
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.profitTax.profit")}
              value={formatMoney(locale, result.profit, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.profitTax.tax")}
              value={formatMoney(locale, result.estimatedProfitTax, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.profitTax.netRemaining")}
              value={formatMoney(locale, result.netRemaining, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>

          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 16 }]}
            onPress={() =>
              void shareLines([
                t("amFreelance.card.profitTax"),
                `${t("amFreelance.profitTax.profit")}: ${formatMoney(locale, result.profit, "AMD")}`,
                `${t("amFreelance.profitTax.tax")}: ${formatMoney(locale, result.estimatedProfitTax, "AMD")}`,
                `${t("amFreelance.profitTax.netRemaining")}: ${formatMoney(locale, result.netRemaining, "AMD")}`,
              ])
            }
          >
            <Ionicons name="share-outline" size={20} color={primaryColor} />
            <ThemedText style={[styles.shareRowLabel, { color: primaryColor, fontWeight: "600" }]}>
              {t("amFinance.shareSummary")}
            </ThemedText>
          </TouchableOpacity>
        </>
      ) : (
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFreelance.common.invalid")}</ThemedText>
      )}
    </View>
  );
}

function VatView(props: {
  t: (k: string) => string;
  locale: string;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const {
    t,
    locale,
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  const { draft, setDraft } = useAmFreelanceDraft();
  const { amountStr, mode } = draft.vat;

  const result = useMemo(() => {
    const amt = parseNum(amountStr);
    if (amt === null || amt < 0) return null;
    return calculateVat({ amount: amt, mode });
  }, [amountStr, mode]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("amFreelance.card.vat"),
        `${t("amFreelance.vat.original")}: ${formatMoney(locale, result.originalAmount, "AMD")}`,
        `${t("amFreelance.vat.vatAmount")}: ${formatMoney(locale, result.vatAmount, "AMD")}`,
        `${t("amFreelance.vat.final")}: ${formatMoney(locale, result.finalAmount, "AMD")}`,
      ].join("\n")
    );
  }, [result, t, locale, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor }]}>
        {t("amFreelance.card.vat")}
      </ThemedText>

      <TouchableOpacity
        onPress={() => setDraft((d) => ({ ...d, vat: { ...d.vat, amountStr: "" } }))}
        style={[styles.clearAllRow, { borderColor }]}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
          {t("amFreelance.clearAllFields")}
        </ThemedText>
      </TouchableOpacity>

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
        {t("amFreelance.vat.mode")}
      </ThemedText>
      <Segment
        left={t("amFreelance.vat.includes")}
        right={t("amFreelance.vat.excludes")}
        leftActive={mode === "includesVat"}
        onLeft={() =>
          setDraft((d) => ({ ...d, vat: { ...d.vat, mode: "includesVat" } }))
        }
        onRight={() =>
          setDraft((d) => ({ ...d, vat: { ...d.vat, mode: "excludesVat" } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        primaryColor={primaryColor}
        textSecondaryColor={textSecondaryColor}
      />

      <Field
        label={mode === "includesVat" ? t("amFreelance.vat.final") : t("amFreelance.vat.original")}
        value={amountStr}
        onChangeText={(amountStr) =>
          setDraft((d) => ({ ...d, vat: { ...d.vat, amountStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="decimal"
      />

      {result ? (
        <>
          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 4 }}>
            {t("amFreelance.common.results")}
          </ThemedText>
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.vat.original")}
              value={formatMoney(locale, result.originalAmount, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.vat.vatAmount")}
              value={formatMoney(locale, result.vatAmount, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.vat.final")}
              value={formatMoney(locale, result.finalAmount, "AMD")}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>
        </>
      ) : (
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFreelance.common.invalid")}</ThemedText>
      )}
    </View>
  );
}
const styles = StyleSheet.create({
  scrollPad: {
    paddingHorizontal: 18,
    paddingBottom: 32,
    paddingTop: 8,
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 14,
    alignSelf: "flex-start",
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
  disclaimer: {
    marginTop: 24,
    lineHeight: 18,
    flexShrink: 1,
  },
  heroCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 16,
    overflow: "hidden",
  },
  heroIcon: {
    flexShrink: 0,
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  heroTitle: {
    fontSize: 18,
    letterSpacing: -0.2,
  },
  menuCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 18,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
  },
  menuIcon: {
    flexShrink: 0,
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
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
  fieldLabel: {
    flexShrink: 1,
  },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: Platform.OS === "ios" ? 14 : 12,
    fontSize: 16,
  },
  segment: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  segmentBtn: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: "center",
    justifyContent: "center",
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
  pillsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginBottom: 14,
  },
  pill: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
    marginBottom: 14,
  },
  toggle: {
    width: 44,
    height: 26,
    borderRadius: 999,
    borderWidth: 1,
    padding: 3,
    justifyContent: "center",
  },
  toggleKnob: {
    width: 18,
    height: 18,
    borderRadius: 999,
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
});


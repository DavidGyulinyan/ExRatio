import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
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
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import { LineChart } from "react-native-chart-kit";

import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
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
  computeInvoiceTotals,
  defaultInvoiceNumber,
  invoiceHtmlTemplate,
  loadInvoices,
  deleteInvoice,
  makeInvoiceId,
  upsertInvoice,
  type Invoice,
  type InvoiceCurrency,
} from "@/lib/invoices";
import { formatDateDDMMYY } from "@/lib/dateFormat";
import {
  disableMonthlyFinanceReminder,
  enableMonthlyFinanceReminder,
  isMonthlyFinanceReminderEnabled,
} from "@/lib/freelanceReminders";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type FreelanceScreen =
  | "menu"
  | "soleProp"
  | "turnover"
  | "profitTax"
  | "vat"
  | "invoice"
  | "dashboard"
  | "reminders";

function parseNum(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function formatMoney(locale: string, value: number, currency: string): string {
  if (!Number.isFinite(value)) return "—";
  const nf = new Intl.NumberFormat(locale, { maximumFractionDigits: 2 });
  return `${nf.format(value)} ${currency}`;
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
  const { effectiveTheme } = useTheme();
  const primaryColor = useThemeColor({}, "primary");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");

  const [screen, setScreen] = useState<FreelanceScreen>(initialScreen);

  useEffect(() => setScreen(initialScreen), [initialScreen]);

  const go = useCallback((s: FreelanceScreen) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setScreen(s);
  }, []);

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={styles.scrollPad}
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
    >
      {screen !== "menu" ? (
        <TouchableOpacity
          onPress={() => go("menu")}
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
          go={go}
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

      {screen === "invoice" ? (
        <InvoiceView
          t={t}
          locale={language === "hy" ? "hy-AM" : "en-US"}
          theme={effectiveTheme}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}

      {screen === "dashboard" ? (
        <DashboardView
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

      {screen === "reminders" ? (
        <RemindersView
          t={t}
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
  );
}

function MenuView(props: {
  t: (k: string) => string;
  go: (s: FreelanceScreen) => void;
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
    go,
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
        `• ${t("amFreelance.card.invoice")}`,
        `• ${t("amFreelance.card.dashboard")}`,
        `• ${t("amFreelance.card.reminders")}`,
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
    {
      id: "invoice",
      icon: "document-text-outline",
      title: t("amFreelance.card.invoice"),
      desc: t("amFreelance.card.invoice.desc"),
    },
    {
      id: "dashboard",
      icon: "grid-outline",
      title: t("amFreelance.card.dashboard"),
      desc: t("amFreelance.card.dashboard.desc"),
    },
    {
      id: "reminders",
      icon: "notifications-outline",
      title: t("amFreelance.card.reminders"),
      desc: t("amFreelance.card.reminders.desc"),
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
          onPress={() => go(c.id)}
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
  borderColor,
  surfaceColor,
  textColor,
  textSecondaryColor,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <ThemedText type="caption" style={[styles.fieldLabel, { color: textSecondaryColor, marginBottom: 6 }]}>
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
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

  const [incomeStr, setIncomeStr] = useState("1000000");
  const [expensesStr, setExpensesStr] = useState("0");
  const [regimeId, setRegimeId] = useState<SoleProprietorRegimeId>("turnover_5");
  const [incomeIsGross, setIncomeIsGross] = useState(true);

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

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
        {t("amFreelance.soleProp.regime")}
      </ThemedText>
      <View style={styles.pillsRow}>
        {regimeButtons.map((r) => {
          const active = r.id === regimeId;
          return (
            <TouchableOpacity
              key={r.id}
              onPress={() => setRegimeId(r.id)}
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
        onLeft={() => setIncomeIsGross(true)}
        onRight={() => setIncomeIsGross(false)}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        primaryColor={primaryColor}
        textSecondaryColor={textSecondaryColor}
      />

      <Field
        label={t("amFreelance.common.monthlyIncome")}
        value={incomeStr}
        onChangeText={setIncomeStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.common.monthlyExpenses")}
        value={expensesStr}
        onChangeText={setExpensesStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
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

  const [revenueStr, setRevenueStr] = useState("1000000");
  const [expensesStr, setExpensesStr] = useState("0");
  const [rateStr, setRateStr] = useState("5");

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

      <Field
        label={t("amFreelance.common.revenue")}
        value={revenueStr}
        onChangeText={setRevenueStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.common.monthlyExpenses")}
        value={expensesStr}
        onChangeText={setExpensesStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 6 }}>
        {t("amFreelance.common.taxRate")}
      </ThemedText>
      <View style={styles.pillsRow}>
        {AM_FREELANCE_TAX_CONSTANTS.TURNOVER_TAX_PRESETS.map((p) => (
          <TouchableOpacity
            key={p.labelKey}
            style={[styles.pill, { borderColor, backgroundColor: surfaceColor }]}
            onPress={() => setRateStr(String(p.rate * 100))}
          >
            <ThemedText type="caption" style={{ fontWeight: "700", color: textSecondaryColor }}>
              {t(p.labelKey)}
            </ThemedText>
          </TouchableOpacity>
        ))}
      </View>
      <TextInput
        value={rateStr}
        onChangeText={setRateStr}
        keyboardType="decimal-pad"
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
              value={`${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(result.effectiveRate * 100)}%`}
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

  const [revenueStr, setRevenueStr] = useState("2000000");
  const [expensesStr, setExpensesStr] = useState("1000000");

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

      <Field
        label={t("amFreelance.common.revenue")}
        value={revenueStr}
        onChangeText={setRevenueStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.common.expenses")}
        value={expensesStr}
        onChangeText={setExpensesStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
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

  const [amountStr, setAmountStr] = useState("120000");
  const [mode, setMode] = useState<VatMode>("includesVat");

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

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
        {t("amFreelance.vat.mode")}
      </ThemedText>
      <Segment
        left={t("amFreelance.vat.includes")}
        right={t("amFreelance.vat.excludes")}
        leftActive={mode === "includesVat"}
        onLeft={() => setMode("includesVat")}
        onRight={() => setMode("excludesVat")}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        primaryColor={primaryColor}
        textSecondaryColor={textSecondaryColor}
      />

      <Field
        label={mode === "includesVat" ? t("amFreelance.vat.final") : t("amFreelance.vat.original")}
        value={amountStr}
        onChangeText={setAmountStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
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

function InvoiceView(props: {
  t: (k: string) => string;
  locale: string;
  theme: "light" | "dark";
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
    theme,
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  const [sellerName, setSellerName] = useState("Your name / Studio");
  const [clientName, setClientName] = useState("Client");
  const [serviceDescription, setServiceDescription] = useState("Design services");
  const [amountStr, setAmountStr] = useState("1000");
  const [currency, setCurrency] = useState<InvoiceCurrency>("USD");
  const [vatOn, setVatOn] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState(defaultInvoiceNumber());
  const [draftId, setDraftId] = useState(makeInvoiceId());
  const [savedInvoices, setSavedInvoices] = useState<Invoice[]>([]);
  const [saving, setSaving] = useState(false);

  const refreshSavedInvoices = useCallback(async () => {
    const list = await loadInvoices();
    setSavedInvoices(list);
  }, []);

  useEffect(() => {
    void refreshSavedInvoices();
  }, [refreshSavedInvoices]);

  const amount = useMemo(() => parseNum(amountStr), [amountStr]);

  const invoiceDraft: Invoice | null = useMemo(() => {
    if (amount === null || amount < 0) return null;
    const now = new Date().toISOString();
    return {
      id: draftId,
      invoiceNumber: invoiceNumber || defaultInvoiceNumber(),
      invoiceDateISO: now,
      sellerName,
      clientName,
      serviceDescription,
      currency,
      amount,
      tax: vatOn
        ? { label: "VAT / ԱԱՀ", rate: AM_FREELANCE_TAX_CONSTANTS.VAT_RATE, includedInPrice: false }
        : undefined,
      createdAtISO: now,
      updatedAtISO: now,
      status: "draft",
    };
  }, [amount, sellerName, clientName, serviceDescription, currency, vatOn, invoiceNumber, draftId]);

  const totals = useMemo(
    () => (invoiceDraft ? computeInvoiceTotals(invoiceDraft) : null),
    [invoiceDraft]
  );

  const previewHtml = useMemo(() => {
    if (!invoiceDraft) return null;
    return invoiceHtmlTemplate({
      invoice: invoiceDraft,
      locale,
      theme,
    });
  }, [invoiceDraft, locale, theme]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!invoiceDraft || !totals) return onShareableMessageChange(null);
    onShareableMessageChange(
      [
        t("amFreelance.invoice.title"),
        `${invoiceDraft.invoiceNumber}`,
        `${formatMoney(locale, totals.total, invoiceDraft.currency)}`,
      ].join("\n")
    );
  }, [invoiceDraft, totals, t, locale, onShareableMessageChange]);

  const currencies: InvoiceCurrency[] = ["AMD", "USD", "EUR", "RUB", "GEL"];

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor }]}>
        {t("amFreelance.card.invoice")}
      </ThemedText>

      <Field
        label={t("amFreelance.invoice.invoiceNumber")}
        value={invoiceNumber}
        onChangeText={setInvoiceNumber}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.invoice.sellerName")}
        value={sellerName}
        onChangeText={setSellerName}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.invoice.clientName")}
        value={clientName}
        onChangeText={setClientName}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.invoice.serviceDescription")}
        value={serviceDescription}
        onChangeText={setServiceDescription}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFreelance.invoice.amount")}
        value={amountStr}
        onChangeText={setAmountStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 6 }}>
        {t("amFreelance.invoice.currency")}
      </ThemedText>
      <View style={styles.pillsRow}>
        {currencies.map((c) => {
          const active = c === currency;
          return (
            <TouchableOpacity
              key={c}
              onPress={() => setCurrency(c)}
              style={[
                styles.pill,
                {
                  borderColor: active ? primaryColor : borderColor,
                  backgroundColor: active ? hexToRgba(primaryColor, 0.14) : surfaceColor,
                },
              ]}
            >
              <ThemedText type="caption" style={{ fontWeight: "800", color: active ? primaryColor : textSecondaryColor }}>
                {c}
              </ThemedText>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.switchRow}>
        <ThemedText style={{ color: textColor, flex: 1 }}>{t("amFreelance.invoice.vatToggle")}</ThemedText>
        <TouchableOpacity
          onPress={() => setVatOn((v) => !v)}
          style={[
            styles.toggle,
            {
              backgroundColor: vatOn ? hexToRgba(primaryColor, 0.25) : hexToRgba(borderColor, 0.14),
              borderColor: vatOn ? primaryColor : borderColor,
            },
          ]}
        >
          <View
            style={[
              styles.toggleKnob,
              {
                backgroundColor: vatOn ? primaryColor : textSecondaryColor,
                transform: [{ translateX: vatOn ? 16 : 0 }],
              },
            ]}
          />
        </TouchableOpacity>
      </View>

      {invoiceDraft && totals ? (
        <>
          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 6 }}>
            {t("amFreelance.common.results")}
          </ThemedText>
          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.invoice.subtotal")}
              value={formatMoney(locale, totals.subtotal, invoiceDraft.currency)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            {invoiceDraft.tax?.rate ? (
              <RowKV
                label={`${invoiceDraft.tax.label} (${new Intl.NumberFormat(locale, { maximumFractionDigits: 2 }).format(
                  invoiceDraft.tax.rate * 100
                )}%)`}
                value={formatMoney(locale, totals.taxAmount, invoiceDraft.currency)}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
              />
            ) : null}
            <RowKV
              label={t("amFreelance.invoice.total")}
              value={formatMoney(locale, totals.total, invoiceDraft.currency)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>

          <View style={styles.invoiceActions}>
            <TouchableOpacity
              style={[styles.actionBtn, { borderColor, backgroundColor: surfaceColor }]}
              onPress={() => {
                if (!invoiceDraft) return;
                void (async () => {
                  try {
                    setSaving(true);
                    await upsertInvoice({
                      ...invoiceDraft,
                      status: "draft",
                      updatedAtISO: new Date().toISOString(),
                    });
                    await refreshSavedInvoices();
                    setDraftId(makeInvoiceId());
                  } finally {
                    setSaving(false);
                  }
                })();
              }}
            >
              <Ionicons name="save-outline" size={18} color={primaryColor} />
              <ThemedText style={{ color: primaryColor, fontWeight: "700" }}>
                {saving ? t("amFreelance.invoice.saving") : t("amFreelance.invoice.save")}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor, backgroundColor: surfaceColor }]}
              onPress={() => {
                if (!previewHtml || !invoiceDraft) return;
                void shareLines([
                  `${t("amFreelance.invoice.title")} #${invoiceDraft.invoiceNumber}`,
                  `${formatMoney(locale, totals.total, invoiceDraft.currency)}`,
                ]);
              }}
            >
              <Ionicons name="share-outline" size={18} color={primaryColor} />
              <ThemedText style={{ color: primaryColor, fontWeight: "700" }}>{t("amFreelance.invoice.share")}</ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionBtn, { borderColor, backgroundColor: surfaceColor }]}
              onPress={() => {
                if (!previewHtml || !invoiceDraft) return;
                void (async () => {
                  try {
                    if (!(await Sharing.isAvailableAsync())) {
                      Alert.alert(
                        t("amFreelance.invoice.sharingUnavailableTitle"),
                        t("amFreelance.invoice.sharingUnavailableBody")
                      );
                      return;
                    }
                    const { uri } = await Print.printToFileAsync({
                      html: previewHtml,
                      base64: false,
                    });
                    await Sharing.shareAsync(uri, {
                      UTI: "com.adobe.pdf",
                      mimeType: "application/pdf",
                      dialogTitle: `Invoice ${invoiceDraft.invoiceNumber}`,
                    });
                  } catch (e: any) {
                    Alert.alert(
                      t("amFreelance.invoice.exportFailedTitle"),
                      e?.message ?? t("amFreelance.invoice.exportFailedBody")
                    );
                  }
                })();
              }}
            >
              <Ionicons name="download-outline" size={18} color={primaryColor} />
              <ThemedText style={{ color: primaryColor, fontWeight: "700" }}>
                {t("amFreelance.invoice.exportPdf")}
              </ThemedText>
            </TouchableOpacity>
          </View>

          <ThemedText type="caption" style={{ color: textSecondaryColor, marginTop: 10 }}>
            {t("amFreelance.invoice.preview")}
          </ThemedText>
          <ThemedText
            type="caption"
            style={{ color: textSecondaryColor, marginTop: 6 }}
            numberOfLines={6}
          >
            {previewHtml ? previewHtml.replaceAll(/\s+/g, " ").slice(0, 240) + "…" : "—"}
          </ThemedText>

          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 18 }}>
            {t("amFreelance.invoice.savedInvoices")}
          </ThemedText>
          {savedInvoices.length === 0 ? (
            <ThemedText style={{ color: textSecondaryColor, marginTop: 8 }}>
              {t("amFreelance.invoice.noSavedInvoices")}
            </ThemedText>
          ) : (
            <View style={{ gap: 10, marginTop: 10 }}>
              {savedInvoices.slice(0, 8).map((inv) => {
                const invTotals = computeInvoiceTotals(inv);
                return (
                  <View
                    key={inv.id}
                    style={{
                      borderWidth: 1,
                      borderColor,
                      borderRadius: 16,
                      padding: 12,
                      backgroundColor: surfaceColor,
                    }}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", gap: 12 }}>
                      <View style={{ flex: 1, minWidth: 0 }}>
                        <ThemedText type="defaultSemiBold" numberOfLines={1} style={{ color: textColor }}>
                          #{inv.invoiceNumber} • {inv.clientName || "Client"}
                        </ThemedText>
                        <ThemedText type="caption" numberOfLines={2} style={{ color: textSecondaryColor, marginTop: 2 }}>
                          {formatDateDDMMYY(inv.invoiceDateISO)} • {inv.status}
                        </ThemedText>
                      </View>
                      <View style={{ alignItems: "flex-end" }}>
                        <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
                          {formatMoney(locale, invTotals.total, inv.currency)}
                        </ThemedText>
                        <TouchableOpacity
                          onPress={() => {
                            void (async () => {
                              await deleteInvoice(inv.id);
                              await refreshSavedInvoices();
                            })();
                          }}
                          style={{
                            marginTop: 6,
                            paddingVertical: 6,
                            paddingHorizontal: 10,
                            borderRadius: 12,
                            borderWidth: 1,
                            borderColor: hexToRgba(borderColor, 0.7),
                          }}
                        >
                          <ThemedText type="caption" style={{ color: textSecondaryColor, fontWeight: "700" }}>
                            {t("amFreelance.invoice.delete")}
                          </ThemedText>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })}
              {savedInvoices.length > 8 ? (
                <ThemedText type="caption" style={{ color: textSecondaryColor }}>
                  {t("amFreelance.invoice.showingSome")
                    .replace("{shown}", "8")
                    .replace("{total}", String(savedInvoices.length))}
                </ThemedText>
              ) : null}
            </View>
          )}
        </>
      ) : (
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFreelance.common.invalid")}</ThemedText>
      )}
    </View>
  );
}

function DashboardView(props: {
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

  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [chartW, setChartW] = useState(0);
  const [selectedCurrency, setSelectedCurrency] = useState<InvoiceCurrency>("USD");

  const refresh = useCallback(async () => {
    setLoading(true);
    const list = await loadInvoices();
    setInvoices(list);
    setLoading(false);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1).getTime();

    const filtered = invoices.filter((i) => i.currency === selectedCurrency);

    const paidThisMonth = filtered.filter((i) => {
      if (i.status !== "paid") return false;
      const ts = new Date(i.invoiceDateISO).getTime();
      return ts >= monthStart && ts < monthEnd;
    });
    const pending = filtered.filter((i) => i.status !== "paid").length;

    const totalThisMonth = paidThisMonth.reduce((sum, inv) => sum + computeInvoiceTotals(inv).total, 0);

    // Build last 6 months series
    const points: number[] = [];
    const labels: string[] = [];
    for (let k = 5; k >= 0; k--) {
      const d = new Date(now.getFullYear(), now.getMonth() - k, 1);
      const start = d.getTime();
      const end = new Date(d.getFullYear(), d.getMonth() + 1, 1).getTime();
      const monthSum = filtered
        .filter((i) => i.status === "paid")
        .filter((i) => {
          const ts = new Date(i.invoiceDateISO).getTime();
          return ts >= start && ts < end;
        })
        .reduce((sum, inv) => sum + computeInvoiceTotals(inv).total, 0);
      points.push(monthSum);
      labels.push(formatDateDDMMYY(d));
    }
    return { totalThisMonth, pending, labels, points };
  }, [invoices, locale, selectedCurrency]);

  useEffect(() => {
    onShareableMessageChange?.(
      [
        t("amFreelance.card.dashboard"),
        `${t("amFreelance.invoice.title")}: ${invoices.length}`,
      ].join("\n")
    );
  }, [t, invoices.length, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
        <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor, marginBottom: 0 }]}>
          {t("amFreelance.card.dashboard")}
        </ThemedText>
        <TouchableOpacity
          onPress={() => void refresh()}
          style={[styles.actionBtn, { borderColor, backgroundColor: surfaceColor, paddingVertical: 8 }]}
        >
          <Ionicons name="refresh-outline" size={18} color={primaryColor} />
          <ThemedText style={{ color: primaryColor, fontWeight: "700" }}>{t("amFreelance.dashboard.refresh")}</ThemedText>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ThemedText style={{ color: textSecondaryColor, marginTop: 12 }}>
          {t("amFreelance.dashboard.loading")}
        </ThemedText>
      ) : (
        <>
          <ThemedText type="caption" style={{ color: textSecondaryColor, marginTop: 14 }}>
            {t("amFreelance.dashboard.currency")}
          </ThemedText>
          <View style={[styles.pillsRow, { marginBottom: 6 }]}>
            {(["AMD", "USD", "EUR", "RUB", "GEL"] as InvoiceCurrency[]).map((c) => {
              const active = c === selectedCurrency;
              return (
                <TouchableOpacity
                  key={c}
                  onPress={() => setSelectedCurrency(c)}
                  style={[
                    styles.pill,
                    {
                      borderColor: active ? primaryColor : borderColor,
                      backgroundColor: active ? hexToRgba(primaryColor, 0.14) : surfaceColor,
                    },
                  ]}
                >
                  <ThemedText type="caption" style={{ fontWeight: "800", color: active ? primaryColor : textSecondaryColor }}>
                    {c}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>

          <View style={{ gap: 8, marginTop: 10 }}>
            <RowKV
              label={t("amFreelance.dashboard.thisMonthPaid")}
              value={formatMoney(locale, stats.totalThisMonth, selectedCurrency)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFreelance.dashboard.pendingInvoices")}
              value={String(stats.pending)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>

          <ThemedText type="defaultSemiBold" style={{ color: textColor, marginTop: 18 }}>
            {t("amFreelance.dashboard.income6Months")}
          </ThemedText>
          <View
            style={{ marginTop: 12, overflow: "hidden", borderRadius: 16 }}
            onLayout={({ nativeEvent }) => {
              const w = Math.floor(nativeEvent.layout.width);
              if (w > 0) setChartW((prev) => (prev === w ? prev : w));
            }}
          >
            {chartW > 0 ? (
              <LineChart
                data={{
                  labels: stats.labels,
                  datasets: [{ data: stats.points.length ? stats.points : [0, 0] }],
                }}
                width={chartW}
                height={220}
                chartConfig={{
                  backgroundColor: surfaceSecondaryColor,
                  backgroundGradientFrom: surfaceSecondaryColor,
                  backgroundGradientTo: hexToRgba(primaryColor, 0.12),
                  decimalPlaces: 0,
                  color: (opacity = 1) => hexToRgba(primaryColor, opacity),
                  labelColor: (opacity = 1) => hexToRgba(textSecondaryColor, opacity),
                  propsForDots: { r: "3" },
                }}
                bezier
                style={{ borderRadius: 16 }}
              />
            ) : null}
          </View>

          {invoices.length === 0 ? (
            <ThemedText style={{ color: textSecondaryColor, marginTop: 12 }}>
              {t("amFreelance.dashboard.noInvoicesHint")}
            </ThemedText>
          ) : null}
        </>
      )}
    </View>
  );
}

function RemindersView(props: {
  t: (k: string) => string;
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
    primaryColor,
    surfaceColor,
    surfaceSecondaryColor,
    textColor,
    textSecondaryColor,
    borderColor,
    onShareableMessageChange,
  } = props;

  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(async () => {
    const on = await isMonthlyFinanceReminderEnabled();
    setEnabled(on);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  useEffect(() => {
    onShareableMessageChange?.(t("amFreelance.card.reminders"));
  }, [t, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText type="defaultSemiBold" style={[styles.cardTitle, { color: textColor }]}>
        {t("amFreelance.card.reminders")}
      </ThemedText>

      <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 10 }}>
        {t("amFreelance.reminders.monthlyTitle")} ({t("amFreelance.reminders.monthlySubtitle")})
      </ThemedText>

      <View style={styles.switchRow}>
        <ThemedText style={{ color: textColor, flex: 1 }}>
          {enabled
            ? t("amFreelance.reminders.enabled")
            : enabled === false
              ? t("amFreelance.reminders.disabled")
              : "…"}
        </ThemedText>
        <TouchableOpacity
          disabled={busy || enabled === null}
          onPress={() => {
            void (async () => {
              if (enabled === null) return;
              setBusy(true);
              const ok = enabled
                ? await disableMonthlyFinanceReminder()
                : await enableMonthlyFinanceReminder({
                    title: t("amFreelance.reminders.notificationTitle"),
                    body: t("amFreelance.reminders.notificationBody"),
                  });
              setBusy(false);
              if (!ok) {
                Alert.alert(
                  t("amFreelance.reminders.updateFailedTitle"),
                  t("amFreelance.reminders.updateFailedBody")
                );
              }
              await refresh();
            })();
          }}
          style={[
            styles.toggle,
            {
              backgroundColor: enabled ? hexToRgba(primaryColor, 0.25) : hexToRgba(borderColor, 0.14),
              borderColor: enabled ? primaryColor : borderColor,
              opacity: busy ? 0.6 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.toggleKnob,
              {
                backgroundColor: enabled ? primaryColor : textSecondaryColor,
                transform: [{ translateX: enabled ? 16 : 0 }],
              },
            ]}
          />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={[styles.actionBtn, { borderColor, backgroundColor: surfaceColor }]}
        onPress={() => void refresh()}
      >
        <Ionicons name="refresh-outline" size={18} color={primaryColor} />
        <ThemedText style={{ color: primaryColor, fontWeight: "700" }}>
          {t("amFreelance.reminders.refreshStatus")}
        </ThemedText>
      </TouchableOpacity>
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
  invoiceActions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
    marginTop: 14,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
});


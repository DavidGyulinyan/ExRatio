import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  calculateDeposit,
  calculateMaternity,
  calculatePaidLeave,
  estimateGrossFromNet,
  payrollBreakdownFromGross,
} from "@/lib/armenia";
import { shareLines } from "@/lib/shareText";

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type FinanceScreen = "menu" | "paidLeave" | "maternity" | "salary" | "deposit";

function formatAmd(value: number): string {
  if (!Number.isFinite(value)) return "—";
  return (
    new Intl.NumberFormat("hy-AM", { maximumFractionDigits: 0 }).format(Math.round(value)) +
    " ֏"
  );
}

function parseNum(raw: string): number | null {
  const s = raw.replace(/\s/g, "").replace(",", ".").trim();
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

type ArmeniaFinanceModalProps = {
  /** When the parent opens the modal, selects starting screen (e.g. from dashboard tiles). */
  initialScreen?: FinanceScreen;
  onShareableMessageChange?: (message: string | null) => void;
};

export default function ArmeniaFinanceModal({
  initialScreen = "menu",
  onShareableMessageChange,
}: ArmeniaFinanceModalProps) {
  const { t } = useLanguage();
  const primaryColor = useThemeColor({}, "primary");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");

  const [screen, setScreen] = useState<FinanceScreen>(initialScreen);

  useEffect(() => {
    setScreen(initialScreen);
  }, [initialScreen]);

  const go = useCallback((s: FinanceScreen) => {
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
            {t("amFinance.back")}
          </ThemedText>
        </TouchableOpacity>
      ) : null}

      {screen === "menu" ? (
        <MenuView
          t={t}
          primaryColor={primaryColor}
          surfaceColor={surfaceColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          go={go}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}
      {screen === "paidLeave" ? (
        <PaidLeaveView
          t={t}
          primaryColor={primaryColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}
      {screen === "maternity" ? (
        <MaternityView
          t={t}
          primaryColor={primaryColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}
      {screen === "salary" ? (
        <SalaryView
          t={t}
          primaryColor={primaryColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}
      {screen === "deposit" ? (
        <DepositView
          t={t}
          primaryColor={primaryColor}
          surfaceSecondaryColor={surfaceSecondaryColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
          borderColor={borderColor}
          onShareableMessageChange={onShareableMessageChange}
        />
      ) : null}

      <ThemedText type="caption" style={[styles.disclaimer, { color: textSecondaryColor }]}>
        {t("amFinance.disclaimer")}
      </ThemedText>
    </ScrollView>
  );
}

function MenuView({
  t,
  primaryColor,
  surfaceColor,
  surfaceSecondaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  go,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  go: (s: FinanceScreen) => void;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  useEffect(() => {
    if (!onShareableMessageChange) return;
    onShareableMessageChange(
      [
        t("amFinance.sectionTitle"),
        `• ${t("amFinance.card.paidLeave")}`,
        `• ${t("amFinance.card.maternity")}`,
        `• ${t("amFinance.card.salary")}`,
        `• ${t("amFinance.card.deposit")}`,
      ].join("\n")
    );
  }, [t, onShareableMessageChange]);

  const cards: { id: FinanceScreen; icon: keyof typeof Ionicons.glyphMap; title: string; desc: string }[] =
    [
      {
        id: "paidLeave",
        icon: "umbrella-outline",
        title: t("amFinance.card.paidLeave"),
        desc: t("amFinance.card.paidLeave.desc"),
      },
      {
        id: "maternity",
        icon: "heart-outline",
        title: t("amFinance.card.maternity"),
        desc: t("amFinance.card.maternity.desc"),
      },
      {
        id: "salary",
        icon: "cash-outline",
        title: t("amFinance.card.salary"),
        desc: t("amFinance.card.salary.desc"),
      },
      {
        id: "deposit",
        icon: "trending-up-outline",
        title: t("amFinance.card.deposit"),
        desc: t("amFinance.card.deposit.desc"),
      },
    ];

  return (
    <View>
      <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={[styles.heroIcon, { backgroundColor: surfaceSecondaryColor }]}>
          <Ionicons name="flag-outline" size={26} color={primaryColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={3}
            ellipsizeMode="tail"
            style={[styles.heroTitle, { color: textColor }]}
          >
            {t("amFinance.sectionTitle")}
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
            {
              backgroundColor: surfaceSecondaryColor,
              borderColor,
            },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: surfaceColor }]}>
            <Ionicons name={c.icon} size={24} color={primaryColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{ color: textColor }}
            >
              {c.title}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={{ color: textSecondaryColor, marginTop: 2 }}
            >
              {c.desc}
            </ThemedText>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={textSecondaryColor}
            style={styles.menuChevron}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
}

function SalaryTypeToggle({
  isGross,
  setIsGross,
  t,
  borderColor,
  surfaceColor,
  primaryColor,
  textColor,
  textSecondaryColor,
}: {
  isGross: boolean;
  setIsGross: (v: boolean) => void;
  t: (k: string) => string;
  borderColor: string;
  surfaceColor: string;
  primaryColor: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={[styles.segment, { borderColor, backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            isGross && { backgroundColor: hexToRgba(primaryColor, 0.2) },
          ]}
          onPress={() => setIsGross(true)}
        >
          <ThemedText
            type="caption"
            numberOfLines={2}
            ellipsizeMode="tail"
            textAlign="center"
            style={{ fontWeight: "700", color: isGross ? primaryColor : textSecondaryColor }}
          >
            {t("amFinance.gross")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.segmentBtn,
            !isGross && { backgroundColor: hexToRgba(primaryColor, 0.2) },
          ]}
          onPress={() => setIsGross(false)}
        >
          <ThemedText
            type="caption"
            numberOfLines={2}
            ellipsizeMode="tail"
            textAlign="center"
            style={{ fontWeight: "700", color: !isGross ? primaryColor : textSecondaryColor }}
          >
            {t("amFinance.net")}
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
  borderColor,
  surfaceColor,
  textColor,
  textSecondaryColor,
}: {
  label: string;
  value: string;
  onChangeText: (s: string) => void;
  keyboardType?: "decimal-pad" | "number-pad";
  borderColor: string;
  surfaceColor: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={{ marginBottom: 14 }}>
      <ThemedText
        type="caption"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[{ color: textSecondaryColor, marginBottom: 6 }, styles.fieldLabel]}
      >
        {label}
      </ThemedText>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType ?? "decimal-pad"}
        placeholderTextColor={textSecondaryColor}
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

function BreakdownRows({
  b,
  t,
  textColor,
  textSecondaryColor,
}: {
  b: ReturnType<typeof payrollBreakdownFromGross>;
  t: (k: string) => string;
  textColor: string;
  textSecondaryColor: string;
}) {
  const rows: [string, number][] = [
    [t("amFinance.incomeTax"), b.incomeTax],
    [t("amFinance.socialPayment"), b.pensionEmployee],
    [t("amFinance.militaryPayment"), b.militaryStamp],
    [t("amFinance.healthPayment"), b.mandatoryHealth],
  ];
  return (
    <View style={{ gap: 8 }}>
      {rows.map(([label, amt]) => (
        <View key={label} style={styles.rowBetween}>
          <ThemedText
            style={[{ color: textSecondaryColor }, styles.rowKVLabel]}
            numberOfLines={4}
            ellipsizeMode="tail"
          >
            {label}
          </ThemedText>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={[{ color: textColor }, styles.rowKVValue]}
          >
            {formatAmd(amt)}
          </ThemedText>
        </View>
      ))}
      <View style={[styles.rowBetween, styles.totalRow]}>
        <ThemedText
          type="defaultSemiBold"
          numberOfLines={3}
          ellipsizeMode="tail"
          style={[{ color: textColor }, styles.rowKVLabel]}
        >
          {t("amFinance.totalDeductions")}
        </ThemedText>
        <ThemedText
          type="defaultSemiBold"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[{ color: textColor }, styles.rowKVValue]}
        >
          {formatAmd(b.totalEmployeeDeductions)}
        </ThemedText>
      </View>
    </View>
  );
}

function PaidLeaveView({
  t,
  primaryColor,
  surfaceSecondaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const surfaceColor = useThemeColor({}, "surface");
  const [salaryStr, setSalaryStr] = useState("500000");
  const [leaveStr, setLeaveStr] = useState("14");
  const [isGross, setIsGross] = useState(false);
  const [workingDayBasis, setWorkingDayBasis] = useState(true);

  const result = useMemo(() => {
    const salary = parseNum(salaryStr);
    const days = parseNum(leaveStr);
    if (salary === null || days === null || salary <= 0 || days <= 0) return null;
    return calculatePaidLeave({
      monthlyAmount: salary,
      isGross,
      leaveDays: days,
      useWorkingDayBasis: workingDayBasis,
    });
  }, [salaryStr, leaveStr, isGross, workingDayBasis]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) {
      onShareableMessageChange(null);
      return;
    }
    onShareableMessageChange(
      [
        t("amFinance.card.paidLeave"),
        `${t("amFinance.paidLeaveGross")}: ${formatAmd(result.leaveGross)}`,
        `${t("amFinance.paidLeaveNet")}: ${formatAmd(result.leaveNet)}`,
      ].join("\n")
    );
  }, [result, t, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[styles.cardTitle, { color: textColor }]}
      >
        {t("amFinance.card.paidLeave")}
      </ThemedText>
      <SalaryTypeToggle
        isGross={isGross}
        setIsGross={setIsGross}
        t={t}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        primaryColor={primaryColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFinance.monthlySalary")}
        value={salaryStr}
        onChangeText={setSalaryStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFinance.leaveDays")}
        value={leaveStr}
        onChangeText={setLeaveStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <View style={styles.switchRow}>
        <ThemedText
          style={[{ color: textColor }, styles.switchLabelText]}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {workingDayBasis ? t("amFinance.basisWorkingDays") : t("amFinance.basisCalendarDays")}
        </ThemedText>
        <Switch
          style={styles.switchControl}
          value={workingDayBasis}
          onValueChange={setWorkingDayBasis}
        />
      </View>

      {result ? (
        <>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={3}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 8 }}
          >
            {t("amFinance.monthlyTitle")}
          </ThemedText>
          <BreakdownRows b={result.monthlyBreakdown} t={t} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 16 }}
          >
            {t("amFinance.results")}
          </ThemedText>
          <View style={{ gap: 6, marginTop: 8 }}>
            <RowKV label={t("amFinance.gross")} value={formatAmd(result.monthlyGross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.net")} value={formatAmd(result.monthlyNet)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.averageDailyGross")} value={formatAmd(result.averageDailyGross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.averageDailyNet")} value={formatAmd(result.averageDailyNet)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.paidLeaveGross")} value={formatAmd(result.leaveGross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.paidLeaveNet")} value={formatAmd(result.leaveNet)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
          <ThemedText type="caption" numberOfLines={8} style={{ color: textSecondaryColor, marginTop: 12 }}>
            {t("amFinance.paidLeave.note")}
          </ThemedText>
          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 16 }]}
            onPress={() =>
              void shareLines([
                t("amFinance.card.paidLeave"),
                `${t("amFinance.paidLeaveGross")}: ${formatAmd(result.leaveGross)}`,
                `${t("amFinance.paidLeaveNet")}: ${formatAmd(result.leaveNet)}`,
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
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFinance.errors.invalid")}</ThemedText>
      )}
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
        style={[{ color: textColor }, styles.rowKVValue]}
      >
        {value}
      </ThemedText>
    </View>
  );
}

function MaternityView({
  t,
  primaryColor,
  surfaceSecondaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const surfaceColor = useThemeColor({}, "surface");
  const [salaryStr, setSalaryStr] = useState("500000");
  const [pregStr, setPregStr] = useState("70");
  const [birthStr, setBirthStr] = useState("70");
  const [isGross, setIsGross] = useState(false);

  const result = useMemo(() => {
    const salary = parseNum(salaryStr);
    const p = parseNum(pregStr) ?? 0;
    const b = parseNum(birthStr) ?? 0;
    if (salary === null || salary <= 0) return null;
    if (p + b <= 0) return null;
    return calculateMaternity({
      monthlyAmount: salary,
      isGross,
      pregnancyDays: p,
      childbirthDays: b,
    });
  }, [salaryStr, pregStr, birthStr, isGross]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) {
      onShareableMessageChange(null);
      return;
    }
    onShareableMessageChange(
      [
        t("amFinance.card.maternity"),
        `${t("amFinance.maternity.estimatedTotal")}: ${formatAmd(result.estimatedBenefitGross)}`,
        `${t("amFinance.maternity.estimatedNet")}: ${formatAmd(result.estimatedBenefitNet)}`,
      ].join("\n")
    );
  }, [result, t, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[styles.cardTitle, { color: textColor }]}
      >
        {t("amFinance.card.maternity")}
      </ThemedText>
      <SalaryTypeToggle
        isGross={isGross}
        setIsGross={setIsGross}
        t={t}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        primaryColor={primaryColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFinance.monthlySalary")}
        value={salaryStr}
        onChangeText={setSalaryStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFinance.pregnancyDays")}
        value={pregStr}
        onChangeText={setPregStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFinance.childbirthDays")}
        value={birthStr}
        onChangeText={setBirthStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />

      {result ? (
        <>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 8 }}
          >
            {t("amFinance.results")}
          </ThemedText>
          <View style={{ gap: 6, marginTop: 8 }}>
            <RowKV label={t("amFinance.maternity.dailyAverage")} value={formatAmd(result.dailyAverageGross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.maternity.estimatedTotal")} value={formatAmd(result.estimatedBenefitGross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.maternity.estimatedNet")} value={formatAmd(result.estimatedBenefitNet)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.maternity.monthlyEquivalent")} value={formatAmd(result.monthlyEquivalentGross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 16 }}
          >
            {t("amFinance.breakdown")}
          </ThemedText>
          <View style={{ marginTop: 8 }}>
            <BreakdownRows b={result.benefitBreakdown} t={t} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 16 }}
          >
            {t("amFinance.maternity.notesTitle")}
          </ThemedText>
          <ThemedText type="caption" numberOfLines={6} style={{ color: textSecondaryColor, marginTop: 6 }}>
            {t("amFinance.maternity.noteStandardDuration")}
          </ThemedText>
          <ThemedText type="caption" numberOfLines={8} style={{ color: textSecondaryColor, marginTop: 6 }}>
            {t("amFinance.maternity.noteLogic")}
          </ThemedText>
          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 16 }]}
            onPress={() =>
              void shareLines([
                t("amFinance.card.maternity"),
                `${t("amFinance.maternity.estimatedTotal")}: ${formatAmd(result.estimatedBenefitGross)}`,
                `${t("amFinance.maternity.estimatedNet")}: ${formatAmd(result.estimatedBenefitNet)}`,
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
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFinance.errors.invalid")}</ThemedText>
      )}
    </View>
  );
}

function SalaryView({
  t,
  primaryColor,
  surfaceSecondaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const surfaceColor = useThemeColor({}, "surface");
  const [amountStr, setAmountStr] = useState("500000");
  const [knowGross, setKnowGross] = useState(false);

  const result = useMemo(() => {
    const amt = parseNum(amountStr);
    if (amt === null || amt <= 0) return null;
    const gross = knowGross ? amt : estimateGrossFromNet(amt);
    const breakdown = payrollBreakdownFromGross(gross);
    return { gross, net: breakdown.netSalary, breakdown };
  }, [amountStr, knowGross]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) {
      onShareableMessageChange(null);
      return;
    }
    onShareableMessageChange(
      [
        t("amFinance.card.salary"),
        `${t("amFinance.gross")}: ${formatAmd(result.gross)}`,
        `${t("amFinance.net")}: ${formatAmd(result.net)}`,
        `${t("amFinance.totalDeductions")}: ${formatAmd(result.breakdown.totalEmployeeDeductions)}`,
      ].join("\n")
    );
  }, [result, t, onShareableMessageChange]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[styles.cardTitle, { color: textColor }]}
      >
        {t("amFinance.card.salary")}
      </ThemedText>
      <View style={[styles.segment, { borderColor, backgroundColor: surfaceColor }]}>
        <TouchableOpacity
          style={[styles.segmentBtn, knowGross && { backgroundColor: hexToRgba(primaryColor, 0.2) }]}
          onPress={() => setKnowGross(true)}
        >
          <ThemedText
            type="caption"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{
              textAlign: "center",
              fontWeight: "700",
              color: knowGross ? primaryColor : textSecondaryColor,
            }}
          >
            {t("amFinance.knowGross")}
          </ThemedText>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.segmentBtn, !knowGross && { backgroundColor: hexToRgba(primaryColor, 0.2) }]}
          onPress={() => setKnowGross(false)}
        >
          <ThemedText
            type="caption"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{
              textAlign: "center",
              fontWeight: "700",
              color: !knowGross ? primaryColor : textSecondaryColor,
            }}
          >
            {t("amFinance.knowNet")}
          </ThemedText>
        </TouchableOpacity>
      </View>
      <Field
        label={knowGross ? t("amFinance.gross") : t("amFinance.net")}
        value={amountStr}
        onChangeText={setAmountStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />

      {result ? (
        <>
          <View style={{ gap: 8, marginTop: 8 }}>
            <RowKV label={t("amFinance.gross")} value={formatAmd(result.gross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.net")} value={formatAmd(result.net)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.employerCost")} value={formatAmd(result.gross)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 16 }}
          >
            {t("amFinance.breakdown")}
          </ThemedText>
          <View style={{ marginTop: 8 }}>
            <BreakdownRows b={result.breakdown} t={t} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
          <RowKV label={t("amFinance.finalReceive")} value={formatAmd(result.breakdown.netSalary)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 16 }]}
            onPress={() =>
              void shareLines([
                t("amFinance.card.salary"),
                `${t("amFinance.gross")}: ${formatAmd(result.gross)}`,
                `${t("amFinance.net")}: ${formatAmd(result.net)}`,
                `${t("amFinance.totalDeductions")}: ${formatAmd(result.breakdown.totalEmployeeDeductions)}`,
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
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFinance.errors.invalid")}</ThemedText>
      )}
    </View>
  );
}

function DepositView({
  t,
  primaryColor,
  surfaceSecondaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const surfaceColor = useThemeColor({}, "surface");
  const [depositLineChartW, setDepositLineChartW] = useState(0);
  const [principalStr, setPrincipalStr] = useState("1000000");
  const [rateStr, setRateStr] = useState("9");
  const [monthsStr, setMonthsStr] = useState("12");
  const [yearsMode, setYearsMode] = useState(false);
  const [yearsStr, setYearsStr] = useState("1");
  const [compound, setCompound] = useState(true);
  const [contribStr, setContribStr] = useState("0");
  const [taxOnProfit, setTaxOnProfit] = useState(true);

  const result = useMemo(() => {
    const principal = parseNum(principalStr);
    const rate = parseNum(rateStr);
    const monthsDirect = parseNum(monthsStr);
    const years = parseNum(yearsStr);
    if (principal === null || rate === null || principal < 0 || rate < 0) return null;
    let months = yearsMode ? Math.max(0, Math.round((years ?? 0) * 12)) : monthsDirect ?? 0;
    if (!yearsMode && (monthsDirect === null || monthsDirect < 0)) return null;
    if (yearsMode && (years === null || years < 0)) return null;
    const contrib = parseNum(contribStr) ?? 0;
    return calculateDeposit({
      principal,
      annualRatePercent: rate,
      months,
      compoundMonthly: compound,
      monthlyContribution: Math.max(0, contrib),
      taxOnProfit,
    });
  }, [principalStr, rateStr, monthsStr, yearsMode, yearsStr, compound, contribStr, taxOnProfit]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) {
      onShareableMessageChange(null);
      return;
    }
    onShareableMessageChange(
      [
        t("amFinance.card.deposit"),
        `${t("amFinance.deposit.finalAmount")}: ${formatAmd(result.finalAmount)}`,
        `${t("amFinance.deposit.netProfit")}: ${formatAmd(result.netProfitAfterTax)}`,
      ].join("\n")
    );
  }, [result, t, onShareableMessageChange]);

  const chartData = useMemo(() => {
    if (!result || result.balanceSeries.length < 2) return null;
    const s = result.balanceSeries;
    const maxPts = 12;
    const step = Math.max(1, Math.ceil((s.length - 1) / maxPts));
    const data: number[] = [];
    const labels: string[] = [];
    for (let i = 0; i < s.length; i += step) {
      data.push(Math.max(0, s[i]));
      labels.push(i === 0 ? "0" : String(i));
    }
    const last = s[s.length - 1];
    if (data[data.length - 1] !== last) {
      data.push(Math.max(0, last));
      labels.push(String(s.length - 1));
    }
    if (data.length === 1) {
      data.push(data[0] + 0.01);
    }
    return { labels, data };
  }, [result]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[styles.cardTitle, { color: textColor }]}
      >
        {t("amFinance.card.deposit")}
      </ThemedText>
      <Field
        label={t("amFinance.deposit.initial")}
        value={principalStr}
        onChangeText={setPrincipalStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <Field
        label={t("amFinance.deposit.rate")}
        value={rateStr}
        onChangeText={setRateStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <View style={styles.switchRow}>
        <ThemedText
          style={[{ color: textColor }, styles.switchLabelText]}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {yearsMode ? t("amFinance.deposit.useYears") : t("amFinance.deposit.useMonths")}
        </ThemedText>
        <Switch style={styles.switchControl} value={yearsMode} onValueChange={setYearsMode} />
      </View>
      {yearsMode ? (
        <Field
          label={t("amFinance.deposit.years")}
          value={yearsStr}
          onChangeText={setYearsStr}
          borderColor={borderColor}
          surfaceColor={surfaceColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />
      ) : (
        <Field
          label={t("amFinance.deposit.months")}
          value={monthsStr}
          onChangeText={setMonthsStr}
          borderColor={borderColor}
          surfaceColor={surfaceColor}
          textColor={textColor}
          textSecondaryColor={textSecondaryColor}
        />
      )}
      <View style={styles.switchRow}>
        <ThemedText
          style={[{ color: textColor }, styles.switchLabelText]}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {compound ? t("amFinance.deposit.compound") : t("amFinance.deposit.simple")}
        </ThemedText>
        <Switch style={styles.switchControl} value={compound} onValueChange={setCompound} />
      </View>
      <Field
        label={t("amFinance.deposit.monthlyContribution")}
        value={contribStr}
        onChangeText={setContribStr}
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />
      <View style={styles.switchRow}>
        <ThemedText
          style={[{ color: textColor }, styles.switchLabelText]}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {t("amFinance.deposit.taxOnProfit")}
        </ThemedText>
        <Switch style={styles.switchControl} value={taxOnProfit} onValueChange={setTaxOnProfit} />
      </View>

      {result && chartData ? (
        <>
          <View style={{ gap: 8, marginTop: 8 }}>
            <RowKV label={t("amFinance.deposit.finalAmount")} value={formatAmd(result.finalAmount)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.deposit.earnedInterest")} value={formatAmd(result.earnedInterestBeforeTax)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.deposit.taxAmount")} value={formatAmd(result.interestTax)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
            <RowKV label={t("amFinance.deposit.netProfit")} value={formatAmd(result.netProfitAfterTax)} textColor={textColor} textSecondaryColor={textSecondaryColor} />
          </View>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={2}
            ellipsizeMode="tail"
            style={{ color: textColor, marginTop: 18 }}
          >
            {t("amFinance.deposit.chartTitle")}
          </ThemedText>
          <View
            style={styles.depositChartWrap}
            onLayout={({ nativeEvent }) => {
              const w = Math.floor(nativeEvent.layout.width);
              if (w > 0) {
                setDepositLineChartW((prev) => (prev === w ? prev : w));
              }
            }}
          >
            {depositLineChartW > 0 ? (
              <LineChart
                data={{
                  labels: chartData.labels,
                  datasets: [{ data: chartData.data.map((v) => (v > 0 ? v : 0)) }],
                }}
                width={depositLineChartW}
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
                style={styles.depositLineChart}
                bezier
                withVerticalLabels
                withHorizontalLabels
              />
            ) : null}
          </View>
          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 12 }]}
            onPress={() =>
              void shareLines([
                t("amFinance.card.deposit"),
                `${t("amFinance.deposit.finalAmount")}: ${formatAmd(result.finalAmount)}`,
                `${t("amFinance.deposit.netProfit")}: ${formatAmd(result.netProfitAfterTax)}`,
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
        <ThemedText style={{ color: textSecondaryColor }}>{t("amFinance.errors.invalid")}</ThemedText>
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
  menuChevron: {
    flexShrink: 0,
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
  totalRow: {
    marginTop: 4,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: "rgba(128,128,128,0.25)",
  },
  disclaimer: {
    marginTop: 24,
    lineHeight: 18,
    flexShrink: 1,
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
  depositChartWrap: {
    width: "100%",
    marginTop: 12,
    alignSelf: "stretch",
    overflow: "hidden",
    borderRadius: 16,
  },
  depositLineChart: {
    borderRadius: 16,
    marginLeft: 0,
    marginRight: 0,
  },
});

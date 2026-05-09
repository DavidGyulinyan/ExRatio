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
import { Ionicons } from "@expo/vector-icons";

import { AmFinanceDraftContext, useAmFinanceDraft } from "@/components/AmFinanceDraftContext";
import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import {
  calculateVehicleCustoms,
  engineDisplacementCcFromFormInput,
  estimateVehicleSaleIncomeTax,
} from "@/lib/armenia";
import {
  defaultAmFinanceDraft,
  loadAmFinanceDraft,
  saveAmFinanceDraft,
  type AmFinanceFormsDraft,
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

if (Platform.OS === "android" && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

export type TransportScreen = "menu" | "vehicleCustoms" | "vehicleDeal";

const HP_TO_KW = 0.745699872;

function powerHpKw(power: number, unit: "hp" | "kw"): { hp: number; kw: number } {
  if (unit === "hp") return { hp: power, kw: power * HP_TO_KW };
  return { hp: power / HP_TO_KW, kw: power };
}

function parseYearStr(raw: string): number | null {
  const n = parseNum(raw);
  if (n === null || !Number.isFinite(n)) return null;
  const y = Math.floor(n);
  const current = new Date().getFullYear();
  if (y < 1980 || y > current + 1) return null;
  return y;
}

function formatAmd(value: number): string {
  return formatAmdSuffix(value);
}

function parseNum(raw: string): number | null {
  return parseGroupedNumericInput(raw);
}

function formatDutyRatePercent(rate: number): string {
  const p = rate * 100;
  const s = p % 1 === 0 ? String(Math.round(p)) : p.toFixed(1).replace(/\.?0+$/, "");
  return `${s}%`;
}

function formatAgeMultiplier(m: number): string {
  if (Math.abs(m - 1) < 1e-9) return "×1";
  const rounded = Math.round(m * 100) / 100;
  return Number.isInteger(rounded) ? `×${rounded}` : `×${rounded}`;
}

function Field({
  label,
  hint,
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
  /** Short caption under the label (e.g. field purpose). */
  hint?: string;
  value: string;
  onChangeText: (s: string) => void;
  keyboardType?: "decimal-pad" | "number-pad" | "default";
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
      <ThemedText
        type="caption"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[{ color: textSecondaryColor, marginBottom: hint ? 4 : 6 }, styles.fieldLabel]}
      >
        {label}
      </ThemedText>
      {hint ? (
        <ThemedText
          type="caption"
          numberOfLines={4}
          ellipsizeMode="tail"
          style={{ color: textSecondaryColor, opacity: 0.92, marginBottom: 8, lineHeight: 18 }}
        >
          {hint}
        </ThemedText>
      ) : null}
      <TextInput
        value={displayValue}
        onChangeText={handleChange}
        keyboardType={keyboardType ?? "decimal-pad"}
        placeholder={placeholder ?? "0"}
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

type Props = {
  initialScreen?: TransportScreen;
  onShareableMessageChange?: (message: string | null) => void;
};

export default function ArmeniaTransportModal({ initialScreen = "menu", onShareableMessageChange }: Props) {
  const { t } = useLanguage();
  const primaryColor = useThemeColor({}, "primary");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");

  const [stack, setStack] = useState<TransportScreen[]>(() =>
    initialScreen === "menu" ? ["menu"] : ["menu", initialScreen]
  );
  const [draft, setDraft] = useState<AmFinanceFormsDraft>(defaultAmFinanceDraft);
  const [draftHydrated, setDraftHydrated] = useState(false);

  useEffect(() => {
    setStack(initialScreen === "menu" ? ["menu"] : ["menu", initialScreen]);
  }, [initialScreen]);

  useEffect(() => {
    let cancelled = false;
    void loadAmFinanceDraft().then((d) => {
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
    const tm = setTimeout(() => void saveAmFinanceDraft(draft), 400);
    return () => clearTimeout(tm);
  }, [draft, draftHydrated]);

  const screen = stack[stack.length - 1];

  const pushScreen = useCallback((s: TransportScreen) => {
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
    <AmFinanceDraftContext.Provider value={{ draft, setDraft }}>
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
              {t("amTransport.back")}
            </ThemedText>
          </TouchableOpacity>
        ) : null}

        {screen === "menu" ? (
          <TransportMenuView
            t={t}
            primaryColor={primaryColor}
            surfaceColor={surfaceColor}
            surfaceSecondaryColor={surfaceSecondaryColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
            pushScreen={pushScreen}
            onShareableMessageChange={onShareableMessageChange}
          />
        ) : null}

        {screen === "vehicleCustoms" ? (
          <VehicleCustomsView
            t={t}
            primaryColor={primaryColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
            onShareableMessageChange={onShareableMessageChange}
          />
        ) : null}

        {screen === "vehicleDeal" ? (
          <VehicleDealView
            t={t}
            primaryColor={primaryColor}
            textColor={textColor}
            textSecondaryColor={textSecondaryColor}
            borderColor={borderColor}
            onShareableMessageChange={onShareableMessageChange}
          />
        ) : null}

        <ThemedText type="caption" style={[styles.disclaimer, { color: textSecondaryColor }]}>
          {t("amTransport.disclaimer")}
        </ThemedText>
      </ScrollView>
    </AmFinanceDraftContext.Provider>
  );
}

function TransportMenuView({
  t,
  primaryColor,
  surfaceColor,
  surfaceSecondaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  pushScreen,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  surfaceColor: string;
  surfaceSecondaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  pushScreen: (s: TransportScreen) => void;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  useEffect(() => {
    if (!onShareableMessageChange) return;
    onShareableMessageChange(
      [
        t("amTransport.sectionTitle"),
        `• ${t("amTransport.card.customs")}`,
        `• ${t("amTransport.card.dealWorksheet")}`,
      ].join("\n")
    );
  }, [t, onShareableMessageChange]);

  const cards: {
    id: TransportScreen;
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    desc: string;
  }[] = [
    {
      id: "vehicleCustoms",
      icon: "car-outline",
      title: t("amTransport.card.customs"),
      desc: t("amTransport.card.customs.desc"),
    },
    {
      id: "vehicleDeal",
      icon: "document-text-outline",
      title: t("amTransport.card.dealWorksheet"),
      desc: t("amTransport.card.dealWorksheet.desc"),
    },
  ];

  return (
    <View>
      <View style={[styles.heroCard, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={[styles.heroIcon, { backgroundColor: surfaceSecondaryColor }]}>
          <Ionicons name="car-sport-outline" size={26} color={primaryColor} />
        </View>
        <View style={{ flex: 1, minWidth: 0 }}>
          <ThemedText
            type="defaultSemiBold"
            numberOfLines={4}
            ellipsizeMode="tail"
            style={[styles.heroTitle, { color: textColor }]}
          >
            {t("amTransport.sectionTitle")}
          </ThemedText>
          <ThemedText
            type="caption"
            numberOfLines={4}
            ellipsizeMode="tail"
            style={{ color: textSecondaryColor, marginTop: 6, lineHeight: 18 }}
          >
            {t("amTransport.heroSubtitle")}
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
            {
              backgroundColor: surfaceSecondaryColor,
              borderColor,
            },
          ]}
        >
          <View style={[styles.menuIcon, { backgroundColor: hexToRgba(primaryColor, 0.12) }]}>
            <Ionicons name={c.icon} size={22} color={primaryColor} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <ThemedText
              type="defaultSemiBold"
              numberOfLines={3}
              ellipsizeMode="tail"
              style={{ color: textColor }}
            >
              {c.title}
            </ThemedText>
            <ThemedText
              type="caption"
              numberOfLines={3}
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

function VehicleCustomsView({
  t,
  primaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const surfaceColor = useThemeColor({}, "surface");
  const { draft, setDraft } = useAmFinanceDraft();
  const { valueStr, engineCcStr, releaseYearStr, isElectric } = draft.vehicleCustoms;

  const result = useMemo(() => {
    const customsValueAmd = parseNum(valueStr);
    const engineDisplacementCc = engineDisplacementCcFromFormInput(engineCcStr);
    const modelYear = parseNum(releaseYearStr);
    if (customsValueAmd === null || customsValueAmd <= 0) return null;
    if (modelYear === null) return null;
    return calculateVehicleCustoms({
      customsValueAmd,
      engineDisplacementCc,
      modelYear,
      isElectric,
    });
  }, [valueStr, engineCcStr, releaseYearStr, isElectric]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    if (!result) {
      onShareableMessageChange(null);
      return;
    }
    onShareableMessageChange(
      [
        t("amTransport.card.customs"),
        `${t("amFinance.vehicleCustoms.releaseYear")}: ${result.modelYear}`,
        `${t("amFinance.vehicleCustoms.total")}: ${formatAmd(result.totalClearanceAmd)}`,
        `${t("amFinance.vehicleCustoms.customsDuty")}: ${formatAmd(result.customsDutyAmd)}`,
        `${t("amFinance.vehicleCustoms.vat")}: ${formatAmd(result.vatAmd)}`,
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
        {t("amTransport.card.customs")}
      </ThemedText>
      <TouchableOpacity
        onPress={() =>
          setDraft((d) => ({
            ...d,
            vehicleCustoms: {
              valueStr: "",
              engineCcStr: "2",
              releaseYearStr: String(new Date().getFullYear()),
              isElectric: false,
            },
          }))
        }
        style={[styles.clearAllRow, { borderColor }]}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
          {t("amFinance.clearAllFields")}
        </ThemedText>
      </TouchableOpacity>
      <Field
        label={t("amFinance.vehicleCustoms.customsValue")}
        value={valueStr}
        onChangeText={(valueStr) =>
          setDraft((d) => ({ ...d, vehicleCustoms: { ...d.vehicleCustoms, valueStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />
      <Field
        label={t("amFinance.vehicleCustoms.releaseYear")}
        value={releaseYearStr}
        onChangeText={(releaseYearStr) =>
          setDraft((d) => ({
            ...d,
            vehicleCustoms: {
              ...d.vehicleCustoms,
              releaseYearStr: sanitizeIntegerDigits(releaseYearStr).slice(0, 4),
            },
          }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        keyboardType="number-pad"
      />
      <Field
        label={t("amFinance.vehicleCustoms.engineCc")}
        value={engineCcStr}
        onChangeText={(engineCcStr) =>
          setDraft((d) => ({
            ...d,
            vehicleCustoms: {
              ...d.vehicleCustoms,
              engineCcStr,
            },
          }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="decimal"
      />
      <View style={styles.switchRow}>
        <ThemedText
          style={[{ color: textColor }, styles.switchLabelText]}
          numberOfLines={4}
          ellipsizeMode="tail"
        >
          {t("amFinance.vehicleCustoms.electric")}
        </ThemedText>
        <Switch
          style={styles.switchControl}
          value={isElectric}
          onValueChange={(isElectric) =>
            setDraft((d) => ({ ...d, vehicleCustoms: { ...d.vehicleCustoms, isElectric } }))
          }
        />
      </View>

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
            <RowKV
              label={t("amFinance.vehicleCustoms.vehicleAge")}
              value={String(result.vehicleAgeYears)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFinance.vehicleCustoms.baseDutyRate")}
              value={formatDutyRatePercent(result.baseDutyRateBeforeAge)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            {!result.isElectric ? (
              <RowKV
                label={t("amFinance.vehicleCustoms.dutyAgeMultiplier")}
                value={formatAgeMultiplier(result.dutyAgeMultiplier)}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
              />
            ) : null}
            <RowKV
              label={t("amFinance.vehicleCustoms.dutyRate")}
              value={formatDutyRatePercent(result.dutyRateApplied)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFinance.vehicleCustoms.customsDuty")}
              value={formatAmd(result.customsDutyAmd)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFinance.vehicleCustoms.excise")}
              value={formatAmd(result.exciseAmd)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFinance.vehicleCustoms.vatBase")}
              value={formatAmd(result.vatBaseAmd)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            <RowKV
              label={t("amFinance.vehicleCustoms.vat")}
              value={formatAmd(result.vatAmd)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
            {result.fixedFeesAmd > 0 ? (
              <RowKV
                label={t("amFinance.vehicleCustoms.fixedFees")}
                value={formatAmd(result.fixedFeesAmd)}
                textColor={textColor}
                textSecondaryColor={textSecondaryColor}
              />
            ) : null}
            <RowKV
              label={t("amFinance.vehicleCustoms.total")}
              value={formatAmd(result.totalClearanceAmd)}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
            />
          </View>
          <ThemedText type="caption" numberOfLines={12} style={{ color: textSecondaryColor, marginTop: 12 }}>
            {t("amFinance.vehicleCustoms.note")}
          </ThemedText>
          <TouchableOpacity
            style={[styles.shareRow, { marginTop: 16 }]}
            onPress={() =>
              void shareLines([
                t("amTransport.card.customs"),
                `${t("amFinance.vehicleCustoms.releaseYear")}: ${result.modelYear}`,
                `${t("amFinance.vehicleCustoms.total")}: ${formatAmd(result.totalClearanceAmd)}`,
                `${t("amFinance.vehicleCustoms.customsDuty")}: ${formatAmd(result.customsDutyAmd)}`,
                `${t("amFinance.vehicleCustoms.vat")}: ${formatAmd(result.vatAmd)}`,
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

function PowerUnitSegment({
  powerUnit,
  setPowerUnit,
  t,
  borderColor,
  surfaceColor,
  primaryColor,
  textColor,
  textSecondaryColor,
}: {
  powerUnit: "hp" | "kw";
  setPowerUnit: (u: "hp" | "kw") => void;
  t: (k: string) => string;
  borderColor: string;
  surfaceColor: string;
  primaryColor: string;
  textColor: string;
  textSecondaryColor: string;
}) {
  return (
    <View style={{ marginBottom: 6 }}>
      <ThemedText
        type="caption"
        numberOfLines={2}
        ellipsizeMode="tail"
        style={{ color: textSecondaryColor, marginBottom: 8 }}
      >
        {t("amTransport.deal.powerUnitLabel")}
      </ThemedText>
      <View style={[styles.segment, { borderColor, backgroundColor: surfaceColor, marginBottom: 14 }]}>
      <TouchableOpacity
        style={[
          styles.segmentBtn,
          powerUnit === "hp" && { backgroundColor: hexToRgba(primaryColor, 0.2) },
        ]}
        onPress={() => setPowerUnit("hp")}
      >
        <ThemedText
          type="caption"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{
            textAlign: "center",
            fontWeight: "700",
            color: powerUnit === "hp" ? primaryColor : textSecondaryColor,
          }}
        >
          {t("amTransport.deal.unitHp")}
        </ThemedText>
      </TouchableOpacity>
      <TouchableOpacity
        style={[
          styles.segmentBtn,
          powerUnit === "kw" && { backgroundColor: hexToRgba(primaryColor, 0.2) },
        ]}
        onPress={() => setPowerUnit("kw")}
      >
        <ThemedText
          type="caption"
          numberOfLines={2}
          ellipsizeMode="tail"
          style={{
            textAlign: "center",
            fontWeight: "700",
            color: powerUnit === "kw" ? primaryColor : textSecondaryColor,
          }}
        >
          {t("amTransport.deal.unitKw")}
        </ThemedText>
      </TouchableOpacity>
      </View>
    </View>
  );
}

function VehicleDealView({
  t,
  primaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  onShareableMessageChange,
}: {
  t: (k: string) => string;
  primaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  onShareableMessageChange?: (message: string | null) => void;
}) {
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const errorColor = useThemeColor({}, "error");
  const { draft, setDraft } = useAmFinanceDraft();
  const {
    acquisitionYearStr,
    saleYearStr,
    acquisitionStr,
    importStr,
    salePriceStr,
    powerStr,
    powerUnit,
  } = draft.vehicleDeal;

  const acquisition = parseNum(acquisitionStr);
  const importAmt = parseNum(importStr);
  const sale = parseNum(salePriceStr);
  const power = parseNum(powerStr);

  const hasAcq = acquisition !== null && Number.isFinite(acquisition);
  const hasImp = importAmt !== null && Number.isFinite(importAmt);
  const totalCost = hasAcq || hasImp ? (acquisition ?? 0) + (importAmt ?? 0) : null;

  const hasSale = sale !== null && Number.isFinite(sale);
  const netVsOutlay = hasSale && totalCost !== null ? sale - totalCost : null;

  const powerNumeric =
    power !== null && Number.isFinite(power) && power >= 0 ? power : null;
  const horsePowerHp = useMemo(() => {
    if (powerNumeric === null) return null;
    return powerHpKw(powerNumeric, powerUnit).hp;
  }, [powerNumeric, powerUnit]);

  const taxEstimate = useMemo(() => {
    if (sale === null || sale <= 0) return null;
    return estimateVehicleSaleIncomeTax({
      salePriceAmd: sale,
      totalCostAmd: totalCost,
      acquisitionYear: parseYearStr(acquisitionYearStr),
      saleYear: parseYearStr(saleYearStr),
      horsePower: horsePowerHp,
    });
  }, [sale, totalCost, acquisitionYearStr, saleYearStr, horsePowerHp]);

  const taxShareExtraLines = useMemo(() => {
    if (!taxEstimate || taxEstimate.invalidYearOrder) return [];
    const lines: string[] = [];
    if (taxEstimate.exemptNoIncomeTax) {
      lines.push(t("amTransport.deal.taxExemptShare"));
      return lines;
    }
    if (taxEstimate.taxOnePercentAmd !== null) {
      lines.push(`${t("amTransport.deal.taxOnePercent")}: ${formatAmd(taxEstimate.taxOnePercentAmd)}`);
    }
    if (taxEstimate.taxMinHpFloorAmd !== null) {
      lines.push(`${t("amTransport.deal.taxMinHp")}: ${formatAmd(taxEstimate.taxMinHpFloorAmd)}`);
    }
    if (taxEstimate.taxIfQuickSaleAmd !== null) {
      lines.push(`${t("amTransport.deal.taxTotalQuickSale")}: ${formatAmd(taxEstimate.taxIfQuickSaleAmd)}`);
    }
    return lines;
  }, [taxEstimate, t]);

  const powerEquiv = useMemo(() => {
    if (power === null || power < 0 || !Number.isFinite(power)) return null;
    if (powerUnit === "hp") {
      const kw = power * HP_TO_KW;
      return {
        label: t("amTransport.deal.powerEquivalent")
          .replace("{value}", formatGroupedNumber(kw, 2))
          .replace("{unit}", "kW"),
      };
    }
    const hp = power / HP_TO_KW;
    return {
      label: t("amTransport.deal.powerEquivalent")
        .replace("{value}", formatGroupedNumber(hp, 2))
        .replace("{unit}", "hp"),
    };
  }, [power, powerUnit, t]);

  const powerBothLabel = useMemo(() => {
    if (power === null || power < 0 || !Number.isFinite(power)) return null;
    const { hp, kw } = powerHpKw(power, powerUnit);
    return t("amTransport.deal.powerBoth")
      .replace("{hp}", formatGroupedNumber(hp, 1))
      .replace("{kw}", formatGroupedNumber(kw, 2));
  }, [power, powerUnit, t]);

  useEffect(() => {
    if (!onShareableMessageChange) return;
    const lines: string[] = [t("amTransport.card.dealWorksheet")];
    if (acquisitionYearStr.length >= 4) {
      lines.push(`${t("amTransport.deal.acquisitionYear")}: ${acquisitionYearStr}`);
    }
    if (saleYearStr.length >= 4) {
      lines.push(`${t("amTransport.deal.saleYear")}: ${saleYearStr}`);
    }
    if (acquisition !== null) lines.push(`${t("amTransport.deal.acquisition")}: ${formatAmd(acquisition)}`);
    if (importAmt !== null) lines.push(`${t("amTransport.deal.importExport")}: ${formatAmd(importAmt)}`);
    if (sale !== null) lines.push(`${t("amTransport.deal.salePrice")}: ${formatAmd(sale)}`);
    if (totalCost !== null) lines.push(`${t("amTransport.deal.totalOutlay")}: ${formatAmd(totalCost)}`);
    if (netVsOutlay !== null) lines.push(`${t("amTransport.deal.netVsOutlay")}: ${formatAmd(netVsOutlay)}`);
    lines.push(...taxShareExtraLines);
    if (powerBothLabel) lines.push(`${t("amTransport.deal.enginePower")}: ${powerBothLabel}`);
    onShareableMessageChange(lines.join("\n"));
  }, [
    acquisitionYearStr,
    saleYearStr,
    acquisition,
    importAmt,
    sale,
    totalCost,
    netVsOutlay,
    taxShareExtraLines,
    powerBothLabel,
    t,
    onShareableMessageChange,
  ]);

  const sharePayload = useMemo(() => {
    const lines: string[] = [t("amTransport.card.dealWorksheet")];
    if (acquisitionYearStr.length >= 4) {
      lines.push(`${t("amTransport.deal.acquisitionYear")}: ${acquisitionYearStr}`);
    }
    if (saleYearStr.length >= 4) {
      lines.push(`${t("amTransport.deal.saleYear")}: ${saleYearStr}`);
    }
    if (acquisition !== null) lines.push(`${t("amTransport.deal.acquisition")}: ${formatAmd(acquisition)}`);
    if (importAmt !== null) lines.push(`${t("amTransport.deal.importExport")}: ${formatAmd(importAmt)}`);
    if (sale !== null) lines.push(`${t("amTransport.deal.salePrice")}: ${formatAmd(sale)}`);
    if (totalCost !== null) lines.push(`${t("amTransport.deal.totalOutlay")}: ${formatAmd(totalCost)}`);
    if (netVsOutlay !== null) lines.push(`${t("amTransport.deal.netVsOutlay")}: ${formatAmd(netVsOutlay)}`);
    lines.push(...taxShareExtraLines);
    if (powerBothLabel) lines.push(`${t("amTransport.deal.enginePower")}: ${powerBothLabel}`);
    return lines;
  }, [
    t,
    acquisitionYearStr,
    saleYearStr,
    acquisition,
    importAmt,
    sale,
    totalCost,
    netVsOutlay,
    taxShareExtraLines,
    powerBothLabel,
  ]);

  return (
    <View style={[styles.card, styles.cardClip, { backgroundColor: surfaceColor, borderColor }]}>
      <ThemedText
        type="defaultSemiBold"
        numberOfLines={4}
        ellipsizeMode="tail"
        style={[styles.cardTitle, { color: textColor }]}
      >
        {t("amTransport.card.dealWorksheet")}
      </ThemedText>
      <TouchableOpacity
        onPress={() =>
          setDraft((d) => ({
            ...d,
            vehicleDeal: defaultAmFinanceDraft().vehicleDeal,
          }))
        }
        style={[styles.clearAllRow, { borderColor }]}
        accessibilityRole="button"
      >
        <Ionicons name="trash-outline" size={18} color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={{ color: primaryColor }}>
          {t("amTransport.clearAllFields")}
        </ThemedText>
      </TouchableOpacity>

      <Field
        label={t("amTransport.deal.acquisitionYear")}
        value={acquisitionYearStr}
        onChangeText={(acquisitionYearStr) =>
          setDraft((d) => ({
            ...d,
            vehicleDeal: {
              ...d.vehicleDeal,
              acquisitionYearStr: sanitizeIntegerDigits(acquisitionYearStr).slice(0, 4),
            },
          }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        keyboardType="number-pad"
      />
      <Field
        label={t("amTransport.deal.saleYear")}
        value={saleYearStr}
        onChangeText={(saleYearStr) =>
          setDraft((d) => ({
            ...d,
            vehicleDeal: {
              ...d.vehicleDeal,
              saleYearStr: sanitizeIntegerDigits(saleYearStr).slice(0, 4),
            },
          }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        keyboardType="number-pad"
      />

      <Field
        label={t("amTransport.deal.acquisition")}
        value={acquisitionStr}
        onChangeText={(acquisitionStr) =>
          setDraft((d) => ({ ...d, vehicleDeal: { ...d.vehicleDeal, acquisitionStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />
      <Field
        label={t("amTransport.deal.importExport")}
        hint={t("amTransport.deal.importExportHint")}
        value={importStr}
        onChangeText={(importStr) =>
          setDraft((d) => ({ ...d, vehicleDeal: { ...d.vehicleDeal, importStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />
      <Field
        label={t("amTransport.deal.salePrice")}
        value={salePriceStr}
        onChangeText={(salePriceStr) =>
          setDraft((d) => ({ ...d, vehicleDeal: { ...d.vehicleDeal, salePriceStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="integer"
      />

      <PowerUnitSegment
        powerUnit={powerUnit}
        setPowerUnit={(powerUnit) =>
          setDraft((d) => ({ ...d, vehicleDeal: { ...d.vehicleDeal, powerUnit } }))
        }
        t={t}
        borderColor={borderColor}
        surfaceColor={surfaceSecondaryColor}
        primaryColor={primaryColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
      />

      <Field
        label={t("amTransport.deal.enginePower")}
        value={powerStr}
        onChangeText={(powerStr) =>
          setDraft((d) => ({ ...d, vehicleDeal: { ...d.vehicleDeal, powerStr } }))
        }
        borderColor={borderColor}
        surfaceColor={surfaceColor}
        textColor={textColor}
        textSecondaryColor={textSecondaryColor}
        numberGrouping="decimal"
      />

      {powerEquiv ? (
        <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8 }}>
          {powerEquiv.label}
        </ThemedText>
      ) : null}

      {sale !== null && sale > 0 && taxEstimate ? (
        <>
          {taxEstimate.invalidYearOrder ? (
            <ThemedText type="caption" style={{ color: errorColor, marginBottom: 10, lineHeight: 18 }}>
              {t("amTransport.deal.invalidYears")}
            </ThemedText>
          ) : (
            <>
              {taxEstimate.exemptNoIncomeTax ? (
                <>
                  <ThemedText
                    type="defaultSemiBold"
                    style={{ color: textColor, marginBottom: 6, lineHeight: 20 }}
                  >
                    {t("amTransport.deal.holdingExemptTitle")}
                  </ThemedText>
                  <ThemedText
                    type="caption"
                    style={{ color: textSecondaryColor, marginBottom: 12, lineHeight: 18 }}
                  >
                    {t("amTransport.deal.holdingExemptBody")}
                  </ThemedText>
                </>
              ) : taxEstimate.holdingBucket === "uncertain" ? (
                <ThemedText
                  type="caption"
                  style={{ color: textSecondaryColor, marginBottom: 10, lineHeight: 18 }}
                >
                  {t("amTransport.deal.holdingUncertain")}
                </ThemedText>
              ) : (
                <ThemedText
                  type="caption"
                  style={{ color: textSecondaryColor, marginBottom: 10, lineHeight: 18 }}
                >
                  {t("amTransport.deal.holdingTaxableShort")}
                </ThemedText>
              )}

              <ThemedText
                type="defaultSemiBold"
                numberOfLines={2}
                ellipsizeMode="tail"
                style={{ color: textColor, marginTop: 4, marginBottom: 8 }}
              >
                {t("amFinance.results")}
              </ThemedText>

              <View style={{ gap: 6, marginBottom: 10 }}>
                {taxEstimate.holdingYears !== null ? (
                  <RowKV
                    label={t("amTransport.deal.holdingPeriod")}
                    value={String(taxEstimate.holdingYears)}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
                {powerBothLabel ? (
                  <RowKV
                    label={t("amTransport.deal.enginePower")}
                    value={powerBothLabel}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
                {totalCost !== null ? (
                  <RowKV
                    label={t("amTransport.deal.totalOutlay")}
                    value={formatAmd(totalCost)}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
                {netVsOutlay !== null ? (
                  <RowKV
                    label={t("amTransport.deal.netVsOutlay")}
                    value={formatAmd(netVsOutlay)}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
                {!taxEstimate.exemptNoIncomeTax && taxEstimate.taxOnePercentAmd !== null ? (
                  <RowKV
                    label={t("amTransport.deal.taxOnePercent")}
                    value={formatAmd(taxEstimate.taxOnePercentAmd)}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
                {!taxEstimate.exemptNoIncomeTax && taxEstimate.taxMinHpFloorAmd !== null ? (
                  <RowKV
                    label={t("amTransport.deal.taxMinHp")}
                    value={formatAmd(taxEstimate.taxMinHpFloorAmd)}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
                {!taxEstimate.exemptNoIncomeTax && taxEstimate.taxIfQuickSaleAmd !== null ? (
                  <RowKV
                    label={t("amTransport.deal.taxTotalQuickSale")}
                    value={formatAmd(taxEstimate.taxIfQuickSaleAmd)}
                    textColor={textColor}
                    textSecondaryColor={textSecondaryColor}
                  />
                ) : null}
              </View>

              <ThemedText type="caption" style={{ color: textSecondaryColor, marginBottom: 8, lineHeight: 18 }}>
                {t("amTransport.deal.taxRateNote")}
              </ThemedText>
            </>
          )}
        </>
      ) : (
        <ThemedText type="caption" style={{ color: textSecondaryColor, marginTop: 4, lineHeight: 18 }}>
          {t("amFinance.errors.invalid")}
        </ThemedText>
      )}

      <ThemedText type="caption" numberOfLines={14} style={{ color: textSecondaryColor, marginTop: 8, lineHeight: 18 }}>
        {t("amTransport.deal.taxNote")}
      </ThemedText>

      <TouchableOpacity
        style={[styles.shareRow, { marginTop: 16 }]}
        onPress={() => void shareLines(sharePayload)}
      >
        <Ionicons name="share-outline" size={20} color={primaryColor} />
        <ThemedText
          numberOfLines={2}
          ellipsizeMode="tail"
          style={[styles.shareRowLabel, { color: primaryColor, fontWeight: "600" }]}
        >
          {t("amTransport.shareSummary")}
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
  clearAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    alignSelf: "flex-start",
    marginBottom: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

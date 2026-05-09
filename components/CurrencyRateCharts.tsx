import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Dimensions,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { LineChart } from "react-native-chart-kit";
import { Ionicons } from "@expo/vector-icons";

import CurrencyPicker from "@/components/CurrencyPicker";
import { usePreferredLocalCurrency } from "@/components/LocationDetection";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import exchangeRateService, {
  HistoricalRateData,
} from "@/lib/exchangeRateService";
import { formatGroupedNumber } from "@/lib/numberFormat";

type Props = {
  currencies: string[];
  defaultBase?: string;
  defaultTarget?: string;
  days?: number;
  /** When true, outer shell is transparent (e.g. QuickActionModal + FinancialBackground). */
  inModal?: boolean;
  onShareableMessageChange?: (message: string | null) => void;
};

type PeriodKey = "7D" | "30D" | "90D" | "1Y";

function compactLabels(dates: string[], maxLabels: number): string[] {
  if (dates.length <= maxLabels) return dates.map((d) => d.slice(5)); // MM-DD
  const step = Math.ceil(dates.length / maxLabels);
  return dates.map((d, idx) => (idx % step === 0 ? d.slice(5) : ""));
}

function formatRate(n: number): string {
  if (!Number.isFinite(n)) return "—";
  if (n < 0.1) return formatGroupedNumber(Number(n.toPrecision(6)), 10);
  const maxFrac = n >= 100 ? 2 : n >= 10 ? 3 : n >= 1 ? 4 : 5;
  return formatGroupedNumber(n, maxFrac);
}

export default function CurrencyRateCharts({
  currencies,
  defaultBase = "USD",
  defaultTarget = "EUR",
  days = 30,
  inModal = false,
  onShareableMessageChange,
}: Props) {
  const { t } = useLanguage();
  const { currency: locationCurrency, loading: locationLoading } =
    usePreferredLocalCurrency();

  const primaryColor = useThemeColor({}, "primary");
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const errorColor = useThemeColor({}, "error");
  const textInverseColor = useThemeColor({}, "textInverse");

  const safeCurrencies = useMemo(() => {
    const unique = Array.from(new Set(currencies)).filter(Boolean);
    return unique.length > 0 ? unique : [defaultBase, defaultTarget];
  }, [currencies, defaultBase, defaultTarget]);

  const [baseCurrency, setBaseCurrency] = useState(
    safeCurrencies.includes(defaultBase) ? defaultBase : safeCurrencies[0]
  );
  const [targetCurrency, setTargetCurrency] = useState(() => {
    if (safeCurrencies.includes(defaultTarget)) return defaultTarget;
    const fallback = safeCurrencies.find((c) => c !== baseCurrency);
    return fallback || baseCurrency;
  });

  const [showBasePicker, setShowBasePicker] = useState(false);
  const [showTargetPicker, setShowTargetPicker] = useState(false);
  const [didInitFromLocation, setDidInitFromLocation] = useState(false);

  const initialPeriod: PeriodKey =
    days >= 365 ? "1Y" : days >= 90 ? "90D" : days >= 30 ? "30D" : "7D";
  const [period, setPeriod] = useState<PeriodKey>(initialPeriod);

  const [rates, setRates] = useState<HistoricalRateData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (!baseCurrency || !targetCurrency || baseCurrency === targetCurrency) {
        setRates([]);
        setError(null);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const periodDays =
          period === "7D" ? 7 : period === "30D" ? 30 : period === "90D" ? 90 : 365;
        const res = await exchangeRateService.getHistoricalRates(
          baseCurrency,
          targetCurrency,
          periodDays
        );
        if (!cancelled) setRates(res.rates || []);
      } catch (e: any) {
        if (!cancelled) {
          setRates([]);
          setError(e?.message || "Failed to load chart data");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, [baseCurrency, targetCurrency, period]);

  // Give the left Y-axis labels more breathing room (chart-kit draws labels inside the SVG).
  const chartWidth = Math.min(Dimensions.get("window").width - 24, 520);

  const labels = rates.map((r) => r.date);
  const values = rates.map((r) => r.rate);

  const hasChart = values.length >= 2 && values.some((v) => Number.isFinite(v));

  const current = values.length ? values[values.length - 1] : undefined;
  const first = values.length ? values[0] : undefined;
  const changeAbs =
    current !== undefined && first !== undefined ? current - first : undefined;
  const changePct =
    changeAbs !== undefined && first !== undefined && first !== 0
      ? (changeAbs / first) * 100
      : undefined;
  const minRate = values.length ? Math.min(...values) : undefined;
  const maxRate = values.length ? Math.max(...values) : undefined;

  const trendColor =
    changeAbs !== undefined && changeAbs < 0 ? errorColor : primaryColor;

  useEffect(() => {
    if (!inModal || !onShareableMessageChange) return;
    if (!baseCurrency || !targetCurrency || baseCurrency === targetCurrency) {
      onShareableMessageChange(null);
      return;
    }
    const periodLabel = t(`chart.timePeriods.${period}`);
    const lines: string[] = [
      t("charts.title"),
      `${baseCurrency} → ${targetCurrency}`,
      periodLabel,
    ];
    if (loading) {
      onShareableMessageChange(lines.join("\n"));
      return;
    }
    if (error) {
      lines.push(error);
      onShareableMessageChange(lines.join("\n"));
      return;
    }
    if (!hasChart || current === undefined) {
      onShareableMessageChange(lines.join("\n"));
      return;
    }
    lines.push(`${t("chart.currentRate")}: ${formatRate(current)}`);
    if (changeAbs !== undefined && first !== undefined) {
      const pctPart =
        changePct !== undefined
          ? ` (${changePct >= 0 ? "+" : ""}${formatGroupedNumber(changePct, 2)}%)`
          : "";
      lines.push(`${t("chart.rateChange")}: ${formatRate(changeAbs)}${pctPart}`);
    }
    onShareableMessageChange(lines.join("\n"));
  }, [
    inModal,
    onShareableMessageChange,
    baseCurrency,
    targetCurrency,
    period,
    loading,
    error,
    hasChart,
    current,
    first,
    changeAbs,
    changePct,
    t,
  ]);

  const [selectedPoint, setSelectedPoint] = useState<{
    value: number;
    label: string;
  } | null>(null);

  // Default pair: USD -> user's location currency (if available).
  useEffect(() => {
    if (didInitFromLocation) return;
    if (locationLoading) return;

    const desiredBase = "USD";
    const desiredTarget =
      locationCurrency && locationCurrency !== "USD" ? locationCurrency : null;

    if (desiredTarget && safeCurrencies.includes(desiredTarget)) {
      setBaseCurrency(desiredBase);
      setTargetCurrency(desiredTarget);
      setDidInitFromLocation(true);
      return;
    }

    // If location currency isn't available in the list (or is USD), keep USD base,
    // but choose the first non-USD target if possible.
    const fallbackTarget =
      safeCurrencies.find((c) => c !== desiredBase) || desiredBase;
    setBaseCurrency(desiredBase);
    setTargetCurrency(fallbackTarget);
    setDidInitFromLocation(true);
  }, [didInitFromLocation, locationCurrency, locationLoading, safeCurrencies]);

  return (
    <View
      style={[
        styles.container,
        { backgroundColor: inModal ? "transparent" : backgroundColor },
      ]}
    >
      <View style={[styles.controls, { backgroundColor: surfaceColor, borderColor }]}>
        <TouchableOpacity
          style={[
            styles.pickerButton,
            { backgroundColor: surfaceSecondaryColor, borderColor },
          ]}
          onPress={() => setShowBasePicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select base currency"
        >
          <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
            {baseCurrency}
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color={textSecondaryColor} />
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            setSelectedPoint(null);
            setBaseCurrency(targetCurrency);
            setTargetCurrency(baseCurrency);
          }}
          activeOpacity={0.85}
          style={[
            styles.swapButton,
            { backgroundColor: surfaceSecondaryColor, borderColor },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Swap currencies"
        >
          <Ionicons name="swap-horizontal" size={18} color={textSecondaryColor} />
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.pickerButton,
            { backgroundColor: surfaceSecondaryColor, borderColor },
          ]}
          onPress={() => setShowTargetPicker(true)}
          accessibilityRole="button"
          accessibilityLabel="Select target currency"
        >
          <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
            {targetCurrency}
          </ThemedText>
          <Ionicons name="chevron-down" size={16} color={textSecondaryColor} />
        </TouchableOpacity>
      </View>

      <View style={[styles.card, { backgroundColor: surfaceColor, borderColor }]}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <View style={[styles.accent, { backgroundColor: trendColor }]} />
            <View style={styles.cardHeaderText}>
              <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
                {t("charts.title")}
              </ThemedText>
              <ThemedText type="caption" style={{ color: textSecondaryColor }}>
                {baseCurrency} → {targetCurrency}
              </ThemedText>
            </View>
          </View>
          <View style={styles.periodRow}>
            {(["7D", "30D", "90D", "1Y"] as const).map((key) => {
              const active = period === key;
              return (
                <TouchableOpacity
                  key={key}
                  onPress={() => {
                    setSelectedPoint(null);
                    setPeriod(key);
                  }}
                  activeOpacity={0.85}
                  style={[
                    styles.periodChip,
                    {
                      backgroundColor: active ? primaryColor : surfaceSecondaryColor,
                      borderColor: active ? primaryColor : borderColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Set period ${key}`}
                >
                  <ThemedText
                    type="caption"
                    style={{
                      color: active ? textInverseColor : textSecondaryColor,
                      fontWeight: active ? "700" : "600",
                    }}
                  >
                    {key}
                  </ThemedText>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        <View style={[styles.statsRow, { borderTopColor: borderColor }]}>
          <View style={styles.stat}>
            <ThemedText type="caption" style={{ color: textSecondaryColor }}>
              Current
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
              {current === undefined ? "—" : formatRate(current)}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="caption" style={{ color: textSecondaryColor }}>
              Change
            </ThemedText>
            <ThemedText
              type="defaultSemiBold"
              style={{
                color:
                  changeAbs === undefined
                    ? textColor
                    : changeAbs >= 0
                      ? textColor
                      : errorColor,
              }}
            >
              {changeAbs === undefined
                ? "—"
                : `${changeAbs >= 0 ? "+" : ""}${formatRate(changeAbs)}${
                    changePct === undefined ? "" : ` (${changePct >= 0 ? "+" : ""}${formatGroupedNumber(changePct, 2)}%)`
                  }`}
            </ThemedText>
          </View>
          <View style={styles.stat}>
            <ThemedText type="caption" style={{ color: textSecondaryColor }}>
              Range
            </ThemedText>
            <ThemedText type="defaultSemiBold" style={{ color: textColor }}>
              {minRate === undefined || maxRate === undefined
                ? "—"
                : `${formatRate(minRate)} – ${formatRate(maxRate)}`}
            </ThemedText>
          </View>
        </View>

        {selectedPoint ? (
          <View
            style={[
              styles.tooltip,
              { backgroundColor: surfaceSecondaryColor, borderColor },
            ]}
          >
            <Ionicons name="information-circle-outline" size={16} color={textSecondaryColor} />
            <ThemedText type="caption" style={{ color: textSecondaryColor }}>
              {selectedPoint.label}:{" "}
            </ThemedText>
            <ThemedText type="caption" style={{ color: textColor }}>
              {formatRate(selectedPoint.value)}
            </ThemedText>
            <View style={{ flex: 1 }} />
            <TouchableOpacity
              onPress={() => setSelectedPoint(null)}
              accessibilityRole="button"
              accessibilityLabel="Close tooltip"
            >
              <Ionicons name="close" size={18} color={textSecondaryColor} />
            </TouchableOpacity>
          </View>
        ) : null}

        <View style={styles.chartBody}>
          {loading ? (
            <View style={styles.center}>
              <ActivityIndicator color={primaryColor} />
              <ThemedText type="caption" style={{ color: textSecondaryColor }}>
                Loading…
              </ThemedText>
            </View>
          ) : error ? (
            <View style={styles.center}>
              <ThemedText type="caption" style={{ color: errorColor }}>
                {error}
              </ThemedText>
            </View>
          ) : !hasChart ? (
            <View style={styles.center}>
              <ThemedText type="caption" style={{ color: textSecondaryColor }}>
                Not enough data yet.
              </ThemedText>
            </View>
          ) : (
            <LineChart
              data={{
                labels: compactLabels(labels, 6),
                datasets: [
                  {
                    data: values,
                    color: () => trendColor,
                    strokeWidth: 2,
                  },
                ],
              }}
              width={chartWidth}
              height={240}
              withDots={values.length <= 16}
              withShadow={true}
              withInnerLines={true}
              withOuterLines={false}
              yLabelsOffset={10}
              chartConfig={{
                backgroundGradientFrom: surfaceColor,
                backgroundGradientTo: surfaceColor,
                color: () => trendColor,
                labelColor: () => textSecondaryColor,
                decimalPlaces: 4,
                propsForBackgroundLines: {
                  stroke: borderColor,
                  strokeDasharray: "4 6",
                },
                propsForDots: {
                  r: "3",
                  strokeWidth: "2",
                  stroke: surfaceColor,
                },
              }}
              style={styles.chart}
              bezier
              onDataPointClick={(p) => {
                const idx = p.index ?? 0;
                const label = labels[idx] || "";
                setSelectedPoint({ value: p.value, label });
              }}
            />
          )}
        </View>
      </View>

      <CurrencyPicker
        visible={showBasePicker}
        currencies={safeCurrencies}
        selectedCurrency={baseCurrency}
        onSelect={(c) => {
          setBaseCurrency(c);
          if (c === targetCurrency) {
            const next = safeCurrencies.find((x) => x !== c) || c;
            setTargetCurrency(next);
          }
          setShowBasePicker(false);
        }}
        onClose={() => setShowBasePicker(false)}
      />

      <CurrencyPicker
        visible={showTargetPicker}
        currencies={safeCurrencies}
        selectedCurrency={targetCurrency}
        onSelect={(c) => {
          setTargetCurrency(c);
          if (c === baseCurrency) {
            const next = safeCurrencies.find((x) => x !== c) || c;
            setBaseCurrency(next);
          }
          setShowTargetPicker(false);
        }}
        onClose={() => setShowTargetPicker(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    gap: 12,
  },
  controls: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    padding: 12,
    borderRadius: 16,
    borderWidth: StyleSheet.hairlineWidth,
  },
  pickerButton: {
    minWidth: 110,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  swapButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    borderRadius: 18,
    padding: 14,
    borderWidth: StyleSheet.hairlineWidth,
    gap: 6,
  },
  cardHeader: {
    gap: 10,
  },
  cardHeaderLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  accent: {
    width: 4,
    height: 34,
    borderRadius: 2,
  },
  cardHeaderText: {
    flex: 1,
    gap: 2,
  },
  periodRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 2,
  },
  periodChip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: StyleSheet.hairlineWidth,
  },
  statsRow: {
    marginTop: 10,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
    flexDirection: "row",
    gap: 12,
  },
  stat: {
    flex: 1,
    gap: 4,
  },
  tooltip: {
    marginTop: 10,
    borderRadius: 14,
    borderWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  chartBody: {
    marginTop: 10,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 260,
  },
  chart: {
    borderRadius: 14,
    paddingLeft: 8,
    paddingRight: 10,
  },
  center: {
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 18,
  },
});


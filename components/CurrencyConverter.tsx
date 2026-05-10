import React, { useCallback, useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  StyleSheet,
  Platform,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import CurrencyPicker from "./CurrencyPicker";
import MathCalculator from "./MathCalculator";
import CurrencyFlag from "./CurrencyFlag";
import MultiCurrencyConverter from "./MultiCurrencyConverter";
import AuthPromptModal from "./AuthPromptModal";
import notificationService from "@/lib/expoGoSafeNotificationService";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import { useUserData } from "@/hooks/useUserData";
import { usePreferredLocalCurrency } from "./LocationDetection";
import { hexToRgba } from "@/constants/theme";
import {
  fiatKeysFromConversionRates,
  isFiatCurrencyCode,
} from "@/constants/fiatCurrencyCodes";
import {
  canonicalDecimalToDisplay,
  displayDecimalToCanonical,
  formatGroupedNumber,
} from "@/lib/numberFormat";

interface CurrencyConverterProps {
  onNavigateToDashboard?: () => void;
  inModal?: boolean;
  /** When `inModal`, reports text suitable for the quick-action share control. */
  onShareableMessageChange?: (message: string | null) => void;
}

interface Data {
  result: string;
  documentation: string;
  terms_of_use: string;
  time_last_update_unix: number;
  time_last_update_utc: string;
  time_next_update_unix: number;
  time_next_update_utc: string;
  base_code: string;
  conversion_rates: {
    [key: string]: number;
  };
}

export default function CurrencyConverter({
  onNavigateToDashboard,
  inModal = false,
  onShareableMessageChange,
}: CurrencyConverterProps) {
  const { t, tWithParams } = useLanguage();
  const [amount, setAmount] = useState<string>("");
  const [convertedAmount, setConvertedAmount] = useState<string>("");
  const [currenciesData, setCurrenciesData] = useState<Data | null>(null);
  const [fromCurrency, setFromCurrency] = useState<string>("USD");
  const [toCurrency, setToCurrency] = useState<string>("EUR");
  const [loading, setLoading] = useState<boolean>(true);
  const [currencyList, setCurrencyList] = useState<string[]>([]);
  const [showFromPicker, setShowFromPicker] = useState<boolean>(false);
  const [showToPicker, setShowToPicker] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [showMultiCurrency, setShowMultiCurrency] = useState<boolean>(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState<boolean>(false);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [multiCurrencyShowAllTargets, setMultiCurrencyShowAllTargets] =
    useState<boolean>(false);

  const { user, formDraftResetEpoch } = useAuth();
  const {
    savedRates: { savedRates, saveRate },
    pickedRates: { trackRate },
  } = useUserData();
  const { currency: detectedCurrency } = usePreferredLocalCurrency();

  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const primaryColor = useThemeColor({}, "primary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const textInverseColor = useThemeColor({}, "textInverse");
  const accentColor = useThemeColor({}, "accent");

  useEffect(() => {
    const initializeApp = async () => {
      try {
        // Set a loading timeout to prevent infinite loading
        const loadingTimeout = setTimeout(() => {
          setLoading(false);
          console.log("⚠️ Loading timeout reached, setting default currencies");
          // Set defaults if something goes wrong
          setFromCurrency("USD");
          setToCurrency("AMD");
          clearTimeout(loadingTimeout);
          setLoading(false);
        }, 10000); // 10 second timeout

        const cachedData = await AsyncStorage.getItem("cachedExchangeRates");
        const cacheTimestamp = await AsyncStorage.getItem(
          "cachedRatesTimestamp"
        );
        const now = Date.now();
        const CACHE_DURATION = 3600000; // 1 hour

        if (
          cachedData &&
          cacheTimestamp &&
          now - parseInt(cacheTimestamp) < CACHE_DURATION
        ) {
          const transformedData: Data = JSON.parse(cachedData);
          setCurrenciesData(transformedData);
          setCurrencyList(
            fiatKeysFromConversionRates(transformedData.conversion_rates)
          );
          console.log("📦 Loaded cached exchange rates");

          // Wait for currency detection/loading before marking complete
          await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for state updates
          clearTimeout(loadingTimeout);
          setLoading(false);
          return;
        }

        console.log("🌐 Fetching fresh exchange rates...");
        const apiUrl =
          Constants.expoConfig?.extra?.apiUrl ||
          process.env.EXPO_PUBLIC_API_URL;
        const apiKey =
          Constants.expoConfig?.extra?.apiKey ||
          process.env.EXPO_PUBLIC_API_KEY;

        console.log("API Configuration:", {
          hasApiUrl: !!apiUrl,
          hasApiKey: !!apiKey,
          apiUrl,
          useConstants: !!Constants.expoConfig?.extra,
        });

        const response = await fetch(`${apiUrl}?apikey=${apiKey}`);

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const apiData = await response.json();

        if (!apiData.rates || !apiData.base) {
          throw new Error("Invalid API response structure");
        }

        const transformedData: Data = {
          result: "success",
          documentation: "https://www.currencyfreaks.com/documentation",
          terms_of_use: "https://www.currencyfreaks.com/terms",
          time_last_update_unix: Math.floor(Date.now() / 1000),
          time_last_update_utc: new Date().toUTCString(),
          time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
          time_next_update_utc: new Date(Date.now() + 3600000).toUTCString(),
          base_code: apiData.base || "USD",
          conversion_rates: apiData.rates || { USD: 1 },
        };

        if (!transformedData.conversion_rates["USD"]) {
          transformedData.conversion_rates["USD"] = 1;
        }

        await AsyncStorage.setItem(
          "cachedExchangeRates",
          JSON.stringify(transformedData)
        );
        await AsyncStorage.setItem("cachedRatesTimestamp", now.toString());

        setCurrenciesData(transformedData);
        setCurrencyList(
          fiatKeysFromConversionRates(transformedData.conversion_rates)
        );
        console.log("📡 Fresh exchange rates loaded");

        // Wait for currency detection/loading before marking complete
        await new Promise((resolve) => setTimeout(resolve, 100)); // Small delay for state updates
        clearTimeout(loadingTimeout);
        setLoading(false);
      } catch (error) {
        console.error("CurrencyFreaks API Fetch Error:", error);

        const cachedData = await AsyncStorage.getItem("cachedExchangeRates");
        if (cachedData) {
          setCurrenciesData(JSON.parse(cachedData));
          const parsed = JSON.parse(cachedData);
          setCurrencyList(
            fiatKeysFromConversionRates(parsed.conversion_rates || {})
          );
          console.log("📦 Using cached data after API error");
        } else {
          // Set default currencies if no cache available
          setFromCurrency("USD");
          setToCurrency("AMD");
          console.log("💡 No cached data available, using defaults");
        }

        setLoading(false);
      }
    };

    initializeApp();
  }, []);

  // Initialize notification service when component mounts
  useEffect(() => {
    const initializeNotifications = async () => {
      try {
        // Check if notificationService exists
        if (!notificationService) {
          console.log("⚠️ Notification service not available");
          return;
        }

        // Handle web platform gracefully - notifications not needed for mobile app web demo
        if (Platform.OS === "web") {
          console.log(
            "🌐 Web platform detected - notifications will work on iOS/Android"
          );
          return;
        }

        // Check if methods exist before calling
        if (typeof notificationService.requestPermissions === "function") {
          await notificationService.requestPermissions();
        }

        if (typeof notificationService.getPushToken === "function") {
          await notificationService.getPushToken();
        }

        if (
          typeof notificationService.setupNotificationListeners === "function"
        ) {
          await notificationService.setupNotificationListeners();
        }

        console.log("📱 Notification service initialized");
      } catch (error) {
        console.error("❌ Failed to initialize notifications:", error);
        // Don't throw error - let the app continue working
        // Don't show error to user for web platform or for non-critical failures
        try {
          if (Platform.OS !== "web" && error instanceof Error) {
            // Only show alert for non-web platforms and real errors
            Alert.alert(
              "Notification Setup",
              "Some notification features may not work properly. The app will continue to work normally."
            );
          }
        } catch (alertError) {
          console.log("Failed to show alert:", alertError);
        }
      }
    };

    // Use setTimeout to delay initialization and prevent blocking
    const timeoutId = setTimeout(async () => {
      await initializeNotifications();
    }, 100);

    return () => {
      clearTimeout(timeoutId);
    };
  }, []);

  // Background rate monitoring for alerts
  useEffect(() => {
    const checkRateAlerts = async () => {
      try {
        const alertsWithActiveSettings = savedRates.filter(
          (rate) =>
            rate.hasAlert &&
            rate.alertSettings?.isActive &&
            !rate.alertSettings.triggered
        );

        for (const rate of alertsWithActiveSettings) {
          if (!currenciesData) continue;

          const currentRate =
            currenciesData.conversion_rates[rate.toCurrency] /
            currenciesData.conversion_rates[rate.fromCurrency];

          const targetRate = rate.alertSettings!.targetRate;
          const direction = rate.alertSettings!.direction;

          // Check if alert should trigger
          let shouldTrigger = false;
          switch (direction) {
            case "above":
              shouldTrigger = currentRate > targetRate;
              break;
            case "below":
              shouldTrigger = currentRate < targetRate;
              break;
            case "equals":
              shouldTrigger = Math.abs(currentRate - targetRate) < 0.0001;
              break;
          }

          if (shouldTrigger) {
            // Mark as triggered and send notification
            // Note: Alert triggering logic would need to be updated to work with the new system
            // For now, just send the notification

            // Send immediate notification
            await notificationService.sendImmediateAlert({
              id: rate.id,
              fromCurrency: rate.fromCurrency,
              toCurrency: rate.toCurrency,
              targetRate,
              direction,
              isActive: true,
              lastChecked: Date.now(),
              triggered: false,
            });
          }
        }
      } catch (error) {
        console.error("❌ Error checking rate alerts:", error);
      }
    };

    // Check alerts every 5 minutes when the app is active
    if (
      savedRates.some((rate) => rate.hasAlert && rate.alertSettings?.isActive)
    ) {
      const interval = setInterval(checkRateAlerts, 5 * 60 * 1000);
      return () => clearInterval(interval);
    }
  }, [savedRates, currenciesData]);

  const handleSaveRate = async (): Promise<void> => {
    if (!fromCurrency || !toCurrency || !currenciesData) return;

    const fromRate = currenciesData.conversion_rates[fromCurrency];
    const toRate = currenciesData.conversion_rates[toCurrency];
    const rate = toRate / fromRate;

    const success = await saveRate(fromCurrency, toCurrency, rate);
    if (success) {
      // Track picked rate when rate is saved
      if (user) {
        await trackRate(fromCurrency, toCurrency, rate, "copied", {
          saved: true,
          timestamp: Date.now(),
        });
      }
      Alert.alert(
        t("converter.saveSuccessTitle"),
        user
          ? t("converter.saveSuccessMessage")
          : t("converter.saveSuccessLocalMessage")
      );
    } else {
      Alert.alert(
        t("converter.saveErrorTitle"),
        t("converter.saveErrorMessage")
      );
    }
  };

  const handleCalculatorResult = (result: number): void => {
    setAmount(result.toString());
    setShowCalculator(false);
  };

  const handleSwap = (): void => {
    setFromCurrency(toCurrency);
    setToCurrency(fromCurrency);
  };

  const updateHistory = async (from: string, to: string): Promise<void> => {
    const storedHistory = await AsyncStorage.getItem("currencyHistory");
    const history = storedHistory ? JSON.parse(storedHistory) : [];
    const newHistory = [
      { from, to },
      ...history.filter(
        (entry: { from: string; to: string }) =>
          entry.from !== from || entry.to !== to
      ),
    ].slice(0, 5);
    await AsyncStorage.setItem("currencyHistory", JSON.stringify(newHistory));
  };

  const updateFrequentlyUsed = async (currency: string): Promise<void> => {
    const storedUsage = await AsyncStorage.getItem("frequentlyUsedCurrencies");
    const usage = storedUsage ? JSON.parse(storedUsage) : {};

    // Increment usage count
    usage[currency] = (usage[currency] || 0) + 1;

    // Keep only top 20 most used currencies
    const sortedCurrencies = Object.entries(usage)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 20);

    const updatedUsage: { [key: string]: number } = {};
    sortedCurrencies.forEach(([curr, count]) => {
      updatedUsage[curr] = count as number;
    });

    await AsyncStorage.setItem(
      "frequentlyUsedCurrencies",
      JSON.stringify(updatedUsage)
    );
  };

  const saveLastConversion = async (
    amount: string,
    from: string,
    to: string
  ): Promise<void> => {
    await AsyncStorage.setItem(
      "lastConversion",
      JSON.stringify({
        amount,
        fromCurrency: from,
        toCurrency: to,
        timestamp: Date.now(),
      })
    );
  };

  const loadLastConversion = async (): Promise<void> => {
    try {
      const stored = await AsyncStorage.getItem("lastConversion");
      if (stored) {
        const lastConversion = JSON.parse(stored);
        // Only restore if it's less than 24 hours old
        const hoursSinceLastUse =
          (Date.now() - lastConversion.timestamp) / (1000 * 60 * 60);
        if (hoursSinceLastUse < 24) {
          if (lastConversion.amount != null && lastConversion.amount !== "") {
            const n = Number(lastConversion.amount);
            if (Number.isFinite(n) && n !== 0) setAmount(String(lastConversion.amount));
          }
          if (
            lastConversion.fromCurrency &&
            currencyList.includes(lastConversion.fromCurrency)
          ) {
            setFromCurrency(lastConversion.fromCurrency);
          }
          if (
            lastConversion.toCurrency &&
            currencyList.includes(lastConversion.toCurrency)
          ) {
            setToCurrency(lastConversion.toCurrency);
          }
        }
      }
    } catch (error) {
      console.log("Failed to load last conversion:", error);
    }
  };

  const refreshExchangeRates = async (): Promise<void> => {
    try {
      console.log("🔄 Refreshing exchange rates...");
      const apiUrl =
        Constants.expoConfig?.extra?.apiUrl || process.env.EXPO_PUBLIC_API_URL;
      const apiKey =
        Constants.expoConfig?.extra?.apiKey || process.env.EXPO_PUBLIC_API_KEY;

      const response = await fetch(`${apiUrl}?apikey=${apiKey}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const apiData = await response.json();

      if (!apiData.rates || !apiData.base) {
        throw new Error("Invalid API response structure");
      }

      const transformedData: Data = {
        result: "success",
        documentation: "https://www.currencyfreaks.com/documentation",
        terms_of_use: "https://www.currencyfreaks.com/terms",
        time_last_update_unix: Math.floor(Date.now() / 1000),
        time_last_update_utc: new Date().toUTCString(),
        time_next_update_unix: Math.floor(Date.now() / 1000) + 3600,
        time_next_update_utc: new Date(Date.now() + 3600000).toUTCString(),
        base_code: apiData.base || "USD",
        conversion_rates: apiData.rates || { USD: 1 },
      };

      if (!transformedData.conversion_rates["USD"]) {
        transformedData.conversion_rates["USD"] = 1;
      }

      await AsyncStorage.setItem(
        "cachedExchangeRates",
        JSON.stringify(transformedData)
      );
      await AsyncStorage.setItem("cachedRatesTimestamp", Date.now().toString());

      setCurrenciesData(transformedData);
      setCurrencyList(
        fiatKeysFromConversionRates(transformedData.conversion_rates)
      );
      console.log("📡 Exchange rates refreshed successfully");
    } catch (error) {
      console.error("Exchange rates refresh error:", error);
      // Try to use cached data if refresh fails
      const cachedData = await AsyncStorage.getItem("cachedExchangeRates");
      if (cachedData) {
        setCurrenciesData(JSON.parse(cachedData));
        const parsedRefresh = JSON.parse(cachedData);
        setCurrencyList(
          fiatKeysFromConversionRates(parsedRefresh.conversion_rates || {})
        );
        console.log("📦 Using cached data after refresh error");
      }
    }
  };

  const onRefresh = async (): Promise<void> => {
    setRefreshing(true);
    await refreshExchangeRates();
    setRefreshing(false);
  };

  useEffect(() => {
    if (fromCurrency && toCurrency) {
      updateHistory(fromCurrency, toCurrency);
    }
  }, [fromCurrency, toCurrency]);

  // Helper function to calculate exchange rate
  const getExchangeRate = useCallback((): number => {
    if (!currenciesData || !fromCurrency || !toCurrency) {
      return 0;
    }

    const fromRate = currenciesData.conversion_rates[fromCurrency];
    const toRate = currenciesData.conversion_rates[toCurrency];

    if (!fromRate || !toRate || isNaN(fromRate) || isNaN(toRate)) {
      return 0;
    }

    return toRate / fromRate;
  }, [currenciesData, fromCurrency, toCurrency]);

  useEffect(() => {
    if (!inModal || !onShareableMessageChange) return;
    if (!currenciesData || !convertedAmount || !fromCurrency || !toCurrency) {
      onShareableMessageChange(null);
      return;
    }
    const inputAmount = parseFloat(amount);
    if (!Number.isFinite(inputAmount) || inputAmount <= 0) {
      onShareableMessageChange(null);
      return;
    }
    const rate = getExchangeRate();
    if (!rate || !Number.isFinite(rate)) {
      onShareableMessageChange(null);
      return;
    }
    const line1 = `${formatGroupedNumber(inputAmount, 6)} ${fromCurrency} → ${formatGroupedNumber(parseFloat(convertedAmount), 6)} ${toCurrency}`;
    const line2 = `${t("converter.exchangeRate")}: 1 ${fromCurrency} = ${formatGroupedNumber(rate, 4)} ${toCurrency}`;
    onShareableMessageChange([t("converter.title"), line1, line2].join("\n"));
  }, [
    inModal,
    onShareableMessageChange,
    amount,
    convertedAmount,
    fromCurrency,
    toCurrency,
    currenciesData,
    getExchangeRate,
    t,
  ]);

  const handleConvert = useCallback(async (): Promise<void> => {
    console.log("🔄 Converting currencies...", {
      hasData: !!currenciesData,
      amount,
      fromCurrency,
      toCurrency,
      fromRate: currenciesData?.conversion_rates[fromCurrency],
      toRate: currenciesData?.conversion_rates[toCurrency],
    });

    // Comprehensive validation
    if (!currenciesData || !amount || !fromCurrency || !toCurrency) {
      setConvertedAmount("");
      console.log("❌ Missing required data for conversion");
      return;
    }

    const fromRate = currenciesData.conversion_rates[fromCurrency];
    const toRate = currenciesData.conversion_rates[toCurrency];

    if (
      !fromRate ||
      !toRate ||
      isNaN(fromRate) ||
      isNaN(toRate) ||
      fromRate === 0
    ) {
      setConvertedAmount("");
      console.log("❌ Invalid exchange rates:", {
        fromRate,
        toRate,
        fromCurrency,
        toCurrency,
      });
      return;
    }

    const inputAmount = parseFloat(amount);
    if (isNaN(inputAmount) || inputAmount <= 0) {
      setConvertedAmount("");
      console.log("❌ Invalid input amount:", amount);
      return;
    }

    try {
      // Proper currency conversion: amount in base currency * (target rate / source rate)
      const convertedValue = (inputAmount / fromRate) * toRate;

      if (isNaN(convertedValue) || !isFinite(convertedValue)) {
        setConvertedAmount("");
        console.log("❌ Invalid conversion result");
        return;
      }

      const formattedResult = convertedValue.toFixed(4);
      setConvertedAmount(formattedResult);
      console.log(
        `✅ Conversion successful: ${amount} ${fromCurrency} → ${formattedResult} ${toCurrency}`
      );
      console.log(
        `📊 Calculation: (${inputAmount} / ${fromRate}) * ${toRate} = ${convertedValue}`
      );

      // Track picked rate when conversion is performed
      if (user) {
        await trackRate(
          fromCurrency,
          toCurrency,
          convertedValue / inputAmount,
          "converted",
          {
            amount: inputAmount,
            result: convertedValue,
            timestamp: Date.now(),
          }
        );
      }
    } catch (error) {
      setConvertedAmount("");
      console.log("❌ Conversion error:", error);
    }
  }, [currenciesData, amount, fromCurrency, toCurrency]);

  // Critical: Call handleConvert whenever dependencies change
  useEffect(() => {
    // Only convert if we have all required data and currencies are properly set
    if (
      currenciesData &&
      fromCurrency &&
      toCurrency &&
      currenciesData.conversion_rates[fromCurrency] &&
      currenciesData.conversion_rates[toCurrency]
    ) {
      handleConvert();
    } else {
      // Clear conversion if data is incomplete
      setConvertedAmount("");
    }
  }, [handleConvert, currenciesData, fromCurrency, toCurrency]);

  const mergeHistoryWithList = (
    history: { from: string; to: string }[],
    list: string[]
  ): string[] => {
    const uniqueCurrencies = new Set();
    const mergedList: string[] = [];

    history.forEach((entry) => {
      if (!isFiatCurrencyCode(entry.from)) return;
      if (!uniqueCurrencies.has(entry.from)) {
        uniqueCurrencies.add(entry.from);
        mergedList.push(entry.from);
      }
    });

    list.forEach((currency) => {
      if (!uniqueCurrencies.has(currency)) {
        uniqueCurrencies.add(currency);
        mergedList.push(currency);
      }
    });

    return mergedList;
  };

  const [history, setHistory] = useState<{ from: string; to: string }[]>([]);

  useEffect(() => {
    const loadHistory = async () => {
      const stored = await AsyncStorage.getItem("currencyHistory");
      setHistory(stored ? JSON.parse(stored) : []);
    };
    loadHistory();
  }, [formDraftResetEpoch]);

  const mergedCurrencyList = mergeHistoryWithList(history, currencyList);

  // Load last conversion when currencies are loaded
  useEffect(() => {
    if (currencyList.length > 0) {
      loadLastConversion();
    }
  }, [currencyList]);

  useEffect(() => {
    if (formDraftResetEpoch === 0) return;
    setAmount("");
    setHistory([]);
    setFromCurrency("USD");
    if (currencyList.length > 0) {
      const to = currencyList.includes("AMD")
        ? "AMD"
        : (currencyList.find((c) => c !== "USD") ?? currencyList[0] ?? "AMD");
      setToCurrency(to);
    } else {
      setToCurrency("AMD");
    }
  }, [formDraftResetEpoch, currencyList]);

  // Set detected currency as default toCurrency if no saved preferences
  useEffect(() => {
    if (
      detectedCurrency &&
      detectedCurrency !== "USD" &&
      currencyList.includes(detectedCurrency)
    ) {
      // Only set if no saved preferences exist
      AsyncStorage.getItem("selectedToCurrency").then((savedTo) => {
        if (!savedTo) {
          setToCurrency(detectedCurrency);
          console.log(`🌍 Set detected currency: ${detectedCurrency}`);
        }
      });
    }
  }, [detectedCurrency, currencyList]);

  if (loading) {
    return (
      <ThemedView style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={primaryColor} />
        <ThemedText type="defaultSemiBold" style={styles.loadingLabel}>
          {t("common.loading")}
        </ThemedText>
      </ThemedView>
    );
  }

  return (
    <ScrollView
      style={[
        {
          flex: 1,
          padding: inModal ? 0 : 14,
          backgroundColor: inModal ? "transparent" : backgroundColor,
        },
      ]}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      <View
        style={[
          styles.converterCard,
          {
            backgroundColor: surfaceColor,
            borderColor,
            marginBottom: inModal ? 0 : 16,
          },
        ]}
      >
        <View
          style={[
            styles.amountPanel,
            {
              borderColor,
              backgroundColor: hexToRgba(accentColor, 0.1),
            },
          ]}
        >
          <View style={styles.amountLabelRow}>
            <View
              style={[
                styles.amountLabelIconWrap,
                { backgroundColor: hexToRgba(primaryColor, 0.15) },
              ]}
            >
              <Ionicons name="cash-outline" size={16} color={primaryColor} />
            </View>
            <ThemedText type="defaultSemiBold" style={styles.amountLabel}>
              {t("converter.amountLabel")}
            </ThemedText>
          </View>
          <TextInput
            style={[
              {
                backgroundColor: surfaceColor,
                borderColor,
                color: textColor,
              },
              styles.amountInput,
            ]}
            placeholder="0"
            value={canonicalDecimalToDisplay(amount)}
            onChangeText={(t) => setAmount(displayDecimalToCanonical(t))}
            keyboardType="numeric"
            placeholderTextColor={textSecondaryColor}
          />
        </View>

        <View
          style={[
            styles.currencyPairPanel,
            {
              backgroundColor: hexToRgba(primaryColor, 0.06),
              borderColor: hexToRgba(primaryColor, 0.16),
            },
          ]}
        >
          <TouchableOpacity
            style={[
              {
                backgroundColor: surfaceColor,
                borderColor,
              },
              styles.currencySelector,
            ]}
            onPress={() => setShowFromPicker(true)}
            activeOpacity={0.85}
          >
            <View style={styles.currencyFlagContainer}>
              <CurrencyFlag currency={fromCurrency} size={24} />
            </View>
            <View style={styles.currencyInfo}>
              <ThemedText style={[{ color: textColor }, styles.currencyCode]}>
                {fromCurrency}
              </ThemedText>
            </View>
            <View
              style={[
                styles.chevronBadge,
                { backgroundColor: surfaceSecondaryColor },
              ]}
            >
              <Ionicons name="chevron-down" size={16} color={primaryColor} />
            </View>
          </TouchableOpacity>

          <View style={styles.swapRow}>
            <TouchableOpacity
              style={[
                {
                  backgroundColor: primaryColor,
                  shadowColor: primaryColor,
                  borderColor: surfaceColor,
                },
                styles.swapButtonModern,
              ]}
              onPress={handleSwap}
              activeOpacity={0.88}
            >
              <Ionicons
                name="swap-vertical"
                size={19}
                color={textInverseColor}
              />
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={[
              {
                backgroundColor: surfaceColor,
                borderColor,
              },
              styles.currencySelector,
            ]}
            onPress={() => setShowToPicker(true)}
            activeOpacity={0.85}
          >
            <View style={styles.currencyFlagContainer}>
              <CurrencyFlag currency={toCurrency} size={24} />
            </View>
            <View style={styles.currencyInfo}>
              <ThemedText style={[{ color: textColor }, styles.currencyCode]}>
                {toCurrency}
              </ThemedText>
            </View>
            <View
              style={[
                styles.chevronBadge,
                { backgroundColor: surfaceSecondaryColor },
              ]}
            >
              <Ionicons name="chevron-down" size={16} color={primaryColor} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.resultSection}>
          <View
            style={[
              styles.resultCard,
              {
                backgroundColor: surfaceSecondaryColor,
                borderColor,
              },
            ]}
          >
            {amount && parseFloat(amount) > 0 && convertedAmount ? (
              <View style={styles.conversionDisplay}>
                <View
                  style={[
                    styles.resultHeroBanner,
                    { backgroundColor: hexToRgba(accentColor, 0.14) },
                  ]}
                >
                  <ThemedText
                    type="caption"
                    style={[
                      styles.resultPairCaption,
                      { color: textSecondaryColor },
                    ]}
                  >
                    {formatGroupedNumber(parseFloat(amount), 6)} {fromCurrency} →{" "}
                    {toCurrency}
                  </ThemedText>
                  <ThemedText
                    style={[{ color: primaryColor }, styles.outputAmount]}
                  >
                    {formatGroupedNumber(parseFloat(convertedAmount), 6)} {toCurrency}
                  </ThemedText>
                </View>
                <View style={styles.ratePillRow}>
                  <View
                    style={[
                      styles.ratePill,
                      {
                        backgroundColor: hexToRgba(primaryColor, 0.08),
                        borderColor: hexToRgba(primaryColor, 0.22),
                      },
                    ]}
                  >
                    <Ionicons
                      name="pulse-outline"
                      size={15}
                      color={primaryColor}
                    />
                    <ThemedText
                      style={[{ color: textSecondaryColor }, styles.ratePillText]}
                    >
                      {tWithParams("converter.exchangeRateResult", {
                        rateLabel: t("converter.exchangeRate"),
                        fromCurrency,
                        rate: formatGroupedNumber(getExchangeRate(), 4),
                        toCurrency,
                      })}
                    </ThemedText>
                  </View>
                </View>
              </View>
            ) : (
              <View style={styles.placeholderResult}>
                <View
                  style={[
                    styles.placeholderIconWrap,
                    { backgroundColor: hexToRgba(accentColor, 0.12) },
                  ]}
                >
                  <Ionicons
                    name="swap-horizontal-outline"
                    size={28}
                    color={primaryColor}
                  />
                </View>
                <ThemedText
                  style={[
                    { color: textSecondaryColor },
                    styles.placeholderText,
                  ]}
                >
                  {t("converter.placeholderResult")}
                </ThemedText>
              </View>
            )}
          </View>
        </View>

        <View style={styles.actionButtons}>
          <View style={styles.actionButtonsRow}>
            <TouchableOpacity
              style={[
                { backgroundColor: primaryColor, shadowColor: primaryColor },
                styles.saveRateButton,
              ]}
              onPress={handleSaveRate}
              activeOpacity={0.88}
            >
              <Ionicons
                name="bookmark-outline"
                size={17}
                color={textInverseColor}
                style={styles.saveRateIcon}
              />
              <ThemedText
                style={[{ color: textInverseColor }, styles.saveRateText]}
              >
                {t("converter.saveRateButton")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Multi-Currency Converter - Using Shared Component */}
      {showMultiCurrency && currenciesData && (
        <MultiCurrencyConverter
          currenciesData={currenciesData}
          fromCurrency={fromCurrency}
          onFromCurrencyChange={setFromCurrency}
          onClose={() => {
            setShowMultiCurrency(false);
            setMultiCurrencyShowAllTargets(false); // Reset when closing
          }}
          showAllTargets={multiCurrencyShowAllTargets}
          onShowMore={() => setMultiCurrencyShowAllTargets(true)}
        />
      )}

      {/* Currency Pickers */}
      <CurrencyPicker
        visible={showFromPicker}
        currencies={mergedCurrencyList}
        selectedCurrency={fromCurrency}
        onSelect={(currency) => setFromCurrency(currency)}
        onClose={() => setShowFromPicker(false)}
        onCurrencySelected={async (currency) => {
          updateFrequentlyUsed(currency);
          saveLastConversion(amount, currency, toCurrency);

          // Track picked rate when currency is selected
          if (currenciesData && toCurrency) {
            const rate =
              currenciesData.conversion_rates[toCurrency] /
              currenciesData.conversion_rates[currency];
            await trackRate(currency, toCurrency, rate, "viewed");
          }
        }}
      />

      <CurrencyPicker
        visible={showToPicker}
        currencies={mergedCurrencyList}
        selectedCurrency={toCurrency}
        onSelect={(currency) => setToCurrency(currency)}
        onClose={() => setShowToPicker(false)}
        onCurrencySelected={async (currency) => {
          updateFrequentlyUsed(currency);
          saveLastConversion(amount, fromCurrency, currency);

          // Track picked rate when currency is selected
          if (currenciesData && fromCurrency) {
            const rate =
              currenciesData.conversion_rates[currency] /
              currenciesData.conversion_rates[fromCurrency];
            await trackRate(fromCurrency, currency, rate, "viewed");
          }
        }}
      />

      {/* Calculator Modal */}
      <MathCalculator
        visible={showCalculator}
        onClose={() => setShowCalculator(false)}
        onResult={handleCalculatorResult}
        autoCloseAfterCalculation={false}
      />

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Create account to sync and enable alerts"
        message="Sign up to save your data and enable premium features"
        feature="general"
      />

    </ScrollView>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 14,
    padding: 24,
  },
  loadingLabel: {
    marginTop: 4,
  },
  converterCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  navHeader: {
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
  },
  navHeaderText: {
    fontWeight: "600",
    fontSize: 16,
    textAlign: "center",
  },
  enhancedHeader: {
    alignItems: "center",
    marginBottom: 20,
    padding: 16,
    backgroundColor: "#ffffff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e4e4e7",
  },
  headerLogoContainer: {
    marginBottom: 12,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: "#18181b",
    marginBottom: 8,
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    color: "#71717a",
    textAlign: "center",
  },
  featureToggles: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  featureToggle: {
    flex: 1,
    padding: 12,
    backgroundColor: "#EFEFEF",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e4e4e7",
    alignItems: "center",
  },
  featureToggleActive: {
    backgroundColor: "#e4e4e7",
    borderColor: "#F07E25",
  },
  featureToggleText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#404040",
    textAlign: "center",
  },
  mainConverterBox: {
    borderWidth: 2,
    borderColor: "#F07E25",
    borderRadius: 16,
    padding: 20,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
    marginBottom: 20,
  },
  converterTitleOld: {
    fontSize: 18,
    fontWeight: "600",
    color: "#18181b",
    textAlign: "center",
    marginBottom: 16,
  },
  convertedAmountBox: {
    padding: 20,
    borderRadius: 12,
    backgroundColor: "#f4f4f5",
    borderWidth: 2,
    borderColor: "#a1a1aa",
    marginBottom: 20,
    alignItems: "center",
  },
  convertedAmountText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#27272a",
    textAlign: "center",
  },
  amountInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    gap: 12,
  },
  amountInputOld: {
    flex: 1,
    borderWidth: 2,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    padding: 15,
    fontSize: 18,
    backgroundColor: "#ffffff",
    fontWeight: "500",
  },
  calculatorButton: {
    backgroundColor: "#F07E25",
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#C86418",
  },
  calculatorButtonText: {
    color: "white",
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  currencySelectors: {
    flexDirection: "column",
    alignItems: "stretch",
    justifyContent: "space-between",
    marginBottom: 20,
    gap: 12,
  },
  currencyButton: {
    flex: 1,
    padding: 15,
    borderWidth: 2,
    borderColor: "#d4d4d8",
    borderRadius: 12,
    backgroundColor: "#f4f4f5",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 60,
    maxHeight: 60,
  },
  currencyButtonContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
    paddingHorizontal: 4,
  },
  currencyButtonText: {
    color: "#18181b",
    fontWeight: "600",
    fontSize: 14,
    textAlign: "center",
    flexWrap: "nowrap",
    marginLeft: 6,
  },
  swapButton: {
    padding: 15,
    marginHorizontal: 15,
    backgroundColor: "#F07E25",
    borderRadius: 50,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#C86418",
  },
  swapButtonText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  swapArrows: {
    color: "#F07E25",
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "center",
  },
  saveButton: {
    backgroundColor: "#F07E25",
    padding: 15,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 20,
    borderWidth: 2,
    borderColor: "#C86418",
  },
  saveButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  disclaimer: {
    textAlign: "center",
    fontSize: 12,
    color: "#71717a",
    fontStyle: "italic",
  },
  amountPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 12,
  },
  amountLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 10,
  },
  amountLabelIconWrap: {
    width: 30,
    height: 30,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  amountLabel: {
    fontSize: 13,
    fontWeight: "600",
    letterSpacing: 0.2,
    flex: 1,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 18,
    fontWeight: "600",
  },

  currencyPairPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 10,
    marginBottom: 12,
    gap: 2,
  },
  currencySelector: {
    width: "100%",
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
  },
  currencyFlagContainer: {
    marginRight: 10,
  },
  currencyInfo: {
    flex: 1,
    minWidth: 0,
    justifyContent: "center",
  },
  currencyCode: {
    fontSize: 18,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  chevronBadge: {
    width: 30,
    height: 30,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  swapRow: {
    alignItems: "center",
    marginVertical: 4,
  },
  swapButtonModern: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 3,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.14,
    shadowRadius: 4,
    elevation: 3,
  },

  resultSection: {
    marginBottom: 14,
  },
  resultCard: {
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    overflow: "hidden",
  },
  conversionDisplay: {
    width: "100%",
    alignItems: "stretch",
  },
  resultHeroBanner: {
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 14,
    alignItems: "center",
    marginBottom: 10,
  },
  resultPairCaption: {
    fontSize: 12,
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 6,
    letterSpacing: 0.15,
  },
  outputAmount: {
    fontSize: 22,
    fontWeight: "700",
    letterSpacing: 0.2,
    textAlign: "center",
  },
  ratePillRow: {
    width: "100%",
    alignItems: "center",
  },
  ratePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 999,
    borderWidth: 1,
    maxWidth: "100%",
  },
  ratePillText: {
    flex: 1,
    fontSize: 12,
    fontWeight: "500",
  },
  placeholderResult: {
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 8,
  },
  placeholderIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  placeholderText: {
    fontSize: 14,
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: 20,
  },

  // Action Buttons
  actionButtons: {
    alignItems: "center",
  },
  actionButtonsRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
  },
  saveRateButton: {
    flex: 1,
    flexDirection: "row",
    borderRadius: 12,
    paddingVertical: 11,
    paddingHorizontal: 16,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },
  saveRateIcon: {
    marginRight: 0,
  },
  saveRateText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Alert,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect } from "@react-navigation/native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedText } from "./themed-text";
import CurrencyFlag from "./CurrencyFlag";
import CurrencyPicker from "./CurrencyPicker";
import DeleteAllButton from "./DeleteAllButton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { useConverterHistory } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import { UserDataService } from "@/lib/userDataService";
import { FormField } from "@/constants/theme";
import { fiatKeysFromConversionRates } from "@/constants/fiatCurrencyCodes";

interface MultiCurrencyConverterProps {
  currenciesData: any;
  fromCurrency?: string;
  onFromCurrencyChange?: (currency: string) => void;
  onClose?: () => void;
  style?: any;
  inModal?: boolean; // Hide close button when used inside DashboardModal
  showMoreEnabled?: boolean;
  onShowMore?: () => void;
  maxVisibleItems?: number;
  showAllTargets?: boolean;
  onShareableMessageChange?: (message: string | null) => void;
}

interface ConversionTarget {
  id: string;
  currency: string;
}

export default function MultiCurrencyConverter({
  currenciesData,
  fromCurrency: fromCurrencyProp,
  onFromCurrencyChange,
  onClose,
  style,
  inModal = false,
  showMoreEnabled = true,
  onShowMore,
  maxVisibleItems = 5,
  showAllTargets = false,
  onShareableMessageChange,
}: MultiCurrencyConverterProps) {
  const [amount, setAmount] = useState<string>("1");
  const [fromCurrency, setFromCurrency] = useState<string>(
    fromCurrencyProp || ""
  );
  const [showFromCurrencyPicker, setShowFromCurrencyPicker] = useState(false);
  const [conversionTargets, setConversionTargets] = useState<
    ConversionTarget[]
  >([]);
  const [conversions, setConversions] = useState<{ [key: string]: number }>({});
  const [currencyList, setCurrencyList] = useState<string[]>([]);
  const [showTargetCurrencyPicker, setShowTargetCurrencyPicker] =
    useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [closeButtonPressed, setCloseButtonPressed] = useState(false);
  const [hasLoadedData, setHasLoadedData] = useState(false);

  const { t } = useLanguage();
  const { user } = useAuth();
  const { saveConversion, converterHistory, refreshHistory } =
    useConverterHistory();

  // Theme colors
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const primaryColor = useThemeColor({}, "primary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const errorColor = useThemeColor({}, "error");
  const shadowColor = "#000000"; // Use black for shadows

  // Storage key for multi-currency converter state
  const STORAGE_KEY = "multiCurrencyConverterState";
  const STORAGE_TS_KEY = "multiCurrencyConverterState.ts";
  const DB_REFRESH_TTL_MS = 10 * 60 * 1000; // 10 minutes

  // Maximum number of visible targets before showing "Show More"
  // const MAX_VISIBLE_TARGETS = 5; // Now using maxVisibleItems prop

  // Debug current state on every render
  console.log("🎬 MultiCurrencyConverter: Component rendering...", {
    amount,
    fromCurrency,
    targetCount: conversionTargets.length,
    showAllTargets,
    shouldShowShowMoreButton:
      showMoreEnabled &&
      !showAllTargets &&
      conversionTargets.length > maxVisibleItems,
    targets: conversionTargets.map((t) => t.currency),
    hasCurrenciesData: !!currenciesData,
  });

  // #region agent log
  fetch('http://127.0.0.1:7338/ingest/0d9f3a3e-388a-412c-97f8-11d612315339',{
    method:'POST',
    headers:{
      'Content-Type':'application/json',
      'X-Debug-Session-Id':'f5505d',
    },
    body:JSON.stringify({
      sessionId:'f5505d',
      runId:'post-fix-1',
      hypothesisId:'H1',
      location:'MultiCurrencyConverter.tsx:90',
      message:'MultiCurrencyConverter render',
      data:{
        targetCount:conversionTargets.length,
        fromCurrency,
        hasDeleteAllButton:!!DeleteAllButton,
      },
      timestamp:Date.now(),
    }),
  }).catch(()=>{});
  // #endregion

  // Load available currencies
  useEffect(() => {
    if (currenciesData && currenciesData.conversion_rates) {
      setCurrencyList(
        fiatKeysFromConversionRates(currenciesData.conversion_rates)
      );
    }
  }, [currenciesData]);

  // Update fromCurrency when prop changes
  useEffect(() => {
    if (fromCurrencyProp) {
      setFromCurrency(fromCurrencyProp);
    }
  }, [fromCurrencyProp]);

  // Update prop when fromCurrency changes
  useEffect(() => {
    if (
      onFromCurrencyChange &&
      fromCurrency &&
      fromCurrency !== fromCurrencyProp
    ) {
      onFromCurrencyChange(fromCurrency);
    }
  }, [fromCurrency, onFromCurrencyChange, fromCurrencyProp]);

  // Calculate conversions
  const calculateConversions = useCallback(() => {
    if (
      !currenciesData ||
      !amount ||
      parseFloat(amount) <= 0 ||
      !fromCurrency
    ) {
      setConversions({});
      return;
    }

    const baseRate = currenciesData.conversion_rates?.[fromCurrency];
    if (!baseRate) {
      setConversions({});
      return;
    }

    const inputAmount = parseFloat(amount);
    const conversionResults: { [key: string]: number } = {};

    conversionTargets.forEach((target) => {
      if (currenciesData.conversion_rates?.[target.currency]) {
        const targetRate = currenciesData.conversion_rates[target.currency];
        const convertedAmount = (inputAmount / baseRate) * targetRate;
        conversionResults[target.currency] = convertedAmount;
      }
    });

    setConversions(conversionResults);
  }, [currenciesData, amount, fromCurrency, conversionTargets]);

  // Save conversion to history when calculations change
  const saveConversionToHistory = useCallback(async () => {
    if (
      user &&
      amount &&
      fromCurrency &&
      conversionTargets.length > 0 &&
      Object.keys(conversions).length > 0
    ) {
      try {
        const targetCurrencies = conversionTargets.map((target) => ({
          currency: target.currency,
          amount: conversions[target.currency] || 0,
          rate: currenciesData?.conversion_rates?.[target.currency] || 0,
        }));

        await saveConversion(
          fromCurrency,
          parseFloat(amount),
          targetCurrencies,
          conversions
        );
      } catch (error) {
        console.error("Error saving conversion to history:", error);
      }
    }
  }, [
    user,
    amount,
    fromCurrency,
    conversionTargets,
    conversions,
    currenciesData,
    saveConversion,
  ]);

  useEffect(() => {
    calculateConversions();
  }, [calculateConversions]);

  useEffect(() => {
    if (!inModal || !onShareableMessageChange) return;
    if (
      !fromCurrency ||
      conversionTargets.length === 0 ||
      Object.keys(conversions).length === 0
    ) {
      onShareableMessageChange(null);
      return;
    }
    const amt = parseFloat(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      onShareableMessageChange(null);
      return;
    }
    const lines = [
      t("converter.multiCurrency.section"),
      `${amt.toLocaleString()} ${fromCurrency}`,
      ...conversionTargets.map((target) => {
        const v = conversions[target.currency];
        const formatted =
          v !== undefined
            ? v.toLocaleString(undefined, { maximumFractionDigits: 4 })
            : "—";
        return `→ ${target.currency}: ${formatted}`;
      }),
    ];
    onShareableMessageChange(lines.join("\n"));
  }, [
    inModal,
    onShareableMessageChange,
    amount,
    fromCurrency,
    conversionTargets,
    conversions,
    t,
  ]);

  // Save to history whenever conversions are calculated
  useEffect(() => {
    if (Object.keys(conversions).length > 0) {
      saveConversionToHistory();
    }
  }, [conversions, saveConversionToHistory]);

  // Load saved state from storage or database
  const loadSavedState = useCallback(async () => {
    try {
      console.log("🔄 Loading saved multi-currency converter state...");

      // Always load local cache first (fast open; no refetch-on-open).
      const savedState = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedState) {
        const parsedState = JSON.parse(savedState);
        const {
          amount: savedAmount,
          fromCurrency: savedFromCurrency,
          conversionTargets: savedTargets,
        } = parsedState ?? {};

        if (savedAmount) setAmount(String(savedAmount));
        if (savedFromCurrency && currencyList.includes(savedFromCurrency)) {
          setFromCurrency(savedFromCurrency);
        }
        if (savedTargets && Array.isArray(savedTargets)) {
          const validTargets = savedTargets.filter(
            (target: ConversionTarget) => currencyList.includes(target.currency)
          );
          if (validTargets.length > 0) setConversionTargets(validTargets);
        }
      }

      setHasLoadedData(true);

      // Signed-in users: refresh from DB only if cache is stale (TTL).
      if (user) {
        const tsRaw = await AsyncStorage.getItem(STORAGE_TS_KEY);
        const ts = tsRaw ? Number(tsRaw) : 0;
        const stale =
          !ts || !Number.isFinite(ts) || Date.now() - ts > DB_REFRESH_TTL_MS;
        if (!stale) return;

        console.log(
          "👤 Authenticated user - refreshing from database (stale cache)"
        );
        const history = await UserDataService.getConverterHistory(1);
        if (history && history.length > 0) {
          const latestRecord = history[0];
          if (latestRecord.amount) setAmount(latestRecord.amount.toString());
          if (
            latestRecord.from_currency &&
            currencyList.includes(latestRecord.from_currency)
          ) {
            setFromCurrency(latestRecord.from_currency);
          }
          if (
            latestRecord.target_currencies &&
            Array.isArray(latestRecord.target_currencies)
          ) {
            const validTargets = latestRecord.target_currencies
              .filter((target: any) => currencyList.includes(target.currency))
              .map((target: any) => ({
                id: target.id || Date.now().toString() + Math.random(),
                currency: target.currency,
              }));
            if (validTargets.length > 0) setConversionTargets(validTargets);
          }
        }
        await AsyncStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
      }
    } catch (error) {
      console.error(
        "❌ Error loading saved multi-currency converter state:",
        error
      );
    }
  }, [currencyList, user]);

  // Save current state to storage or database
  const saveCurrentState = useCallback(async () => {
    try {
      // Always save locally to avoid reloading every time user opens the modal.
      const stateToSave = {
        amount,
        fromCurrency,
        conversionTargets,
        timestamp: Date.now(),
        version: "1.0",
      };
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(stateToSave));
      await AsyncStorage.setItem(STORAGE_TS_KEY, String(Date.now()));
    } catch (error) {
      console.error(
        "❌ MultiCurrencyConverter: Error saving multi-currency converter state:",
        error
      );
      // Don't throw error to prevent breaking the user flow
    }
  }, [amount, fromCurrency, conversionTargets, user, saveConversion]);

  // Track component lifecycle
  useEffect(() => {
    console.log("🚀 MultiCurrencyConverter: Component mounted");

    return () => {
      console.log("🔄 MultiCurrencyConverter: Component unmounting");
    };
  }, []);

  // Test AsyncStorage functionality
  useEffect(() => {
    const testAsyncStorage = async () => {
      try {
        // Test write
        const testKey = "test_multi_currency_" + Date.now();
        const testData = { test: true, timestamp: Date.now() };
        await AsyncStorage.setItem(testKey, JSON.stringify(testData));
        console.log("✅ MultiCurrencyConverter: Test write successful");

        // Test read
        const readData = await AsyncStorage.getItem(testKey);
        if (readData) {
          console.log(
            "✅ MultiCurrencyConverter: Test read successful:",
            readData
          );

          // Clean up test data
          await AsyncStorage.removeItem(testKey);
          console.log("✅ MultiCurrencyConverter: Test cleanup successful");
        } else {
          console.error(
            "❌ MultiCurrencyConverter: Test read failed - no data found"
          );
        }
      } catch (error) {
        console.error(
          "❌ MultiCurrencyConverter: AsyncStorage test failed:",
          error
        );
      }
    };

    testAsyncStorage();
  }, []);

  // Fallback loading mechanism - load immediately when component mounts
  useEffect(() => {
    console.log(
      "🚀 MultiCurrencyConverter: Component mounted, starting fallback loading"
    );

    const loadStateFallback = async () => {
      try {
        if (user) {
          // Authenticated user - load from database
          console.log("👤 Authenticated user - fallback loading from database");
          const history = await UserDataService.getConverterHistory(1);
          if (history && history.length > 0) {
            const latestRecord = history[0];
            console.log(
              "💾 MultiCurrencyConverter: Found database state data:",
              {
                fromCurrency: latestRecord.from_currency,
                amount: latestRecord.amount,
                targetsCount: latestRecord.target_currencies?.length,
              }
            );

            // Set state immediately, validation will happen when currencies are loaded
            if (latestRecord.amount) {
              setAmount(latestRecord.amount.toString());
              console.log(
                "✅ MultiCurrencyConverter: Set amount to:",
                latestRecord.amount
              );
            }

            if (latestRecord.from_currency) {
              setFromCurrency(latestRecord.from_currency);
              console.log(
                "✅ MultiCurrencyConverter: Set fromCurrency to:",
                latestRecord.from_currency
              );
            }

            if (
              latestRecord.target_currencies &&
              Array.isArray(latestRecord.target_currencies)
            ) {
              const targetsWithIds = latestRecord.target_currencies.map(
                (target: any) => ({
                  id: target.id || Date.now().toString() + Math.random(),
                  currency: target.currency,
                })
              );
              setConversionTargets(targetsWithIds);
              console.log(
                "✅ MultiCurrencyConverter: Set conversionTargets to:",
                targetsWithIds.map((t) => t.currency)
              );
            }

            console.log(
              "🔄 MultiCurrencyConverter: Fallback loading from database completed"
            );
          } else {
            console.log(
              "ℹ️ MultiCurrencyConverter: No saved state found in database"
            );
          }
          // Mark that data loading is complete
          setHasLoadedData(true);
        } else {
          // Non-authenticated user - load from AsyncStorage
          console.log(
            "📖 MultiCurrencyConverter: Attempting to read from AsyncStorage with key:",
            STORAGE_KEY
          );
          const savedState = await AsyncStorage.getItem(STORAGE_KEY);

          if (savedState) {
            console.log(
              "💾 MultiCurrencyConverter: Found saved state data:",
              savedState
            );
            const parsedState = JSON.parse(savedState);
            const {
              amount: savedAmount,
              fromCurrency: savedFromCurrency,
              conversionTargets: savedTargets,
            } = parsedState;

            console.log("🔍 MultiCurrencyConverter: Parsed saved state:", {
              savedAmount,
              savedFromCurrency,
              savedTargets,
              targetCount: savedTargets?.length || 0,
            });

            // Set state immediately, validation will happen when currencies are loaded
            if (savedAmount) {
              setAmount(savedAmount);
              console.log(
                "✅ MultiCurrencyConverter: Set amount to:",
                savedAmount
              );
            }

            if (savedFromCurrency) {
              setFromCurrency(savedFromCurrency);
              console.log(
                "✅ MultiCurrencyConverter: Set fromCurrency to:",
                savedFromCurrency
              );
            }

            if (savedTargets && Array.isArray(savedTargets)) {
              setConversionTargets(savedTargets);
              console.log(
                "✅ MultiCurrencyConverter: Set conversionTargets to:",
                savedTargets.map((t) => t.currency)
              );
            }

            console.log(
              "🔄 MultiCurrencyConverter: Fallback loading completed"
            );
          } else {
            console.log(
              "ℹ️ MultiCurrencyConverter: No saved state found in AsyncStorage"
            );
          }
          // Mark that data loading is complete
          setHasLoadedData(true);
        }
      } catch (error) {
        console.error(
          "❌ MultiCurrencyConverter: Error in fallback loading:",
          error
        );
      }
    };

    loadStateFallback();
  }, [user]);

  // Enhanced persistence mechanism with force refresh
  useEffect(() => {
    console.log(
      "🔄 MultiCurrencyConverter: Enhanced persistence mechanism running..."
    );

    const forceRefreshPersistedData = async () => {
      console.log(
        "🔄 MultiCurrencyConverter: Force refreshing persisted data..."
      );

      try {
        if (user) {
          // Authenticated user - force reload from database
          console.log("👤 Authenticated user - force refresh from database");
          const history = await UserDataService.getConverterHistory(1);
          if (history && history.length > 0) {
            const latestRecord = history[0];
            console.log(
              "🔍 MultiCurrencyConverter: Force refresh from DB - loaded state:",
              {
                fromCurrency: latestRecord.from_currency,
                amount: latestRecord.amount,
                targetsCount: latestRecord.target_currencies?.length || 0,
              }
            );

            // Always set the targets, even if they might be filtered later
            if (
              latestRecord.target_currencies &&
              Array.isArray(latestRecord.target_currencies)
            ) {
              const targetsWithIds = latestRecord.target_currencies.map(
                (target: any) => ({
                  id: target.id || Date.now().toString() + Math.random(),
                  currency: target.currency,
                })
              );
              console.log(
                "✅ MultiCurrencyConverter: Force setting conversionTargets from DB:",
                targetsWithIds.map((t) => t.currency)
              );
              setConversionTargets(targetsWithIds);
            }

            if (latestRecord.amount) {
              setAmount(latestRecord.amount.toString());
            }

            if (latestRecord.from_currency) {
              setFromCurrency(latestRecord.from_currency);
            }
          } else {
            console.log(
              "ℹ️ MultiCurrencyConverter: No saved state found in database during force refresh"
            );
          }
          // Mark that data loading is complete
          setHasLoadedData(true);
        } else {
          // Non-authenticated user - force reload from AsyncStorage
          console.log(
            "👤 Non-authenticated user - force refresh from AsyncStorage"
          );
          const savedState = await AsyncStorage.getItem(STORAGE_KEY);
          if (savedState) {
            const parsedState = JSON.parse(savedState);
            const {
              amount: savedAmount,
              fromCurrency: savedFromCurrency,
              conversionTargets: savedTargets,
            } = parsedState;

            console.log(
              "🔍 MultiCurrencyConverter: Force refresh - loaded state:",
              {
                savedAmount,
                savedFromCurrency,
                savedTargetsCount: savedTargets?.length || 0,
              }
            );

            // Always set the targets, even if they might be filtered later
            if (savedTargets && Array.isArray(savedTargets)) {
              console.log(
                "✅ MultiCurrencyConverter: Force setting conversionTargets:",
                savedTargets.map((t) => t.currency)
              );
              setConversionTargets(savedTargets);
            }

            if (savedAmount) {
              setAmount(savedAmount);
            }

            if (savedFromCurrency) {
              setFromCurrency(savedFromCurrency);
            }
          } else {
            console.log(
              "ℹ️ MultiCurrencyConverter: No saved state found during force refresh"
            );
          }
          // Mark that data loading is complete
          setHasLoadedData(true);
        }
      } catch (error) {
        console.error(
          "❌ MultiCurrencyConverter: Error during force refresh:",
          error
        );
      }
    };

    // Run immediately when component mounts
    forceRefreshPersistedData();
  }, [user]);

  // Validate and clean up loaded state when currency list is available
  useEffect(() => {
    if (currencyList.length > 0) {
      console.log(
        "💱 MultiCurrencyConverter: Currency list loaded, validating loaded state..."
      );
      console.log(
        "📋 MultiCurrencyConverter: Current currency list length:",
        currencyList.length
      );
      console.log(
        "🔍 MultiCurrencyConverter: Current fromCurrency:",
        fromCurrency
      );
      console.log(
        "🎯 MultiCurrencyConverter: Current conversionTargets:",
        conversionTargets.map((t) => t.currency)
      );

      // Clean up invalid currencies in fromCurrency
      if (fromCurrency && !currencyList.includes(fromCurrency)) {
        console.log(
          "⚠️ MultiCurrencyConverter: fromCurrency not in current list, clearing..."
        );
        setFromCurrency("");
      }

      // Clean up invalid currencies in conversionTargets
      const validTargets = conversionTargets.filter((target) =>
        currencyList.includes(target.currency)
      );

      console.log(
        "🧹 MultiCurrencyConverter: Valid targets after filtering:",
        validTargets.map((t) => t.currency)
      );

      if (validTargets.length !== conversionTargets.length) {
        console.log(
          "🔧 MultiCurrencyConverter: Cleaning up invalid target currencies, removing",
          conversionTargets.length - validTargets.length,
          "invalid ones"
        );
        setConversionTargets(validTargets);
      } else {
        console.log(
          "✅ MultiCurrencyConverter: All conversion targets are valid"
        );
      }

      console.log("✅ MultiCurrencyConverter: State validation completed");
    }
  }, [currencyList, fromCurrency, conversionTargets]);

  // Save state whenever it changes
  useEffect(() => {
    console.log("💾 MultiCurrencyConverter: State changed, scheduling save...");
    console.log("📊 MultiCurrencyConverter: Current state:", {
      amount,
      fromCurrency,
      targetCount: conversionTargets.length,
      targets: conversionTargets.map((t) => t.currency),
    });

    // Add a small delay to avoid excessive saves during rapid changes
    const timeoutId = setTimeout(() => {
      // Only save after data has been loaded to prevent saving initial/default state
      if (hasLoadedData) {
        if (amount || fromCurrency || conversionTargets.length > 0) {
          saveCurrentState();
        }
      }
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [
    amount,
    fromCurrency,
    conversionTargets,
    saveCurrentState,
    hasLoadedData,
  ]);

  // Load saved state once (avoid refetch on every open).
  useEffect(() => {
    loadSavedState();
  }, [user, loadSavedState]);

  // Add new target currency
  const addTargetCurrency = (currency: string) => {
    // Check if currency is already in the list
    const isDuplicate = conversionTargets.some(
      (target) => target.currency === currency
    );
    if (isDuplicate) {
      Alert.alert(
        t("error.duplicateCurrency"),
        `${currency} ${t("multi.alreadyInList")}`,
        [{ text: t("common.ok"), style: "default" }]
      );
      setShowTargetCurrencyPicker(false);
      setEditingTargetId(null);
      return;
    }

    const newTarget: ConversionTarget = {
      id: Date.now().toString(),
      currency,
    };
    setConversionTargets([...conversionTargets, newTarget]);
    setShowTargetCurrencyPicker(false);
    setEditingTargetId(null);
  };

  // Remove target currency
  const removeTargetCurrency = (id: string) => {
    setConversionTargets(
      conversionTargets.filter((target) => target.id !== id)
    );
  };

  // Remove all target currencies
  const removeAllTargetCurrencies = () => {
    Alert.alert(t("common.delete"), t("saved.deleteAllConfirm"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: () => setConversionTargets([]),
      },
    ]);
  };

  // Handle "From" currency selection
  const handleFromCurrencySelect = (currency: string) => {
    setFromCurrency(currency);
    setShowFromCurrencyPicker(false);
  };

  // Handle target currency selection
  const handleTargetCurrencySelect = (currency: string) => {
    if (editingTargetId) {
      // Update existing target
      setConversionTargets((targets) =>
        targets.map((target) =>
          target.id === editingTargetId ? { ...target, currency } : target
        )
      );
      setEditingTargetId(null);
    } else {
      // Add new target
      addTargetCurrency(currency);
    }
    setShowTargetCurrencyPicker(false);
  };

  // Start editing target currency
  const editTargetCurrency = (id: string) => {
    setEditingTargetId(id);
    setShowTargetCurrencyPicker(true);
  };

  return (
    <View style={[styles.container, style, inModal && styles.containerFlex]}>
      <ScrollView
        style={[
          inModal ? styles.scrollFlex : undefined,
          inModal && { backgroundColor: "transparent" },
        ]}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        nestedScrollEnabled
        showsVerticalScrollIndicator={inModal}
      >
        <View
          style={[
            {
              backgroundColor: surfaceColor,
              borderColor: borderColor,
              shadowColor: shadowColor,
            },
            styles.card,
          ]}
        >
          {!inModal && (
            <View style={styles.header}>
              {onClose && (
                <TouchableOpacity
                  style={[
                    {
                      backgroundColor: surfaceSecondaryColor,
                      shadowColor: shadowColor,
                    },
                    styles.closeButton,
                    closeButtonPressed && { backgroundColor: borderColor },
                  ]}
                  onPressIn={() => setCloseButtonPressed(true)}
                  onPressOut={() => setCloseButtonPressed(false)}
                  onPress={() => {
                    onClose();
                    setCloseButtonPressed(false);
                  }}
                  accessibilityRole="button"
                  accessibilityLabel="Go back"
                >
                  <Ionicons
                    name="arrow-back"
                    size={22}
                    color={closeButtonPressed ? textSecondaryColor : textColor}
                  />
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Amount Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={[{ color: textColor }, styles.label]}>
              {t("multi.amount")}
            </ThemedText>
            <TextInput
              style={[
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                  color: textColor,
                },
                styles.amountInput,
              ]}
              value={amount}
              onChangeText={setAmount}
              keyboardType="numeric"
              placeholder={t("converter.enterAmount")}
              placeholderTextColor={textSecondaryColor}
            />
          </View>

          {/* From Currency Input */}
          <View style={styles.inputGroup}>
            <ThemedText style={[{ color: textColor }, styles.label]}>
              {t("multi.from")}
            </ThemedText>
            <TouchableOpacity
              style={[
                {
                  backgroundColor: surfaceColor,
                  borderColor: borderColor,
                  shadowColor: shadowColor,
                },
                styles.currencyButton,
              ]}
              onPress={() => setShowFromCurrencyPicker(true)}
            >
              {fromCurrency ? (
                <>
                  <CurrencyFlag currency={fromCurrency} size={20} />
                  <ThemedText
                    style={[{ color: textColor }, styles.currencyButtonText]}
                  >
                    {fromCurrency}
                  </ThemedText>
                </>
              ) : (
                <ThemedText
                  style={[
                    { color: textSecondaryColor },
                    styles.currencyButtonPlaceholder,
                  ]}
                >
                  {t("multi.selectCurrency")}
                </ThemedText>
              )}
            </TouchableOpacity>
          </View>

          {/* Target Currencies Section */}
          <View style={styles.targetsSection}>
          <View style={styles.targetsHeader}>
            <ThemedText style={[{ color: textColor }, styles.label]}>
              {t("multi.convertTo")}
            </ThemedText>
            <TouchableOpacity
              style={[
                {
                  backgroundColor: surfaceSecondaryColor,
                  borderColor: primaryColor,
                  shadowColor: shadowColor,
                },
                styles.addButton,
              ]}
              onPress={() => {
                setEditingTargetId(null);
                setShowTargetCurrencyPicker(true);
              }}
            >
              <ThemedText
                style={[{ color: primaryColor }, styles.addButtonText]}
              >
                {t("multi.addCurrency")}
              </ThemedText>
            </TouchableOpacity>
          </View>

          {conversionTargets.length === 0 ? (
            <View
              style={[
                {
                  backgroundColor: surfaceSecondaryColor,
                  borderColor: borderColor,
                },
                styles.emptyState,
              ]}
            >
              <ThemedText
                style={[{ color: textSecondaryColor }, styles.emptyStateText]}
              >
                {t("multi.emptyState")}
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.targetsList}>
                {(() => {
                  const visibleTargets = showAllTargets
                    ? conversionTargets.slice(0, 20)
                    : conversionTargets.slice(
                        0,
                        Math.min(maxVisibleItems, 20)
                      );

                  return (
                    <View
                      key={`targets-${showAllTargets ? "all" : "limited"}`}
                    >
                      {visibleTargets.map((target) => (
                        <View
                          key={target.id}
                          style={[
                            {
                              backgroundColor: surfaceSecondaryColor,
                              borderColor: borderColor,
                              shadowColor: shadowColor,
                            },
                            styles.targetItem,
                          ]}
                        >
                          <TouchableOpacity
                            style={[
                              {
                                backgroundColor: surfaceColor,
                                borderColor: borderColor,
                                shadowColor: shadowColor,
                              },
                              styles.targetCurrencyButton,
                            ]}
                            onPress={() => editTargetCurrency(target.id)}
                          >
                            <CurrencyFlag
                              currency={target.currency}
                              size={18}
                            />
                            <ThemedText
                              style={[
                                { color: textColor },
                                styles.targetCurrencyText,
                              ]}
                            >
                              {target.currency}
                            </ThemedText>
                          </TouchableOpacity>

                          <View style={styles.conversionResult}>
                            <ThemedText
                              style={[
                                { color: primaryColor },
                                styles.conversionAmount,
                              ]}
                            >
                              {conversions[target.currency]?.toFixed(4) ||
                                "---"}
                            </ThemedText>
                          </View>

                          <TouchableOpacity
                            style={[
                              {
                                backgroundColor: errorColor,
                                shadowColor: errorColor,
                              },
                              styles.removeButton,
                            ]}
                            onPress={() => removeTargetCurrency(target.id)}
                          >
                            <ThemedText
                              style={[
                                { color: textColor },
                                styles.removeButtonText,
                              ]}
                            >
                              ×
                            </ThemedText>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  );
                })()}
              </View>

              {showMoreEnabled &&
                !showAllTargets &&
                conversionTargets.length > maxVisibleItems && (
                  <View style={{ marginTop: 12, alignItems: "center" }}>
                    <TouchableOpacity
                      style={[
                        {
                          backgroundColor: surfaceSecondaryColor,
                          shadowColor: shadowColor,
                        },
                        styles.showMoreButton,
                      ]}
                      onPress={() => {
                        if (onShowMore) {
                          onShowMore();
                        }
                      }}
                    >
                      <ThemedText
                        style={[{ color: primaryColor }, styles.showMoreText]}
                      >
                        {t("common.showMore").replace(
                          "more",
                          `up to 20 target currencies`
                        ) + " →"}
                      </ThemedText>
                    </TouchableOpacity>
                  </View>
                )}

              {conversionTargets.length > 1 && (
                <DeleteAllButton
                  onPress={removeAllTargetCurrencies}
                  count={conversionTargets.length}
                  translationKey="multi.deleteAll"
                />
              )}
            </>
          )}
        </View>
        </View>
      </ScrollView>

      {/* From Currency Picker */}
      <CurrencyPicker
        visible={showFromCurrencyPicker}
        currencies={currencyList}
        selectedCurrency={fromCurrency}
        onSelect={handleFromCurrencySelect}
        onClose={() => setShowFromCurrencyPicker(false)}
      />

      {/* Target Currency Picker */}
      <CurrencyPicker
        visible={showTargetCurrencyPicker}
        currencies={currencyList}
        selectedCurrency={
          editingTargetId
            ? conversionTargets.find((t) => t.id === editingTargetId)
                ?.currency || ""
            : ""
        }
        onSelect={handleTargetCurrencySelect}
        onClose={() => {
          setShowTargetCurrencyPicker(false);
          setEditingTargetId(null);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 24,
  },
  containerFlex: {
    flex: 1,
  },
  scrollFlex: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 24,
  },
  card: {
    borderRadius: FormField.radiusCard,
    borderWidth: 1,
    padding: 14,
  },
  header: {
    flexDirection: "row",
    justifyContent: "flex-end",
    marginBottom: 20,
  },
  title: {
    flex: 1,
    fontSize: 20,
    fontWeight: "700",
    paddingRight: 16,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButtonActive: {},
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: FormField.labelSize,
    fontWeight: "600",
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  amountInput: {
    borderWidth: 1,
    borderRadius: FormField.radiusInput,
    paddingHorizontal: FormField.padH,
    paddingVertical: FormField.padV,
    fontSize: FormField.fontSize,
    fontWeight: FormField.fontWeight,
  },
  currencyButton: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: FormField.radiusInput,
    paddingVertical: FormField.padV,
    paddingHorizontal: FormField.padH,
  },
  currencyButtonText: {
    marginLeft: 10,
    fontSize: 18,
    fontWeight: "600",
  },
  currencyButtonPlaceholder: {
    fontSize: 16,
    fontStyle: "italic",
  },
  targetsSection: {
    marginTop: 16,
  },
  targetsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  addButton: {
    paddingHorizontal: FormField.padH,
    paddingVertical: 10,
    borderRadius: FormField.radiusInput,
    borderWidth: 1,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
  },
  emptyStateText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  targetsList: {
    // Removed maxHeight for mobile compatibility - shows all items without scrolling
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "nowrap",
    paddingVertical: 4,
  },
  targetItem: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginVertical: 4,
    borderWidth: 1,
  },
  targetContent: {
    alignItems: "center",
  },
  targetHeader: {
    marginBottom: 8,
  },
  targetCurrencyButton: {
    flexDirection: "row",
    alignItems: "center",
    flexGrow: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 10,
    borderWidth: 1,
  },
  targetCurrencyText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: "600",
  },
  conversionResult: {
    marginHorizontal: 12,
    minWidth: 80,
    alignItems: "flex-end",
    justifyContent: "center",
  },
  conversionAmount: {
    fontSize: 12,
    fontWeight: "bold",
  },
  removeButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  removeButtonText: {
    fontSize: 16,
    fontWeight: "bold",
  },
  showMoreButton: {
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
});

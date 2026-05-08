import AuthPromptModal from "@/components/AuthPromptModal";
import BurgerMenu from "@/components/BurgerMenu";
import CurrencyConverter from "@/components/CurrencyConverter";
import QuickActionModal from "@/components/QuickActionModal";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import MultiCurrencyConverter from "@/components/MultiCurrencyConverter";
import SavedRates from "@/components/SavedRates";
import RateAlertManager from "@/components/RateAlertManager";
import MathCalculator from "@/components/MathCalculator";
import LoanCalculator from "@/components/LoanCalculator";
import OnboardingGuide from "@/components/OnboardingGuide";
import CurrencyRateCharts from "@/components/CurrencyRateCharts";
import ArmeniaFinanceModal, {
  type FinanceScreen,
} from "@/components/ArmeniaFinanceModal";
import ArmeniaFreelanceModal from "@/components/ArmeniaFreelanceModal";
import TouristCalculator from "@/components/TouristCalculator";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserData } from "@/hooks/useUserData";
import { getAsyncStorage } from "@/lib/storage";
import { fiatKeysFromConversionRates } from "@/constants/fiatCurrencyCodes";
import { hexToRgba } from "@/constants/theme";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

// Popular currencies for multi-currency conversion - moved outside component to avoid re-renders
const POPULAR_CURRENCIES = [
  "AMD",
  "RUB",
  "GEL",
  "EUR",
  "CAD",
  "GBP",
  "JPY",
  "AUD",
  "CHF",
  "CNY",
  "SEK",
  "NZD",
  "MXN",
  "SGD",
  "HKD",
  "NOK",
  "KRW",
  "TRY",
  "INR",
  "BRL",
  "ZAR",
  "AED",
];

export default function HomeScreen() {
  const { t } = useLanguage();
  const router = useRouter();
  const { user, signOut } = useAuth();
  const {
    savedRates: { savedRates, deleteRate, deleteAllRates, refreshRates },
    rateAlerts: { rateAlerts, refreshAlerts },
  } = useUserData();

  // Theme colors - must be called at top level
  const primaryColor = useThemeColor({}, "primary");
  const textInverseColor = useThemeColor({}, "textInverse");
  const pageBackgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const [currentView, setCurrentView] = useState<"dashboard" | "converter">(
    "dashboard"
  );
  const [showMultiCurrency, setShowMultiCurrency] = useState(false);
  const [multiCurrencyShowAllTargets, setMultiCurrencyShowAllTargets] =
    useState(false);
  const [showSavedRates, setShowSavedRates] = useState(false);
  const [showRateAlerts, setShowRateAlerts] = useState(false);
  const [showCalculator, setShowCalculator] = useState(false);
  const [showLoanCalculator, setShowLoanCalculator] = useState(false);
  const [showConverter, setShowConverter] = useState(false);
  const [showCharts, setShowCharts] = useState(false);
  const [showTouristCalc, setShowTouristCalc] = useState(false);
  const [shareTouristCalc, setShareTouristCalc] = useState<string | null>(null);
  const [shareConverter, setShareConverter] = useState<string | null>(null);
  const [shareMulti, setShareMulti] = useState<string | null>(null);
  const [shareSaved, setShareSaved] = useState<string | null>(null);
  const [shareAlerts, setShareAlerts] = useState<string | null>(null);
  const [shareCharts, setShareCharts] = useState<string | null>(null);
  const [shareAmFinance, setShareAmFinance] = useState<string | null>(null);
  const [showArmeniaFinance, setShowArmeniaFinance] = useState(false);
  const [armeniaFinanceScreen, setArmeniaFinanceScreen] =
    useState<FinanceScreen>("menu");
  const [shareAmFreelance, setShareAmFreelance] = useState<string | null>(null);
  const [showArmeniaFreelance, setShowArmeniaFreelance] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currenciesData, setCurrenciesData] = useState<any>(null);
  const [currencyList, setCurrencyList] = useState<string[]>([]);
  const [multiCurrencyLoading, setMultiCurrencyLoading] = useState(false);
  const [savedRatesMaxVisible, setSavedRatesMaxVisible] = useState(4);
  const [refreshing, setRefreshing] = useState(false);

  const closeAllQuickModals = useCallback(() => {
    setShowConverter(false);
    setShowMultiCurrency(false);
    setMultiCurrencyShowAllTargets(false);
    setShowSavedRates(false);
    setShowRateAlerts(false);
    setShowCharts(false);
    setShowTouristCalc(false);
    setShowCalculator(false);
    setShowLoanCalculator(false);
    setShowArmeniaFinance(false);
    setShowArmeniaFreelance(false);
    setShareConverter(null);
    setShareMulti(null);
    setShareSaved(null);
    setShareAlerts(null);
    setShareCharts(null);
    setShareTouristCalc(null);
    setShareAmFinance(null);
    setShareAmFreelance(null);
  }, []);

  const openArmeniaFinance = useCallback((screen: FinanceScreen = "menu") => {
    closeAllQuickModals();
    setCurrentView("dashboard");
    setArmeniaFinanceScreen(screen);
    setShowArmeniaFinance(true);
  }, [closeAllQuickModals]);

  const openCalculatorShortcut = useCallback(() => {
    closeAllQuickModals();
    setCurrentView("dashboard");
    setShowCalculator(true);
  }, [closeAllQuickModals]);

  const openConverterShortcut = useCallback(() => {
    closeAllQuickModals();
    setCurrentView("dashboard");
    setShowConverter(true);
  }, [closeAllQuickModals]);

  const openQuickFromMenu = useCallback(
    (open: () => void) => {
      closeAllQuickModals();
      setCurrentView("dashboard");
      open();
    },
    [closeAllQuickModals]
  );

  const burgerQuickActions = useMemo(
    () => ({
      openConverter: () => openQuickFromMenu(() => setShowConverter(true)),
      openMultiCurrency: () => openQuickFromMenu(() => setShowMultiCurrency(true)),
      openCharts: () => openQuickFromMenu(() => setShowCharts(true)),
      openSavedRates: () => openQuickFromMenu(() => setShowSavedRates(true)),
      openRateAlerts: () => openQuickFromMenu(() => setShowRateAlerts(true)),
      openCalculator: () => openQuickFromMenu(() => setShowCalculator(true)),
      openLoanCalculator: () => openQuickFromMenu(() => setShowLoanCalculator(true)),
      openArmeniaFinance: () => openQuickFromMenu(() => openArmeniaFinance("menu")),
    }),
    [openQuickFromMenu, openArmeniaFinance]
  );

  useEffect(() => {
    loadExchangeRates();
    checkOnboardingStatus();
  }, [user]);

  // Refresh saved rates when the modal opens
  useEffect(() => {
    if (showSavedRates) {
      refreshRates();
    }
  }, [showSavedRates, refreshRates]);

  // Refresh rate alerts when the modal opens
  useEffect(() => {
    if (showRateAlerts) {
      refreshAlerts();
    }
  }, [showRateAlerts, refreshAlerts]);

  // Refresh data when modals close
  useEffect(() => {
    if (!showSavedRates) {
      refreshRates();
    }
  }, [showSavedRates, refreshRates]);

  useEffect(() => {
    if (!showRateAlerts) {
      refreshAlerts();
    }
  }, [showRateAlerts, refreshAlerts]);

  // Refresh data when switching back to dashboard view
  useEffect(() => {
    if (currentView === "dashboard") {
      refreshRates();
      refreshAlerts();
    }
  }, [currentView, refreshRates, refreshAlerts]);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem(
        "onboardingCompleted"
      );

      // Show onboarding if:
      // 1. User hasn't completed onboarding, OR
      // 2. User account was created very recently (within last 24 hours)
      const shouldShowOnboarding =
        !onboardingCompleted ||
        (user &&
          user.created_at &&
          Date.now() - new Date(user.created_at).getTime() <
            24 * 60 * 60 * 1000);

      if (shouldShowOnboarding && user) {
        setShowOnboarding(true);
      }
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    }
  };

  const loadExchangeRates = async () => {
    try {
      setMultiCurrencyLoading(true);
      const storage = getAsyncStorage();
      const cachedData = await storage.getItem("cachedExchangeRates");
      if (cachedData) {
        const data = JSON.parse(cachedData);
        setCurrenciesData(data);
        setCurrencyList(fiatKeysFromConversionRates(data.conversion_rates));
        console.log("📦 Loaded cached exchange rates for multi-currency");
      } else {
        // Set default currencies if no cached data
        setCurrencyList(POPULAR_CURRENCIES);
        console.log("💡 No cached data available for multi-currency");
      }
    } catch (error) {
      console.error("Error loading cached rates:", error);
      setCurrencyList(POPULAR_CURRENCIES);
    } finally {
      setMultiCurrencyLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([loadExchangeRates(), refreshRates()]);
    setRefreshing(false);
  };

  const deleteSavedRate = async (id: string | number) => {
    const success = await deleteRate(id.toString());
    if (!success) {
      Alert.alert("Error", "Failed to delete rate. Please try again.");
    }
  };

  const deleteAllSavedRates = async () => {
    if (savedRates.length === 0) return;

    Alert.alert(t("saved.deleteAll"), t("saved.deleteAllConfirm"), [
      {
        text: t("common.cancel"),
        style: "cancel",
      },
      {
        text: t("saved.deleteAll"),
        style: "destructive",
        onPress: async () => {
          const success = await deleteAllRates();
          if (!success) {
            Alert.alert(
              "Error",
              "Failed to delete all rates. Please try again."
            );
          }
        },
      },
    ]);
  };

  const renderMainContent = (): React.ReactElement => {
    if (currentView === "converter") {
      return (
        <CurrencyConverter
          onNavigateToDashboard={() => setCurrentView("dashboard")}
        />
      );
    }

    // Dashboard view with widget system
    return (
      <ThemedView style={styles.dashboardContainer}>
        <View
          style={[
            styles.dashboardHeader,
            {
              borderBottomColor: borderColor,
              backgroundColor: surfaceColor,
            },
          ]}
        >
          <View style={styles.headerTopRow}>
            <View style={styles.heroBlock}>
              <Logo size={40} showText={false} />
            </View>
            <BurgerMenu quickActions={burgerQuickActions} />
          </View>
        </View>

        <ScrollView
          style={styles.dashboardScrollView}
          contentContainerStyle={styles.scrollContentContainer}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.quickActionsContainer}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.quickActionsTitle, { color: textColor }]}
            >
              {t("dashboard.quickActions")}
            </ThemedText>
            <View style={styles.quickActionsGrid}>
              {(
                [
                  {
                    id: "converter" as const,
                    labelKey: "quick.action.converter",
                    icon: "swap-horizontal" as const,
                    active: showConverter,
                    onPress: () => setShowConverter(!showConverter),
                  },
                  {
                    id: "calculator" as const,
                    labelKey: "quick.action.calculator",
                    icon: "calculator-outline" as const,
                    active: showCalculator,
                    onPress: () => setShowCalculator(!showCalculator),
                  },
                  {
                    id: "multi" as const,
                    labelKey: "quick.action.multiCurrency",
                    icon: "stats-chart-outline" as const,
                    active: showMultiCurrency,
                    onPress: () => setShowMultiCurrency(!showMultiCurrency),
                  },
                  {
                    id: "saved" as const,
                    labelKey: "quick.action.savedRates",
                    icon: "bookmark-outline" as const,
                    active: showSavedRates,
                    onPress: () => setShowSavedRates(!showSavedRates),
                  },
                  {
                    id: "alerts" as const,
                    labelKey: "quick.action.rateAlerts",
                    icon: "notifications-outline" as const,
                    active: showRateAlerts,
                    onPress: () => setShowRateAlerts(!showRateAlerts),
                  },
                  {
                    id: "charts" as const,
                    labelKey: "quick.action.charts",
                    icon: "trending-up-outline" as const,
                    active: showCharts,
                    onPress: () => setShowCharts(!showCharts),
                  },
                  {
                    id: "tourist" as const,
                    labelKey: "quick.action.touristCalc",
                    icon: "airplane-outline" as const,
                    active: showTouristCalc,
                    onPress: () => setShowTouristCalc(!showTouristCalc),
                  },
                ] as const
              ).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[
                    styles.quickTile,
                    {
                      // Use canvas tint, not surface (white) — white at any alpha reads as a solid block on the chart.
                      backgroundColor: item.active
                        ? hexToRgba(primaryColor, 0.22)
                        : hexToRgba(pageBackgroundColor, 0.52),
                      borderColor: item.active ? primaryColor : borderColor,
                      borderWidth: item.active ? 2 : 1,
                    },
                  ]}
                  onPress={item.onPress}
                >
                  <View
                    style={[
                      styles.quickTileIconWrap,
                      {
                        backgroundColor: item.active
                          ? hexToRgba(primaryColor, 0.14)
                          : "transparent",
                        borderWidth: 1,
                        borderColor: item.active
                          ? hexToRgba(primaryColor, 0.45)
                          : hexToRgba(borderColor, 0.55),
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={item.active ? primaryColor : textSecondaryColor}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[styles.quickTileLabel, { color: textColor }]}
                  >
                    {t(item.labelKey)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.amFinanceSection}>
            <ThemedText
              type="defaultSemiBold"
              style={[styles.quickActionsTitle, { color: textColor }]}
            >
              {t("amFinance.sectionTitle")}
            </ThemedText>
            <View style={styles.quickActionsGrid}>
              {(
                [
                  {
                    id: "paidLeave" as const,
                    labelKey: "amFinance.card.paidLeave",
                    icon: "umbrella-outline" as const,
                    screen: "paidLeave" as const,
                  },
                  {
                    id: "maternity" as const,
                    labelKey: "amFinance.card.maternity",
                    icon: "heart-outline" as const,
                    screen: "maternity" as const,
                  },
                  {
                    id: "amSalary" as const,
                    labelKey: "amFinance.card.salary",
                    icon: "cash-outline" as const,
                    screen: "salary" as const,
                  },
                  {
                    id: "deposit" as const,
                    labelKey: "amFinance.card.deposit",
                    icon: "trending-up-outline" as const,
                    screen: "deposit" as const,
                  },
                  {
                    id: "amFreelance" as const,
                    labelKey: "amFreelance.sectionTitle",
                    icon: "briefcase-outline" as const,
                    isFreelance: true as const,
                  },
                  {
                    id: "loanCalc" as const,
                    labelKey: "amFinance.card.loan",
                    icon: "wallet-outline" as const,
                    isLoan: true as const,
                  },
                ] as const
              ).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.85}
                  style={[
                    styles.quickTile,
                    {
                      backgroundColor: hexToRgba(pageBackgroundColor, 0.52),
                      borderColor,
                      borderWidth: 1,
                    },
                  ]}
                  onPress={() => {
                    if ("isLoan" in item && item.isLoan) {
                      openQuickFromMenu(() => setShowLoanCalculator(true));
                    } else if ("isFreelance" in item && item.isFreelance) {
                      closeAllQuickModals();
                      setCurrentView("dashboard");
                      setShowArmeniaFreelance(true);
                    } else {
                      openArmeniaFinance(item.screen);
                    }
                  }}
                >
                  <View
                    style={[
                      styles.quickTileIconWrap,
                      {
                        backgroundColor: "transparent",
                        borderWidth: 1,
                        borderColor: hexToRgba(borderColor, 0.55),
                      },
                    ]}
                  >
                    <Ionicons
                      name={item.icon}
                      size={24}
                      color={textSecondaryColor}
                    />
                  </View>
                  <ThemedText
                    type="caption"
                    numberOfLines={2}
                    ellipsizeMode="tail"
                    style={[styles.quickTileLabel, { color: textColor }]}
                  >
                    {t(item.labelKey)}
                  </ThemedText>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Additional Content to Enable Scrolling */}
          <View style={styles.bottomSpacer} />
        </ScrollView>

        <QuickActionModal
          visible={showConverter}
          onClose={() => {
            setShowConverter(false);
            setShareConverter(null);
          }}
          title={t("converter.title")}
          shareMessage={shareConverter}
          onOpenCalculator={openCalculatorShortcut}
        >
          <CurrencyConverter
            onNavigateToDashboard={() => setShowConverter(false)}
            inModal={true}
            onShareableMessageChange={setShareConverter}
          />
        </QuickActionModal>

        <QuickActionModal
          visible={showMultiCurrency}
          onClose={() => {
            setShowMultiCurrency(false);
            setMultiCurrencyShowAllTargets(false);
            setShareMulti(null);
          }}
          title={t("converter.multiCurrency.section")}
          shareMessage={shareMulti}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          {!currenciesData ? (
            <View style={styles.emptyState}>
              <ThemedText style={[styles.emptyStateText, { color: textSecondaryColor }]}>
                {t("converter.loadingRates")}
              </ThemedText>
              <TouchableOpacity
                style={[
                  styles.refreshButton,
                  { backgroundColor: primaryColor, shadowColor: primaryColor },
                ]}
                onPress={loadExchangeRates}
              >
                <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                  <Ionicons name="refresh-outline" size={18} color={textInverseColor} />
                  <ThemedText style={[styles.refreshButtonText, { color: textInverseColor }]}>
                    {t("converter.refreshData")}
                  </ThemedText>
                </View>
              </TouchableOpacity>
            </View>
          ) : (
            <MultiCurrencyConverter
              key="multiCurrencyConverter-main"
              currenciesData={currenciesData}
              fromCurrency="USD"
              onFromCurrencyChange={(currency) =>
                console.log("From currency changed to:", currency)
              }
              onClose={() => setShowMultiCurrency(false)}
              inModal={true}
              showAllTargets={multiCurrencyShowAllTargets}
              onShowMore={() => setMultiCurrencyShowAllTargets(true)}
              onShareableMessageChange={setShareMulti}
            />
          )}
        </QuickActionModal>

        <QuickActionModal
          visible={showSavedRates}
          onClose={() => {
            setShowSavedRates(false);
            setSavedRatesMaxVisible(4);
            setShareSaved(null);
          }}
          title={t("saved.title")}
          shareMessage={shareSaved}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          <ScrollView
            style={{ flex: 1, backgroundColor: "transparent" }}
            contentContainerStyle={{ paddingBottom: 24 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <SavedRates
              savedRates={savedRates}
              showSavedRates={true}
              onToggleVisibility={() => {
                setShowSavedRates(false);
                setSavedRatesMaxVisible(4);
              }}
              onSelectRate={() => {
                setShowSavedRates(false);
                setShowConverter(true);
              }}
              onDeleteRate={deleteSavedRate}
              onDeleteAll={deleteAllSavedRates}
              showMoreEnabled={true}
              onShowMore={() => setSavedRatesMaxVisible(savedRates.length)}
              maxVisibleItems={savedRatesMaxVisible}
              title=""
              containerStyle={{ marginBottom: 0 }}
              inModal={true}
              onShareableMessageChange={setShareSaved}
            />
          </ScrollView>
        </QuickActionModal>

        <QuickActionModal
          visible={showRateAlerts}
          onClose={() => {
            setShowRateAlerts(false);
            setShareAlerts(null);
          }}
          title={t("rateAlerts.title")}
          shareMessage={shareAlerts}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          <RateAlertManager
            savedRates={savedRates.map((rate) => ({
              id: rate.id,
              fromCurrency: rate.from_currency,
              toCurrency: rate.to_currency,
              rate: rate.rate,
              timestamp: new Date(rate.created_at).getTime(),
              hasAlert: false,
              alertSettings: undefined,
            }))}
            onRatesUpdate={() => {
              refreshAlerts();
            }}
            currenciesData={currenciesData}
            inModal={true}
            onShareableMessageChange={setShareAlerts}
          />
        </QuickActionModal>

        <QuickActionModal
          visible={showCharts}
          onClose={() => {
            setShowCharts(false);
            setShareCharts(null);
          }}
          title={t("charts.title")}
          shareMessage={shareCharts}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          <CurrencyRateCharts
            currencies={currencyList.length ? currencyList : POPULAR_CURRENCIES}
            inModal
            onShareableMessageChange={setShareCharts}
          />
        </QuickActionModal>

        <QuickActionModal
          visible={showTouristCalc}
          onClose={() => {
            setShowTouristCalc(false);
            setShareTouristCalc(null);
          }}
          title={t("quick.action.touristCalc")}
          shareMessage={shareTouristCalc}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          <TouristCalculator
            onShareableMessageChange={setShareTouristCalc}
            currenciesData={currenciesData}
          />
        </QuickActionModal>

        <MathCalculator
          visible={showCalculator}
          onClose={() => setShowCalculator(false)}
          autoCloseAfterCalculation={false}
        />

        <LoanCalculator
          visible={showLoanCalculator}
          onClose={() => setShowLoanCalculator(false)}
        />

        <QuickActionModal
          visible={showArmeniaFinance}
          onClose={() => {
            setShowArmeniaFinance(false);
            setArmeniaFinanceScreen("menu");
            setShareAmFinance(null);
          }}
          title={t("amFinance.sectionTitle")}
          shareMessage={shareAmFinance}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          <ArmeniaFinanceModal
            initialScreen={armeniaFinanceScreen}
            onShareableMessageChange={setShareAmFinance}
          />
        </QuickActionModal>

        <QuickActionModal
          visible={showArmeniaFreelance}
          onClose={() => {
            setShowArmeniaFreelance(false);
            setShareAmFreelance(null);
          }}
          title={t("amFreelance.sectionTitle")}
          shareMessage={shareAmFreelance}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
        >
          <ArmeniaFreelanceModal onShareableMessageChange={setShareAmFreelance} />
        </QuickActionModal>

      </ThemedView>
    );
  };

  // Show onboarding for new users
  if (showOnboarding) {
    return (
      <SafeAreaView
        style={{ flex: 1, backgroundColor: pageBackgroundColor }}
        edges={["top", "left", "right", "bottom"]}
      >
        <OnboardingGuide onComplete={() => setShowOnboarding(false)} />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView
      style={{ flex: 1, backgroundColor: "transparent" }}
      edges={["top", "left", "right", "bottom"]}
    >
      {renderMainContent()}

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Create account to sync and enable alerts"
        message="Sign up to save your data"
        feature="general"
      />
      <Footer />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  dashboardContainer: {
    flex: 1,
    backgroundColor: "transparent",
  },

  dashboardHeader: {
    paddingHorizontal: 18,
    paddingTop: 10,
    paddingBottom: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  heroBlock: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 14,
    minWidth: 0,
  },

  dashboardScrollView: {
    flex: 1,
  },
  scrollContentContainer: {
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 88,
  },

  quickActionsContainer: {
    marginTop: 4,
    marginBottom: 28,
  },
  amFinanceSection: {
    marginBottom: 28,
  },
  quickActionsTitle: {
    fontSize: 17,
    marginBottom: 14,
  },
  quickActionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  quickTile: {
    width: "48%",
    maxWidth: "48%",
    borderRadius: 18,
    paddingVertical: 16,
    paddingHorizontal: 14,
    alignItems: "stretch",
    gap: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 0,
  },
  quickTileIconWrap: {
    alignSelf: "flex-start",
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  quickTileLabel: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "600",
    width: "100%",
    flexShrink: 1,
  },

  bottomSpacer: {
    height: 60,
  },

  // State styles
  emptyState: {
    alignItems: "center",
    paddingVertical: 32,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 8,
    textAlign: "center",
  },
  emptyStateSubtext: {
    fontSize: 14,
    textAlign: "center",
  },
  refreshButton: {
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  refreshButtonText: {
    fontSize: 14,
    fontWeight: "600",
  },

  // Rate alerts styles
  rateAlertsSection: {
    marginBottom: 24,
  },
  rateAlertsCard: {
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 16,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  rateAlertsHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  rateAlertsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#18181b",
  },
  existingAlerts: {
    marginBottom: 24,
  },
  alertsList: {
    gap: 12,
  },
  alertItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
  },
  alertArrow: {
    marginHorizontal: 10,
    fontSize: 14,
    color: "#71717a",
  },
  alertText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: "600",
    color: "#F07E25",
  },
  createAlertSection: {
    marginTop: 20,
  },
  alertForm: {
    gap: 16,
  },
  alertFormRow: {
    flexDirection: "row",
    gap: 10,
  },
  alertInput: {
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.8)",
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    color: "#18181b",
  },
  conditionButton: {
    backgroundColor: "#F07E25",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    minWidth: 80,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  conditionButtonText: {
    color: "#ffffff",
    fontSize: 12,
    fontWeight: "600",
  },
  createAlertButton: {
    backgroundColor: "#FFB366",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  createAlertButtonText: {
    color: "#1c1c1e",
    fontSize: 15,
    fontWeight: "600",
  },
  showMoreAlertsText: {
    color: "#F07E25",
    fontSize: 13,
    fontWeight: "600",
    textAlign: "center",
    marginTop: 12,
  },
  sectionSubtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#404040",
    marginBottom: 16,
  },
  alertContent: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
  },
  alertDeleteButton: {
    padding: 8,
    backgroundColor: "rgba(63, 63, 70, 0.12)",
    borderRadius: 6,
    marginLeft: 12,
  },
  alertDeleteText: {
    fontSize: 14,
  },
  deleteAllInlineButton: {
    backgroundColor: "#E04D4D",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 16,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  deleteAllInlineText: {
    color: "white",
    fontWeight: "600",
    fontSize: 14,
  },
  currencyPickerButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "rgba(248, 250, 252, 0.8)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.6)",
    gap: 8,
  },
  currencyPickerButtonText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#18181b",
  },

  // Settings button
  settingsButton: {
    backgroundColor: "rgba(107, 114, 128, 0.9)",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    shadowColor: "#6b7280",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  settingsButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 10,
    textAlign: "center",
  },
});

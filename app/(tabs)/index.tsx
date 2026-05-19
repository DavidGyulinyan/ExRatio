import AuthPromptModal from "@/components/AuthPromptModal";
import BurgerMenu from "@/components/BurgerMenu";
import CurrencyConverter from "@/components/CurrencyConverter";
import QuickActionModal, {
  type QuickActionModalMenuItem,
} from "@/components/QuickActionModal";
import Footer from "@/components/Footer";
import Logo from "@/components/Logo";
import MultiCurrencyConverter from "@/components/MultiCurrencyConverter";
import SavedRates from "@/components/SavedRates";
import RateAlertManager from "@/components/RateAlertManager";
import MathCalculator from "@/components/MathCalculator";
import LoanCalculator from "@/components/LoanCalculator";
import OnboardingGuide from "@/components/OnboardingGuide";
import DashboardSortableTileGrid from "@/components/DashboardSortableTileGrid";
import CurrencyRateCharts from "@/components/CurrencyRateCharts";
import ArmeniaFinanceModal, {
  type FinanceScreen,
} from "@/components/ArmeniaFinanceModal";
import ArmeniaFreelanceModal, {
  type FreelanceScreen,
} from "@/components/ArmeniaFreelanceModal";
import ArmeniaTransportModal, {
  type TransportScreen,
} from "@/components/ArmeniaTransportModal";
import TouristCalculator from "@/components/TouristCalculator";
import { ThemedText } from "@/components/themed-text";
import { ThemedView } from "@/components/themed-view";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { useUserData } from "@/hooks/useUserData";
import { normalizeDashboardCardOrder } from "@/lib/dashboardCardOrder";
import { getHasCompletedOnboarding } from "@/lib/onboardingStorage";
import { getAsyncStorage } from "@/lib/storage";
import { fiatKeysFromConversionRates } from "@/constants/fiatCurrencyCodes";
import { hexToRgba } from "@/constants/theme";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  type LayoutChangeEvent,
  LayoutAnimation,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

function runDashboardReorderLayoutAnimation() {
  if (Platform.OS === "android") {
    UIManager.setLayoutAnimationEnabledExperimental?.(true);
  }
  LayoutAnimation.configureNext({
    duration: 420,
    update: {
      type: LayoutAnimation.Types.easeInEaseOut,
    },
  });
}

/** Min finger movement before grid tiles may swap (avoids jerk on initial touch noise). */
const DASHBOARD_DRAG_REORDER_ACTIVATION_PX = 14;

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

const QUICK_ACTION_STORAGE_KEY = "dashboardQuickActionOrderV1";

const QUICK_ACTION_ORDER_DEFAULT = [
  "converter",
  "calculator",
  "multi",
  "saved",
  "alerts",
  "charts",
  "tourist",
] as const;

type DashboardQuickActionId = (typeof QUICK_ACTION_ORDER_DEFAULT)[number];

const DEFAULT_QUICK_ACTION_ORDER: DashboardQuickActionId[] = [
  ...QUICK_ACTION_ORDER_DEFAULT,
];

const AM_FINANCE_CARDS_STORAGE_KEY = "dashboardAmFinanceCardsOrderV1";

const AM_FINANCE_CARD_ORDER_DEFAULT = [
  "paidLeave",
  "maternity",
  "amSalary",
  "deposit",
  "amFreelance",
  "loanCalc",
] as const;

type AmFinanceCardId = (typeof AM_FINANCE_CARD_ORDER_DEFAULT)[number];

const DEFAULT_AM_FINANCE_CARD_ORDER: AmFinanceCardId[] = [
  ...AM_FINANCE_CARD_ORDER_DEFAULT,
];

const AM_TRANSPORT_CARDS_STORAGE_KEY = "dashboardAmTransportCardsOrderV1";

const AM_TRANSPORT_CARD_ORDER_DEFAULT = ["tmCustoms", "tmDeal"] as const;

type AmTransportCardId = (typeof AM_TRANSPORT_CARD_ORDER_DEFAULT)[number];

const DEFAULT_AM_TRANSPORT_CARD_ORDER: AmTransportCardId[] = [
  ...AM_TRANSPORT_CARD_ORDER_DEFAULT,
];

export default function HomeScreen() {
  const { t } = useLanguage();
  const { user, formDraftResetEpoch } = useAuth();
  const {
    savedRates: { savedRates, deleteRate, deleteAllRates, refreshRates },
    rateAlerts: { refreshAlerts },
  } = useUserData();

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
  const [armeniaFreelanceScreen, setArmeniaFreelanceScreen] =
    useState<FreelanceScreen>("menu");
  const [shareAmTransport, setShareAmTransport] = useState<string | null>(null);
  const [showArmeniaTransport, setShowArmeniaTransport] = useState(false);
  const [armeniaTransportScreen, setArmeniaTransportScreen] =
    useState<TransportScreen>("menu");
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [currenciesData, setCurrenciesData] = useState<any>(null);
  const [currencyList, setCurrencyList] = useState<string[]>([]);
  const [savedRatesMaxVisible, setSavedRatesMaxVisible] = useState(4);
  const [refreshing, setRefreshing] = useState(false);

  const [quickActionOrder, setQuickActionOrder] = useState<
    DashboardQuickActionId[]
  >(() => [...DEFAULT_QUICK_ACTION_ORDER]);
  const [dashboardReorderMode, setDashboardReorderMode] = useState(false);
  const [quickActionDraggingId, setQuickActionDraggingId] =
    useState<DashboardQuickActionId | null>(null);
  const [dashboardCardOrdersHydrated, setDashboardCardOrdersHydrated] =
    useState(false);
  const quickActionGridRef = useRef<View | null>(null);
  const quickActionGridMetricsRef = useRef<{
    pageX: number;
    pageY: number;
    width: number;
    tileRowHeight: number;
  } | null>(null);
  const quickActionTileStepRef = useRef(128);
  const quickActionDragIndexRef = useRef<number | null>(null);

  const [amFinanceCardOrder, setAmFinanceCardOrder] = useState<
    AmFinanceCardId[]
  >(() => [...DEFAULT_AM_FINANCE_CARD_ORDER]);
  const [amFinanceDraggingId, setAmFinanceDraggingId] =
    useState<AmFinanceCardId | null>(null);
  const amFinanceGridRef = useRef<View | null>(null);
  const amFinanceGridMetricsRef = useRef<{
    pageX: number;
    pageY: number;
    width: number;
    tileRowHeight: number;
  } | null>(null);
  const amFinanceTileStepRef = useRef(128);
  const amFinanceDragIndexRef = useRef<number | null>(null);

  const [amTransportCardOrder, setAmTransportCardOrder] = useState<
    AmTransportCardId[]
  >(() => [...DEFAULT_AM_TRANSPORT_CARD_ORDER]);
  const [amTransportDraggingId, setAmTransportDraggingId] =
    useState<AmTransportCardId | null>(null);
  const amTransportGridRef = useRef<View | null>(null);
  const amTransportGridMetricsRef = useRef<{
    pageX: number;
    pageY: number;
    width: number;
    tileRowHeight: number;
  } | null>(null);
  const amTransportTileStepRef = useRef(128);
  const amTransportDragIndexRef = useRef<number | null>(null);

  /** First move after grab; ignore swaps until finger moves past this (avoids snap + LayoutAnimation on touch-down). */
  const dashboardDragReorderOriginRef = useRef<{
    x: number;
    y: number;
  } | null>(null);
  const resetDashboardDragReorderOrigin = useCallback(() => {
    dashboardDragReorderOriginRef.current = null;
  }, []);

  const clearDashboardDragState = useCallback(() => {
    setQuickActionDraggingId(null);
    setAmFinanceDraggingId(null);
    setAmTransportDraggingId(null);
    quickActionDragIndexRef.current = null;
    amFinanceDragIndexRef.current = null;
    amTransportDragIndexRef.current = null;
    dashboardDragReorderOriginRef.current = null;
  }, []);

  const toggleDashboardReorderMode = useCallback(() => {
    setDashboardReorderMode((prev) => !prev);
    clearDashboardDragState();
  }, [clearDashboardDragState]);

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
    setShowArmeniaTransport(false);
    setArmeniaFinanceScreen("menu");
    setArmeniaFreelanceScreen("menu");
    setArmeniaTransportScreen("menu");
    setShareConverter(null);
    setShareMulti(null);
    setShareSaved(null);
    setShareAlerts(null);
    setShareCharts(null);
    setShareTouristCalc(null);
    setShareAmFinance(null);
    setShareAmFreelance(null);
    setShareAmTransport(null);
  }, []);

  useEffect(() => {
    if (formDraftResetEpoch === 0) return;
    setShareTouristCalc(null);
    setShareConverter(null);
    setShareMulti(null);
    setShareSaved(null);
    setShareAlerts(null);
    setShareCharts(null);
    setShareAmFinance(null);
    setShareAmFreelance(null);
    setShareAmTransport(null);
  }, [formDraftResetEpoch]);

  const openArmeniaFinance = useCallback((screen: FinanceScreen = "menu") => {
    closeAllQuickModals();
    setCurrentView("dashboard");
    setArmeniaFinanceScreen(screen);
    setShowArmeniaFinance(true);
  }, [closeAllQuickModals]);

  const openArmeniaTransport = useCallback((screen: TransportScreen = "menu") => {
    closeAllQuickModals();
    setCurrentView("dashboard");
    setArmeniaTransportScreen(screen);
    setShowArmeniaTransport(true);
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

  const loadExchangeRates = useCallback(async () => {
    try {
      const storage = getAsyncStorage();
      const cachedData = await storage.getItem("cachedExchangeRates");
      if (cachedData) {
        const data = JSON.parse(cachedData);
        setCurrenciesData(data);
        setCurrencyList(fiatKeysFromConversionRates(data.conversion_rates));
      } else {
        setCurrencyList(POPULAR_CURRENCIES);
      }
    } catch (error) {
      console.error("Error loading cached rates:", error);
      setCurrencyList(POPULAR_CURRENCIES);
    }
  }, []);

  const checkOnboardingStatus = useCallback(async () => {
    try {
      if (!user?.id) {
        setShowOnboarding(false);
        return;
      }

      const done = await getHasCompletedOnboarding(user.id);
      setShowOnboarding(!done);
    } catch (error) {
      console.error("Failed to check onboarding status:", error);
    }
  }, [user]);

  const quickToolsMenu = useCallback(
    (excludeId: string): QuickActionModalMenuItem[] => {
      const go = (fn: () => void) => {
        closeAllQuickModals();
        setCurrentView("dashboard");
        fn();
      };
      const items: QuickActionModalMenuItem[] = [
        {
          id: "converter",
          label: t("quick.action.converter"),
          icon: "swap-horizontal-outline",
          onPress: () => go(() => setShowConverter(true)),
        },
        {
          id: "multi",
          label: t("quick.action.multiCurrency"),
          icon: "stats-chart-outline",
          onPress: () => go(() => setShowMultiCurrency(true)),
        },
        {
          id: "saved",
          label: t("quick.action.savedRates"),
          icon: "bookmark-outline",
          onPress: () => go(() => setShowSavedRates(true)),
        },
        {
          id: "alerts",
          label: t("quick.action.rateAlerts"),
          icon: "notifications-outline",
          onPress: () => go(() => setShowRateAlerts(true)),
        },
        {
          id: "charts",
          label: t("quick.action.charts"),
          icon: "trending-up-outline",
          onPress: () => go(() => setShowCharts(true)),
        },
        {
          id: "tourist",
          label: t("quick.action.touristCalc"),
          icon: "airplane-outline",
          onPress: () => go(() => setShowTouristCalc(true)),
        },
        {
          id: "amFinance",
          label: t("amFinance.sectionTitle"),
          icon: "flag-outline",
          onPress: () =>
            go(() => {
              setArmeniaFinanceScreen("menu");
              setShowArmeniaFinance(true);
            }),
        },
        {
          id: "amFreelance",
          label: t("amFreelance.sectionTitle"),
          icon: "briefcase-outline",
          onPress: () =>
            go(() => {
              setArmeniaFreelanceScreen("menu");
              setShowArmeniaFreelance(true);
            }),
        },
        {
          id: "amTransport",
          label: t("quick.action.amTransport"),
          icon: "car-sport-outline",
          onPress: () =>
            go(() => {
              setArmeniaTransportScreen("menu");
              setShowArmeniaTransport(true);
            }),
        },
        {
          id: "loan",
          label: t("quick.action.loanCalculator"),
          icon: "wallet-outline",
          onPress: () => go(() => setShowLoanCalculator(true)),
        },
        {
          id: "calculator",
          label: t("quick.action.calculator"),
          icon: "calculator-outline",
          onPress: () => go(() => setShowCalculator(true)),
        },
      ];
      return items.filter((item) => item.id !== excludeId);
    },
    [closeAllQuickModals, t, openArmeniaFinance]
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
      openLeavePayCalculator: () =>
        openQuickFromMenu(() => openArmeniaFinance("paidLeave")),
      openArmeniaFinance: () => openQuickFromMenu(() => openArmeniaFinance("menu")),
      openArmeniaTransport: () => openQuickFromMenu(() => openArmeniaTransport("menu")),
    }),
    [openQuickFromMenu, openArmeniaFinance, openArmeniaTransport]
  );

  const dashboardQuickActionDefs = useMemo(() => {
    const defs: Record<
      DashboardQuickActionId,
      {
        labelKey: string;
        icon: keyof typeof Ionicons.glyphMap;
        active: boolean;
        onPress: () => void;
      }
    > = {
      converter: {
        labelKey: "quick.action.converter",
        icon: "swap-horizontal",
        active: showConverter,
        onPress: () => setShowConverter(!showConverter),
      },
      calculator: {
        labelKey: "quick.action.calculator",
        icon: "calculator-outline",
        active: showCalculator,
        onPress: () => setShowCalculator(!showCalculator),
      },
      multi: {
        labelKey: "quick.action.multiCurrency",
        icon: "stats-chart-outline",
        active: showMultiCurrency,
        onPress: () => setShowMultiCurrency(!showMultiCurrency),
      },
      saved: {
        labelKey: "quick.action.savedRates",
        icon: "bookmark-outline",
        active: showSavedRates,
        onPress: () => setShowSavedRates(!showSavedRates),
      },
      alerts: {
        labelKey: "quick.action.rateAlerts",
        icon: "notifications-outline",
        active: showRateAlerts,
        onPress: () => setShowRateAlerts(!showRateAlerts),
      },
      charts: {
        labelKey: "quick.action.charts",
        icon: "trending-up-outline",
        active: showCharts,
        onPress: () => setShowCharts(!showCharts),
      },
      tourist: {
        labelKey: "quick.action.touristCalc",
        icon: "airplane-outline",
        active: showTouristCalc,
        onPress: () => setShowTouristCalc(!showTouristCalc),
      },
    };
    return defs;
  }, [
    showConverter,
    showCalculator,
    showMultiCurrency,
    showSavedRates,
    showRateAlerts,
    showCharts,
    showTouristCalc,
    openArmeniaFinance,
  ]);

  const dashboardAmFinanceCardDefs = useMemo(() => {
    const defs: Record<
      AmFinanceCardId,
      {
        labelKey: string;
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
      }
    > = {
      paidLeave: {
        labelKey: "amFinance.card.leavePay",
        icon: "calendar-outline",
        onPress: () => openArmeniaFinance("paidLeave"),
      },
      maternity: {
        labelKey: "amFinance.card.maternity",
        icon: "heart-outline",
        onPress: () => openArmeniaFinance("maternity"),
      },
      amSalary: {
        labelKey: "amFinance.card.salary",
        icon: "cash-outline",
        onPress: () => openArmeniaFinance("salary"),
      },
      deposit: {
        labelKey: "amFinance.card.deposit",
        icon: "trending-up-outline",
        onPress: () => openArmeniaFinance("deposit"),
      },
      amFreelance: {
        labelKey: "amFreelance.sectionTitle",
        icon: "briefcase-outline",
        onPress: () => {
          closeAllQuickModals();
          setCurrentView("dashboard");
          setArmeniaFreelanceScreen("menu");
          setShowArmeniaFreelance(true);
        },
      },
      loanCalc: {
        labelKey: "amFinance.card.loan",
        icon: "wallet-outline",
        onPress: () => openQuickFromMenu(() => setShowLoanCalculator(true)),
      },
    };
    return defs;
  }, [closeAllQuickModals, openArmeniaFinance, openQuickFromMenu]);

  const dashboardAmTransportCardDefs = useMemo(() => {
    const defs: Record<
      AmTransportCardId,
      {
        labelKey: string;
        icon: keyof typeof Ionicons.glyphMap;
        onPress: () => void;
      }
    > = {
      tmCustoms: {
        labelKey: "amTransport.card.customs",
        icon: "car-outline",
        onPress: () => openArmeniaTransport("vehicleCustoms"),
      },
      tmDeal: {
        labelKey: "amTransport.card.dealWorksheet",
        icon: "document-text-outline",
        onPress: () => openArmeniaTransport("vehicleDeal"),
      },
    };
    return defs;
  }, [openArmeniaTransport]);

  const dashboardTileGridStyles = useMemo(
    () => ({
      quickActionsGrid: styles.quickActionsGrid,
      quickTile: styles.quickTile,
      quickTileIconWrap: styles.quickTileIconWrap,
      quickTileLabel: styles.quickTileLabel,
    }),
    []
  );

  const remeasureQuickActionGrid = useCallback(() => {
    requestAnimationFrame(() => {
      quickActionGridRef.current?.measureInWindow((x, y, w) => {
        quickActionGridMetricsRef.current = {
          pageX: x,
          pageY: y,
          width: w,
          tileRowHeight: quickActionTileStepRef.current,
        };
      });
    });
  }, []);

  const onQuickActionTileLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      const gap = 12;
      const step = h + gap;
      if (quickActionTileStepRef.current !== step) {
        quickActionTileStepRef.current = step;
        remeasureQuickActionGrid();
      }
    },
    [remeasureQuickActionGrid]
  );

  const handleQuickActionDragMove = useCallback(
    (pageX: number, pageY: number) => {
      const m = quickActionGridMetricsRef.current;
      if (!m) return;
      const from = quickActionDragIndexRef.current;
      if (from === null) return;
      if (dashboardDragReorderOriginRef.current === null) {
        dashboardDragReorderOriginRef.current = { x: pageX, y: pageY };
        return;
      }
      const o = dashboardDragReorderOriginRef.current;
      if (
        Math.hypot(pageX - o.x, pageY - o.y) < DASHBOARD_DRAG_REORDER_ACTIVATION_PX
      ) {
        return;
      }
      const relX = pageX - m.pageX;
      const relY = pageY - m.pageY;
      if (relY < -24) return;
      const col = relX < m.width / 2 ? 0 : 1;
      const row = Math.max(0, Math.floor(relY / m.tileRowHeight));
      setQuickActionOrder((prev) => {
        let target = row * 2 + col;
        target = Math.min(Math.max(target, 0), prev.length - 1);
        if (target === from) return prev;
        runDashboardReorderLayoutAnimation();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(target, 0, item);
        quickActionDragIndexRef.current = target;
        return next;
      });
    },
    []
  );

  const remeasureAmFinanceGrid = useCallback(() => {
    requestAnimationFrame(() => {
      amFinanceGridRef.current?.measureInWindow((x, y, w) => {
        amFinanceGridMetricsRef.current = {
          pageX: x,
          pageY: y,
          width: w,
          tileRowHeight: amFinanceTileStepRef.current,
        };
      });
    });
  }, []);

  const onAmFinanceTileLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      const gap = 12;
      const step = h + gap;
      if (amFinanceTileStepRef.current !== step) {
        amFinanceTileStepRef.current = step;
        remeasureAmFinanceGrid();
      }
    },
    [remeasureAmFinanceGrid]
  );

  const handleAmFinanceDragMove = useCallback(
    (pageX: number, pageY: number) => {
      const m = amFinanceGridMetricsRef.current;
      if (!m) return;
      const from = amFinanceDragIndexRef.current;
      if (from === null) return;
      if (dashboardDragReorderOriginRef.current === null) {
        dashboardDragReorderOriginRef.current = { x: pageX, y: pageY };
        return;
      }
      const o = dashboardDragReorderOriginRef.current;
      if (
        Math.hypot(pageX - o.x, pageY - o.y) < DASHBOARD_DRAG_REORDER_ACTIVATION_PX
      ) {
        return;
      }
      const relX = pageX - m.pageX;
      const relY = pageY - m.pageY;
      if (relY < -24) return;
      const col = relX < m.width / 2 ? 0 : 1;
      const row = Math.max(0, Math.floor(relY / m.tileRowHeight));
      setAmFinanceCardOrder((prev) => {
        let target = row * 2 + col;
        target = Math.min(Math.max(target, 0), prev.length - 1);
        if (target === from) return prev;
        runDashboardReorderLayoutAnimation();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(target, 0, item);
        amFinanceDragIndexRef.current = target;
        return next;
      });
    },
    []
  );

  const remeasureAmTransportGrid = useCallback(() => {
    requestAnimationFrame(() => {
      amTransportGridRef.current?.measureInWindow((x, y, w) => {
        amTransportGridMetricsRef.current = {
          pageX: x,
          pageY: y,
          width: w,
          tileRowHeight: amTransportTileStepRef.current,
        };
      });
    });
  }, []);

  const onAmTransportTileLayout = useCallback(
    (e: LayoutChangeEvent) => {
      const h = e.nativeEvent.layout.height;
      const gap = 12;
      const step = h + gap;
      if (amTransportTileStepRef.current !== step) {
        amTransportTileStepRef.current = step;
        remeasureAmTransportGrid();
      }
    },
    [remeasureAmTransportGrid]
  );

  const handleAmTransportDragMove = useCallback(
    (pageX: number, pageY: number) => {
      const m = amTransportGridMetricsRef.current;
      if (!m) return;
      const from = amTransportDragIndexRef.current;
      if (from === null) return;
      if (dashboardDragReorderOriginRef.current === null) {
        dashboardDragReorderOriginRef.current = { x: pageX, y: pageY };
        return;
      }
      const o = dashboardDragReorderOriginRef.current;
      if (
        Math.hypot(pageX - o.x, pageY - o.y) < DASHBOARD_DRAG_REORDER_ACTIVATION_PX
      ) {
        return;
      }
      const relX = pageX - m.pageX;
      const relY = pageY - m.pageY;
      if (relY < -24) return;
      const col = relX < m.width / 2 ? 0 : 1;
      const row = Math.max(0, Math.floor(relY / m.tileRowHeight));
      setAmTransportCardOrder((prev) => {
        let target = row * 2 + col;
        target = Math.min(Math.max(target, 0), prev.length - 1);
        if (target === from) return prev;
        runDashboardReorderLayoutAnimation();
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        const next = [...prev];
        const [item] = next.splice(from, 1);
        next.splice(target, 0, item);
        amTransportDragIndexRef.current = target;
        return next;
      });
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [qaRaw, finRaw, trRaw] = await Promise.all([
          AsyncStorage.getItem(QUICK_ACTION_STORAGE_KEY),
          AsyncStorage.getItem(AM_FINANCE_CARDS_STORAGE_KEY),
          AsyncStorage.getItem(AM_TRANSPORT_CARDS_STORAGE_KEY),
        ]);
        if (cancelled) return;
        if (qaRaw) {
          const qaParsed = JSON.parse(qaRaw) as unknown;
          const qaMigrated = Array.isArray(qaParsed)
            ? qaParsed.filter((id) => id !== "vacation" && id !== "disabilityBenefit")
            : qaParsed;
          setQuickActionOrder(
            normalizeDashboardCardOrder(qaMigrated, DEFAULT_QUICK_ACTION_ORDER)
          );
        }
        if (finRaw) {
          const parsed = JSON.parse(finRaw) as unknown;
          const migrated = Array.isArray(parsed)
            ? parsed.map((id) => (id === "disabilityBenefit" ? "paidLeave" : id))
            : parsed;
          setAmFinanceCardOrder(
            normalizeDashboardCardOrder(migrated, DEFAULT_AM_FINANCE_CARD_ORDER)
          );
        }
        if (trRaw) {
          setAmTransportCardOrder(
            normalizeDashboardCardOrder(
              JSON.parse(trRaw) as unknown,
              DEFAULT_AM_TRANSPORT_CARD_ORDER
            )
          );
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setDashboardCardOrdersHydrated(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!dashboardCardOrdersHydrated) return;
    void AsyncStorage.setItem(
      QUICK_ACTION_STORAGE_KEY,
      JSON.stringify(quickActionOrder)
    );
  }, [dashboardCardOrdersHydrated, quickActionOrder]);

  useEffect(() => {
    if (!dashboardCardOrdersHydrated) return;
    void AsyncStorage.setItem(
      AM_FINANCE_CARDS_STORAGE_KEY,
      JSON.stringify(amFinanceCardOrder)
    );
  }, [dashboardCardOrdersHydrated, amFinanceCardOrder]);

  useEffect(() => {
    if (!dashboardCardOrdersHydrated) return;
    void AsyncStorage.setItem(
      AM_TRANSPORT_CARDS_STORAGE_KEY,
      JSON.stringify(amTransportCardOrder)
    );
  }, [dashboardCardOrdersHydrated, amTransportCardOrder]);

  useEffect(() => {
    void loadExchangeRates();
    void checkOnboardingStatus();
  }, [user, loadExchangeRates, checkOnboardingStatus]);

  useEffect(() => {
    refreshRates();
  }, [showSavedRates, refreshRates]);

  useEffect(() => {
    refreshAlerts();
  }, [showRateAlerts, refreshAlerts]);

  useEffect(() => {
    if (currentView === "dashboard") {
      refreshRates();
      refreshAlerts();
    }
  }, [currentView, refreshRates, refreshAlerts]);

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
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: 10,
              }}
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  dashboardReorderMode
                    ? t("dashboard.finishReorder")
                    : t("dashboard.reorderCards")
                }
                activeOpacity={0.85}
                onPress={toggleDashboardReorderMode}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: dashboardReorderMode ? 2 : 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: primaryColor,
                  backgroundColor: dashboardReorderMode
                    ? hexToRgba(primaryColor, 0.16)
                    : hexToRgba(primaryColor, 0.09),
                }}
              >
                <Ionicons
                  name={
                    dashboardReorderMode ? "checkmark-circle" : "swap-vertical"
                  }
                  size={22}
                  color={primaryColor}
                />
              </TouchableOpacity>
              <BurgerMenu quickActions={burgerQuickActions} />
            </View>
          </View>
          {dashboardReorderMode ? (
            <ThemedText
              type="caption"
              style={{
                color: textSecondaryColor,
                marginTop: 8,
                lineHeight: 18,
              }}
            >
              {t("dashboard.reorderCardsHint")}
            </ThemedText>
          ) : null}
        </View>

        <ScrollView
          style={styles.dashboardScrollView}
          contentContainerStyle={styles.scrollContentContainer}
          nestedScrollEnabled
          showsVerticalScrollIndicator={false}
          scrollEnabled
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.quickActionsContainer}>
            <View
              style={{
                marginBottom: dashboardReorderMode ? 8 : 14,
              }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.quickActionsTitle,
                  {
                    color: textColor,
                    marginBottom: 0,
                  },
                ]}
              >
                {t("dashboard.quickActions")}
              </ThemedText>
            </View>
            <DashboardSortableTileGrid
              order={quickActionOrder}
              defs={dashboardQuickActionDefs}
              reorderMode={dashboardReorderMode}
              draggingId={quickActionDraggingId}
              onDraggingIdChange={setQuickActionDraggingId}
              dragIndexRef={quickActionDragIndexRef}
              gridRef={quickActionGridRef}
              onGridLayout={remeasureQuickActionGrid}
              onFirstTileLayout={onQuickActionTileLayout}
              onDragMove={handleQuickActionDragMove}
              onDragSessionStart={resetDashboardDragReorderOrigin}
              onDragSessionEnd={resetDashboardDragReorderOrigin}
              t={t}
              gridStyles={dashboardTileGridStyles}
              primaryColor={primaryColor}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
              borderColor={borderColor}
              pageBackgroundColor={pageBackgroundColor}
              variant="quick"
            />
          </View>

          <View style={styles.amFinanceSection}>
            <View
              style={{
                marginBottom: dashboardReorderMode ? 8 : 14,
              }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.quickActionsTitle,
                  {
                    color: textColor,
                    marginBottom: 0,
                  },
                ]}
              >
                {t("amFinance.sectionTitle")}
              </ThemedText>
            </View>
            <DashboardSortableTileGrid
              order={amFinanceCardOrder}
              defs={dashboardAmFinanceCardDefs}
              reorderMode={dashboardReorderMode}
              draggingId={amFinanceDraggingId}
              onDraggingIdChange={setAmFinanceDraggingId}
              dragIndexRef={amFinanceDragIndexRef}
              gridRef={amFinanceGridRef}
              onGridLayout={remeasureAmFinanceGrid}
              onFirstTileLayout={onAmFinanceTileLayout}
              onDragMove={handleAmFinanceDragMove}
              onDragSessionStart={resetDashboardDragReorderOrigin}
              onDragSessionEnd={resetDashboardDragReorderOrigin}
              t={t}
              gridStyles={dashboardTileGridStyles}
              primaryColor={primaryColor}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
              borderColor={borderColor}
              pageBackgroundColor={pageBackgroundColor}
              variant="plain"
            />
          </View>

          <View
            style={[
              styles.amTransportSection,
              { borderTopColor: hexToRgba(borderColor, 0.4) },
            ]}
          >
            <View
              style={{
                marginBottom: dashboardReorderMode ? 8 : 14,
              }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.quickActionsTitle,
                  {
                    color: textColor,
                    marginBottom: 0,
                  },
                ]}
              >
                {t("amTransport.sectionTitle")}
              </ThemedText>
            </View>
            <DashboardSortableTileGrid
              order={amTransportCardOrder}
              defs={dashboardAmTransportCardDefs}
              reorderMode={dashboardReorderMode}
              draggingId={amTransportDraggingId}
              onDraggingIdChange={setAmTransportDraggingId}
              dragIndexRef={amTransportDragIndexRef}
              gridRef={amTransportGridRef}
              onGridLayout={remeasureAmTransportGrid}
              onFirstTileLayout={onAmTransportTileLayout}
              onDragMove={handleAmTransportDragMove}
              onDragSessionStart={resetDashboardDragReorderOrigin}
              onDragSessionEnd={resetDashboardDragReorderOrigin}
              t={t}
              gridStyles={dashboardTileGridStyles}
              primaryColor={primaryColor}
              textColor={textColor}
              textSecondaryColor={textSecondaryColor}
              borderColor={borderColor}
              pageBackgroundColor={pageBackgroundColor}
              variant="plain"
            />
          </View>

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
          menuItems={quickToolsMenu("converter")}
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
          menuItems={quickToolsMenu("multi")}
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
          menuItems={quickToolsMenu("saved")}
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
          menuItems={quickToolsMenu("alerts")}
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
          menuItems={quickToolsMenu("charts")}
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
          menuItems={quickToolsMenu("tourist")}
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
          toolsMenuItems={quickToolsMenu("calculator")}
        />

        <LoanCalculator
          visible={showLoanCalculator}
          onClose={() => setShowLoanCalculator(false)}
          menuItems={quickToolsMenu("loan")}
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
          menuItems={quickToolsMenu("amFinance")}
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
            setArmeniaFreelanceScreen("menu");
            setShareAmFreelance(null);
          }}
          title={t("amFreelance.sectionTitle")}
          shareMessage={shareAmFreelance}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
          menuItems={quickToolsMenu("amFreelance")}
        >
          <ArmeniaFreelanceModal
            initialScreen={armeniaFreelanceScreen}
            onShareableMessageChange={setShareAmFreelance}
          />
        </QuickActionModal>

        <QuickActionModal
          visible={showArmeniaTransport}
          onClose={() => {
            setShowArmeniaTransport(false);
            setArmeniaTransportScreen("menu");
            setShareAmTransport(null);
          }}
          title={t("amTransport.modalTitle")}
          shareMessage={shareAmTransport}
          onOpenCalculator={openCalculatorShortcut}
          onOpenConverter={openConverterShortcut}
          menuItems={quickToolsMenu("amTransport")}
        >
          <ArmeniaTransportModal
            initialScreen={armeniaTransportScreen}
            onShareableMessageChange={setShareAmTransport}
          />
        </QuickActionModal>

      </ThemedView>
    );
  };

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
  amTransportSection: {
    marginTop: 4,
    marginBottom: 28,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
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
});

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
import SortableQuickTile from "@/components/SortableQuickTile";
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
import { getAsyncStorage } from "@/lib/storage";
import { fiatKeysFromConversionRates } from "@/constants/fiatCurrencyCodes";
import { hexToRgba } from "@/constants/theme";
import { useRouter } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import {
  Alert,
  type LayoutChangeEvent,
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

const QUICK_ACTION_STORAGE_KEY = "dashboardQuickActionOrderV1";

const QUICK_ACTION_ORDER_DEFAULT = [
  "converter",
  "calculator",
  "multi",
  "saved",
  "alerts",
  "charts",
  "tourist",
  "vacation",
] as const;

type DashboardQuickActionId = (typeof QUICK_ACTION_ORDER_DEFAULT)[number];

const DEFAULT_QUICK_ACTION_ORDER: DashboardQuickActionId[] = [
  ...QUICK_ACTION_ORDER_DEFAULT,
];

function normalizeQuickActionOrder(raw: unknown): DashboardQuickActionId[] {
  const allowed = new Set<string>(DEFAULT_QUICK_ACTION_ORDER);
  if (!Array.isArray(raw)) return [...DEFAULT_QUICK_ACTION_ORDER];
  const seen = new Set<string>();
  const out: DashboardQuickActionId[] = [];
  for (const x of raw) {
    if (
      typeof x === "string" &&
      allowed.has(x) &&
      !seen.has(x)
    ) {
      seen.add(x);
      out.push(x as DashboardQuickActionId);
    }
  }
  for (const id of DEFAULT_QUICK_ACTION_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

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

function normalizeAmFinanceCardOrder(raw: unknown): AmFinanceCardId[] {
  const allowed = new Set<string>(DEFAULT_AM_FINANCE_CARD_ORDER);
  if (!Array.isArray(raw)) return [...DEFAULT_AM_FINANCE_CARD_ORDER];
  const seen = new Set<string>();
  const out: AmFinanceCardId[] = [];
  for (const x of raw) {
    if (typeof x === "string" && allowed.has(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x as AmFinanceCardId);
    }
  }
  for (const id of DEFAULT_AM_FINANCE_CARD_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

const AM_TRANSPORT_CARDS_STORAGE_KEY = "dashboardAmTransportCardsOrderV1";

const AM_TRANSPORT_CARD_ORDER_DEFAULT = ["tmCustoms", "tmDeal"] as const;

type AmTransportCardId = (typeof AM_TRANSPORT_CARD_ORDER_DEFAULT)[number];

const DEFAULT_AM_TRANSPORT_CARD_ORDER: AmTransportCardId[] = [
  ...AM_TRANSPORT_CARD_ORDER_DEFAULT,
];

function normalizeAmTransportCardOrder(raw: unknown): AmTransportCardId[] {
  const allowed = new Set<string>(DEFAULT_AM_TRANSPORT_CARD_ORDER);
  if (!Array.isArray(raw)) return [...DEFAULT_AM_TRANSPORT_CARD_ORDER];
  const seen = new Set<string>();
  const out: AmTransportCardId[] = [];
  for (const x of raw) {
    if (typeof x === "string" && allowed.has(x) && !seen.has(x)) {
      seen.add(x);
      out.push(x as AmTransportCardId);
    }
  }
  for (const id of DEFAULT_AM_TRANSPORT_CARD_ORDER) {
    if (!seen.has(id)) out.push(id);
  }
  return out;
}

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
  const [multiCurrencyLoading, setMultiCurrencyLoading] = useState(false);
  const [savedRatesMaxVisible, setSavedRatesMaxVisible] = useState(4);
  const [refreshing, setRefreshing] = useState(false);

  const [quickActionOrder, setQuickActionOrder] = useState<
    DashboardQuickActionId[]
  >(() => [...DEFAULT_QUICK_ACTION_ORDER]);
  const [quickActionReorderMode, setQuickActionReorderMode] = useState(false);
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
  const [amFinanceReorderMode, setAmFinanceReorderMode] = useState(false);
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
  const [amTransportReorderMode, setAmTransportReorderMode] = useState(false);
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

  const clearDashboardDragState = useCallback(() => {
    setQuickActionDraggingId(null);
    setAmFinanceDraggingId(null);
    setAmTransportDraggingId(null);
    quickActionDragIndexRef.current = null;
    amFinanceDragIndexRef.current = null;
    amTransportDragIndexRef.current = null;
  }, []);

  const setExclusiveReorderMode = useCallback(
    (section: "quick" | "finance" | "transport" | null) => {
      setQuickActionReorderMode(section === "quick");
      setAmFinanceReorderMode(section === "finance");
      setAmTransportReorderMode(section === "transport");
      clearDashboardDragState();
    },
    [clearDashboardDragState]
  );

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
          id: "vacation",
          label: t("quick.action.vacationCalc"),
          icon: "calendar-outline",
          onPress: () => go(() => openArmeniaFinance("paidLeave")),
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
    [closeAllQuickModals, t, openArmeniaFinance, openArmeniaTransport]
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
      openVacationCalculator: () =>
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
      vacation: {
        labelKey: "quick.action.vacationCalc",
        icon: "calendar-outline",
        active: false,
        onPress: () => openArmeniaFinance("paidLeave"),
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
        labelKey: "amFinance.card.paidLeave",
        icon: "umbrella-outline",
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
      const relX = pageX - m.pageX;
      const relY = pageY - m.pageY;
      if (relY < -24) return;
      const col = relX < m.width / 2 ? 0 : 1;
      const row = Math.max(0, Math.floor(relY / m.tileRowHeight));
      setQuickActionOrder((prev) => {
        let target = row * 2 + col;
        target = Math.min(Math.max(target, 0), prev.length - 1);
        if (target === from) return prev;
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
      const relX = pageX - m.pageX;
      const relY = pageY - m.pageY;
      if (relY < -24) return;
      const col = relX < m.width / 2 ? 0 : 1;
      const row = Math.max(0, Math.floor(relY / m.tileRowHeight));
      setAmFinanceCardOrder((prev) => {
        let target = row * 2 + col;
        target = Math.min(Math.max(target, 0), prev.length - 1);
        if (target === from) return prev;
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
      const relX = pageX - m.pageX;
      const relY = pageY - m.pageY;
      if (relY < -24) return;
      const col = relX < m.width / 2 ? 0 : 1;
      const row = Math.max(0, Math.floor(relY / m.tileRowHeight));
      setAmTransportCardOrder((prev) => {
        let target = row * 2 + col;
        target = Math.min(Math.max(target, 0), prev.length - 1);
        if (target === from) return prev;
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
          setQuickActionOrder(
            normalizeQuickActionOrder(JSON.parse(qaRaw) as unknown)
          );
        }
        if (finRaw) {
          setAmFinanceCardOrder(
            normalizeAmFinanceCardOrder(JSON.parse(finRaw) as unknown)
          );
        }
        if (trRaw) {
          setAmTransportCardOrder(
            normalizeAmTransportCardOrder(JSON.parse(trRaw) as unknown)
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
          scrollEnabled={
            !quickActionDraggingId &&
            !amFinanceDraggingId &&
            !amTransportDraggingId
          }
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
          }
        >
          <View style={styles.quickActionsContainer}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: quickActionReorderMode ? 8 : 14,
              }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.quickActionsTitle,
                  {
                    color: textColor,
                    marginBottom: 0,
                    flex: 1,
                    minWidth: 0,
                  },
                ]}
              >
                {t("dashboard.quickActions")}
              </ThemedText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  quickActionReorderMode
                    ? t("dashboard.finishReorder")
                    : t("dashboard.reorderCards")
                }
                activeOpacity={0.85}
                onPress={() => {
                  if (quickActionReorderMode) setExclusiveReorderMode(null);
                  else setExclusiveReorderMode("quick");
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: quickActionReorderMode ? 2 : 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: primaryColor,
                  backgroundColor: quickActionReorderMode
                    ? hexToRgba(primaryColor, 0.16)
                    : hexToRgba(primaryColor, 0.09),
                }}
              >
                <Ionicons
                  name={
                    quickActionReorderMode ? "checkmark-circle" : "swap-vertical"
                  }
                  size={22}
                  color={primaryColor}
                />
              </TouchableOpacity>
            </View>
            {quickActionReorderMode ? (
              <ThemedText
                type="caption"
                style={{
                  color: textSecondaryColor,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                {t("dashboard.reorderCardsHint")}
              </ThemedText>
            ) : null}
            <View
              ref={quickActionGridRef}
              collapsable={false}
              onLayout={remeasureQuickActionGrid}
              style={styles.quickActionsGrid}
            >
              {quickActionOrder.map((actionId, index) => {
                const item = dashboardQuickActionDefs[actionId];
                const tileInner = (
                  <>
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
                        color={
                          item.active ? primaryColor : textSecondaryColor
                        }
                      />
                    </View>
                    <ThemedText
                      type="caption"
                      numberOfLines={2}
                      ellipsizeMode="tail"
                      style={[
                        styles.quickTileLabel,
                        {
                          color: textColor,
                          paddingRight: quickActionReorderMode ? 22 : 0,
                        },
                      ]}
                    >
                      {t(item.labelKey)}
                    </ThemedText>
                  </>
                );

                return (
                  <SortableQuickTile
                    key={actionId}
                    reorderMode={quickActionReorderMode}
                    isDragging={quickActionDraggingId === actionId}
                    handleColor={textSecondaryColor}
                    onDragStart={() => {
                      quickActionDragIndexRef.current = index;
                      setQuickActionDraggingId(actionId);
                    }}
                    onDragMove={handleQuickActionDragMove}
                    onDragEnd={() => {
                      setQuickActionDraggingId(null);
                      quickActionDragIndexRef.current = null;
                    }}
                    style={[
                      styles.quickTile,
                      {
                        backgroundColor: item.active
                          ? hexToRgba(primaryColor, 0.22)
                          : hexToRgba(pageBackgroundColor, 0.52),
                        borderColor: item.active ? primaryColor : borderColor,
                        borderWidth: item.active ? 2 : 1,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={quickActionReorderMode}
                      onLayout={
                        index === 0 ? onQuickActionTileLayout : undefined
                      }
                      style={{ flex: 1 }}
                      onPress={item.onPress}
                    >
                      {tileInner}
                    </TouchableOpacity>
                  </SortableQuickTile>
                );
              })}
            </View>
          </View>

          <View style={styles.amFinanceSection}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: amFinanceReorderMode ? 8 : 14,
              }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.quickActionsTitle,
                  {
                    color: textColor,
                    marginBottom: 0,
                    flex: 1,
                    minWidth: 0,
                  },
                ]}
              >
                {t("amFinance.sectionTitle")}
              </ThemedText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  amFinanceReorderMode
                    ? t("dashboard.finishReorder")
                    : t("dashboard.reorderCards")
                }
                activeOpacity={0.85}
                onPress={() => {
                  if (amFinanceReorderMode) setExclusiveReorderMode(null);
                  else setExclusiveReorderMode("finance");
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: amFinanceReorderMode ? 2 : 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: primaryColor,
                  backgroundColor: amFinanceReorderMode
                    ? hexToRgba(primaryColor, 0.16)
                    : hexToRgba(primaryColor, 0.09),
                }}
              >
                <Ionicons
                  name={
                    amFinanceReorderMode ? "checkmark-circle" : "swap-vertical"
                  }
                  size={22}
                  color={primaryColor}
                />
              </TouchableOpacity>
            </View>
            {amFinanceReorderMode ? (
              <ThemedText
                type="caption"
                style={{
                  color: textSecondaryColor,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                {t("dashboard.reorderCardsHint")}
              </ThemedText>
            ) : null}
            <View
              ref={amFinanceGridRef}
              collapsable={false}
              onLayout={remeasureAmFinanceGrid}
              style={styles.quickActionsGrid}
            >
              {amFinanceCardOrder.map((cardId, index) => {
                const item = dashboardAmFinanceCardDefs[cardId];
                const tileInner = (
                  <>
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
                      style={[
                        styles.quickTileLabel,
                        {
                          color: textColor,
                          paddingRight: amFinanceReorderMode ? 22 : 0,
                        },
                      ]}
                    >
                      {t(item.labelKey)}
                    </ThemedText>
                  </>
                );

                return (
                  <SortableQuickTile
                    key={cardId}
                    reorderMode={amFinanceReorderMode}
                    isDragging={amFinanceDraggingId === cardId}
                    handleColor={textSecondaryColor}
                    onDragStart={() => {
                      amFinanceDragIndexRef.current = index;
                      setAmFinanceDraggingId(cardId);
                    }}
                    onDragMove={handleAmFinanceDragMove}
                    onDragEnd={() => {
                      setAmFinanceDraggingId(null);
                      amFinanceDragIndexRef.current = null;
                    }}
                    style={[
                      styles.quickTile,
                      {
                        backgroundColor: hexToRgba(pageBackgroundColor, 0.52),
                        borderColor,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={amFinanceReorderMode}
                      onLayout={
                        index === 0 ? onAmFinanceTileLayout : undefined
                      }
                      style={{ flex: 1 }}
                      onPress={item.onPress}
                    >
                      {tileInner}
                    </TouchableOpacity>
                  </SortableQuickTile>
                );
              })}
            </View>
          </View>

          <View
            style={[
              styles.amTransportSection,
              { borderTopColor: hexToRgba(borderColor, 0.4) },
            ]}
          >
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                justifyContent: "space-between",
                gap: 10,
                marginBottom: amTransportReorderMode ? 8 : 14,
              }}
            >
              <ThemedText
                type="defaultSemiBold"
                style={[
                  styles.quickActionsTitle,
                  {
                    color: textColor,
                    marginBottom: 0,
                    flex: 1,
                    minWidth: 0,
                  },
                ]}
              >
                {t("amTransport.sectionTitle")}
              </ThemedText>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel={
                  amTransportReorderMode
                    ? t("dashboard.finishReorder")
                    : t("dashboard.reorderCards")
                }
                activeOpacity={0.85}
                onPress={() => {
                  if (amTransportReorderMode) setExclusiveReorderMode(null);
                  else setExclusiveReorderMode("transport");
                }}
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  borderWidth: amTransportReorderMode ? 2 : 0,
                  alignItems: "center",
                  justifyContent: "center",
                  borderColor: primaryColor,
                  backgroundColor: amTransportReorderMode
                    ? hexToRgba(primaryColor, 0.16)
                    : hexToRgba(primaryColor, 0.09),
                }}
              >
                <Ionicons
                  name={
                    amTransportReorderMode ? "checkmark-circle" : "swap-vertical"
                  }
                  size={22}
                  color={primaryColor}
                />
              </TouchableOpacity>
            </View>
            {amTransportReorderMode ? (
              <ThemedText
                type="caption"
                style={{
                  color: textSecondaryColor,
                  marginBottom: 12,
                  lineHeight: 18,
                }}
              >
                {t("dashboard.reorderCardsHint")}
              </ThemedText>
            ) : null}
            <View
              ref={amTransportGridRef}
              collapsable={false}
              onLayout={remeasureAmTransportGrid}
              style={styles.quickActionsGrid}
            >
              {amTransportCardOrder.map((cardId, index) => {
                const item = dashboardAmTransportCardDefs[cardId];
                const tileInner = (
                  <>
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
                      style={[
                        styles.quickTileLabel,
                        {
                          color: textColor,
                          paddingRight: amTransportReorderMode ? 22 : 0,
                        },
                      ]}
                    >
                      {t(item.labelKey)}
                    </ThemedText>
                  </>
                );

                return (
                  <SortableQuickTile
                    key={cardId}
                    reorderMode={amTransportReorderMode}
                    isDragging={amTransportDraggingId === cardId}
                    handleColor={textSecondaryColor}
                    onDragStart={() => {
                      amTransportDragIndexRef.current = index;
                      setAmTransportDraggingId(cardId);
                    }}
                    onDragMove={handleAmTransportDragMove}
                    onDragEnd={() => {
                      setAmTransportDraggingId(null);
                      amTransportDragIndexRef.current = null;
                    }}
                    style={[
                      styles.quickTile,
                      {
                        backgroundColor: hexToRgba(pageBackgroundColor, 0.52),
                        borderColor,
                        borderWidth: 1,
                      },
                    ]}
                  >
                    <TouchableOpacity
                      activeOpacity={0.85}
                      disabled={amTransportReorderMode}
                      onLayout={
                        index === 0 ? onAmTransportTileLayout : undefined
                      }
                      style={{ flex: 1 }}
                      onPress={item.onPress}
                    >
                      {tileInner}
                    </TouchableOpacity>
                  </SortableQuickTile>
                );
              })}
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

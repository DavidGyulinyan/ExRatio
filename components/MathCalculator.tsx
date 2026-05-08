import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  useWindowDimensions,
  ScrollView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedView } from "./themed-view";
import { SafeAreaView } from "react-native-safe-area-context";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useCalculatorHistory } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import { useLanguage } from "@/contexts/LanguageContext";
import { shareLines } from "@/lib/shareText";
import * as Haptics from "expo-haptics";

type CalculatorMode = "basic" | "advanced";

interface MathCalculatorProps {
  visible: boolean;
  onClose: () => void;
  onResult?: (result: number) => void;
  onAddToConverter?: (result: number) => void;
  autoCloseAfterCalculation?: boolean;
  inModal?: boolean; // Hide header when used inside DashboardModal
}

const LOAN_HISTORY_ARROW = "\u2192";

/** Safe single-line label for calculator history (Supabase rows or local strings). */
function formatCalculatorHistoryDisplay(record: {
  expression?: unknown;
  result?: unknown;
  calculation_type?: string | null;
}): string {
  const rawExpr = record?.expression;
  const expression =
    typeof rawExpr === "string"
      ? rawExpr
      : rawExpr != null && rawExpr !== ""
        ? String(rawExpr)
        : "Unknown calculation";
  const trimExpr = expression.trim() || "Unknown calculation";
  const type = record?.calculation_type;

  if (type === "loan" || trimExpr.includes(LOAN_HISTORY_ARROW)) {
    return trimExpr;
  }
  if (trimExpr.includes("=")) {
    return trimExpr;
  }
  const r = record?.result;
  if (r != null && r !== "") {
    return `${trimExpr} = ${String(r)}`;
  }
  return trimExpr;
}

export default function MathCalculator({
  visible,
  onClose,
  onResult,
  onAddToConverter,
  autoCloseAfterCalculation = true,
  inModal = false,
}: MathCalculatorProps) {
  const { user } = useAuth();
  const { calculatorHistory: supabaseHistory, saveCalculation, clearAllCalculations, loading: historyLoading } = useCalculatorHistory();
  const { t, tWithParams } = useLanguage();
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");
  const errorColor = useThemeColor({}, "error");
  const successColor = useThemeColor({}, "success");
  const textInverseColor = useThemeColor({}, "textInverse");

  const [display, setDisplay] = useState("0");
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [equation, setEquation] = useState<string>("");
  const [calculationComplete, setCalculationComplete] = useState(false);
  
  const [calculationHistory, setCalculationHistory] = useState<string[]>([]);
  const [roundingDecimalPlaces, setRoundingDecimalPlaces] = useState<number>(2);
  const [showHistory, setShowHistory] = useState(false);
  const [showRoundingOptions, setShowRoundingOptions] = useState(false);
  const [mode, setMode] = useState<CalculatorMode>("basic");
  const [showQuickMenu, setShowQuickMenu] = useState(false);

  const { height } = useWindowDimensions();
  const isSmallScreen = height < 700;
  const isMediumScreen = height >= 700 && height < 800;

  // Initialize local history with Supabase history when component becomes visible
  useEffect(() => {
    if (visible && user && supabaseHistory.length > 0) {
      const formattedHistory = supabaseHistory
        .filter((record): record is NonNullable<typeof record> => record != null)
        .map((record) => formatCalculatorHistoryDisplay(record));
      setCalculationHistory(prev => {
        // Merge Supabase history with any existing local history, avoiding duplicates
        const merged = [...formattedHistory];
        prev.forEach(localCalc => {
          if (!merged.includes(localCalc)) {
            merged.push(localCalc);
          }
        });
        return merged.slice(0, 15); // Keep only 15 most recent
      });
    } else if (visible && !user) {
      // For non-authenticated users, keep local history
      setCalculationHistory(prev => prev);
    }
  }, [visible, user, supabaseHistory]);

  const getResponsiveValue = (small: number, medium: number, large: number) => {
    if (isSmallScreen) return small;
    if (isMediumScreen) return medium;
    return large;
  };
  const sidePad = getResponsiveValue(12, 16, 20);

  const safeHaptic = (kind: "light" | "success" | "error" = "light") => {
    try {
      if (kind === "success") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        return;
      }
      if (kind === "error") {
        void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
      void Haptics.selectionAsync();
    } catch {
      // ignore
    }
  };

  const inputNumber = (num: string) => {
    safeHaptic("light");
    if (calculationComplete) {
      setDisplay(num);
      setEquation(num);
      setCalculationComplete(false);
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(false);
    } else if (waitingForOperand) {
      setDisplay(num);
      setEquation(prev => {
        // Add space if the last character is an operator
        const operators = ['+', '-', '×', '÷'];
        const lastChar = prev.slice(-1);
        const needsSpace = operators.includes(lastChar);
        return prev + (needsSpace ? ' ' : '') + num;
      });
      setWaitingForOperand(false);
    } else {
      setDisplay(display === "0" ? num : display + num);
      setEquation(prev => prev === "0" ? num : prev + num);
    }
  };

  const inputOperation = (nextOperation: string) => {
    safeHaptic("light");
    const inputValue = parseFloat(display);
    const operationSymbol = nextOperation === "/" ? "÷" : nextOperation === "*" ? "×" : nextOperation;

    if (calculationComplete) {
      setEquation(display + " " + operationSymbol);
      setCalculationComplete(false);
      setPreviousValue(inputValue);
    } else if (previousValue === null) {
      setPreviousValue(inputValue);
      setEquation(prev => prev + " " + operationSymbol);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);
      const result = parseFloat(newValue.toFixed(roundingDecimalPlaces));

      setDisplay(`${result}`);
      setPreviousValue(newValue);
      setEquation(prev => prev + " " + operationSymbol);
      
      // Show result immediately in history
      const intermediateResult = `${currentValue} ${operation === "/" ? "÷" : operation === "*" ? "×" : operation} ${inputValue} = ${result}`;
      addToHistory(intermediateResult);
    }

    setWaitingForOperand(true);
    setOperation(nextOperation);
  };

  const calculate = (
    firstValue: number,
    secondValue: number,
    operation: string
  ): number => {
    switch (operation) {
      case "+":
        return firstValue + secondValue;
      case "-":
        return firstValue - secondValue;
      case "*":
        return firstValue * secondValue;
      case "/":
        return firstValue / secondValue;
      case "%":
        return (firstValue * secondValue) / 100;
      case "=":
        return secondValue;
      default:
        return secondValue;
    }
  };

  const performCalculation = async () => {
    safeHaptic("success");
    const inputValue = parseFloat(display);

    if (previousValue !== null && operation) {
      const newValue = calculate(previousValue, inputValue, operation);
      const result = parseFloat(newValue.toFixed(roundingDecimalPlaces));

      const fullEquation = `${equation} = ${result}`;
      setEquation(fullEquation);
      setDisplay(`${result}`);
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(true);
      setCalculationComplete(true);

      // Add to local history
      addToHistory(fullEquation);

      // Save to user history if authenticated
      if (user && fullEquation && fullEquation.trim() !== '') {
        try {
          const calculationType = operation === '%' ? 'percentage' :
                                ['+', '-', '*', '/'].includes(operation) ? 'basic' : 'advanced';

          await saveCalculation(fullEquation, result, calculationType, {
            roundingDecimalPlaces,
            operation,
            previousValue,
            inputValue
          });
        } catch (error) {
          console.error('Error saving calculation to history:', error);
        }
      }

      // Pass result to parent if callback provided
      if (onResult) {
        onResult(result);
      }

      // Automatically add to converter after calculation
      if (onAddToConverter) {
        onAddToConverter(result);
        // Only close if auto-close is enabled
        if (autoCloseAfterCalculation) {
          onClose();
          // Reset calculator state
          clear();
        }
      } else {
        // If no converter callback, don't close automatically
        // This allows users to do multiple calculations
      }
    }
  };

  // Tip & discount helpers
  const roundForDisplay = (n: number) => parseFloat(n.toFixed(roundingDecimalPlaces));

  const applySqrt = () => {
    safeHaptic("light");
    const currentValue = parseFloat(display);
    if (isNaN(currentValue) || currentValue < 0) return;
    const out = roundForDisplay(Math.sqrt(currentValue));
    const full = `√(${currentValue}) = ${out}`;
    setEquation(full);
    setDisplay(String(out));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
    setCalculationComplete(true);
    addToHistory(full);
  };

  const applyReciprocal = () => {
    safeHaptic("light");
    const currentValue = parseFloat(display);
    if (isNaN(currentValue) || currentValue === 0) return;
    const out = roundForDisplay(1 / currentValue);
    const full = `1/${currentValue} = ${out}`;
    setEquation(full);
    setDisplay(String(out));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
    setCalculationComplete(true);
    addToHistory(full);
  };

  const splitBy = (parts: number) => {
    safeHaptic("light");
    const currentValue = parseFloat(display);
    if (isNaN(currentValue) || parts <= 0) return;
    const out = roundForDisplay(currentValue / parts);
    const full = `${currentValue} ÷ ${parts} = ${out}`;
    setEquation(full);
    setDisplay(String(out));
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(true);
    setCalculationComplete(true);
    addToHistory(full);
  };

  // History functions
  const addToHistory = (calculation: string) => {
    setCalculationHistory(prev => [calculation, ...prev.slice(0, 14)]); // Keep last 15 calculations
  };

  const clear = () => {
    safeHaptic("light");
    setDisplay("0");
    setEquation("");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setCalculationComplete(false);
  };

  const clearAll = () => {
    safeHaptic("light");
    setDisplay("0");
    setEquation("");
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
    setCalculationComplete(false);
    setCalculationHistory([]);
  };

  const inputDecimal = () => {
    safeHaptic("light");
    if (calculationComplete) {
      setDisplay("0.");
      setEquation("0.");
      setCalculationComplete(false);
    } else if (waitingForOperand) {
      setDisplay("0.");
      setEquation(prev => prev + "0.");
      setWaitingForOperand(false);
    } else if (display.indexOf(".") === -1) {
      setDisplay(display + ".");
      setEquation(prev => prev + ".");
    }
  };

  const inputPercentage = () => {
    safeHaptic("light");
    if (calculationComplete) {
      const percentageValue = parseFloat(display) / 100;
      setDisplay(percentageValue.toString());
      setEquation(percentageValue.toString());
      setCalculationComplete(false);
    } else if (waitingForOperand) {
      const percentageValue = parseFloat(display) / 100;
      setDisplay(percentageValue.toString());
      setEquation(prev => prev + "%");
      setWaitingForOperand(false);
    } else {
      const percentageValue = parseFloat(display) / 100;
      setDisplay(percentageValue.toString());
      setEquation(prev => prev + "%");
    }
  };

  const toggleSign = () => {
    safeHaptic("light");
    const currentValue = parseFloat(display);
    const toggledValue = -currentValue;
    setDisplay(toggledValue.toString());
    setEquation(toggledValue.toString());
    setCalculationComplete(false);
    setPreviousValue(null);
    setOperation(null);
    setWaitingForOperand(false);
  };

  const deleteLastDigit = () => {
    safeHaptic("light");
    if (calculationComplete) {
      return; // Don't allow deletion after calculation is complete
    }
    
    if (display.length > 1) {
      const newDisplay = display.slice(0, -1);
      const newEquation = equation.slice(0, -1);
      setDisplay(newDisplay);
      setEquation(newEquation);
    } else {
      setDisplay("0");
      setEquation("0");
    }
  };

  const clearEntry = () => {
    safeHaptic("light");
    setDisplay("0");
    if (!operation) {
      setEquation("");
      setPreviousValue(null);
      setOperation(null);
      setWaitingForOperand(false);
    } else {
      setWaitingForOperand(true);
    }
    setCalculationComplete(false);
  };

  const renderButton = (
    text: string,
    onPress: () => void,
    buttonType: string = "default",
    flex?: number,
    compact: boolean = false,
    onLongPress?: () => void
  ) => {
    const flexStyle = flex ? { flex } : {};
    let style: Record<string, unknown> = {
      ...styles.button,
      ...flexStyle,
      backgroundColor: surfaceColor,
      borderColor,
    };

    switch (buttonType) {
      case "operation":
        style = {
          ...styles.button,
          ...styles.operationButton,
          ...flexStyle,
          backgroundColor: primaryColor,
          borderColor: primaryColor,
        };
        break;
      case "clear":
        style = {
          ...styles.button,
          ...styles.clearButton,
          ...flexStyle,
          backgroundColor: errorColor,
          borderColor: errorColor,
        };
        break;
      case "delete":
        style = {
          ...styles.button,
          ...styles.deleteButton,
          ...flexStyle,
          backgroundColor: surfaceSecondaryColor,
          borderColor,
        };
        break;
      case "equals":
        style = {
          ...styles.button,
          ...styles.equalsButton,
          ...flexStyle,
          backgroundColor: successColor,
          borderColor: successColor,
        };
        break;
      case "scientific":
        style = {
          ...styles.button,
          ...styles.scientificButton,
          ...flexStyle,
        };
        break;
      case "financial":
        style = {
          ...styles.button,
          ...styles.financialButton,
          ...flexStyle,
        };
        break;
      case "advancedTool":
        style = {
          ...styles.button,
          ...flexStyle,
          backgroundColor: surfaceColor,
          borderColor,
        };
        break;
      case "utility":
        style = {
          ...styles.button,
          ...styles.utilityButton,
          ...flexStyle,
        };
        break;
      case "history":
        style = {
          ...styles.button,
          ...styles.historyButton,
          ...flexStyle,
        };
        break;
      default:
        break;
    }

    if (compact) {
      style = { ...style, ...styles.buttonCompact };
    }

    const renderButtonText = () => {
      switch (buttonType) {
        case "operation":
          return (
            <Text
              style={[styles.operationButtonText, compact && styles.operationButtonTextCompact]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
        case "clear":
          return (
            <Text
              style={[styles.clearButtonText, compact && styles.clearButtonTextCompact]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
        case "delete":
          return (
            <Text
              style={[
                styles.deleteButtonText,
                compact && styles.deleteButtonTextCompact,
                { color: textColor },
              ]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
        case "equals":
          return (
            <Text
              style={[styles.equalsButtonText, compact && styles.equalsButtonTextCompact]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
        case "advancedTool":
          return (
            <Text
              style={[
                styles.buttonText,
                compact && styles.buttonTextCompact,
                { color: textColor },
              ]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
        case "financial":
        case "scientific":
        case "utility":
        case "history":
          return (
            <Text
              style={[styles.specialButtonText, compact && styles.specialButtonTextCompact]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
        default:
          return (
            <Text
              style={[styles.buttonText, compact && styles.buttonTextCompact, { color: textColor }]}
              numberOfLines={compact ? 1 : undefined}
              adjustsFontSizeToFit={compact}
              minimumFontScale={compact ? 0.55 : undefined}
            >
              {text}
            </Text>
          );
      }
    };

    return (
      <TouchableOpacity 
        style={style}
        onPress={onPress}
        onLongPress={onLongPress}
        delayLongPress={onLongPress ? 320 : undefined}
        activeOpacity={0.8}
        disabled={
          calculationComplete &&
          ![
            "equals",
            "clear",
            "utility",
            "history",
            "financial",
            "scientific",
            "advancedTool",
          ].includes(buttonType)
        }
      >
        {renderButtonText()}
      </TouchableOpacity>
    );
  };

  const getEquationPreviewText = () => {
    if (calculationComplete) return equation;
    if (equation && operation && !waitingForOperand && previousValue !== null) {
      const currentValue = parseFloat(display);
      if (!isNaN(currentValue)) {
        const previewResult = calculate(previousValue, currentValue, operation);
        const result = parseFloat(previewResult.toFixed(roundingDecimalPlaces));
        return `${equation} = ${result}`;
      }
    }
    if (equation && (operation || waitingForOperand)) return equation;
    return "";
  };

  const getMainValueText = () => display;

  const getDisplayFontSize = () => {
    const textLength = getMainValueText().length;
    if (textLength > 15) return getResponsiveValue(13, 15, 17);
    if (textLength > 10) return getResponsiveValue(16, 18, 21);
    return getResponsiveValue(24, 28, 32);
  };

  const RoundingOptions = () => (
    <View
      style={[
        styles.optionsContainer,
        { backgroundColor: surfaceSecondaryColor, borderColor, marginHorizontal: sidePad },
      ]}
    >
      <Text style={[styles.optionsTitle, { color: textColor }]}>{t('calculator.roundingOptions')}</Text>
      <View style={styles.optionsRow}>
        {[0, 1, 2, 3, 4].map(decimals => (
          <TouchableOpacity
            key={decimals}
            style={[
              styles.optionButton,
              { backgroundColor: surfaceColor, borderColor },
              roundingDecimalPlaces === decimals && {
                backgroundColor: primaryColor,
                borderColor: primaryColor,
              },
            ]}
            onPress={() => setRoundingDecimalPlaces(decimals)}
          >
            <Text
              style={[
                styles.optionButtonText,
                roundingDecimalPlaces === decimals
                  ? styles.optionButtonTextActive
                  : { color: textColor },
              ]}
            >
              {decimals}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    </View>
  );

  const clearHistory = async () => {
    try {
      const success = await clearAllCalculations();
      if (success) {
        // Clear local history as well
        setCalculationHistory([]);
      }
    } catch (error) {
      console.error('Error clearing calculator history:', error);
    }
  };

  const advancedRowGap = {
    marginBottom: getResponsiveValue(5, 6, 8),
    gap: getResponsiveValue(5, 6, 8),
  };

  const AdvancedToolsPanel = () => (
    <View
      style={[
        styles.advancedPanel,
        styles.advancedPanelBelowKeypad,
        {
          backgroundColor: surfaceColor,
          borderColor,
        },
      ]}
    >
      <View style={styles.advancedPanelTitleRow}>
        <View style={styles.advancedPanelTitleLeft}>
          <Ionicons name="sparkles-outline" size={18} color={textSecondaryColor} />
          <Text style={[styles.advancedPanelTitle, { color: textColor }]}>
            {t("calculator.advancedTools")}
          </Text>
        </View>
      </View>

      <View style={[styles.advancedSectionBlock, styles.advancedSectionBlockLast]}>
        <Text style={[styles.advancedSectionLabel, { color: textSecondaryColor }]}>
          {t("calculator.sectionQuickMath")}
        </Text>
        <View style={[styles.buttonRow, advancedRowGap]}>
          {renderButton(t("calculator.buttonSqrt"), applySqrt, "advancedTool", undefined, true)}
          {renderButton(t("calculator.buttonReciprocal"), applyReciprocal, "advancedTool", undefined, true)}
          {renderButton(t("calculator.buttonPlusMinus"), toggleSign, "advancedTool", undefined, true)}
        </View>
        <View style={[styles.buttonRow, advancedRowGap]}>
          {renderButton(t("calculator.splitBy2"), () => splitBy(2), "advancedTool", undefined, true)}
          {renderButton(t("calculator.splitBy3"), () => splitBy(3), "advancedTool", undefined, true)}
          {renderButton(t("calculator.splitBy4"), () => splitBy(4), "advancedTool", undefined, true)}
        </View>
      </View>
    </View>
  );

  const HistoryView = () => {
    // Combine Supabase history with local history for display
    const displayHistory =
      user && supabaseHistory.length > 0
        ? supabaseHistory
            .filter((record): record is NonNullable<typeof record> => record != null)
            .map((record) => formatCalculatorHistoryDisplay(record))
        : calculationHistory;

    return (
      <View
        style={[
          styles.historyContainer,
          { backgroundColor: surfaceSecondaryColor, borderColor, marginHorizontal: sidePad },
        ]}
      >
        <View style={styles.historyHeader}>
          <Text
            style={[styles.historyTitle, { color: textColor }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {t('calculator.calculationHistory')}
          </Text>
          {displayHistory.length > 0 && (
            <TouchableOpacity
              style={[styles.clearHistoryButton, { backgroundColor: errorColor, borderColor: errorColor }]}
              onPress={clearHistory}
              activeOpacity={0.8}
            >
              <Text
                style={styles.clearHistoryButtonText}
                numberOfLines={1}
                adjustsFontSizeToFit
                minimumFontScale={0.7}
              >
                {t('calculator.clear')}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        <ScrollView style={styles.historyList}>
          {displayHistory.length === 0 ? (
            <Text style={[styles.historyEmpty, { color: textSecondaryColor }]}>{t('calculator.noCalculations')}</Text>
          ) : (
            displayHistory.map((calc, index) => (
              <View key={index}>
                <Text style={[styles.historyItem, { color: textColor, borderBottomColor: borderColor }]}>
                  {typeof calc === "string" ? calc : String(calc ?? "")}
                </Text>
              </View>
            ))
          )}
        </ScrollView>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={{ flex: 1, backgroundColor }}
        edges={["top", "left", "right", "bottom"]}
      >
      <ThemedView style={[styles.container, { backgroundColor }]}>
        {!inModal && (
          <View style={[
            styles.header,
            {
              paddingTop: getResponsiveValue(20, 30, 40),
              paddingHorizontal: sidePad,
              marginBottom: getResponsiveValue(16, 24, 32),
            }
          ]}>
            <View style={styles.headerSide}>
              <TouchableOpacity
                onPress={onClose}
                accessibilityRole="button"
                accessibilityLabel="Go back"
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: surfaceSecondaryColor,
                    borderColor,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="arrow-back" size={22} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>
            <Text style={[
              styles.title,
              {
                fontSize: getResponsiveValue(20, 24, 28),
                color: textColor,
              }
            ]}>{t('calculator.title')}</Text>
            <View style={styles.headerSideRight}>
              <TouchableOpacity
                onPress={() => setShowQuickMenu(true)}
                accessibilityRole="button"
                accessibilityLabel="Menu"
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: surfaceSecondaryColor,
                    borderColor,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="menu-outline" size={22} color={textSecondaryColor} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  void shareLines([
                    t("calculator.title"),
                    getEquationPreviewText() || getMainValueText(),
                  ])
                }
                accessibilityRole="button"
                accessibilityLabel={t("common.share")}
                style={[
                  styles.closeButton,
                  {
                    backgroundColor: surfaceSecondaryColor,
                    borderColor,
                    borderWidth: 1,
                  },
                ]}
              >
                <Ionicons name="share-outline" size={22} color={primaryColor} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        <Modal
          visible={showQuickMenu}
          transparent
          animationType="fade"
          onRequestClose={() => setShowQuickMenu(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={() => setShowQuickMenu(false)}
            style={styles.menuBackdrop}
          >
            <View
              style={[
                styles.menuSheet,
                { backgroundColor: surfaceSecondaryColor, borderColor },
              ]}
            >
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setMode((m) => (m === "advanced" ? "basic" : "advanced"));
                  setShowHistory(false);
                  setShowRoundingOptions(false);
                  setShowQuickMenu(false);
                }}
              >
                <Ionicons
                  name={mode === "advanced" ? "calculator-outline" : "sparkles-outline"}
                  size={18}
                  color={textSecondaryColor}
                />
                <Text style={[styles.menuItemText, { color: textColor }]}>
                  {mode === "advanced" ? t("calculator.basic") : t("calculator.advanced")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowHistory((v) => !v);
                  setShowRoundingOptions(false);
                  setShowQuickMenu(false);
                }}
              >
                <Ionicons name="time-outline" size={18} color={textSecondaryColor} />
                <Text style={[styles.menuItemText, { color: textColor }]}>
                  {t("calculator.history")}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.menuItem}
                onPress={() => {
                  setShowRoundingOptions((v) => !v);
                  setShowHistory(false);
                  setShowQuickMenu(false);
                }}
              >
                <Ionicons name="options-outline" size={18} color={textSecondaryColor} />
                <Text style={[styles.menuItemText, { color: textColor }]}>
                  {tWithParams("calculator.rounding", { decimals: roundingDecimalPlaces })}
                </Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        <View style={[
          styles.displayContainer,
          {
            paddingHorizontal: sidePad,
            marginBottom: getResponsiveValue(10, 12, 14),
          }
        ]}>
          <View style={[
            styles.display,
            {
              minHeight: getResponsiveValue(68, 78, 88),
              paddingVertical: getResponsiveValue(12, 14, 16),
              paddingHorizontal: getResponsiveValue(14, 16, 18),
              borderRadius: getResponsiveValue(12, 14, 16),
              backgroundColor: surfaceSecondaryColor,
              borderColor,
            }
          ]}>
            {getEquationPreviewText() ? (
              <Text
                style={[
                  styles.equationText,
                  { color: textSecondaryColor },
                ]}
                numberOfLines={2}
                ellipsizeMode="tail"
              >
                {getEquationPreviewText()}
              </Text>
            ) : null}
            <Text
              style={[
                styles.displayText,
                {
                  fontSize: getDisplayFontSize(),
                  lineHeight: getDisplayFontSize() * 1.15,
                  color: textColor,
                  textAlign: "right",
                },
              ]}
              numberOfLines={4}
              minimumFontScale={0.75}
            >
              {getMainValueText()}
            </Text>
          </View>
        </View>

        {onAddToConverter ? (
          <View style={[styles.toolbar, { paddingHorizontal: sidePad }]}>
            <View style={styles.toolbarRowCompact}>
              <TouchableOpacity
                style={[
                  styles.toolbarIconButton,
                  { backgroundColor: successColor, borderColor: successColor },
                ]}
                onPress={() => {
                  const result = parseFloat(display);
                  if (!isNaN(result) && result !== 0) {
                    onAddToConverter(result);
                    onClose();
                    clear();
                  }
                }}
                accessibilityRole="button"
                accessibilityLabel={t("calculator.addToConverter")}
              >
                <Ionicons name="swap-horizontal-outline" size={24} color={textInverseColor} />
              </TouchableOpacity>
            </View>
          </View>
        ) : null}

        {/* Conditional views (controlled from menu) */}
        {showRoundingOptions && <RoundingOptions />}
        {showHistory && <HistoryView />}

        <ScrollView
          style={[
            styles.buttonGrid,
            {
              paddingHorizontal: sidePad,
              flex: showHistory || showRoundingOptions ? 0 : 1,
            }
          ]}
          contentContainerStyle={{
            paddingBottom: getResponsiveValue(20, 28, 36),
          }}
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {mode === "basic" && (
            <>
              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton(t('calculator.buttonC'), clear, "clear")}
                {renderButton(t('calculator.buttonBackspace'), deleteLastDigit, "delete", undefined, false, clearEntry)}
                {renderButton(t('calculator.buttonPercent'), inputPercentage)}
                {renderButton(t('calculator.buttonDivide'), () => inputOperation("/"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("7", () => inputNumber("7"))}
                {renderButton("8", () => inputNumber("8"))}
                {renderButton("9", () => inputNumber("9"))}
                {renderButton(t('calculator.buttonMultiply'), () => inputOperation("*"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("4", () => inputNumber("4"))}
                {renderButton("5", () => inputNumber("5"))}
                {renderButton("6", () => inputNumber("6"))}
                {renderButton(t('calculator.buttonSubtract'), () => inputOperation("-"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("1", () => inputNumber("1"))}
                {renderButton("2", () => inputNumber("2"))}
                {renderButton("3", () => inputNumber("3"))}
                {renderButton(t('calculator.buttonAdd'), () => inputOperation("+"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("0", () => inputNumber("0"), "default", 2)}
                {renderButton(t('calculator.buttonDecimal'), inputDecimal)}
                {renderButton(t('calculator.buttonEquals'), performCalculation, "equals")}
              </View>
            </>
          )}
          {mode === "advanced" && (
            <>
              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton(t('calculator.buttonC'), clear, "clear")}
                {renderButton(t('calculator.buttonBackspace'), deleteLastDigit, "delete", undefined, false, clearEntry)}
                {renderButton(t('calculator.buttonPercent'), inputPercentage)}
                {renderButton(t('calculator.buttonDivide'), () => inputOperation("/"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("7", () => inputNumber("7"))}
                {renderButton("8", () => inputNumber("8"))}
                {renderButton("9", () => inputNumber("9"))}
                {renderButton(t('calculator.buttonMultiply'), () => inputOperation("*"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("4", () => inputNumber("4"))}
                {renderButton("5", () => inputNumber("5"))}
                {renderButton("6", () => inputNumber("6"))}
                {renderButton(t('calculator.buttonSubtract'), () => inputOperation("-"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("1", () => inputNumber("1"))}
                {renderButton("2", () => inputNumber("2"))}
                {renderButton("3", () => inputNumber("3"))}
                {renderButton(t('calculator.buttonAdd'), () => inputOperation("+"), "operation")}
              </View>

              <View style={[
                styles.buttonRow,
                {
                  marginBottom: getResponsiveValue(8, 12, 16),
                  gap: getResponsiveValue(6, 8, 12),
                }
              ]}>
                {renderButton("0", () => inputNumber("0"), "default", 2)}
                {renderButton(t('calculator.buttonDecimal'), inputDecimal)}
                {renderButton(t('calculator.buttonEquals'), performCalculation, "equals")}
              </View>
            </>
          )}
          {mode === "advanced" && <AdvancedToolsPanel />}
        </ScrollView>
      </ThemedView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0a0a0a",
    paddingHorizontal: 0,
    paddingTop: 8,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 0,
  },
  headerSide: {
    width: 36,
    alignItems: "flex-start",
    justifyContent: "center",
  },
  headerSideRight: {
    width: 86,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
  },
  closeButton: {
    width: 36,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    color: "#ffffff",
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  displayContainer: {
    paddingHorizontal: 0,
  },
  display: {
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    boxShadow: "0px 4px 10px rgba(0, 0, 0, 0.28)",
    elevation: 4,
  },
  displayText: {
    color: "#ffffff",
    fontWeight: "300",
    textAlign: "right",
    letterSpacing: 0.35,
    includeFontPadding: false,
  },
  equationText: {
    width: "100%",
    textAlign: "right",
    fontSize: 12,
    lineHeight: 16,
    fontWeight: "600",
    letterSpacing: 0.2,
    marginBottom: 6,
    includeFontPadding: false,
  },
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-start",
    alignItems: "flex-end",
    paddingTop: 72,
    paddingRight: 14,
  },
  menuSheet: {
    width: 260,
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 10,
    borderRadius: 12,
  },
  menuItemText: {
    fontSize: 14,
    fontWeight: "600",
    includeFontPadding: false,
  },
  toolbar: {
    paddingHorizontal: 0,
    paddingVertical: 2,
    marginBottom: 8,
  },
  toolbarRowCompact: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 10,
    rowGap: 10,
  },
  toolbarIconButton: {
    width: 52,
    height: 52,
    minWidth: 52,
    minHeight: 52,
    flexGrow: 0,
    flexShrink: 0,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 14,
    borderWidth: 1,
  },
  optionsContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  optionsTitle: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 12,
    textAlign: "center",
  },
  optionsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  optionButton: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.2)",
  },
  optionButtonActive: {
    backgroundColor: "rgba(63, 63, 70, 0.35)",
    borderColor: "rgba(82, 82, 91, 0.9)",
  },
  optionButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "500",
  },
  optionButtonTextActive: {
    color: "#ffffff",
    fontWeight: "700",
  },
  historyContainer: {
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    marginBottom: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
    maxHeight: 200,
    overflow: "hidden",
  },
  historyHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
    minWidth: 0,
  },
  historyTitle: {
    flex: 1,
    minWidth: 0,
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    paddingRight: 4,
  },
  clearHistoryButton: {
    flexShrink: 0,
    backgroundColor: "rgba(63, 63, 70, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(63, 63, 70, 0.65)",
    maxWidth: "42%",
  },
  clearHistoryButtonText: {
    color: "#ffffff",
    fontSize: 11,
    fontWeight: "600",
    textAlign: "center",
    includeFontPadding: false,
  },
  historyList: {
    maxHeight: 120,
  },
  historyEmpty: {
    color: "#8e8e93",
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  historyItem: {
    color: "#ffffff",
    fontSize: 12,
    paddingVertical: 2,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(255, 255, 255, 0.1)",
  },
  buttonGrid: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: "row",
  },
  button: {
    flex: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.12)",
    boxShadow: "0px 3px 6px rgba(0, 0, 0, 0.25)",
    elevation: 3,
    minHeight: 50,
  },
  buttonCompact: {
    paddingVertical: 6,
    paddingHorizontal: 3,
    minHeight: 34,
    borderRadius: 10,
    elevation: 1,
  },
  buttonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "400",
    includeFontPadding: false,
  },
  buttonTextCompact: {
    fontSize: 14,
    fontWeight: "500",
  },
  operationButton: {
    backgroundColor: "rgba(82, 82, 91, 0.92)",
    borderColor: "rgba(82, 82, 91, 0.65)",
  },
  operationButtonText: {
    color: "#ffffff",
    fontSize: 22,
    fontWeight: "600",
    includeFontPadding: false,
  },
  operationButtonTextCompact: {
    fontSize: 17,
  },
  clearButton: {
    backgroundColor: "rgba(64, 64, 64, 0.9)",
    borderColor: "rgba(64, 64, 64, 0.65)",
  },
  clearButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "500",
    includeFontPadding: false,
  },
  clearButtonTextCompact: {
    fontSize: 14,
  },
  deleteButton: {
    backgroundColor: "rgba(142, 142, 147, 0.8)",
    borderColor: "rgba(142, 142, 147, 0.5)",
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 18,
    fontWeight: "500",
    includeFontPadding: false,
  },
  deleteButtonTextCompact: {
    fontSize: 14,
  },
  equalsButton: {
    backgroundColor: "rgba(82, 82, 91, 0.88)",
    borderColor: "rgba(82, 82, 91, 0.6)",
  },
  equalsButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "600",
    includeFontPadding: false,
    textAlign: "center",
  },
  equalsButtonTextCompact: {
    fontSize: 14,
  },
  scientificButton: {
    backgroundColor: "rgba(82, 82, 91, 0.88)",
    borderColor: "rgba(82, 82, 91, 0.58)",
  },
  financialButton: {
    backgroundColor: "rgba(82, 82, 91, 0.88)",
    borderColor: "rgba(82, 82, 91, 0.58)",
  },
  utilityButton: {
    backgroundColor: "rgba(82, 82, 91, 0.88)",
    borderColor: "rgba(82, 82, 91, 0.58)",
  },
  historyButton: {
    backgroundColor: "rgba(82, 82, 91, 0.88)",
    borderColor: "rgba(82, 82, 91, 0.58)",
  },
  specialButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "600",
    includeFontPadding: false,
    textAlign: "center",
  },
  specialButtonTextCompact: {
    fontSize: 10,
    fontWeight: "700",
    paddingHorizontal: 1,
  },
  advancedPanel: {
    borderRadius: 14,
    borderWidth: 1,
    padding: 12,
    marginBottom: 8,
  },
  advancedPanelBelowKeypad: {
    marginTop: 4,
  },
  advancedSectionBlock: {
    marginBottom: 14,
  },
  advancedSectionBlockLast: {
    marginBottom: 0,
  },
  advancedPanelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 8,
  },
  advancedPanelTitleLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexShrink: 1,
  },
  advancedPanelTitle: {
    fontSize: 15,
    fontWeight: "600",
    letterSpacing: 0.1,
  },
  advancedSectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    letterSpacing: 0.15,
    marginBottom: 8,
    marginTop: 0,
  },
});

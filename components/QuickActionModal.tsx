import React, { useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
  ScrollView,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FinancialBackground } from "@/components/FinancialBackground";
import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { shareLines } from "@/lib/shareText";

export type QuickActionModalMenuItem = {
  id: string;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
};

interface QuickActionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** When set, header shows a share control that shares this text. */
  shareMessage?: string | null;
  /** When set, header may show a calculator shortcut (hidden if `menuItems` is set — use the tools menu). */
  onOpenCalculator?: () => void;
  /** When set, header may show a converter shortcut (hidden if `menuItems` is set — use the tools menu). */
  onOpenConverter?: () => void;
  /** Opens from header: switch to other tools (e.g. other modals, calculator). */
  menuItems?: QuickActionModalMenuItem[];
}

/**
 * Full-screen slide modal — same presentation as MathCalculator.
 */
export default function QuickActionModal({
  visible,
  onClose,
  title,
  children,
  shareMessage,
  onOpenCalculator,
  onOpenConverter,
  menuItems,
}: QuickActionModalProps) {
  const { t } = useLanguage();
  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");
  const [toolsMenuOpen, setToolsMenuOpen] = useState(false);

  const trimmedShare = shareMessage?.trim();
  const canShare = Boolean(trimmedShare);
  const canOpenCalculator = Boolean(onOpenCalculator);
  const canOpenConverter = Boolean(onOpenConverter);
  const canOpenToolsMenu = Boolean(menuItems && menuItems.length > 0);
  /** These are listed in the tools menu — avoid duplicating them in the header. */
  const showCalculatorShortcut = canOpenCalculator && !canOpenToolsMenu;
  const showConverterShortcut = canOpenConverter && !canOpenToolsMenu;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <SafeAreaView
        style={[styles.safeArea, { backgroundColor }]}
        edges={["top", "left", "right", "bottom"]}
      >
        <FinancialBackground />
        <View style={styles.contentLayer}>
          <View
            style={[
              styles.header,
              {
                borderBottomColor: borderColor,
                backgroundColor: hexToRgba(backgroundColor, 0.88),
              },
            ]}
          >
            <TouchableOpacity
              onPress={onClose}
              style={[
                styles.closeButton,
                {
                  backgroundColor: hexToRgba(backgroundColor, 0.55),
                  borderColor,
                },
              ]}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons
                name="arrow-back"
                size={22}
                color={textSecondaryColor}
              />
            </TouchableOpacity>
            <ThemedText
              type="defaultSemiBold"
              style={[
                styles.title,
                { color: textColor },
                Platform.OS === "android" ? { includeFontPadding: false } : null,
              ]}
              numberOfLines={2}
            >
              {title}
            </ThemedText>
            <View style={styles.headerActions}>
              {canOpenToolsMenu ? (
                <TouchableOpacity
                  onPress={() => setToolsMenuOpen(true)}
                  style={[
                    styles.headerIconButton,
                    {
                      backgroundColor: hexToRgba(backgroundColor, 0.55),
                      borderColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("quick.toolsMenu")}
                >
                  <Ionicons name="apps-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
              ) : null}
              {showConverterShortcut ? (
                <TouchableOpacity
                  onPress={onOpenConverter}
                  style={[
                    styles.headerIconButton,
                    {
                      backgroundColor: hexToRgba(backgroundColor, 0.55),
                      borderColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("quick.action.converter")}
                >
                  <Ionicons name="swap-horizontal-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
              ) : null}
              {showCalculatorShortcut ? (
                <TouchableOpacity
                  onPress={onOpenCalculator}
                  style={[
                    styles.headerIconButton,
                    {
                      backgroundColor: hexToRgba(backgroundColor, 0.55),
                      borderColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("quick.action.calculator")}
                >
                  <Ionicons name="calculator-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
              ) : null}
              {canShare ? (
                <TouchableOpacity
                  onPress={() => void shareLines([trimmedShare])}
                  style={[
                    styles.headerIconButton,
                    {
                      backgroundColor: hexToRgba(backgroundColor, 0.55),
                      borderColor,
                    },
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={t("common.share")}
                >
                  <Ionicons name="share-outline" size={20} color={primaryColor} />
                </TouchableOpacity>
              ) : null}
              {!canShare &&
              !showCalculatorShortcut &&
              !showConverterShortcut &&
              !canOpenToolsMenu ? (
                <View style={styles.headerSpacer} />
              ) : null}
            </View>
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </SafeAreaView>

      <Modal
        visible={toolsMenuOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setToolsMenuOpen(false)}
      >
        <TouchableOpacity
          style={styles.toolsMenuBackdrop}
          activeOpacity={1}
          onPress={() => setToolsMenuOpen(false)}
        >
          <View
            style={[
              styles.toolsMenuSheet,
              {
                backgroundColor: surfaceColor,
                borderColor,
              },
            ]}
            onStartShouldSetResponder={() => true}
          >
            <ThemedText
              type="defaultSemiBold"
              style={[styles.toolsMenuTitle, { color: textColor }]}
            >
              {t("quick.toolsMenu")}
            </ThemedText>
            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
            >
              {(menuItems ?? []).map((item) => (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    styles.toolsMenuRow,
                    { borderBottomColor: hexToRgba(borderColor, 0.35) },
                  ]}
                  onPress={() => {
                    setToolsMenuOpen(false);
                    item.onPress();
                  }}
                >
                  <Ionicons name={item.icon} size={22} color={primaryColor} />
                  <ThemedText
                    style={[styles.toolsMenuRowLabel, { color: textColor }]}
                    numberOfLines={2}
                  >
                    {item.label}
                  </ThemedText>
                  <Ionicons
                    name="chevron-forward"
                    size={18}
                    color={textSecondaryColor}
                  />
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </TouchableOpacity>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
  },
  contentLayer: {
    flex: 1,
    backgroundColor: "transparent",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 14,
    minHeight: 52,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerIconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: StyleSheet.hairlineWidth,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: 10,
    minWidth: 36,
  },
  title: {
    flex: 1,
    fontSize: 17,
    lineHeight: 22,
    textAlign: "center",
    marginHorizontal: 8,
  },
  headerSpacer: {
    width: 36,
  },
  body: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 0,
    backgroundColor: "transparent",
  },
  toolsMenuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
    paddingBottom: Platform.OS === "ios" ? 28 : 20,
    paddingHorizontal: 16,
  },
  toolsMenuSheet: {
    maxHeight: "72%",
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    paddingBottom: 8,
    overflow: "hidden",
  },
  toolsMenuTitle: {
    paddingHorizontal: 16,
    paddingBottom: 10,
    fontSize: 16,
  },
  toolsMenuRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  toolsMenuRowLabel: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
  },
});

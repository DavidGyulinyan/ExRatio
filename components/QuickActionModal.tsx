import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { FinancialBackground } from "@/components/FinancialBackground";
import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { useLanguage } from "@/contexts/LanguageContext";
import { useThemeColor } from "@/hooks/use-theme-color";
import { shareLines } from "@/lib/shareText";

interface QuickActionModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** When set, header shows a share control that shares this text. */
  shareMessage?: string | null;
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
}: QuickActionModalProps) {
  const { t } = useLanguage();
  const backgroundColor = useThemeColor({}, "background");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");
  const primaryColor = useThemeColor({}, "primary");

  const trimmedShare = shareMessage?.trim();
  const canShare = Boolean(trimmedShare);

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
            ) : (
              <View style={styles.headerSpacer} />
            )}
          </View>
          <View style={styles.body}>{children}</View>
        </View>
      </SafeAreaView>
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
});

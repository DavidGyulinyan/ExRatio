import React from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Pressable,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layout, hexToRgba } from "@/constants/theme";

type DangerZoneModalProps = {
  visible: boolean;
  onClose: () => void;
  onContactSupport: () => void;
  onRequestDeleteAccount: () => void;
  deleteBusy: boolean;
};

export default function DangerZoneModal({
  visible,
  onClose,
  onContactSupport,
  onRequestDeleteAccount,
  deleteBusy,
}: DangerZoneModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const primaryColor = useThemeColor({}, "primary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const textInverseColor = useThemeColor({}, "textInverse");
  const borderColor = useThemeColor({}, "border");
  const errorColor = useThemeColor({}, "error");

  const bullets = [
    t("settings.dangerZoneModalBulletServer"),
    t("settings.dangerZoneModalBulletDevice"),
    t("settings.dangerZoneModalBulletIrreversible"),
    t("settings.dangerZoneModalBulletSupport"),
  ];

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0,0,0,0.5)",
      justifyContent: "center",
      paddingTop: insets.top,
      paddingBottom: insets.bottom,
      paddingHorizontal: Layout.spaceMd,
    },
    card: {
      backgroundColor: surfaceColor,
      borderRadius: Layout.radiusLg,
      borderWidth: 1,
      borderColor: borderColor,
      maxHeight: "88%",
      overflow: "hidden",
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      paddingHorizontal: Layout.spaceMd,
      paddingVertical: Layout.spaceSm,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: borderColor,
      gap: 10,
    },
    headerIconWrap: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: hexToRgba(errorColor, 0.12),
      alignItems: "center",
      justifyContent: "center",
    },
    title: {
      flex: 1,
      fontSize: 18,
      fontWeight: "700",
      color: textColor,
      letterSpacing: -0.2,
    },
    closeHeader: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: surfaceSecondaryColor,
      alignItems: "center",
      justifyContent: "center",
    },
    body: {
      paddingHorizontal: Layout.spaceMd,
      paddingTop: Layout.spaceMd,
      paddingBottom: Layout.spaceSm,
    },
    intro: {
      fontSize: 15,
      lineHeight: 22,
      color: textColor,
      fontWeight: "500",
      marginBottom: Layout.spaceMd,
    },
    bulletRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 10,
      marginBottom: 10,
    },
    bulletDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: errorColor,
      marginTop: 8,
    },
    bulletText: {
      flex: 1,
      fontSize: 14,
      lineHeight: 20,
      color: textSecondaryColor,
    },
    actions: {
      padding: Layout.spaceMd,
      gap: 10,
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: borderColor,
    },
    btnSecondary: {
      paddingVertical: 14,
      borderRadius: Layout.radiusMd,
      borderWidth: 1,
      borderColor: hexToRgba(primaryColor, 0.45),
      alignItems: "center",
    },
    btnSecondaryText: {
      fontSize: 16,
      fontWeight: "600",
      color: primaryColor,
    },
    btnSupport: {
      paddingVertical: 12,
      alignItems: "center",
    },
    btnSupportText: {
      fontSize: 15,
      fontWeight: "600",
      color: primaryColor,
    },
    btnDestroy: {
      paddingVertical: 14,
      borderRadius: Layout.radiusMd,
      backgroundColor: errorColor,
      alignItems: "center",
    },
    btnDestroyText: {
      fontSize: 16,
      fontWeight: "600",
      color: textInverseColor,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <Pressable style={styles.overlay} onPress={onClose}>
        <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
          <View style={styles.header}>
            <View style={styles.headerIconWrap}>
              <Ionicons name="warning-outline" size={22} color={errorColor} />
            </View>
            <ThemedText style={styles.title}>{t("settings.dangerZone")}</ThemedText>
            <TouchableOpacity
              style={styles.closeHeader}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel={t("common.close")}
            >
              <Ionicons name="close" size={22} color={textSecondaryColor} />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={{ maxHeight: 360 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.body}>
              <ThemedText style={styles.intro}>
                {t("settings.dangerZoneModalIntro")}
              </ThemedText>
              {bullets.map((line, i) => (
                <View key={i} style={styles.bulletRow}>
                  <View style={styles.bulletDot} />
                  <ThemedText style={styles.bulletText}>{line}</ThemedText>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity
              style={styles.btnSecondary}
              onPress={onClose}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.btnSecondaryText}>
                {t("settings.dangerZoneModalClose")}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnSupport}
              onPress={() => {
                onClose();
                onContactSupport();
              }}
              activeOpacity={0.75}
            >
              <ThemedText style={styles.btnSupportText}>
                {t("settings.dangerZoneModalContactSupport")}
              </ThemedText>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.btnDestroy}
              onPress={() => {
                onClose();
                onRequestDeleteAccount();
              }}
              disabled={deleteBusy}
              activeOpacity={0.85}
            >
              <ThemedText style={styles.btnDestroyText}>
                {deleteBusy ? t("common.loading") : t("settings.deleteAccount")}
              </ThemedText>
            </TouchableOpacity>
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

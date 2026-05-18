import React, { useEffect, useState } from "react";
import {
  Modal,
  View,
  TouchableOpacity,
  StyleSheet,
  Pressable,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { Layout, FormField, hexToRgba } from "@/constants/theme";

type DeleteAccountPasswordModalProps = {
  visible: boolean;
  email?: string | null;
  onClose: () => void;
  onSubmit: (password: string) => Promise<{ errorMessage?: string }>;
  busy: boolean;
};

export default function DeleteAccountPasswordModal({
  visible,
  email,
  onClose,
  onSubmit,
  busy,
}: DeleteAccountPasswordModalProps) {
  const insets = useSafeAreaInsets();
  const { t } = useLanguage();
  const [password, setPassword] = useState("");
  const [localError, setLocalError] = useState<string | null>(null);

  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const primaryColor = useThemeColor({}, "primary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const textInverseColor = useThemeColor({}, "textInverse");
  const borderColor = useThemeColor({}, "border");
  const errorColor = useThemeColor({}, "error");

  useEffect(() => {
    if (!visible) {
      setPassword("");
      setLocalError(null);
    }
  }, [visible]);

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
      padding: Layout.spaceMd,
    },
    header: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      marginBottom: Layout.spaceSm,
    },
    title: {
      fontSize: 18,
      fontWeight: "700",
      color: textColor,
      flex: 1,
    },
    closeBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: surfaceSecondaryColor,
      alignItems: "center",
      justifyContent: "center",
    },
    subtitle: {
      fontSize: 14,
      lineHeight: 20,
      color: textSecondaryColor,
      marginBottom: Layout.spaceMd,
    },
    emailHint: {
      fontSize: 13,
      color: textSecondaryColor,
      marginBottom: Layout.spaceSm,
    },
    input: {
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: FormField.radiusInput,
      paddingVertical: 12,
      paddingHorizontal: 14,
      fontSize: 16,
      color: textColor,
      backgroundColor: surfaceSecondaryColor,
      marginBottom: 8,
    },
    errorText: {
      fontSize: 13,
      color: errorColor,
      marginBottom: Layout.spaceSm,
    },
    row: {
      flexDirection: "row",
      gap: 10,
      marginTop: Layout.spaceSm,
    },
    btnCancel: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: Layout.radiusMd,
      borderWidth: 1,
      borderColor: hexToRgba(primaryColor, 0.45),
      alignItems: "center",
    },
    btnCancelText: {
      fontSize: 16,
      fontWeight: "600",
      color: primaryColor,
    },
    btnDestroy: {
      flex: 1,
      paddingVertical: 14,
      borderRadius: Layout.radiusMd,
      backgroundColor: errorColor,
      alignItems: "center",
      justifyContent: "center",
    },
    btnDestroyText: {
      fontSize: 16,
      fontWeight: "600",
      color: textInverseColor,
    },
  });

  const handleConfirm = async () => {
    setLocalError(null);
    const pw = password.trim();
    if (!pw) {
      setLocalError(t("settings.deleteAccountPasswordEmpty"));
      return;
    }
    const { errorMessage } = await onSubmit(pw);
    if (errorMessage) {
      setLocalError(errorMessage);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={busy ? undefined : onClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        style={{ flex: 1 }}
      >
        <Pressable style={styles.overlay} onPress={busy ? undefined : onClose}>
          <Pressable style={styles.card} onPress={(e) => e.stopPropagation()}>
            <View style={styles.header}>
              <ThemedText style={styles.title}>
                {t("settings.deleteAccountPasswordTitle")}
              </ThemedText>
              <TouchableOpacity
                style={styles.closeBtn}
                onPress={onClose}
                disabled={busy}
                accessibilityRole="button"
                accessibilityLabel={t("common.close")}
              >
                <Ionicons name="close" size={22} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>

            <ThemedText style={styles.subtitle}>
              {t("settings.deleteAccountPasswordSubtitle")}
            </ThemedText>
            {email ? (
              <ThemedText style={styles.emailHint} numberOfLines={1}>
                {email}
              </ThemedText>
            ) : null}

            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder={t("settings.deleteAccountPasswordPlaceholder")}
              placeholderTextColor={textSecondaryColor}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
              editable={!busy}
              onSubmitEditing={handleConfirm}
            />

            {localError ? (
              <ThemedText style={styles.errorText}>{localError}</ThemedText>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity
                style={styles.btnCancel}
                onPress={onClose}
                disabled={busy}
              >
                <ThemedText style={styles.btnCancelText}>
                  {t("common.cancel")}
                </ThemedText>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.btnDestroy}
                onPress={handleConfirm}
                disabled={busy}
              >
                {busy ? (
                  <ActivityIndicator color={textInverseColor} />
                ) : (
                  <ThemedText style={styles.btnDestroyText}>
                    {t("settings.deleteAccountConfirm")}
                  </ThemedText>
                )}
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

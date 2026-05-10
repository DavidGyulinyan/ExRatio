import React, { useState } from "react";
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Alert,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "@/components/themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { useAuth } from "@/contexts/AuthContext";
import * as MailComposer from "expo-mail-composer";
import { FormField } from "@/constants/theme";

interface ContactSupportModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function ContactSupportModal({
  visible,
  onClose,
}: ContactSupportModalProps) {
  const insets = useSafeAreaInsets();
  const [message, setMessage] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const { t } = useLanguage();
  const { user } = useAuth();

  const surfaceColor = useThemeColor({}, "surface");
  const surfaceSecondaryColor = useThemeColor({}, "surfaceSecondary");
  const primaryColor = useThemeColor({}, "primary");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const textInverseColor = useThemeColor({}, "textInverse");
  const borderColor = useThemeColor({}, "border");

  const handleSend = async () => {
    if (!message.trim()) {
      Alert.alert(t("common.error"), t("contactSupport.emptyMessage"));
      return;
    }

    setLoading(true);
    try {
      const isAvailable = await MailComposer.composeAsync({
        recipients: ["davidguiyn@gmail.com"],
        subject: "Capital Support Request",
        body: `From: ${user?.email || userEmail || "Anonymous User"}\n\n${message}`,
      });

      if (isAvailable) {
        Alert.alert(t("common.save"), t("contactSupport.messageSent"));
        setMessage("");
        setUserEmail("");
        onClose();
      } else {
        Alert.alert(
          t("common.error"),
          "Email composer is not available on this device"
        );
      }
    } catch (error) {
      console.error("Email composer error:", error);
      Alert.alert(t("common.error"), t("contactSupport.sendError"));
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    overlay: {
      flex: 1,
      backgroundColor: "rgba(0, 0, 0, 0.5)",
      justifyContent: "center",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingTop: insets.top + 12,
      paddingBottom: insets.bottom + 12,
    },
    container: {
      backgroundColor: surfaceColor,
      borderRadius: FormField.radiusCard,
      borderWidth: 1,
      borderColor: borderColor,
      padding: 14,
      width: "100%",
      maxWidth: 400,
      position: "relative",
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
    },
    modalHeader: {
      flexDirection: "row",
      alignItems: "center",
      marginBottom: 20,
      gap: 8,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: "600",
      color: textColor,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: surfaceSecondaryColor,
      alignItems: "center",
      justifyContent: "center",
    },
    input: {
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: FormField.radiusInput,
      paddingHorizontal: FormField.padH,
      paddingVertical: FormField.padV,
      fontSize: FormField.fontSize,
      fontWeight: FormField.fontWeight,
      color: textColor,
      backgroundColor: surfaceColor,
      height: 120,
      textAlignVertical: "top",
    },
    button: {
      backgroundColor: primaryColor,
      borderRadius: FormField.radiusInput,
      paddingVertical: FormField.padV + 2,
      paddingHorizontal: FormField.padH,
      alignItems: "center",
      marginTop: 16,
    },
    buttonText: {
      color: textInverseColor,
      fontSize: 16,
      fontWeight: "600",
    },
    label: {
      fontSize: FormField.labelSize,
      fontWeight: "600",
      color: textColor,
      marginBottom: 10,
      letterSpacing: 0.2,
    },
  });

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.modalHeader}>
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              disabled={loading}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={22} color={textSecondaryColor} />
            </TouchableOpacity>
            <ThemedText style={[styles.modalTitle, { flex: 1, textAlign: "center" }]}>
              {t("contactSupport.title")}
            </ThemedText>
            <View style={{ width: 32 }} />
          </View>

          {!user && (
            <>
              <ThemedText style={styles.label}>
                {t("contactSupport.yourEmail")}
              </ThemedText>
              <TextInput
                style={[styles.input, { height: 50, marginBottom: 16 }]}
                value={userEmail}
                onChangeText={setUserEmail}
                placeholder="your.email@example.com"
                placeholderTextColor={textSecondaryColor}
                keyboardType="email-address"
                autoCapitalize="none"
                editable={!loading}
              />
            </>
          )}

          <ThemedText style={styles.label}>
            {t("contactSupport.describeIssue")}
          </ThemedText>
          <TextInput
            style={styles.input}
            value={message}
            onChangeText={setMessage}
            placeholder={t("contactSupport.describeIssue")}
            placeholderTextColor={textSecondaryColor}
            multiline
            numberOfLines={4}
            editable={!loading}
          />

          <TouchableOpacity
            style={styles.button}
            onPress={handleSend}
            disabled={loading || !message.trim()}
          >
            {loading ? (
              <ActivityIndicator color={textInverseColor} />
            ) : (
              <ThemedText style={styles.buttonText}>
                {t("contactSupport.sendMessage")}
              </ThemedText>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

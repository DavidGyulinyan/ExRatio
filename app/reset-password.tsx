import React, { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Logo from "@/components/Logo";
import { useThemeColor } from "@/hooks/use-theme-color";
import { hexToRgba, FormField } from "@/constants/theme";
import { getSupabaseClient } from "@/lib/supabase-safe";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [confirmVisible, setConfirmVisible] = useState(false);
  const [loading, setLoading] = useState(false);

  const backgroundColor = useThemeColor({}, "background");
  const surfaceColor = useThemeColor({}, "surface");
  const primaryColor = useThemeColor({}, "primary");
  const accentColor = useThemeColor({}, "accent");
  const textColor = useThemeColor({}, "text");
  const textSecondaryColor = useThemeColor({}, "textSecondary");
  const borderColor = useThemeColor({}, "border");

  const styles = useMemo(
    () =>
      StyleSheet.create({
        container: { flex: 1, backgroundColor },
        scrollContainer: { flexGrow: 1 },
        content: {
          flex: 1,
          paddingHorizontal: 24,
          paddingTop: 24,
          paddingBottom: 40,
          alignItems: "center",
          justifyContent: "center",
        },
        title: {
          fontSize: 30,
          fontWeight: "700",
          color: textColor,
          marginTop: 18,
          marginBottom: 8,
        },
        subtitle: {
          fontSize: 15,
          color: textSecondaryColor,
          textAlign: "center",
          marginBottom: 28,
        },
        authCard: {
          width: "100%",
          maxWidth: 420,
          backgroundColor: surfaceColor,
          borderRadius: FormField.radiusCard,
          padding: 14,
          borderWidth: 1,
          borderColor,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 8,
          elevation: 2,
        },
        fieldPanel: {
          borderRadius: FormField.radiusPanel,
          borderWidth: 1,
          padding: 12,
          marginBottom: 12,
        },
        label: {
          fontSize: FormField.labelSize,
          fontWeight: "600",
          color: textColor,
          marginBottom: 10,
          letterSpacing: 0.2,
        },
        passwordInputContainer: { position: "relative" },
        input: {
          borderWidth: 1,
          borderColor,
          borderRadius: FormField.radiusInput,
          paddingHorizontal: FormField.padH,
          paddingVertical: FormField.padV,
          paddingRight: 50,
          fontSize: FormField.fontSize,
          fontWeight: FormField.fontWeight,
          backgroundColor: surfaceColor,
          color: textColor,
        },
        eyeButton: {
          position: "absolute",
          right: 12,
          top: "50%",
          transform: [{ translateY: -10 }],
          padding: 4,
        },
        button: {
          backgroundColor: primaryColor,
          borderRadius: 12,
          paddingVertical: 16,
          alignItems: "center",
          justifyContent: "center",
          marginTop: 6,
        },
        buttonText: { color: "#fff", fontSize: 16, fontWeight: "600" },
        buttonDisabled: { opacity: 0.6 },
        backLink: { marginTop: 18, padding: 8 },
        backText: { color: primaryColor, fontWeight: "600", fontSize: 14 },
      }),
    [backgroundColor, borderColor, primaryColor, surfaceColor, textColor, textSecondaryColor]
  );

  const handleUpdatePassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert("Error", "Please fill all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Error", "Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert("Error", "Passwords do not match.");
      return;
    }

    const supabase = getSupabaseClient();
    if (!supabase) {
      Alert.alert("Error", "Authentication service is unavailable.");
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) {
        Alert.alert("Error", error.message);
        return;
      }

      Alert.alert("Success", "Password updated successfully.", [
        {
          text: "OK",
          onPress: () => router.replace("/signin"),
        },
      ]);
    } catch (error) {
      Alert.alert("Error", error instanceof Error ? error.message : "Failed to update password.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <Logo size={72} showText textSize={26} />
            <Text style={styles.title}>Set New Password</Text>
            <Text style={styles.subtitle}>
              Enter your new password to complete recovery.
            </Text>

            <View style={[styles.authCard, { borderColor }]}>
              <View
                style={[
                  styles.fieldPanel,
                  {
                    borderColor,
                    backgroundColor: hexToRgba(accentColor, 0.1),
                    marginBottom: 16,
                  },
                ]}
              >
                <Text style={styles.label}>New Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!passwordVisible}
                    autoCapitalize="none"
                    placeholder="Enter new password"
                    placeholderTextColor={textSecondaryColor}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setPasswordVisible((v) => !v)}
                  >
                    <Ionicons
                      name={passwordVisible ? "eye-off" : "eye"}
                      size={20}
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <View
                style={[
                  styles.fieldPanel,
                  {
                    borderColor,
                    backgroundColor: hexToRgba(accentColor, 0.1),
                    marginBottom: 16,
                  },
                ]}
              >
                <Text style={styles.label}>Confirm Password</Text>
                <View style={styles.passwordInputContainer}>
                  <TextInput
                    style={styles.input}
                    value={confirmPassword}
                    onChangeText={setConfirmPassword}
                    secureTextEntry={!confirmVisible}
                    autoCapitalize="none"
                    placeholder="Confirm new password"
                    placeholderTextColor={textSecondaryColor}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setConfirmVisible((v) => !v)}
                  >
                    <Ionicons
                      name={confirmVisible ? "eye-off" : "eye"}
                      size={20}
                      color={textSecondaryColor}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[styles.button, loading && styles.buttonDisabled]}
                onPress={handleUpdatePassword}
                disabled={loading}
              >
                <Text style={styles.buttonText}>
                  {loading ? "Updating..." : "Update Password"}
                </Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.backLink}
              onPress={() => router.replace("/signin")}
            >
              <Text style={styles.backText}>Back to Sign In</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

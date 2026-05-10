import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  Platform,
  KeyboardAvoidingView,
  ScrollView,
  StatusBar,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { hexToRgba, FormField } from '@/constants/theme';
import Logo from '@/components/Logo';
import { Ionicons } from '@expo/vector-icons';

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const { resetPassword } = useAuth();
  const router = useRouter();

  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const primaryColor = useThemeColor({}, 'primary');
  const accentColor = useThemeColor({}, 'accent');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: backgroundColor,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 24,
      paddingTop: 24,
      paddingBottom: 40,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 16,
    },
    backNavButton: {
      padding: 8,
      marginLeft: -8,
    },

    title: {
      fontSize: 32,
      fontWeight: '700',
      color: textColor,
      marginBottom: 8,
      textAlign: 'center',
      letterSpacing: 0.3,
    },
    subtitle: {
      fontSize: 16,
      color: textSecondaryColor,
      textAlign: 'center',
      marginBottom: 32,
      lineHeight: 24,
      paddingHorizontal: 20,
    },

    authCard: {
      width: '100%',
      maxWidth: 400,
      marginBottom: 24,
      backgroundColor: surfaceColor,
      borderRadius: FormField.radiusCard,
      padding: 14,
      borderWidth: 1,
      borderColor: borderColor,
      shadowColor: '#000',
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
      fontWeight: '600',
      color: textColor,
      marginBottom: 10,
      letterSpacing: 0.2,
    },
    input: {
      borderWidth: 1,
      borderColor: borderColor,
      borderRadius: FormField.radiusInput,
      paddingHorizontal: FormField.padH,
      paddingVertical: FormField.padV,
      fontSize: FormField.fontSize,
      fontWeight: FormField.fontWeight,
      backgroundColor: surfaceColor,
      color: textColor,
    },

    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 12,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    primaryButton: {
      backgroundColor: primaryColor,
      shadowColor: primaryColor,
      shadowOpacity: 0.3,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
    },
    buttonDisabled: {
      opacity: 0.6,
    },

    successCard: {
      backgroundColor: surfaceColor,
      borderRadius: FormField.radiusCard,
      padding: 14,
      marginBottom: 32,
      borderWidth: 1,
      borderColor: borderColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 8,
      elevation: 2,
      alignItems: 'center',
    },
    successTitle: {
      fontSize: 20,
      fontWeight: '700',
      color: textColor,
      marginBottom: 12,
      textAlign: 'center',
    },
    successText: {
      fontSize: 14,
      color: textSecondaryColor,
      textAlign: 'center',
      lineHeight: 20,
    },

    backLink: {
      padding: 8,
    },
    backText: {
      color: primaryColor,
      fontSize: 16,
      fontWeight: '600',
    },

    resendLink: {
      padding: 8,
      marginTop: 16,
    },
    resendText: {
      color: primaryColor,
      fontSize: 14,
      fontWeight: '600',
      textAlign: 'center',
    },
  }), [backgroundColor, surfaceColor, primaryColor, textColor, textSecondaryColor, borderColor]);

  const handleResetPassword = async () => {
    const normalizedEmail = email.trim().toLowerCase();
    if (!normalizedEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      Alert.alert('Error', 'Please enter a valid email address');
      return;
    }

    setLoading(true);
    try {
      const { error } = await resetPassword(normalizedEmail);
      if (error) {
        Alert.alert('Error', error.message || 'Failed to send reset email. Please try again.');
      } else {
        setEmail(normalizedEmail);
        setEmailSent(true);
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (emailSent) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle="dark-content" />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backNavButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={24} color={textColor} />
              </TouchableOpacity>
            </View>
            <Logo size={72} showText={true} textSize={26} />
            <Text style={styles.title}>Check Your Email</Text>
            <Text style={styles.subtitle}>
              {"We've sent password reset instructions to "}
              {email}
            </Text>

            <View style={styles.successCard}>
              <Ionicons name="mail-outline" size={48} color={primaryColor} style={{ marginBottom: 16 }} />
              <Text style={styles.successTitle}>Reset Email Sent!</Text>
              <Text style={styles.successText}>
                Click the link in the email to reset your password. The link will expire in 1 hour.
              </Text>
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton]}
              onPress={() => router.push('/signin')}
            >
              <Text style={styles.primaryButtonText}>Back to Sign In</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.resendLink}
              onPress={() => setEmailSent(false)}
            >
              <Text style={styles.resendText}>
                {"Didn't receive the email? Try again"}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'left', 'right', 'bottom']}>
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar barStyle="dark-content" />
      <ScrollView contentContainerStyle={styles.scrollContainer}>
        <View style={styles.content}>
          <View style={styles.topBar}>
            <TouchableOpacity
              onPress={() => router.back()}
              style={styles.backNavButton}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={24} color={textColor} />
            </TouchableOpacity>
          </View>
          <Logo size={72} showText={true} textSize={36} />
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>
            {
              "Enter your email address and we'll send you a link to reset your password"
            }
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
              <Text style={styles.label}>Email</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder="Enter your email address"
                placeholderTextColor={textSecondaryColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleResetPassword}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? 'Sending...' : 'Send Reset Email'}
              </Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity
            style={styles.backLink}
            onPress={() => router.back()}
          >
            <Text style={styles.backText}>← Back to Sign In</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

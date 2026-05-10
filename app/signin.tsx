import React, { useState, useMemo, useEffect } from 'react';
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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { hexToRgba, FormField } from '@/constants/theme';
import Logo from '@/components/Logo';
import AuthButtons from '@/components/AuthButtons';
import { Ionicons } from '@expo/vector-icons';

export default function SignInScreen() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [passwordVisible, setPasswordVisible] = useState(false);
    const [loading, setLoading] = useState(false);
    const [emailNotConfirmed, setEmailNotConfirmed] = useState(false);
    const [invalidCredentials, setInvalidCredentials] = useState(false);
    const [resendLoading, setResendLoading] = useState(false);
    const [welcomeTitle, setWelcomeTitle] = useState('auth.welcome'); // Default to "Welcome"
    const [rememberMe, setRememberMe] = useState(false);

    const { signIn, resendConfirmationEmail } = useAuth();
    const { t } = useLanguage();
    const router = useRouter();

    useEffect(() => {
      const loadPreferences = async () => {
        try {
          const hasSignedInBefore = await AsyncStorage.getItem('hasSignedInBefore');
          if (hasSignedInBefore === 'true') {
            setWelcomeTitle('signin.welcomeBack');
          } else {
            setWelcomeTitle('auth.welcome');
          }

          const rememberMePref = await AsyncStorage.getItem('rememberMe');
          if (rememberMePref === 'true') {
            setRememberMe(true);
          }
        } catch (error) {
          console.warn('Failed to load preferences:', error);
          setWelcomeTitle('auth.welcome');
        }
      };

      loadPreferences();
    }, []);

   const backgroundColor = useThemeColor({}, 'background');
   const surfaceColor = useThemeColor({}, 'surface');
   const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
   const primaryColor = useThemeColor({}, 'primary');
   const accentColor = useThemeColor({}, 'accent');
   const textColor = useThemeColor({}, 'text');
   const textSecondaryColor = useThemeColor({}, 'textSecondary');
   const borderColor = useThemeColor({}, 'border');
   const errorColor = useThemeColor({}, 'error');
   const warningColor = useThemeColor({}, 'warning');

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: backgroundColor,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    backgroundPattern: {
      flex: 1,
      backgroundColor: backgroundColor,
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

    // Card layout
    logoContainer: {
      marginBottom: 32,
      alignItems: 'center',
    },
    authCard: {
      backgroundColor: surfaceColor,
      width: '100%',
      maxWidth: 400,
      borderRadius: FormField.radiusCard,
      padding: 14,
      marginBottom: 20,
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

    // Typography
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
    passwordInputContainer: {
      position: 'relative',
    },
    passwordInput: {
      borderWidth: 1,
      borderColor: borderColor,
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
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: [{ translateY: -10 }],
      padding: 4,
    },

    // Buttons
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 12,
      flexWrap: 'wrap',
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
      flexWrap: 'wrap',
    },
    buttonDisabled: {
      opacity: 0.6,
    },

    // Footer
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
      paddingHorizontal: 20,
    },
    footerText: {
      color: textSecondaryColor,
      fontSize: 14,
    },
    signUpLink: {
      color: primaryColor,
      fontSize: 14,
      fontWeight: '600',
    },

    // Email Confirmation Error Styles
    confirmationError: {
      backgroundColor: hexToRgba(warningColor, 0.1),
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: warningColor,
    },
    confirmationErrorTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: warningColor,
      marginBottom: 8,
      textAlign: 'center',
    },
    confirmationErrorText: {
      fontSize: 14,
      color: warningColor,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    resendButton: {
      backgroundColor: warningColor,
    },
    resendButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },

    // Invalid Credentials Error Styles
    credentialsError: {
      backgroundColor: hexToRgba(errorColor, 0.1),
      borderRadius: 12,
      padding: 16,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: errorColor,
    },
    credentialsErrorTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: errorColor,
      marginBottom: 8,
      textAlign: 'center',
    },
    credentialsErrorText: {
      fontSize: 14,
      color: errorColor,
      textAlign: 'center',
      marginBottom: 16,
      lineHeight: 20,
    },
    retryButton: {
      backgroundColor: errorColor,
    },
    retryButtonText: {
      color: '#fff',
      fontSize: 14,
      fontWeight: '600',
    },

    // Forgot Password Link
    forgotPasswordLink: {
      alignSelf: 'center',
      marginTop: 16,
      padding: 8,
    },
    forgotPasswordText: {
      color: primaryColor,
      fontSize: 14,
      fontWeight: '600',
    },

    // Remember Me Checkbox
    rememberMeContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 8,
      marginBottom: 16,
      alignSelf: 'flex-start',
    },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 2,
      borderColor: borderColor,
      borderRadius: 4,
      backgroundColor: surfaceSecondaryColor,
      alignItems: 'center',
      justifyContent: 'center',
      marginRight: 8,
    },
    checkboxChecked: {
      backgroundColor: primaryColor,
      borderColor: primaryColor,
    },
    rememberMeText: {
      fontSize: 14,
      color: textColor,
    },
  }), [backgroundColor, surfaceColor, surfaceSecondaryColor, primaryColor, textColor, textSecondaryColor, borderColor, errorColor, warningColor]);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert(t('common.error'), t('signin.fillAllFields'));
      return;
    }

    setLoading(true);
    setEmailNotConfirmed(false);
    setInvalidCredentials(false);
    try {
      const { error } = await signIn(email, password);
      if (error) {
        // Check if it's an email confirmation error
        if (error.name === 'EmailNotConfirmedError') {
          setEmailNotConfirmed(true);
        } else if (error.name === 'InvalidCredentialsError') {
          setInvalidCredentials(true);
        } else {
          Alert.alert(t('auth.signin'), error.message);
        }
      } else {
        // Store remember me preference
        AsyncStorage.setItem('rememberMe', rememberMe.toString()).catch(error => {
          console.warn('Failed to store remember me preference:', error);
        });
        // Navigation will be handled by the auth state change
        router.back();
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert(t('common.error'), t('error.loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      Alert.alert(t('common.error'), t('signup.enterEmail'));
      return;
    }

    setResendLoading(true);
    try {
      const { error } = await resendConfirmationEmail(email);
      if (error) {
        Alert.alert(t('common.error'), t('error.loading'));
      } else {
        Alert.alert(t('common.ok'), t('signin.confirmationSent'));
      }
    } catch {
      Alert.alert(t('common.error'), t('error.loading'));
    } finally {
      setResendLoading(false);
    }
  };


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
           <Text style={styles.title}>{t(welcomeTitle)}</Text>
           <Text style={styles.subtitle}>{t('signin.subtitle')}</Text>

          <View style={[styles.authCard, { borderColor }]}>
            <View
              style={[
                styles.fieldPanel,
                {
                  borderColor,
                  backgroundColor: hexToRgba(accentColor, 0.1),
                },
              ]}
            >
              <Text style={styles.label}>{t('auth.email')}</Text>
              <TextInput
                style={styles.input}
                value={email}
                onChangeText={setEmail}
                placeholder={t('signin.enterEmail')}
                placeholderTextColor={textSecondaryColor}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>

            <View
              style={[
                styles.fieldPanel,
                {
                  borderColor,
                  backgroundColor: hexToRgba(accentColor, 0.1),
                },
              ]}
            >
              <Text style={styles.label}>{t('auth.password')}</Text>
              <View style={styles.passwordInputContainer}>
                <TextInput
                  style={styles.passwordInput}
                  value={password}
                  onChangeText={setPassword}
                  placeholder={t('signin.enterPassword')}
                  placeholderTextColor={textSecondaryColor}
                  secureTextEntry={!passwordVisible}
                />
                <TouchableOpacity
                  style={styles.eyeButton}
                  onPress={() => setPasswordVisible(!passwordVisible)}
                >
                  <Ionicons
                    name={passwordVisible ? "eye-off" : "eye"}
                    size={20}
                    color={textSecondaryColor}
                  />
                </TouchableOpacity>
              </View>
            </View>

            <TouchableOpacity
              style={styles.rememberMeContainer}
              onPress={() => setRememberMe(!rememberMe)}
            >
              <View style={[styles.checkbox, rememberMe && styles.checkboxChecked]}>
                {rememberMe && (
                  <Ionicons name="checkmark" size={14} color="#fff" />
                )}
              </View>
              <Text style={styles.rememberMeText}>{t('signin.rememberMe')}</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
              onPress={handleSignIn}
              disabled={loading}
            >
              <Text style={styles.primaryButtonText}>
                {loading ? t('signin.signingIn') : t('signin.signIn')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.forgotPasswordLink}
              onPress={() => router.push('/forgot-password')}
            >
              <Text style={styles.forgotPasswordText}>{t('signin.forgotPassword')}</Text>
            </TouchableOpacity>
          </View>

          {/* Email Confirmation Error */}
          {emailNotConfirmed && (
            <View style={styles.confirmationError}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="mail-outline" size={22} color={primaryColor} />
                <Text style={styles.confirmationErrorTitle}>{t('signin.emailNotConfirmed')}</Text>
              </View>
              <Text style={styles.confirmationErrorText}>
                {t('signin.checkEmail')}
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.resendButton, resendLoading && styles.buttonDisabled]}
                onPress={handleResendConfirmation}
                disabled={resendLoading}
              >
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
                  {!resendLoading && <Ionicons name="send-outline" size={18} color="#fff" />}
                  <Text style={styles.resendButtonText}>
                    {resendLoading ? t('common.loading') : t('signin.resendConfirmation')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          )}

          {/* Invalid Credentials Error */}
          {invalidCredentials && (
            <View style={styles.credentialsError}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                <Ionicons name="close-circle-outline" size={22} color={errorColor} />
                <Text style={styles.credentialsErrorTitle}>{t('signin.invalidCredentials')}</Text>
              </View>
              <Text style={styles.credentialsErrorText}>
                {t('signin.invalidCredentialsText')}
              </Text>
              <TouchableOpacity
                style={[styles.button, styles.retryButton]}
                onPress={() => setInvalidCredentials(false)}
              >
                <Text style={styles.retryButtonText}>{t('signin.tryAgain')}</Text>
              </TouchableOpacity>
            </View>
          )}

          <AuthButtons onSuccess={() => router.back()} />

          <View style={styles.footer}>
            <Text style={styles.footerText}>{t('auth.dontHaveAccount')} </Text>
            <TouchableOpacity onPress={() => router.push('/signup')}>
              <Text style={styles.signUpLink}>{t('signin.signUp')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

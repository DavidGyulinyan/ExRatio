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
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import { useThemeColor } from '@/hooks/use-theme-color';
import { hexToRgba, FormField, Layout } from '@/constants/theme';
import Logo from '@/components/Logo';
import AuthButtons from '@/components/AuthButtons';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';
import { SIGNUP_NO_VERIFICATION_EMAIL } from '@/lib/authErrors';
import {
  getPasswordPolicyFailureMessageKey,
  isPasswordPolicyValid,
  MIN_PASSWORD_LENGTH,
} from '@/lib/passwordPolicy';

WebBrowser.maybeCompleteAuthSession();

function SignUpScreen() {
   const [email, setEmail] = useState('');
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [passwordVisible, setPasswordVisible] = useState(false);
   const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
   const [loading, setLoading] = useState(false);
   const [pendingVerificationEmail, setPendingVerificationEmail] = useState<
     string | null
   >(null);
   const [emailOtp, setEmailOtp] = useState('');
   const [confirmingOtp, setConfirmingOtp] = useState(false);
   const [resendingOtp, setResendingOtp] = useState(false);

   const { signUp, confirmSignupWithOtp, resendConfirmationEmail } = useAuth();
   const { t, tWithParams } = useLanguage();
   const router = useRouter();
   const { effectiveTheme } = useTheme();

   const backgroundColor = useThemeColor({}, 'background');
   const surfaceColor = useThemeColor({}, 'surface');
   const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
   const primaryColor = useThemeColor({}, 'primary');
   const textColor = useThemeColor({}, 'text');
   const textSecondaryColor = useThemeColor({}, 'textSecondary');
   const borderColor = useThemeColor({}, 'border');
   const errorColor = useThemeColor({}, 'error');

  const styles = useMemo(() => StyleSheet.create({
    safeArea: {
      flex: 1,
      backgroundColor: backgroundColor,
    },
    container: {
      flex: 1,
      backgroundColor: backgroundColor,
    },
    scrollContainer: {
      flexGrow: 1,
    },
    content: {
      flex: 1,
      paddingHorizontal: 22,
      paddingTop: 8,
      paddingBottom: 36,
      alignItems: 'center',
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 4,
    },
    backNavButton: {
      padding: 8,
      marginLeft: -8,
    },
    title: {
      fontSize: 26,
      fontWeight: '600',
      color: textColor,
      marginTop: 8,
      marginBottom: 6,
      textAlign: 'center',
      letterSpacing: -0.2,
    },
    subtitle: {
      fontSize: 15,
      color: textSecondaryColor,
      textAlign: 'center',
      marginBottom: 26,
      lineHeight: 22,
      paddingHorizontal: 8,
      opacity: 0.95,
    },
    authCard: {
      width: '100%',
      maxWidth: 400,
      backgroundColor: surfaceColor,
      borderRadius: Layout.radiusLg,
      padding: 20,
      borderWidth: 1,
      borderColor: hexToRgba(borderColor, 0.65),
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.04,
      shadowRadius: 20,
      elevation: 1,
      marginBottom: 12,
    },
    fieldGroup: {
      marginBottom: 18,
    },
    label: {
      fontSize: FormField.labelSize,
      fontWeight: '500',
      color: textSecondaryColor,
      marginBottom: 8,
      letterSpacing: 0.15,
    },
    input: {
      borderWidth: 1,
      borderColor: hexToRgba(borderColor, 0.75),
      borderRadius: Layout.radiusMd,
      paddingHorizontal: FormField.padH,
      paddingVertical: FormField.padV,
      fontSize: FormField.authInputFontSize,
      fontWeight: '500',
      backgroundColor: surfaceSecondaryColor,
      color: textColor,
    },
    passwordInputContainer: {
      position: 'relative',
    },
    passwordInput: {
      borderWidth: 1,
      borderColor: hexToRgba(borderColor, 0.75),
      borderRadius: Layout.radiusMd,
      paddingHorizontal: FormField.padH,
      paddingVertical: FormField.padV,
      paddingRight: 50,
      fontSize: FormField.authInputFontSize,
      fontWeight: '500',
      backgroundColor: surfaceSecondaryColor,
      color: textColor,
    },
    eyeButton: {
      position: 'absolute',
      right: 12,
      top: '50%',
      transform: [{ translateY: -10 }],
      padding: 4,
    },
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: Layout.radiusMd,
      paddingVertical: 15,
      paddingHorizontal: 20,
      marginTop: 4,
      marginBottom: 4,
      flexWrap: 'wrap',
    },
    primaryButton: {
      backgroundColor: primaryColor,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 2,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      flexWrap: 'wrap',
      includeFontPadding: false,
      letterSpacing: 0.2,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: 20,
      gap: 4,
    },
    footerText: {
      color: textSecondaryColor,
      fontSize: 14,
      fontWeight: '400',
    },
    signInLink: {
      color: primaryColor,
      fontSize: 14,
      fontWeight: '600',
    },
    secondaryButton: {
      marginTop: 12,
      paddingVertical: 12,
      alignItems: 'center',
    },
    secondaryButtonText: {
      color: primaryColor,
      fontSize: 15,
      fontWeight: '600',
    },
    emailPreview: {
      fontSize: 14,
      color: textSecondaryColor,
      textAlign: 'center',
      marginBottom: 16,
    },
    passwordHint: {
      marginTop: 6,
      fontSize: 12,
      lineHeight: 17,
      color: textSecondaryColor,
    },
  }), [backgroundColor, surfaceColor, surfaceSecondaryColor, primaryColor, textColor, textSecondaryColor, borderColor]);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('signup.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('signup.passwordsDontMatch'));
      return;
    }

    if (!isPasswordPolicyValid(password)) {
      const failureKey = getPasswordPolicyFailureMessageKey(password);
      const failureMessage =
        failureKey === 'signup.passwordTooShort'
          ? tWithParams('signup.passwordTooShort', {
              count: password.length,
              min: MIN_PASSWORD_LENGTH,
            })
          : t(failureKey);
      Alert.alert(t('common.error'), failureMessage);
      return;
    }

    setLoading(true);
    try {
      const { error, needsEmailConfirmation } = await signUp(
        email,
        password,
        username
      );
      if (error) {
        const msg =
          error.message === SIGNUP_NO_VERIFICATION_EMAIL
            ? t('signup.noVerificationEmail')
            : error.message;
        Alert.alert(t('auth.signup'), msg);
      } else if (needsEmailConfirmation) {
        setEmailOtp('');
        setPendingVerificationEmail(email.trim());
      } else {
        router.replace('/');
      }
    } catch {
      Alert.alert(t('common.error'), t('error.loading'));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmOtp = async () => {
    if (!pendingVerificationEmail) return;
    const code = emailOtp.trim().replace(/\s+/g, '');
    if (!code) {
      Alert.alert(t('common.error'), t('signup.codeMissing'));
      return;
    }
    setConfirmingOtp(true);
    try {
      const { error } = await confirmSignupWithOtp(
        pendingVerificationEmail,
        code
      );
      if (error) {
        Alert.alert(t('auth.signup'), error.message);
      } else {
        router.replace('/');
      }
    } finally {
      setConfirmingOtp(false);
    }
  };

  const handleResendOtp = async () => {
    if (!pendingVerificationEmail || resendingOtp) return;
    setResendingOtp(true);
    try {
      const { error } = await resendConfirmationEmail(pendingVerificationEmail);
      if (error) {
        Alert.alert(t('common.error'), error.message);
      } else {
        Alert.alert(t('common.ok'), t('signup.resendSent'));
      }
    } finally {
      setResendingOtp(false);
    }
  };

  const exitVerificationStep = () => {
    setPendingVerificationEmail(null);
    setEmailOtp('');
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <StatusBar barStyle={effectiveTheme === 'dark' ? 'light-content' : 'dark-content'} />
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <View style={styles.content}>
            <View style={styles.topBar}>
              <TouchableOpacity
                onPress={() => router.back()}
                style={styles.backNavButton}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>
            <Logo size={64} showText textSize={24} />
            <Text style={styles.title}>
              {pendingVerificationEmail
                ? t('signup.verifyTitle')
                : t('signup.createAccount')}
            </Text>
            <Text style={styles.subtitle}>
              {pendingVerificationEmail
                ? t('signup.verifySubtitle')
                : t('signup.subtitle')}
            </Text>

            <View style={styles.authCard}>
              {pendingVerificationEmail ? (
                <>
                  <Text style={styles.emailPreview}>{pendingVerificationEmail}</Text>
                  <Text style={[styles.footerText, { textAlign: 'center', marginBottom: 12 }]}>
                    {t('signup.verifySpamHint')}
                  </Text>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t('signup.codeLabel')}</Text>
                    <TextInput
                      style={styles.input}
                      value={emailOtp}
                      onChangeText={setEmailOtp}
                      placeholder={t('signup.codePlaceholder')}
                      placeholderTextColor={textSecondaryColor}
                      autoCapitalize="none"
                      autoCorrect={false}
                      keyboardType="number-pad"
                      textContentType="oneTimeCode"
                      maxLength={12}
                    />
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.button,
                      styles.primaryButton,
                      (confirmingOtp || resendingOtp) && styles.buttonDisabled,
                    ]}
                    onPress={handleConfirmOtp}
                    disabled={confirmingOtp || resendingOtp}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryButtonText}>
                      {confirmingOtp
                        ? t('signup.verifying')
                        : t('signup.verifyEmailButton')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={handleResendOtp}
                    disabled={confirmingOtp || resendingOtp}
                    activeOpacity={0.75}
                  >
                    <Text style={styles.secondaryButtonText}>
                      {resendingOtp ? t('signup.resending') : t('signup.resendCode')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.secondaryButton}
                    onPress={exitVerificationStep}
                    disabled={confirmingOtp || resendingOtp}
                    activeOpacity={0.75}
                  >
                    <Text style={[styles.secondaryButtonText, { fontWeight: '500' }]}>
                      {t('signup.backToSignUp')}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <>
                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t('signup.usernameOptional')}</Text>
                    <TextInput
                      style={styles.input}
                      value={username}
                      onChangeText={setUsername}
                      placeholder={t('signup.chooseUsername')}
                      placeholderTextColor={textSecondaryColor}
                      autoCapitalize="none"
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t('auth.email')}</Text>
                    <TextInput
                      style={styles.input}
                      value={email}
                      onChangeText={setEmail}
                      placeholder={t('signup.enterEmail')}
                      placeholderTextColor={textSecondaryColor}
                      keyboardType="email-address"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t('auth.password')}</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={password}
                        onChangeText={setPassword}
                        placeholder={t('signup.createPassword')}
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
                    <Text
                      style={[
                        styles.passwordHint,
                        password.length > 0 &&
                          password.length < MIN_PASSWORD_LENGTH && {
                            color: errorColor,
                            fontWeight: '600',
                          },
                      ]}
                    >
                      {password.length > 0 &&
                      password.length < MIN_PASSWORD_LENGTH
                        ? (() => {
                            const msg = tWithParams(
                              'signup.passwordLengthWarning',
                              {
                                count: password.length,
                                min: MIN_PASSWORD_LENGTH,
                              }
                            );
                            if (
                              msg.includes('{count}') ||
                              msg === 'signup.passwordLengthWarning'
                            ) {
                              return `${password.length} / ${MIN_PASSWORD_LENGTH} ${t('signup.passwordCharUnit')}`;
                            }
                            return msg;
                          })()
                        : t('signup.passwordHint')}
                    </Text>
                  </View>

                  <View style={styles.fieldGroup}>
                    <Text style={styles.label}>{t('auth.confirmPassword')}</Text>
                    <View style={styles.passwordInputContainer}>
                      <TextInput
                        style={styles.passwordInput}
                        value={confirmPassword}
                        onChangeText={setConfirmPassword}
                        placeholder={t('signup.confirmPassword')}
                        placeholderTextColor={textSecondaryColor}
                        secureTextEntry={!confirmPasswordVisible}
                      />
                      <TouchableOpacity
                        style={styles.eyeButton}
                        onPress={() => setConfirmPasswordVisible(!confirmPasswordVisible)}
                      >
                        <Ionicons
                          name={confirmPasswordVisible ? "eye-off" : "eye"}
                          size={20}
                          color={textSecondaryColor}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.button, styles.primaryButton, loading && styles.buttonDisabled]}
                    onPress={handleSignUp}
                    disabled={loading}
                    activeOpacity={0.88}
                  >
                    <Text style={styles.primaryButtonText}>
                      {loading ? t('signup.creatingAccount') : t('signup.createAccount')}
                    </Text>
                  </TouchableOpacity>
                </>
              )}
            </View>

            {!pendingVerificationEmail && (
              <AuthButtons onSuccess={() => router.push('/')} />
            )}

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')} </Text>
              <TouchableOpacity onPress={() => router.push('/signin')} activeOpacity={0.75}>
                <Text style={styles.signInLink}>{t('signin.signIn')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

    </SafeAreaView>
  );
}

export default SignUpScreen;

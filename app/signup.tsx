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
import { useThemeColor } from '@/hooks/use-theme-color';
import { hexToRgba, FormField } from '@/constants/theme';
import Logo from '@/components/Logo';
import AuthButtons from '@/components/AuthButtons';
import * as WebBrowser from 'expo-web-browser';
import { Ionicons } from '@expo/vector-icons';

WebBrowser.maybeCompleteAuthSession();

function SignUpScreen() {
   const [email, setEmail] = useState('');
   const [username, setUsername] = useState('');
   const [password, setPassword] = useState('');
   const [confirmPassword, setConfirmPassword] = useState('');
   const [passwordVisible, setPasswordVisible] = useState(false);
   const [confirmPasswordVisible, setConfirmPasswordVisible] = useState(false);
   const [loading, setLoading] = useState(false);

   const { signUp } = useAuth();
   const { t } = useLanguage();
   const router = useRouter();

   const backgroundColor = useThemeColor({}, 'background');
   const surfaceColor = useThemeColor({}, 'surface');
   const primaryColor = useThemeColor({}, 'primary');
   const accentColor = useThemeColor({}, 'accent');
   const textColor = useThemeColor({}, 'text');
   const textSecondaryColor = useThemeColor({}, 'textSecondary');
   const borderColor = useThemeColor({}, 'border');

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
      paddingHorizontal: 24,
      paddingTop: 16,
      paddingBottom: 40,
      alignItems: 'center',
    },
    topBar: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    backNavButton: {
      padding: 8,
      marginLeft: -8,
    },
    title: {
      fontSize: 28,
      fontWeight: 'bold',
      color: textColor,
      marginTop: 24,
      marginBottom: 8,
    },
    subtitle: {
      fontSize: 16,
      color: textSecondaryColor,
      textAlign: 'center',
      marginBottom: 32,
    },
    authCard: {
      width: '100%',
      maxWidth: 400,
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
      marginBottom: 8,
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
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 12,
      paddingVertical: 16,
      paddingHorizontal: 20,
      marginBottom: 12,
      flexWrap: 'wrap',
    },
    primaryButton: {
      backgroundColor: primaryColor,
    },
    primaryButtonText: {
      color: '#fff',
      fontSize: 16,
      fontWeight: '600',
      textAlign: 'center',
      flexWrap: 'wrap',
      includeFontPadding: false,
    },
    buttonDisabled: {
      opacity: 0.6,
    },
    footer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginTop: 24,
    },
    footerText: {
      color: textSecondaryColor,
      fontSize: 14,
    },
    signInLink: {
      color: primaryColor,
      fontSize: 14,
      fontWeight: '600',
    },
  }), [backgroundColor, surfaceColor, primaryColor, textColor, textSecondaryColor, borderColor]);

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert(t('common.error'), t('signup.fillAllFields'));
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert(t('common.error'), t('signup.passwordsDontMatch'));
      return;
    }

    if (password.length < 6) {
      Alert.alert(t('common.error'), t('signup.passwordTooShort'));
      return;
    }

    setLoading(true);
    try {
      const { error } = await signUp(email, password, username);
      if (error) {
        Alert.alert(t('auth.signup'), error.message);
      } else {

        router.replace('/');
      }
    } catch {
      Alert.alert(t('common.error'), t('error.loading'));
    } finally {
      setLoading(false);
    }
  };


  return (
    <SafeAreaView style={styles.safeArea} edges={['top', 'left', 'right', 'bottom']}>
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
            <Text style={styles.title}>{t('signup.createAccount')}</Text>
            <Text style={styles.subtitle}>{t('signup.subtitle')}</Text>

            <View style={[styles.authCard, { borderColor }]}>
              <View
                style={[
                  styles.fieldPanel,
                  { borderColor, backgroundColor: hexToRgba(accentColor, 0.1) },
                ]}
              >
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

              <View
                style={[
                  styles.fieldPanel,
                  { borderColor, backgroundColor: hexToRgba(accentColor, 0.1) },
                ]}
              >
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

              <View
                style={[
                  styles.fieldPanel,
                  { borderColor, backgroundColor: hexToRgba(accentColor, 0.1) },
                ]}
              >
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
              </View>

              <View
                style={[
                  styles.fieldPanel,
                  { borderColor, backgroundColor: hexToRgba(accentColor, 0.1) },
                ]}
              >
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
              >
                <Text style={styles.primaryButtonText}>
                  {loading ? t('signup.creatingAccount') : t('signup.createAccount')}
                </Text>
              </TouchableOpacity>
            </View>

            <AuthButtons onSuccess={() => router.push('/')} />

            <View style={styles.footer}>
              <Text style={styles.footerText}>{t('auth.alreadyHaveAccount')}</Text>
              <TouchableOpacity onPress={() => router.push('/signin')}>
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

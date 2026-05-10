import React from 'react';
import { View, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from './themed-text';

interface AuthButtonsProps {
  onSuccess?: () => void;
}

export default function AuthButtons({ onSuccess }: AuthButtonsProps) {
  const { signInWithGoogle, signInWithApple } = useAuth();
  const { t } = useLanguage();

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert(t('auth.continueWithGoogle'), error.message);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      Alert.alert(t('auth.continueWithGoogle'), error instanceof Error ? error.message : t('error.loading'));
    }
  };

  const handleAppleSignIn = async () => {
    try {
      const { error } = await signInWithApple();
      if (error) {
        Alert.alert(t('auth.continueWithApple'), error.message);
      } else {
        onSuccess?.();
      }
    } catch (error) {
      Alert.alert(t('auth.continueWithApple'), error instanceof Error ? error.message : t('error.loading'));
    }
  };

  return (
    <>
      <View style={styles.divider}>
        <View style={styles.dividerLine} />
        <ThemedText style={styles.dividerText}>{t('auth.orContinueWith')}</ThemedText>
        <View style={styles.dividerLine} />
      </View>

      <View style={styles.socialButtons}>
        <TouchableOpacity
          style={[styles.button, styles.googleButton]}
          onPress={handleGoogleSignIn}
        >
          <Ionicons name="logo-google" size={20} color="#52525b" />
          <ThemedText style={styles.googleButtonText}>{t('auth.continueWithGoogle')}</ThemedText>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.button, styles.appleButton]}
          onPress={handleAppleSignIn}
        >
          <Ionicons name="logo-apple" size={20} color="#000" />
          <ThemedText style={styles.appleButtonText}>{t('auth.continueWithApple')}</ThemedText>
        </TouchableOpacity>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 32,
    width: '100%',
    maxWidth: 400,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#e5e7eb',
  },
  dividerText: {
    marginHorizontal: 16,
    color: '#6b7280',
    fontSize: 14,
  },
  socialButtons: {
    width: '100%',
    maxWidth: 400,
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
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  googleButtonText: {
    color: '#374151',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flexWrap: 'wrap',
    includeFontPadding: false,
    flex: 1,
    textAlign: 'center',
  },
  appleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  appleButtonText: {
    color: '#000',
    fontSize: 15,
    fontWeight: '600',
    marginLeft: 12,
    flexWrap: 'wrap',
    includeFontPadding: false,
    flex: 1,
    textAlign: 'center',
  },
});
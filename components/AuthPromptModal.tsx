import React, { useState } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Modal,
  Platform,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';

interface AuthPromptModalProps {
  visible: boolean;
  onClose: () => void;
  title?: string;
  message?: string;
  feature?: 'alerts' | 'sync' | 'general';
}

export default function AuthPromptModal({
  visible,
  onClose,
  title = 'Create account to sync and enable alerts',
  message = 'Sign up to save your data and enable premium features',
  feature = 'general',
}: AuthPromptModalProps) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, signInWithApple } = useAuth();
  const { t } = useLanguage();
  const router = useRouter();

  const handleGoogleSignIn = async () => {
    setLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        Alert.alert('Google Sign In Error', error.message);
      } else {
        onClose();
      }
    } catch {
      Alert.alert('Error', 'An unexpected error occurred with Google sign in');
    } finally {
      setLoading(false);
    }
  };

  const handleAppleSignIn = async () => {
    if (Platform.OS === 'ios') {
      setLoading(true);
      try {
        const { error } = await signInWithApple();
        if (error) {
          Alert.alert('Apple Sign In Error', error.message);
        } else {
          onClose();
        }
      } catch {
        Alert.alert('Error', 'An unexpected error occurred with Apple sign in');
      } finally {
        setLoading(false);
      }
    } else {
      Alert.alert('Not Available', 'Apple Sign In is only available on iOS');
    }
  };

  const handleContinueWithEmail = () => {
    onClose();
    router.push('/signup');
  };

  const handleSignIn = () => {
    onClose();
    router.push('/signin');
  };

  const getFeatureSpecificMessage = () => {
    switch (feature) {
      case 'alerts':
        return 'Sign up to create custom rate alerts and get notified when rates reach your targets';
      case 'sync':
        return 'Sign up to sync your saved currencies across all your devices';
      default:
        return message;
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={[
          styles.overlay,
          {
            paddingTop: insets.top + 12,
            paddingBottom: insets.bottom + 12,
          },
        ]}
      >
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.closeButton}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={24} color="#71717a" />
          </TouchableOpacity>

          <View style={styles.iconContainer}>
            <Ionicons name="cloud-upload-outline" size={48} color="#F07E25" />
          </View>

          <Text style={styles.title}>{title}</Text>
          <Text style={styles.message}>{getFeatureSpecificMessage()}</Text>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={[styles.button, styles.googleButton]}
              onPress={handleGoogleSignIn}
              disabled={loading}
            >
              <Ionicons name="logo-google" size={20} color="#636366" />
              <Text style={styles.googleButtonText}>{t('signin.continueWithGoogle')}</Text>
            </TouchableOpacity>

            {Platform.OS === 'ios' && (
              <TouchableOpacity
                style={[styles.button, styles.appleButton]}
                onPress={handleAppleSignIn}
                disabled={loading}
              >
                <Ionicons name="logo-apple" size={20} color="#fff" />
                <Text style={styles.appleButtonText}>Continue with Apple</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.button, styles.emailButton]}
              onPress={handleContinueWithEmail}
            >
              <Ionicons name="mail-outline" size={20} color="#F07E25" />
              <Text style={styles.emailButtonText}>Create account with Email</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.signInLink}
              onPress={handleSignIn}
            >
              <Text style={styles.signInText}>
                Already have an account? <Text style={styles.signInLinkText}>Sign in</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  container: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    position: 'relative',
  },
  closeButton: {
    width: 36,
    height: 36,
    backgroundColor: '#f3f4f6',
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'absolute',
    top: 16,
    left: 16,
  },
  iconContainer: {
    marginTop: 20,
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#18181b',
    textAlign: 'center',
    marginBottom: 8,
  },
  message: {
    fontSize: 16,
    color: '#71717a',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginBottom: 12,
  },
  googleButton: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  googleButtonText: {
    color: '#404040',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  appleButton: {
    backgroundColor: '#000',
  },
  appleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  emailButton: {
    backgroundColor: '#EFEFEF',
    borderWidth: 1,
    borderColor: '#F07E25',
  },
  emailButtonText: {
    color: '#F07E25',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 12,
  },
  signInLink: {
    marginTop: 8,
    alignItems: 'center',
  },
  signInText: {
    color: '#71717a',
    fontSize: 14,
    textAlign: 'center',
  },
  signInLinkText: {
    color: '#F07E25',
    fontWeight: '600',
  },
});
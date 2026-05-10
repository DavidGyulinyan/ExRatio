import React, { useEffect, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, Alert, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { getSupabaseClient } from '@/lib/supabase-safe';
import { useThemeColor } from '@/hooks/use-theme-color';
import { Ionicons } from '@expo/vector-icons';
import * as Linking from 'expo-linking';

export default function AuthCallbackScreen() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const primaryColor = useThemeColor({}, 'primary');
  const errorColor = useThemeColor({}, 'error');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const backgroundColor = useThemeColor({}, 'background');

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not available');
        }

        const incomingUrl = await Linking.getInitialURL();
        if (incomingUrl) {
          const { queryParams } = Linking.parse(incomingUrl);
          const params = queryParams ?? {};
          const errRaw = params.error;
          const errorCode =
            typeof errRaw === 'string'
              ? errRaw
              : Array.isArray(errRaw)
                ? errRaw[0]
                : null;

          if (errorCode) {
            throw new Error(`OAuth callback error: ${errorCode}`);
          }

          const typeParam = params?.type;
          const type =
            typeof typeParam === 'string'
              ? typeParam
              : Array.isArray(typeParam)
              ? typeParam[0]
              : undefined;

          const codeParam = params?.code;
          const code =
            typeof codeParam === 'string'
              ? codeParam
              : Array.isArray(codeParam)
              ? codeParam[0]
              : undefined;

          if (code) {
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              throw exchangeError;
            }
          } else if (type === 'recovery') {
            const accessTokenParam = params?.access_token;
            const refreshTokenParam = params?.refresh_token;
            const accessToken =
              typeof accessTokenParam === 'string'
                ? accessTokenParam
                : Array.isArray(accessTokenParam)
                ? accessTokenParam[0]
                : undefined;
            const refreshToken =
              typeof refreshTokenParam === 'string'
                ? refreshTokenParam
                : Array.isArray(refreshTokenParam)
                ? refreshTokenParam[0]
                : undefined;

            if (accessToken && refreshToken) {
              const { error: setSessionError } = await supabase.auth.setSession({
                access_token: accessToken,
                refresh_token: refreshToken,
              });
              if (setSessionError) {
                throw setSessionError;
              }
            }
            router.replace('/reset-password');
            return;
          }
        }

        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🔴 OAuth callback error:', error);
          setError(error.message);
          Alert.alert('Authentication Error', error.message);
          return;
        }

        if (data.session) {
          Alert.alert('Success', 'You have been signed in successfully!');
          router.replace({ pathname: '/' });
        } else {
          setTimeout(async () => {
            const { data: sessionData } = await supabase.auth.getSession();
            if (sessionData.session) {
              router.replace({ pathname: '/' });
            } else {
              setError('No authentication session found');
              Alert.alert('Error', 'No authentication session found');
            }
          }, 2000);
        }
      } catch (err) {
        console.error('🔴 OAuth callback processing error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
        Alert.alert('Error', 'Failed to complete authentication');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [router]);

  const handleRetry = () => {
    setError(null);
    setLoading(true);
    // Retry the callback processing
    const handleAuthCallback = async () => {
      try {
        const supabase = getSupabaseClient();
        if (!supabase) {
          throw new Error('Supabase client not available');
        }

        // Check for session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('🔴 Retry OAuth callback error:', error);
          setError(error.message);
          return;
        }

        if (data.session) {
          router.replace({ pathname: '/' });
        }
      } catch (err) {
        console.error('🔴 Retry OAuth callback error:', err);
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  };

  const handleGoBack = () => {
    router.back();
  };

  if (loading) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={primaryColor} />
          <Text style={styles.loadingText}>Completing authentication...</Text>
          <Text style={styles.subtitle}>Please wait while we sign you in</Text>
        </View>
      </View>
      </SafeAreaView>
    );
  }

  if (error) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'left', 'right', 'bottom']}>
      <View style={[styles.container, { backgroundColor }]}>
        <View style={styles.content}>
          <Ionicons name="alert-circle-outline" size={64} color={errorColor} />
          <Text style={[styles.errorTitle, { color: errorColor }]}>Authentication Failed</Text>
          <Text style={styles.errorText}>{error}</Text>
          
          <View style={styles.buttonContainer}>
            <TouchableOpacity style={styles.retryButtonRow} onPress={handleRetry} activeOpacity={0.7}>
              <Ionicons name="refresh-outline" size={18} color={primaryColor} />
              <Text style={[styles.retryButton, { color: primaryColor }]}>Try Again</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.backButtonRow} onPress={handleGoBack} activeOpacity={0.7}>
              <Ionicons name="arrow-back" size={18} color={textSecondaryColor} />
              <Text style={[styles.backButton, { color: textSecondaryColor }]}>Go Back</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor }} edges={['top', 'left', 'right', 'bottom']}>
    <View style={[styles.container, { backgroundColor }]}>
      <View style={styles.content}>
        <Ionicons name="checkmark-circle-outline" size={64} color={primaryColor} />
        <Text style={[styles.successTitle, { color: primaryColor }]}>Authentication Complete</Text>
        <Text style={styles.successText}>You have been successfully signed in!</Text>
      </View>
    </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  content: {
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 32,
    width: '100%',
    maxWidth: 320,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#18181b',
    marginTop: 16,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 8,
    textAlign: 'center',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  errorText: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 8,
    textAlign: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    textAlign: 'center',
  },
  successText: {
    fontSize: 14,
    color: '#71717a',
    marginTop: 8,
    textAlign: 'center',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 24,
    alignItems: 'center',
  },
  retryButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  backButtonRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    padding: 12,
  },
  retryButton: {
    fontSize: 16,
    fontWeight: '600',
  },
  backButton: {
    fontSize: 16,
    fontWeight: '600',
  },
});
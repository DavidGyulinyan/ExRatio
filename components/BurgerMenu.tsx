import React, { useState } from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  Modal,
  ScrollView,
  Alert,
  Platform,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ThemedText } from '@/components/themed-text';
import { useThemeColor } from '@/hooks/use-theme-color';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

/** Opens dashboard modals — same tools as Quick Actions, separate from Settings. */
export type BurgerMenuQuickActions = {
  openConverter: () => void;
  openMultiCurrency: () => void;
  openCharts: () => void;
  openSavedRates: () => void;
  openRateAlerts: () => void;
  openCalculator: () => void;
  openLoanCalculator: () => void;
  openArmeniaFinance?: () => void;
};

interface BurgerMenuProps {
  style?: any;
  quickActions?: BurgerMenuQuickActions;
}

export default function BurgerMenu({ style, quickActions }: BurgerMenuProps) {
   const { t } = useLanguage();
   const router = useRouter();
   const { user, signOut } = useAuth();
   const [isVisible, setIsVisible] = useState(false);
   const insets = useSafeAreaInsets();

   // Helper function to add opacity to hex colors
   const addOpacity = (hexColor: string, opacity: number) => {
     const r = parseInt(hexColor.slice(1, 3), 16);
     const g = parseInt(hexColor.slice(3, 5), 16);
     const b = parseInt(hexColor.slice(5, 7), 16);
     return `rgba(${r}, ${g}, ${b}, ${opacity})`;
   };

   // Theme colors
   const primaryColor = useThemeColor({}, 'primary');
   const surfaceColor = useThemeColor({}, 'surface');
   const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
   const textColor = useThemeColor({}, 'text');
   const textSecondaryColor = useThemeColor({}, 'textSecondary');
   const borderColor = useThemeColor({}, 'border');
   const modalBackgroundColor = addOpacity(useThemeColor({}, 'background'), 0.8);
   const errorColor = useThemeColor({}, 'error');

  const handleSignOut = async () => {
    try {
      await signOut();
      setIsVisible(false);
      Alert.alert(t('auth.signoutSuccess'));
    } catch (error) {
      Alert.alert('Error', 'Failed to sign out. Please try again.');
    }
  };

  type MenuItem = {
    id: string;
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    onPress: () => void;
    subtitle?: string;
    danger?: boolean;
  };

  const closeThen = (fn: () => void) => {
    setIsVisible(false);
    fn();
  };

  const settingsItem: MenuItem = {
    id: 'settings',
    title: t('settings.title'),
    icon: 'settings-outline',
    onPress: () => {
      closeThen(() => router.push('/(tabs)/settings'));
    },
  };

  const quickActionItems: MenuItem[] = quickActions
    ? [
        {
          id: 'qa-converter',
          title: t('quick.action.converter'),
          icon: 'swap-horizontal',
          onPress: () => closeThen(quickActions.openConverter),
        },
        {
          id: 'qa-multi',
          title: t('quick.action.multiCurrency'),
          icon: 'stats-chart-outline',
          onPress: () => closeThen(quickActions.openMultiCurrency),
        },
        {
          id: 'qa-charts',
          title: t('quick.action.charts'),
          icon: 'trending-up-outline',
          onPress: () => closeThen(quickActions.openCharts),
        },
        {
          id: 'qa-saved',
          title: t('quick.action.savedRates'),
          icon: 'bookmark-outline',
          onPress: () => closeThen(quickActions.openSavedRates),
        },
        {
          id: 'qa-alerts',
          title: t('quick.action.rateAlerts'),
          icon: 'notifications-outline',
          onPress: () => closeThen(quickActions.openRateAlerts),
        },
        {
          id: 'qa-calculator',
          title: t('quick.action.calculator'),
          icon: 'calculator-outline',
          onPress: () => closeThen(quickActions.openCalculator),
        },
        {
          id: 'qa-loan',
          title: t('quick.action.loanCalculator'),
          icon: 'wallet-outline',
          onPress: () => closeThen(quickActions.openLoanCalculator),
        },
        ...(quickActions.openArmeniaFinance
          ? [
              {
                id: 'qa-am-finance',
                title: t('quick.action.armeniaFinance'),
                icon: 'flag-outline' as const,
                onPress: () => closeThen(quickActions.openArmeniaFinance!),
              },
            ]
          : []),
      ]
    : [];

  const guideItem: MenuItem = {
    id: 'guide',
    title: t('auth.converter'),
    icon: 'map-outline',
    onPress: () => {
      closeThen(() => router.push('/guide'));
    },
  };

  const authItems: MenuItem[] = user
    ? [
        {
          id: 'signout',
          title: t('auth.signout'),
          icon: 'log-out-outline',
          onPress: handleSignOut,
          danger: true,
        },
      ]
    : [
        {
          id: 'signin',
          title: t('auth.signin'),
          icon: 'log-in-outline',
          onPress: () => {
            closeThen(() => router.push('/signin'));
          },
        },
        {
          id: 'signup',
          title: t('auth.signup'),
          icon: 'person-add-outline',
          onPress: () => {
            closeThen(() => router.push('/signup'));
          },
        },
      ];

  const renderRow = (item: MenuItem) => (
    <TouchableOpacity
      key={item.id}
      activeOpacity={0.88}
      style={{
        paddingVertical: 16,
        paddingHorizontal: 20,
        marginBottom: 10,
        backgroundColor: item.danger ? addOpacity(errorColor, 0.14) : surfaceSecondaryColor,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: borderColor,
      }}
      onPress={item.onPress}
    >
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Ionicons
          name={item.icon}
          size={22}
          color={item.danger ? errorColor : primaryColor}
        />
        <ThemedText
          style={{
            fontSize: 16,
            fontWeight: '600',
            color: item.danger ? errorColor : textColor,
            flex: 1,
          }}
        >
          {item.title}
        </ThemedText>
      </View>
      {item.subtitle ? (
        <ThemedText style={{
          fontSize: 14,
          color: textSecondaryColor,
          marginTop: 4,
        }}>
          {item.subtitle}
        </ThemedText>
      ) : null}
    </TouchableOpacity>
  );

  return (
    <>
      {/* Burger Menu Button */}
      <TouchableOpacity
        style={[{
          flexDirection: 'column',
          justifyContent: 'space-around',
          width: 28,
          height: 28,
          paddingHorizontal: 4,
          paddingVertical: 6,
        }, style]}
        onPress={() => setIsVisible(true)}
        accessibilityRole="button"
        accessibilityLabel="Open menu"
      >
        <View style={{ height: 2, backgroundColor: primaryColor, borderRadius: 1 }} />
        <View style={{ height: 2, backgroundColor: primaryColor, borderRadius: 1 }} />
        <View style={{ height: 2, backgroundColor: primaryColor, borderRadius: 1 }} />
      </TouchableOpacity>

      {/* Menu Modal */}
      <Modal
        visible={isVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setIsVisible(false)}
      >
        <View style={{ flex: 1, backgroundColor: modalBackgroundColor, justifyContent: 'flex-end' }}>
          <View style={{
            backgroundColor: surfaceColor,
            borderTopLeftRadius: 22,
            borderTopRightRadius: 22,
            maxHeight: '92%',
            minHeight: '56%',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -4 },
            shadowOpacity: 0.18,
            shadowRadius: 16,
            elevation: 8,
            borderTopWidth: StyleSheet.hairlineWidth,
            borderLeftWidth: StyleSheet.hairlineWidth,
            borderRightWidth: StyleSheet.hairlineWidth,
            borderColor: borderColor,
          }}>
            <View style={{
              alignSelf: 'center',
              width: 40,
              height: 4,
              borderRadius: 2,
              backgroundColor: borderColor,
              marginTop: 10,
              marginBottom: 6,
              opacity: 0.6,
            }} />
            <View style={{
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              paddingHorizontal: 20,
              paddingBottom: 16,
              borderBottomWidth: StyleSheet.hairlineWidth,
              borderBottomColor: borderColor,
            }}>
              <View style={{ flex: 1, paddingRight: 12 }}>
                <ThemedText
                  style={{
                    fontSize: 20,
                    lineHeight: 26,
                    fontWeight: '700',
                    color: textColor,
                    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
                  }}
                >
                  {t('app.title')}
                </ThemedText>
                <ThemedText
                  style={{
                    fontSize: 13,
                    lineHeight: 18,
                    color: textSecondaryColor,
                    marginTop: 4,
                    ...(Platform.OS === 'android' ? { includeFontPadding: false } : null),
                  }}
                >
                  {t('app.subtitle')}
                </ThemedText>
              </View>
              <TouchableOpacity
                style={{
                  width: 36,
                  height: 36,
                  backgroundColor: surfaceSecondaryColor,
                  borderRadius: 18,
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderWidth: StyleSheet.hairlineWidth,
                  borderColor: borderColor,
                }}
                onPress={() => setIsVisible(false)}
                accessibilityRole="button"
                accessibilityLabel="Go back"
              >
                <Ionicons name="arrow-back" size={22} color={textSecondaryColor} />
              </TouchableOpacity>
            </View>

            {/* Menu Items */}
            <ScrollView
              style={{ flex: 1 }}
              contentContainerStyle={{
                padding: 20,
                paddingBottom: 28 + insets.bottom,
              }}
              showsVerticalScrollIndicator={false}
            >
              {renderRow(settingsItem)}

              {quickActionItems.length > 0 ? (
                <View style={{ marginTop: 4, marginBottom: 6 }}>
                  <ThemedText
                    style={{
                      fontSize: 12,
                      fontWeight: '700',
                      color: textSecondaryColor,
                      letterSpacing: 0.4,
                      textTransform: 'uppercase',
                      marginBottom: 10,
                    }}
                  >
                    {t('dashboard.quickActions')}
                  </ThemedText>
                  {quickActionItems.map(renderRow)}
                </View>
              ) : null}

              {renderRow(guideItem)}

              {authItems.map(renderRow)}

              {/* App Info */}
              <View style={{
                alignItems: 'center',
                marginTop: 20,
                paddingTop: 20,
                borderTopWidth: StyleSheet.hairlineWidth,
                borderTopColor: borderColor,
              }}>
                <ThemedText style={{
                  fontSize: 12,
                  color: textSecondaryColor,
                  textAlign: 'center',
                }}>
                  {t('app.title')} v1.0
                </ThemedText>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </>
  );
}

import React, { useEffect, useState } from "react";
import {
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  StyleSheet,
  ScrollView,
  Modal,
  Switch,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "./themed-text";
import CurrencyFlag from "./CurrencyFlag";
import CurrencyPicker from "./CurrencyPicker";
import AuthPromptModal from "./AuthPromptModal";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { useRateAlerts } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import alertCheckerService from "@/lib/alertCheckerService";
import { getAsyncStorage } from "@/lib/storage";
import { FormField } from "@/constants/theme";
import { fiatKeysFromConversionRates } from "@/constants/fiatCurrencyCodes";
import { formatDateDDMMYY } from "@/lib/dateFormat";
import { formatGroupedNumber } from "@/lib/numberFormat";

interface RateAlert {
  id: string;
  user_id: string;
  from_currency: string;
  to_currency: string;
  target_rate: number;
  condition: 'above' | 'below';
  is_active: boolean;
  notified: boolean;
  created_at: string;
  updated_at: string;
}

interface RateAlertManagerProps {
  savedRates: any[];
  onRatesUpdate: () => void;
  currenciesData?: any;
  inModal?: boolean; // Hide header when used inside DashboardModal
  onShareableMessageChange?: (message: string | null) => void;
}

interface AlertFormData {
  fromCurrency: string;
  toCurrency: string;
  targetRate: string;
  direction: 'above' | 'below';
  isActive: boolean;
}

export default function RateAlertManager({
  savedRates,
  onRatesUpdate,
  currenciesData,
  inModal = false,
  onShareableMessageChange,
}: RateAlertManagerProps) {
  const { t, tWithParams } = useLanguage();
  const { user } = useAuth();
  const { rateAlerts, loading, createAlert, updateAlert, deleteAlert, error } = useRateAlerts();

  // Theme colors
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const successColor = useThemeColor({}, 'success');
  const errorColor = useThemeColor({}, 'error');
  const textInverseColor = useThemeColor({}, 'textInverse');
  const shadowColor = '#000000'; // Use black for shadows

  // Extract currencies list from currenciesData
  const currencies = fiatKeysFromConversionRates(
    currenciesData?.conversion_rates
  );
  const [showAlertModal, setShowAlertModal] = useState(false);
  const [editingAlertId, setEditingAlertId] = useState<string | null>(null);
  const [showFromCurrencyPicker, setShowFromCurrencyPicker] = useState(false);
  const [showToCurrencyPicker, setShowToCurrencyPicker] = useState(false);
  const [showAuthPrompt, setShowAuthPrompt] = useState(false);
  const [formData, setFormData] = useState<AlertFormData>({
    fromCurrency: 'USD',
    toCurrency: 'AMD',
    targetRate: '',
    direction: 'above',
    isActive: true,
  });

  useEffect(() => {
    if (!inModal || !onShareableMessageChange) return;
    if (!rateAlerts.length) {
      onShareableMessageChange(null);
      return;
    }
    const lines = [
      t('rateAlerts.title'),
      ...rateAlerts.map((a) => {
        const dir =
          a.condition === 'above'
            ? t('rateAlerts.direction.above')
            : t('rateAlerts.direction.below');
        const status = a.is_active ? t('rateAlerts.active') : t('common.disabled');
        return `• ${a.from_currency}→${a.to_currency}: ${dir} ${a.target_rate} — ${status}`;
      }),
    ];
    onShareableMessageChange(lines.join('\n'));
  }, [inModal, onShareableMessageChange, rateAlerts, t]);

  const handleEditAlert = (alert: RateAlert) => {
    setEditingAlertId(alert.id);
    setFormData({
      fromCurrency: alert.from_currency,
      toCurrency: alert.to_currency,
      targetRate: alert.target_rate.toString(),
      direction: alert.condition,
      isActive: alert.is_active,
    });
    setShowAlertModal(true);
  };

  const handleSaveAlert = async () => {
    const targetRate = parseFloat(formData.targetRate);
    if (isNaN(targetRate) || targetRate <= 0) {
      Alert.alert(t('error.invalidInput'), 'Please enter a valid target rate');
      return;
    }

    try {
      // Check if alert condition is already met
      const currentRate = await getCurrentRateForAlert(formData.fromCurrency, formData.toCurrency);
      const conditionAlreadyMet = checkIfConditionMet(currentRate, targetRate, formData.direction);

      if (conditionAlreadyMet && !editingAlertId) {
        // Show warning that condition is already met
        const shouldContinue = await new Promise<boolean>((resolve) => {
          Alert.alert(
            t('rateAlerts.conditionAlreadyMetTitle'),
            tWithParams('rateAlerts.conditionAlreadyMetMessage', {
              fromCurrency: formData.fromCurrency,
              toCurrency: formData.toCurrency,
              currentRate: formatGroupedNumber(currentRate, 4),
              targetRate: formatGroupedNumber(targetRate, 4),
              condition: t(`rateAlerts.direction.${formData.direction}`)
            }),
            [
              { text: t('common.cancel'), style: 'cancel', onPress: () => resolve(false) },
              { text: t('rateAlerts.createAnyway'), onPress: () => resolve(true) }
            ]
          );
        });

        if (!shouldContinue) {
          return;
        }
      }

      if (editingAlertId) {
        // Update existing alert
        const success = await updateAlert(editingAlertId, {
          target_rate: targetRate,
          condition: formData.direction,
          is_active: formData.isActive,
        });

        if (!success) {
          Alert.alert(t('rateAlerts.error'), t('rateAlerts.updateFailed'));
          return;
        }
      } else {
        // Create new alert with selected currencies
        const success = await createAlert(formData.fromCurrency, formData.toCurrency, targetRate, formData.direction);
        if (!success) {
          Alert.alert(t('rateAlerts.error'), t('rateAlerts.createFailed'));
          return;
        }
      }

      setShowAlertModal(false);
      setEditingAlertId(null);
      onRatesUpdate();

      Alert.alert(t('rateAlerts.success'), t('rateAlerts.savedSuccessfully'));
    } catch (error) {
      console.error('Error saving alert:', error);
      Alert.alert('Error', 'Failed to save rate alert');
    }
  };

  const handleDeleteAlert = async (alertId: string) => {
    Alert.alert(
      t('rateAlerts.deleteTitle'),
      t('rateAlerts.deleteMessage'),
      [
        { text: t('rateAlerts.cancelButton'), style: 'cancel' },
        {
          text: t('rateAlerts.deleteButton'),
          style: 'destructive',
          onPress: async () => {
            const success = await deleteAlert(alertId);
            if (!success) {
              Alert.alert(t('rateAlerts.error'), t('rateAlerts.deleteFailed'));
            }
            onRatesUpdate();
          }
        }
      ]
    );
  };

  const handleResetAlert = async (alertId: string) => {
    Alert.alert(
      t('rateAlerts.resetTitle'),
      t('rateAlerts.resetMessage'),
      [
        { text: t('rateAlerts.cancelButton'), style: 'cancel' },
        {
          text: t('rateAlerts.resetButton'),
          style: 'default',
          onPress: async () => {
            const success = await updateAlert(alertId, { notified: false, is_active: true });
            if (!success) {
              Alert.alert(t('rateAlerts.error'), t('rateAlerts.resetFailed'));
            }
            onRatesUpdate();
          }
        }
      ]
    );
  };

  const toggleAlertActive = async (alertId: string, isActive: boolean) => {
    const success = await updateAlert(alertId, { is_active: isActive });
    if (!success) {
      Alert.alert(t('rateAlerts.error'), t('rateAlerts.updateStatusFailed'));
    }
    onRatesUpdate();
  };

  const getAlertStatusText = (alert: RateAlert): string => {
    if (alert.notified) return t('rateAlerts.status.notified');
    if (!alert.is_active) return t('rateAlerts.status.inactive');
    return t('rateAlerts.status.active');
  };

  const getAlertStatusColor = (alert: RateAlert): string => {
    if (alert.notified) return primaryColor; // Use primary color for notified alerts
    if (!alert.is_active) return textSecondaryColor;
    return successColor;
  };

  const getCurrentRateForAlert = async (fromCurrency: string, toCurrency: string): Promise<number> => {
    try {
      const storage = getAsyncStorage();
      const cachedData = await storage.getItem('cachedExchangeRates');
      if (cachedData) {
        const data = JSON.parse(cachedData);
        const fromRate = data.conversion_rates[fromCurrency];
        const toRate = data.conversion_rates[toCurrency];

        if (fromRate && toRate) {
          return toRate / fromRate;
        }
      }
      throw new Error('No cached rates available');
    } catch (error) {
      console.error('Error getting current rate for alert:', error);
      throw error;
    }
  };

  const checkIfConditionMet = (currentRate: number, targetRate: number, direction: 'above' | 'below'): boolean => {
    const tolerance = 0.0001; // Small tolerance for floating point comparison

    switch (direction) {
      case 'above':
        return currentRate > targetRate + tolerance;
      case 'below':
        return currentRate < targetRate - tolerance;
      default:
        return false;
    }
  };

  const handleCreateAlert = () => {
    if (!user) {
      // Show auth prompt for non-authenticated users
      setShowAuthPrompt(true);
      return;
    }

    setEditingAlertId(null);
    setFormData({
      fromCurrency: 'USD',
      toCurrency: 'AMD',
      targetRate: '1.0',
      direction: 'above',
      isActive: true,
    });
    setShowAlertModal(true);
  };

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.container, inModal && styles.containerInModal]}>
        {!inModal && (
          <View style={styles.header}>
            <ThemedText type="subtitle" style={styles.title}>
              {t('alerts.title')}
            </ThemedText>
            <View style={styles.headerActions}>
              <TouchableOpacity
                style={[{ backgroundColor: successColor, shadowColor: successColor }, styles.createButton]}
                onPress={handleCreateAlert}
              >
                <ThemedText style={[{ color: textInverseColor }, styles.createButtonText]}>{t('rateAlerts.createButton')}</ThemedText>
              </TouchableOpacity>
            </View>
            <ThemedText style={styles.subtitle}>
              {t('rateAlerts.loading')}
            </ThemedText>
          </View>
        )}

        {/* Show Create button inside modal content when inModal is true */}
        {inModal && (
          <View style={styles.modalCreateButtonContainer}>
            <TouchableOpacity
              style={[{ backgroundColor: successColor, shadowColor: successColor }, styles.createButton]}
              onPress={handleCreateAlert}
            >
              <ThemedText style={[{ color: textInverseColor }, styles.createButtonText]}>{t('rateAlerts.createButton')}</ThemedText>
            </TouchableOpacity>
          </View>
        )}

        <ScrollView style={[styles.alertsList, inModal && styles.alertsListInModal]}>
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              Loading rate alerts...
            </ThemedText>
          </View>
        </ScrollView>
      </View>
    );
  }

  // Show error state
  if (error) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            Rate Alerts
          </ThemedText>
        </View>
        <View style={styles.emptyState}>
          <ThemedText style={styles.emptyStateText}>
            {tWithParams('rateAlerts.errorPrefix', { error })}
          </ThemedText>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, inModal && styles.containerInModal]}>
      {!inModal && (
        <View style={styles.header}>
          <ThemedText type="subtitle" style={styles.title}>
            {t('alerts.title')}
          </ThemedText>
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={[{ backgroundColor: successColor, shadowColor: successColor }, styles.createButton]}
              onPress={handleCreateAlert}
            >
              <ThemedText style={[{ color: textInverseColor }, styles.createButtonText]}>{t('rateAlerts.createButton')}</ThemedText>
            </TouchableOpacity>
          </View>
          {user && (
            <ThemedText style={styles.subtitle}>
              {tWithParams('rateAlerts.activeCount', { count: rateAlerts.filter(alert => alert.is_active).length })}
            </ThemedText>
          )}
        </View>
      )}

      {/* Show Create button inside modal content when inModal is true */}
      {inModal && (
        <View style={styles.modalCreateButtonContainer}>
          <TouchableOpacity
            style={[{ backgroundColor: successColor, shadowColor: successColor }, styles.createButton]}
            onPress={handleCreateAlert}
          >
            <ThemedText style={[{ color: textColor }, styles.createButtonText]}>{t('rateAlerts.createButton')}</ThemedText>
          </TouchableOpacity>
        </View>
      )}

      <ScrollView style={[styles.alertsList, inModal && styles.alertsListInModal]}>
        {!user ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              Sign in to create and manage rate alerts that notify you when currency rates reach your targets.
            </ThemedText>
          </View>
        ) : rateAlerts.length === 0 ? (
          <View style={styles.emptyState}>
            <ThemedText style={styles.emptyStateText}>
              {t('rateAlerts.emptyState')}
            </ThemedText>
          </View>
        ) : (
          rateAlerts.map((alert) => (
            <View key={alert.id} style={[{ backgroundColor: surfaceColor, borderColor: borderColor, shadowColor: shadowColor }, styles.alertCard]}>
              <View style={styles.alertHeader}>
                <View style={styles.currencyPair}>
                  <View style={styles.currencyItem}>
                    <CurrencyFlag currency={alert.from_currency} size={20} />
                    <ThemedText style={[{ color: textColor }, styles.currencyCode]}>
                      {alert.from_currency}
                    </ThemedText>
                  </View>
                  <ThemedText style={[{ color: textSecondaryColor }, styles.arrow]}>→</ThemedText>
                  <View style={styles.currencyItem}>
                    <CurrencyFlag currency={alert.to_currency} size={20} />
                    <ThemedText style={[{ color: textColor }, styles.currencyCode]}>
                      {alert.to_currency}
                    </ThemedText>
                  </View>
                </View>
              </View>
                <View style={styles.alertControls}>
                  <ThemedText style={[{ color: textColor }, styles.switchLabel]}>{t('rateAlerts.active')}</ThemedText>
                  <Switch
                    value={alert.is_active}
                    onValueChange={(value) => toggleAlertActive(alert.id, value)}
                    disabled={alert.notified}
                    trackColor={{ false: borderColor, true: primaryColor }}
                    thumbColor={textInverseColor}
                  />
                </View>

              <View style={styles.alertInfo}>
                <View style={styles.alertRow}>
                  <ThemedText style={[{ color: textSecondaryColor }, styles.alertLabel]}>{t('rateAlerts.target')}</ThemedText>
                  <ThemedText style={[{ color: textColor }, styles.alertValue]}>
                    {t(`rateAlerts.direction.${alert.condition}`)} {formatGroupedNumber(alert.target_rate, 6)}
                  </ThemedText>
                </View>
                <View style={styles.alertRow}>
                  <ThemedText style={[{ color: textSecondaryColor }, styles.alertLabel]}>{t('rateAlerts.status')}</ThemedText>
                  <ThemedText style={[styles.statusText, { color: getAlertStatusColor(alert) }]}>
                    {getAlertStatusText(alert)}
                  </ThemedText>
                </View>
                <View style={styles.alertRow}>
                  <ThemedText style={[{ color: textSecondaryColor }, styles.alertLabel]}>{t('rateAlerts.created')}</ThemedText>
                  <ThemedText style={[{ color: textColor }, styles.alertValue]}>
                    {formatDateDDMMYY(alert.created_at)}
                  </ThemedText>
                </View>
              </View>

              <View style={styles.alertActions}>
                <TouchableOpacity
                  style={[{ backgroundColor: primaryColor, shadowColor: primaryColor }, styles.editButton]}
                  onPress={() => handleEditAlert(alert)}
                >
                  <ThemedText style={[{ color: textColor }, styles.editButtonText]}>{t('rateAlerts.edit')}</ThemedText>
                </TouchableOpacity>

                {alert.notified ? (
                  <TouchableOpacity
                    style={[{ backgroundColor: successColor, shadowColor: successColor }, styles.resetButton]}
                    onPress={() => handleResetAlert(alert.id)}
                  >
                    <ThemedText style={[{ color: textColor }, styles.resetButtonText]}>{t('rateAlerts.reset')}</ThemedText>
                  </TouchableOpacity>
                ) : null}

                <TouchableOpacity
                  style={[{ backgroundColor: errorColor, shadowColor: errorColor }, styles.deleteButton]}
                  onPress={() => handleDeleteAlert(alert.id)}
                >
                  <ThemedText style={[{ color: textColor }, styles.deleteButtonText]}>{t('rateAlerts.delete')}</ThemedText>
                </TouchableOpacity>
              </View>
            </View>
          ))
        )}
      </ScrollView>

      {/* Alert Configuration Modal */}
      <Modal
        visible={showAlertModal}
        animationType="slide"
        transparent={false}
        onRequestClose={() => setShowAlertModal(false)}
      >
        <View style={[{ backgroundColor: backgroundColor }, styles.modalContainer]}>
          <View style={[{ backgroundColor: surfaceColor, borderBottomColor: borderColor }, styles.modalTitleSection]}>
            <ThemedText type="subtitle" style={[{ color: textColor }, styles.modalTitle]}>
              {editingAlertId ? t('rateAlerts.editAlert') : t('rateAlerts.createAlert')}
            </ThemedText>
          </View>
          <View style={[{ backgroundColor: surfaceColor, borderBottomColor: borderColor }, styles.modalHeader]}>
            <TouchableOpacity
              onPress={() => setShowAlertModal(false)}
              style={[
                {
                  backgroundColor: surfaceSecondaryColor,
                  borderColor,
                  borderWidth: StyleSheet.hairlineWidth,
                },
                styles.cancelButton,
              ]}
              accessibilityRole="button"
              accessibilityLabel={t('rateAlerts.cancel')}
            >
              <Ionicons name="arrow-back" size={22} color={textSecondaryColor} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSaveAlert} style={[{ backgroundColor: successColor, shadowColor: successColor }, styles.saveButton]}>
              <ThemedText style={[{ color: textInverseColor }, styles.saveButtonText]}>{t('rateAlerts.save')}</ThemedText>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.modalContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.formGroup}>
              <ThemedText style={[{ color: textColor }, styles.label]}>{t('rateAlerts.fromCurrency')}</ThemedText>
              <TouchableOpacity
                style={[{ backgroundColor: surfaceColor, borderColor: borderColor }, styles.currencySelector]}
                onPress={() => setShowFromCurrencyPicker(true)}
              >
                <View style={styles.currencySelectorContent}>
                  <CurrencyFlag currency={formData.fromCurrency} size={24} />
                  <ThemedText style={[{ color: textColor }, styles.currencySelectorText]}>
                    {formData.fromCurrency}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={18} color={textSecondaryColor} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[{ color: textColor }, styles.label]}>{t('rateAlerts.toCurrency')}</ThemedText>
              <TouchableOpacity
                style={[{ backgroundColor: surfaceColor, borderColor: borderColor }, styles.currencySelector]}
                onPress={() => setShowToCurrencyPicker(true)}
              >
                <View style={styles.currencySelectorContent}>
                  <CurrencyFlag currency={formData.toCurrency} size={24} />
                  <ThemedText style={[{ color: textColor }, styles.currencySelectorText]}>
                    {formData.toCurrency}
                  </ThemedText>
                  <Ionicons name="chevron-down" size={18} color={textSecondaryColor} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[{ color: textColor }, styles.label]}>
                {tWithParams('rateAlerts.targetRate', { fromCurrency: formData.fromCurrency, toCurrency: formData.toCurrency })}
              </ThemedText>
              <TextInput
                style={[{ backgroundColor: surfaceColor, borderColor: borderColor, color: textColor }, styles.input]}
                value={formData.targetRate}
                onChangeText={(text) => setFormData({ ...formData, targetRate: text })}
                keyboardType="numeric"
                placeholder={tWithParams('rateAlerts.enterRate', { fromCurrency: formData.fromCurrency, toCurrency: formData.toCurrency })}
                placeholderTextColor={textSecondaryColor}
              />
            </View>

            <View style={styles.formGroup}>
              <ThemedText style={[{ color: textColor }, styles.label]}>{t('rateAlerts.direction')}</ThemedText>
              <View style={styles.directionButtons}>
                {(['above', 'below'] as const).map((direction) => (
                  <TouchableOpacity
                    key={direction}
                    style={[
                      { backgroundColor: surfaceSecondaryColor, borderColor: borderColor },
                      styles.directionButton,
                      formData.direction === direction && { backgroundColor: primaryColor, borderColor: primaryColor },
                    ]}
                    onPress={() => setFormData({ ...formData, direction })}
                  >
                    <ThemedText
                      style={[
                        styles.directionButtonText,
                        {
                          color:
                            formData.direction === direction ? textInverseColor : textColor,
                        },
                      ]}
                    >
                      {t(`rateAlerts.direction.${direction}`)}
                    </ThemedText>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.formGroup}>
              <View style={styles.switchContainer}>
                <ThemedText style={[{ color: textColor }, styles.label]}>{t('rateAlerts.activateAlert')}</ThemedText>
                <Switch
                  value={formData.isActive}
                  onValueChange={(value) => setFormData({ ...formData, isActive: value })}
                  trackColor={{ false: borderColor, true: primaryColor }}
                  thumbColor={textInverseColor}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>

      {/* From Currency Picker */}
      <CurrencyPicker
        visible={showFromCurrencyPicker}
        currencies={currencies}
        selectedCurrency={formData.fromCurrency}
        onSelect={(currency) => {
          setFormData({ ...formData, fromCurrency: currency });
          setShowFromCurrencyPicker(false);
        }}
        onClose={() => setShowFromCurrencyPicker(false)}
      />

      {/* To Currency Picker */}
      <CurrencyPicker
        visible={showToCurrencyPicker}
        currencies={currencies}
        selectedCurrency={formData.toCurrency}
        onSelect={(currency) => {
          setFormData({ ...formData, toCurrency: currency });
          setShowToCurrencyPicker(false);
        }}
        onClose={() => setShowToCurrencyPicker(false)}
      />

      {/* Auth Prompt Modal */}
      <AuthPromptModal
        visible={showAuthPrompt}
        onClose={() => setShowAuthPrompt(false)}
        title="Authorize to sync your data"
        message="Create an account to save and sync your rate alerts across devices"
        feature="alerts"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  containerInModal: {
    flex: 1,
    paddingTop: 0,
  },
  header: {
    padding: 20,
    borderBottomWidth: 1,
  },
  headerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 10,
  },
  createButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    fontWeight: '600',
    fontSize: 14,
  },
  debugButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    marginRight: 8,
  },
  debugButtonText: {
    fontWeight: '600',
    fontSize: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    marginTop: 8,
  },
  alertsList: {
    flex: 1,
    padding: 16,
  },
  alertsListInModal: {
    flex: 1,
    paddingHorizontal: 0,
    paddingVertical: 16,
    backgroundColor: "transparent",
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  alertCard: {
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  alertHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currencyPair: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  currencyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 6,
    minWidth: 35,
  },
  arrow: {
    marginHorizontal: 6,
    fontSize: 16,
    fontWeight: 'bold',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 6,
    flex: 1,
  },
  alertControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  switchLabel: {
    fontSize: 14,
    marginRight: 8,
    fontWeight: '500',
  },
  alertInfo: {
    marginBottom: 16,
  },
  alertRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  alertLabel: {
    fontSize: 14,
    fontWeight: '500',
    minWidth: 70,
  },
  alertValue: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    flex: 1,
    textAlign: 'right',
    flexWrap: 'wrap',
  },
  alertActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 6,
    flexWrap: 'wrap',
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 50,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  deleteButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 50,
  },
  deleteButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  resetButton: {
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 5,
    minWidth: 50,
  },
  resetButtonText: {
    fontSize: 11,
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
  },
  modalTitleSection: {
    padding: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    alignItems: 'center',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 16,
  },
  modalTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  cancelButton: {
    padding: 10,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  modalCreateButtonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0, 0, 0, 0.1)',
  },
  modalSubtitle: {
    fontSize: 14,
    marginTop: 0,
  },
  saveButton: {
    padding: 8,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  formGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: FormField.labelSize,
    fontWeight: '600',
    marginBottom: 10,
    letterSpacing: 0.2,
  },
  input: {
    borderWidth: 1,
    borderRadius: FormField.radiusInput,
    paddingHorizontal: FormField.padH,
    paddingVertical: FormField.padV,
    fontSize: FormField.fontSize,
    fontWeight: FormField.fontWeight,
  },
  directionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  directionButton: {
    flex: 1,
    paddingVertical: FormField.padV,
    paddingHorizontal: FormField.padH,
    borderRadius: FormField.radiusInput,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
  },
  directionButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencySelector: {
    borderWidth: 1,
    borderRadius: FormField.radiusInput,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  currencySelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  currencySelectorText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
});
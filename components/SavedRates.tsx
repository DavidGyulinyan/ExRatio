import React, { useEffect, useState } from "react";
import { View, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { ThemedText } from "./themed-text";
import CurrencyFlag from "./CurrencyFlag";
import DeleteAllButton from "./DeleteAllButton";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { useSavedRates } from "@/hooks/useUserData";
import { useAuth } from "@/contexts/AuthContext";
import { formatDateDDMMYY } from "@/lib/dateFormat";
import { formatGroupedNumber } from "@/lib/numberFormat";

interface SavedRate {
  id: string;
  from_currency: string;
  to_currency: string;
  rate: number;
  created_at: string;
  updated_at: string;
}

interface SavedRatesProps {
  savedRates?: SavedRate[]; // Optional - will use hook data if not provided
  showSavedRates: boolean;
  onToggleVisibility: () => void;
  onSelectRate?: (from: string, to: string) => void;
  onDeleteRate?: (id: string | number) => void; // Optional - will use hook if not provided
  onDeleteAll?: () => void; // Optional - will use hook if not provided
  showMoreEnabled?: boolean;
  onShowMore?: () => void;
  maxVisibleItems?: number;
  containerStyle?: any;
  title?: string;
  inModal?: boolean; // Hide header when used inside DashboardModal
  forceUseHook?: boolean; // Force use hook data instead of prop
  showDeleteButtons?: boolean; // Show delete buttons for each item
  onShareableMessageChange?: (message: string | null) => void;
}

export default function SavedRates({
  savedRates: propSavedRates,
  showSavedRates,
  onToggleVisibility,
  onSelectRate,
  onDeleteRate,
  onDeleteAll,
  showMoreEnabled = false,
  onShowMore,
  maxVisibleItems = 10,
  containerStyle,
  title,
  inModal = false,
  forceUseHook = false,
  showDeleteButtons = false,
  onShareableMessageChange,
}: SavedRatesProps) {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { savedRates: hookSavedRates, deleteRate, deleteAllRates, loading } = useSavedRates();

  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const borderColor = useThemeColor({}, 'border');
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const shadowColor = '#000000'; // Use black for shadows

  // Use hook data if forceUseHook is true, otherwise use prop or fallback to hook
  const savedRates = forceUseHook ? hookSavedRates : (propSavedRates || (user ? hookSavedRates : []));

  const displayTitle = title || `⭐ ${t('saved.shortTitle')}`;

  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!inModal || !onShareableMessageChange) return;
    const list = forceUseHook
      ? hookSavedRates
      : propSavedRates || (user ? hookSavedRates : []);
    if (!list.length) {
      onShareableMessageChange(null);
      return;
    }
    const lines = [
      t("saved.title"),
      ...list.map(
        (r) =>
          `• ${r.from_currency} → ${r.to_currency}: ${formatGroupedNumber(Number(r.rate), 4)}`
      ),
    ];
    onShareableMessageChange(lines.join("\n"));
  }, [
    inModal,
    onShareableMessageChange,
    forceUseHook,
    hookSavedRates,
    propSavedRates,
    user,
    t,
  ]);

  const handleDeleteRate = async (id: string) => {
    if (onDeleteRate) {
      onDeleteRate(id);
    } else {
      Alert.alert(
        t('saved.deleteRateTitle'),
        t('saved.deleteRateMessage'),
        [
          { text: t('saved.deleteRateCancel'), style: 'cancel' },
          {
            text: t('saved.deleteRateConfirm'),
            style: 'destructive',
            onPress: async () => {
              try {
                setDeletingId(id);
                const success = await deleteRate(id);
                if (success) {
                  Alert.alert(t('saved.deleteSuccessTitle'), t('saved.deleteSuccessMessage'));
                } else {
                  Alert.alert(
                    t('saved.deleteFailedTitle'),
                    t('saved.deleteFailedMessage')
                  );
                }
              } catch (error) {
                Alert.alert(
                  t('saved.deleteErrorTitle'),
                  t('saved.deleteErrorMessage')
                );
                console.error('Delete rate error:', error);
              } finally {
                setDeletingId(null);
              }
            }
          }
        ]
      );
    }
  };

  const handleDeleteAllRates = async () => {
    if (onDeleteAll) {
      onDeleteAll();
    } else {
      Alert.alert(
        t('saved.deleteAllTitle'),
        t('saved.deleteAllMessage'),
        [
          { text: t('saved.deleteAllCancel'), style: 'cancel' },
          {
            text: t('saved.deleteAllConfirmButton'),
            style: 'destructive',
            onPress: async () => {
              const success = await deleteAllRates();
              if (!success) {
                Alert.alert(t('saved.deleteAllErrorTitle'), t('saved.deleteAllErrorMessage'));
              }
            }
          }
        ]
      );
    }
  };
  
  const renderSavedRateItem = (rate: SavedRate, index: number) => (
    <TouchableOpacity
      key={rate.id || index}
      style={[{ backgroundColor: surfaceSecondaryColor, borderColor: borderColor, shadowColor: shadowColor }, styles.savedRateItem]}
      onPress={() => onSelectRate?.(rate.from_currency, rate.to_currency)}
    >
      <View style={styles.savedRateContent}>
        <View style={styles.savedRateHeader}>
          <CurrencyFlag currency={rate.from_currency} size={20} />
          <ThemedText style={[{ color: textSecondaryColor }, styles.arrow]}>→</ThemedText>
          <CurrencyFlag currency={rate.to_currency} size={20} />
        </View>
        <ThemedText style={[{ color: primaryColor }, styles.rateValue]}>
          {formatGroupedNumber(rate.rate, 4)}
        </ThemedText>
        <ThemedText style={[{ color: textSecondaryColor }, styles.savedRateDate]}>
          {formatDateDDMMYY(rate.created_at)}
        </ThemedText>
      </View>
      {showDeleteButtons && (
        <TouchableOpacity
          style={[styles.deleteButton, deletingId === rate.id && styles.deleteButtonDisabled]}
          onPress={() => handleDeleteRate(rate.id)}
          disabled={deletingId === rate.id}
        >
          <ThemedText style={[
            styles.deleteButtonText,
            deletingId === rate.id && styles.deleteButtonTextDisabled
          ]}>
            {deletingId === rate.id ? "..." : "x"}
          </ThemedText>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );

  const visibleRates =
    showMoreEnabled && savedRates.length > maxVisibleItems
      ? savedRates.slice(0, maxVisibleItems)
      : savedRates;

  // Show loading state
  if (loading) {
    return (
      <View style={[styles.savedRatesSection, containerStyle]}>
        <View style={styles.savedRatesHeader}>
          <ThemedText type="subtitle" style={styles.savedRatesTitle}>
            {displayTitle} (0)
          </ThemedText>
        </View>
        <View style={styles.savedRatesList}>
          <View style={styles.emptySavedRates}>
            <ThemedText style={styles.emptySavedRatesText}>
              {t('saved.loadingText')}
            </ThemedText>
          </View>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.savedRatesSection, containerStyle]}>
      {!inModal && (
        <View style={styles.savedRatesHeader}>
          <ThemedText type="subtitle" style={styles.savedRatesTitle}>
            {displayTitle} ({savedRates.length})
          </ThemedText>
          {savedRates.length > 0 && (
            <TouchableOpacity onPress={onToggleVisibility}>
            <ThemedText
              style={[
                { color: textColor },
                styles.showHideText,
                showSavedRates && { color: primaryColor, fontWeight: "600" },
              ]}
            >
              {showSavedRates ? t('saved.hideIcon') : `▶ ${t('common.more')}`}
            </ThemedText>
          </TouchableOpacity>
          )}
        </View>
      )}

      {showSavedRates && (
        <View style={[
          inModal
            ? styles.fadeIn
            : [{ borderColor: primaryColor, shadowColor: shadowColor }, styles.savedRatesList, styles.fadeIn]
        ]}>
          {savedRates.length === 0 ? (
            <View style={styles.emptySavedRates}>
              <ThemedText style={[{ color: textSecondaryColor }, styles.emptySavedRatesText]}>
                {!user
                  ? t('saved.signInPrompt')
                  : t('saved.emptyState')
                }
              </ThemedText>
            </View>
          ) : (
            <>
              <View style={styles.gridContainer}>
                {visibleRates.map((rate, index) =>
                  renderSavedRateItem(rate, index)
                )}
              </View>

              {showMoreEnabled && savedRates.length > maxVisibleItems && (
                <TouchableOpacity
                  style={[{ backgroundColor: surfaceSecondaryColor, shadowColor: shadowColor }, styles.showMoreButton]}
                  onPress={onShowMore}
                >
                  <ThemedText style={[{ color: primaryColor }, styles.showMoreText]}>
                    {t('common.showMore').replace('more', `all ${savedRates.length} saved rates`)} →
                  </ThemedText>
                </TouchableOpacity>
              )}

              {showDeleteButtons && savedRates.length > 1 && (
                <DeleteAllButton
                  onPress={handleDeleteAllRates}
                  count={savedRates.length}
                  translationKey="saved.deleteAll"
                />
              )}
            </>
          )}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  savedRatesSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  savedRatesHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  savedRatesList: {
    borderWidth: 2,
    borderRadius: 16,
    padding: 20,
  },
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 4,
  },
  emptySavedRates: {
    padding: 20,
    alignItems: "center",
  },
  emptySavedRatesText: {
    fontSize: 14,
    textAlign: "center",
    fontStyle: "italic",
  },
  savedRateItem: {
    width: '48%',
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 12,
    borderRadius: 20,
    borderWidth: 1,
    margin: 2,
  },
  savedRateContent: {
    alignItems: "center",
  },
  savedRateHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  arrow: {
    marginHorizontal: 6,
    fontSize: 16,
    fontWeight: "bold",
  },
  rateValue: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 4,
  },
  savedRatesTitle: {
    fontSize: 16,
    fontWeight: "600",
  },
  showHideText: {
    fontSize: 18,
    fontWeight: "bold",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    minWidth: 30,
    textAlign: "center",
  },
  showHideTextActive: {
  },
  savedRateDate: {
    fontSize: 10,
  },
  deleteButton: {
    width: 20,
    height: 20,
    position: "absolute",
    top: 4,
    right: 4,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(63, 63, 70, 0.12)",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "rgba(63, 63, 70, 0.25)",
  },
  deleteButtonDisabled: {
    opacity: 0.5,
  },
  deleteButtonText: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#404040",
  },
  deleteButtonTextDisabled: {
    opacity: 0.5,
  },
  fadeIn: {
    opacity: 1,
    transform: [{ scale: 1 }],
  },
  showMoreButton: {
    padding: 10,
    borderRadius: 6,
    alignItems: "center",
    marginTop: 12,
  },
  showMoreText: {
    fontSize: 14,
    fontWeight: "600",
  },
});


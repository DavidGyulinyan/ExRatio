import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Modal,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemedView } from "./themed-view";
import { ThemedText } from "./themed-text";
import CurrencyFlag from "./CurrencyFlag";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";
import { FormField } from "@/constants/theme";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";

interface CurrencyPickerProps {
  visible: boolean;
  currencies: string[];
  selectedCurrency: string;
  onSelect: (currency: string) => void;
  onClose: () => void;
  onCurrencySelected?: (currency: string) => void;
}

// Comprehensive currency to country mapping
const CURRENCY_TO_COUNTRIES: { [key: string]: string[] } = {
  'USD': ['United States', 'America', 'US', 'USA'],
  'EUR': ['Eurozone', 'European Union', 'EU', 'Germany', 'France', 'Italy', 'Spain', 'Netherlands', 'Belgium', 'Austria', 'Finland', 'Ireland', 'Portugal', 'Greece', 'Luxembourg', 'Cyprus', 'Malta', 'Slovakia', 'Slovenia', 'Estonia', 'Latvia', 'Lithuania', 'Croatia'],
  'GBP': ['United Kingdom', 'Britain', 'UK', 'England', 'Scotland', 'Wales', 'Northern Ireland'],
  'JPY': ['Japan', 'Japanese'],
  'CAD': ['Canada', 'Canadian'],
  'AUD': ['Australia', 'Australian'],
  'CHF': ['Switzerland', 'Swiss'],
  'CNY': ['China', 'Chinese', 'Renminbi', 'Yuan'],
  'SEK': ['Sweden', 'Swedish', 'Krona'],
  'NZD': ['New Zealand', 'NZ'],
  'MXN': ['Mexico', 'Mexican', 'Peso'],
  'SGD': ['Singapore', 'Singaporean', 'Dollar'],
  'HKD': ['Hong Kong', 'HK'],
  'NOK': ['Norway', 'Norwegian', 'Krone'],
  'KRW': ['South Korea', 'Korean', 'Won'],
  'TRY': ['Turkey', 'Turkish', 'Lira'],
  'RUB': ['Russia', 'Russian', 'Ruble'],
  'INR': ['India', 'Indian', 'Rupee'],
  'BRL': ['Brazil', 'Brazilian', 'Real'],
  'ZAR': ['South Africa', 'South African', 'Rand'],
  'AED': ['United Arab Emirates', 'UAE', 'Dubai', 'Emirates', 'Dirham'],
  'PLN': ['Poland', 'Polish', 'Zloty'],
  'CZK': ['Czech Republic', 'Czech', 'Koruna'],
  'HUF': ['Hungary', 'Hungarian', 'Forint'],
  'RON': ['Romania', 'Romanian', 'Leu'],
  'BGN': ['Bulgaria', 'Bulgarian', 'Lev'],
  'ISK': ['Iceland', 'Icelandic', 'Krona'],
  'DKK': ['Denmark', 'Danish', 'Krone'],
  'THB': ['Thailand', 'Thai', 'Baht'],
  'MYR': ['Malaysia', 'Malaysian', 'Ringgit'],
  'PHP': ['Philippines', 'Philippine', 'Peso'],
  'IDR': ['Indonesia', 'Indonesian', 'Rupiah'],
  'VND': ['Vietnam', 'Vietnamese', 'Dong'],
  'SAR': ['Saudi Arabia', 'Saudi', 'Riyal'],
  'ILS': ['Israel', 'Israeli', 'Shekel'],
  'CLP': ['Chile', 'Chilean', 'Peso'],
  'COP': ['Colombia', 'Colombian', 'Peso'],
  'PEN': ['Peru', 'Peruvian', 'Sol'],
  'ARS': ['Argentina', 'Argentine', 'Peso'],
  'UYU': ['Uruguay', 'Uruguayan', 'Peso'],
  'EGP': ['Egypt', 'Egyptian', 'Pound'],
  'MAD': ['Morocco', 'Moroccan', 'Dirham'],
  'NGN': ['Nigeria', 'Nigerian', 'Naira'],
  'KES': ['Kenya', 'Kenyan', 'Shilling'],
  'GHS': ['Ghana', 'Ghanaian', 'Cedi'],
  'TWD': ['Taiwan', 'Taiwanese', 'Dollar'],
  'PKR': ['Pakistan', 'Pakistani', 'Rupee'],
  'BDT': ['Bangladesh', 'Bangladeshi', 'Taka'],
  'LKR': ['Sri Lanka', 'Sri Lankan', 'Rupee'],
  'NPR': ['Nepal', 'Nepalese', 'Rupee'],
  'AFN': ['Afghanistan', 'Afghan', 'Afghani'],
  'IRR': ['Iran', 'Iranian', 'Rial'],
  'IQD': ['Iraq', 'Iraqi', 'Dinar'],
  'KWD': ['Kuwait', 'Kuwaiti', 'Dinar'],
  'BHD': ['Bahrain', 'Bahraini', 'Dinar'],
  'OMR': ['Oman', 'Omani', 'Rial'],
  'JOD': ['Jordan', 'Jordanian', 'Dinar'],
  'LBP': ['Lebanon', 'Lebanese', 'Pound'],
  'SYP': ['Syria', 'Syrian', 'Pound'],
  'AMD': ['Armenia', 'Armenian', 'Dram'],
  'GEL': ['Georgia', 'Georgian', 'Lari'],
  'AZN': ['Azerbaijan', 'Azerbaijani', 'Manat'],
  'UZS': ['Uzbekistan', 'Uzbek', 'Som'],
  'KZT': ['Kazakhstan', 'Kazakh', 'Tenge'],
  'KGS': ['Kyrgyzstan', 'Kyrgyz', 'Som'],
  'TJS': ['Tajikistan', 'Tajik', 'Somoni'],
  'TMT': ['Turkmenistan', 'Turkmen', 'Manat'],
};

// Currency codes to their full currency names
const CURRENCY_TO_FULL_NAMES: { [key: string]: string } = {
  'USD': 'US Dollar',
  'EUR': 'Euro',
  'GBP': 'British Pound',
  'JPY': 'Japanese Yen',
  'CAD': 'Canadian Dollar',
  'AUD': 'Australian Dollar',
  'CHF': 'Swiss Franc',
  'CNY': 'Chinese Yuan',
  'SEK': 'Swedish Krona',
  'NZD': 'New Zealand Dollar',
  'MXN': 'Mexican Peso',
  'SGD': 'Singapore Dollar',
  'HKD': 'Hong Kong Dollar',
  'NOK': 'Norwegian Krone',
  'KRW': 'South Korean Won',
  'TRY': 'Turkish Lira',
  'RUB': 'Russian Ruble',
  'INR': 'Indian Rupee',
  'BRL': 'Brazilian Real',
  'ZAR': 'South African Rand',
  'AED': 'UAE Dirham',
  'PLN': 'Polish Zloty',
  'CZK': 'Czech Koruna',
  'HUF': 'Hungarian Forint',
  'RON': 'Romanian Leu',
  'BGN': 'Bulgarian Lev',
  'ISK': 'Icelandic Krona',
  'DKK': 'Danish Krone',
  'THB': 'Thai Baht',
  'MYR': 'Malaysian Ringgit',
  'PHP': 'Philippine Peso',
  'IDR': 'Indonesian Rupiah',
  'VND': 'Vietnamese Dong',
  'SAR': 'Saudi Riyal',
  'ILS': 'Israeli Shekel',
  'CLP': 'Chilean Peso',
  'COP': 'Colombian Peso',
  'PEN': 'Peruvian Sol',
  'ARS': 'Argentine Peso',
  'UYU': 'Uruguayan Peso',
  'EGP': 'Egyptian Pound',
  'MAD': 'Moroccan Dirham',
  'NGN': 'Nigerian Naira',
  'KES': 'Kenyan Shilling',
  'GHS': 'Ghanaian Cedi',
  'TWD': 'New Taiwan Dollar',
  'PKR': 'Pakistani Rupee',
  'BDT': 'Bangladeshi Taka',
  'LKR': 'Sri Lankan Rupee',
  'NPR': 'Nepalese Rupee',
  'AFN': 'Afghan Afghani',
  'IRR': 'Iranian Rial',
  'IQD': 'Iraqi Dinar',
  'KWD': 'Kuwaiti Dinar',
  'BHD': 'Bahraini Dinar',
  'OMR': 'Omani Rial',
  'JOD': 'Jordanian Dinar',
  'LBP': 'Lebanese Pound',
  'SYP': 'Syrian Pound',
  'AMD': 'Armenian Dram',
  'GEL': 'Georgian Lari',
  'AZN': 'Azerbaijani Manat',
  'UZS': 'Uzbekistan Som',
  'KZT': 'Kazakhstani Tenge',
  'KGS': 'Kyrgyzstani Som',
  'TJS': 'Tajikistani Somoni',
  'TMT': 'Turkmenistani Manat',
};

export default function CurrencyPicker({
  visible,
  currencies,
  selectedCurrency,
  onSelect,
  onClose,
  onCurrencySelected,
}: CurrencyPickerProps) {
  const { t } = useLanguage();
  const [search, setSearch] = useState("");
  const [frequentlyUsedCurrencies, setFrequentlyUsedCurrencies] = useState<{[key: string]: number}>({});

  const surfaceColor = useThemeColor({}, 'surface');
  const surfaceSecondaryColor = useThemeColor({}, 'surfaceSecondary');
  const primaryColor = useThemeColor({}, 'primary');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const textInverseColor = useThemeColor({}, 'textInverse');
  const borderColor = useThemeColor({}, 'border');
  const shadowColor = '#000000'; // Use black for shadows
  const insets = useSafeAreaInsets();

  // Load frequently used currencies from storage
  const loadFrequentlyUsedCurrencies = async () => {
    try {
      const stored = await AsyncStorage.getItem("frequentlyUsedCurrencies");
      if (stored) {
        setFrequentlyUsedCurrencies(JSON.parse(stored));
      }
    } catch (error) {
      console.log('Failed to load frequently used currencies:', error);
    }
  };

  useEffect(() => {
    if (visible) {
      loadFrequentlyUsedCurrencies();
    }
  }, [visible]);

  const enhancedCurrencies = useMemo(() => {
    // Filter out non-currency items - only keep items that have valid currency mappings
    const validCurrencies = currencies.filter(currency =>
      CURRENCY_TO_COUNTRIES.hasOwnProperty(currency) &&
      CURRENCY_TO_COUNTRIES[currency].length > 0
    );
    
    // Create currency items with usage count
    const currencyItems = validCurrencies.map(currency => {
      const countries = CURRENCY_TO_COUNTRIES[currency] || [];
      const usageCount = frequentlyUsedCurrencies[currency] || 0;
      return {
        code: currency,
        countries: countries,
        searchText: `${currency} ${countries.join(' ')}`.toLowerCase(),
        usageCount
      };
    });
    
    // Sort currencies: frequently used first (by usage count), then alphabetical
    const sortedCurrencies = currencyItems.sort((a, b) => {
      // First sort by usage count (descending)
      if (b.usageCount !== a.usageCount) {
        return b.usageCount - a.usageCount;
      }
      // If usage counts are equal, sort alphabetically
      return a.code.localeCompare(b.code);
    });
    
    return sortedCurrencies;
  }, [currencies, frequentlyUsedCurrencies]);

  const filteredCurrencies = useMemo(() => {
    if (!search.trim()) return enhancedCurrencies;
    
    return enhancedCurrencies.filter(item =>
      item.searchText.includes(search.toLowerCase())
    );
  }, [enhancedCurrencies, search]);

  const updateFrequentlyUsed = async (currency: string) => {
    try {
      const storedUsage = await AsyncStorage.getItem("frequentlyUsedCurrencies");
      const usage = storedUsage ? JSON.parse(storedUsage) : {};
      
      // Increment usage count
      usage[currency] = (usage[currency] || 0) + 1;
      
      // Keep only top 20 most used currencies
      const sortedCurrencies = Object.entries(usage)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 20);
      
      const updatedUsage: { [key: string]: number } = {};
      sortedCurrencies.forEach(([curr, count]) => {
        updatedUsage[curr] = count as number;
      });
      
      await AsyncStorage.setItem("frequentlyUsedCurrencies", JSON.stringify(updatedUsage));
    } catch (error) {
      console.log('Failed to update frequently used currencies:', error);
    }
  };

  const handleSelect = async (currency: string) => {
    onSelect(currency);
    
    // Update frequently used currencies
    await updateFrequentlyUsed(currency);
    
    // Call the callback if provided
    if (onCurrencySelected) {
      onCurrencySelected(currency);
    }
    
    onClose();
    setSearch("");
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <ThemedView style={[styles.container, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
        <View style={styles.header}>
          <TouchableOpacity
            style={[{ backgroundColor: surfaceSecondaryColor, shadowColor: shadowColor }, styles.backButton]}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Go back"
          >
            <Ionicons name="arrow-back" size={22} color={textSecondaryColor} />
          </TouchableOpacity>
          <ThemedText type="title" style={[styles.title, { color: textColor }]}>
            {t('picker.selectCurrency')}
          </ThemedText>
          <View style={styles.headerSpacer} />
        </View>
        
        {/* Search Input */}
        <TextInput
          style={[{ backgroundColor: surfaceColor, borderColor: borderColor, color: textColor }, styles.searchInput]}
          placeholder={t('picker.searchCurrencies')}
          value={search}
          onChangeText={setSearch}
          placeholderTextColor={textSecondaryColor}
        />

        {/* Frequently Used Section */}
        {Object.keys(frequentlyUsedCurrencies).length > 0 && !search.trim() && (
          <View style={[{ backgroundColor: surfaceSecondaryColor, borderBottomColor: primaryColor }, styles.sectionHeader]}>
            <ThemedText style={[{ color: primaryColor }, styles.sectionTitle]}>{t('picker.frequentlyUsed')}</ThemedText>
          </View>
        )}
        
        <FlatList
          data={filteredCurrencies}
          keyExtractor={(item) => item.code}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                { backgroundColor: surfaceColor, borderColor: borderColor },
                styles.currencyItem,
                item.code === selectedCurrency && {
                  backgroundColor: surfaceSecondaryColor,
                  borderColor: primaryColor,
                },
              ]}
              onPress={() => handleSelect(item.code)}
            >
              <View style={styles.currencyItemContent}>
                <View style={styles.currencyLeftContent}>
                  <CurrencyFlag currency={item.code} size={20} />
                  <View style={styles.currencyInfo}>
                    <View style={styles.currencyHeader}>
                      <ThemedText
                        style={
                          item.code === selectedCurrency ? [{ color: primaryColor, fontWeight: "600" }] : [{ color: textColor }, styles.currencyCode]
                        }
                      >
                        {item.code}
                      </ThemedText>
                      {item.usageCount > 0 && (
                        <View style={[{ backgroundColor: primaryColor }, styles.usageIndicator]}>
                          <ThemedText style={[{ color: textInverseColor }, styles.usageCount]}>
                            {item.usageCount}
                          </ThemedText>
                        </View>
                      )}
                    </View>
                    {item.countries.length > 0 && (
                      <ThemedText style={[{ color: textSecondaryColor }, styles.countryNames]}>
                        {(() => {
                          // Format as "Country, Full Currency Name" for better readability
                          const countryName = item.countries[0] || '';
                          const currencyFullName = CURRENCY_TO_FULL_NAMES[item.code] || '';

                          if (currencyFullName) {
                            return `${countryName}, ${currencyFullName}`;
                          } else {
                            // If no currency name found, just show country name with currency code
                            return `${countryName} (${item.code})`;
                          }
                        })()}
                      </ThemedText>
                    )}
                  </View>
                </View>
              </View>
            </TouchableOpacity>
          )}
          style={styles.list}
        />
      </ThemedView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    marginBottom: 20,
    gap: 8,
  },
  backButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    textAlign: "center",
  },
  headerSpacer: {
    width: 36,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: FormField.radiusInput,
    paddingVertical: FormField.padV,
    paddingHorizontal: FormField.padH,
    fontSize: FormField.fontSize,
    fontWeight: FormField.fontWeight,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  list: {
    flex: 1,
    paddingHorizontal: 16,
  },
  currencyItem: {
    padding: 14,
    marginBottom: 8,
    borderRadius: 14,
    borderBottomWidth: 0,
    borderWidth: 1,
  },
  selectedItem: {
    backgroundColor: "#f4f4f5",
    borderBottomColor: "#d4d4d8",
  },
  currencyItemContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  currencyInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currencyHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  currencyCode: {
    fontSize: 16,
    fontWeight: "600",
  },
  countryNames: {
    fontSize: 12,
    marginTop: 2,
  },
  selectedText: {
    fontWeight: "600",
  },
  frequentlyUsedItem: {
    backgroundColor: "#e4e4e7",
    borderBottomColor: "#d4d4d8",
  },
  currencyLeftContent: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  usageIndicator: {
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: "center",
  },
  usageCount: {
    fontSize: 10,
    fontWeight: "bold",
  },
  sectionHeader: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "600",
  },
});

import React from "react";
import { TouchableOpacity, StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";
import { useLanguage } from "@/contexts/LanguageContext";

interface DeleteAllButtonProps {
  onPress: () => void;
  count: number;
  translationKey?: string;
  style?: any;
}

export default function DeleteAllButton({
  onPress,
  count,
  translationKey = "saved.deleteAll",
  style,
}: DeleteAllButtonProps) {
  const { t } = useLanguage();

  const errorColor = useThemeColor({}, 'error');
  const textInverseColor = useThemeColor({}, 'textInverse');
  const shadowColor = '#000000'; // Use black for shadows

  return (
    <TouchableOpacity
      style={[{ backgroundColor: errorColor, shadowColor: shadowColor }, styles.deleteAllButton, style]}
      onPress={onPress}
    >
      <ThemedText style={[{ color: textInverseColor }, styles.deleteAllText]}>
        {t(translationKey)} ({count})
      </ThemedText>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  deleteAllButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 12,
  },
  deleteAllText: {
    fontWeight: "bold",
    fontSize: 16,
  },
});
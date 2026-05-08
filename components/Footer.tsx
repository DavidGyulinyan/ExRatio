import React from "react";
import { View, StyleSheet } from "react-native";
import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface FooterProps {
  style?: any;
}

export default function Footer({ style }: FooterProps) {
  const backgroundColor = useThemeColor({}, 'surface');
  const borderColor = useThemeColor({}, 'border');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');

  const appTitle = "Capital";
  const year = new Date().getFullYear();

  return (
    <View
      style={[
        {
          backgroundColor,
          borderTopWidth: StyleSheet.hairlineWidth,
          borderTopColor: borderColor,
          paddingVertical: 16,
          paddingHorizontal: 20,
          alignItems: "center",
        },
        style,
      ]}
    >
      <ThemedText style={{ fontSize: 12, textAlign: "center", color: textSecondaryColor, lineHeight: 18 }}>
        © {year} {appTitle}
      </ThemedText>
    </View>
  );
}

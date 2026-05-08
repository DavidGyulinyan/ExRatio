import React from 'react';
import { StyleSheet, Text, type TextProps } from "react-native";

import { useThemeColor } from "@/hooks/use-theme-color";

export type ThemedTextProps = TextProps & {
  lightColor?: string;
  darkColor?: string;
  type?: "default" | "title" | "defaultSemiBold" | "subtitle" | "link" | "caption";
};

export function ThemedText({
  style,
  lightColor,
  darkColor,
  type = "default",
  ...rest
}: ThemedTextProps) {
  const color = useThemeColor({ light: lightColor, dark: darkColor }, "text");
  const linkTint = useThemeColor({}, "primary");

  /** Armenian script reads better with a slight size reduction. */
  const fontSizeAdjustment = -2;

  return (
    <Text
      style={[
        { color },
        type === "default" ? { ...styles.default, fontSize: Math.max(14, styles.default.fontSize + fontSizeAdjustment) } : undefined,
        type === "title" ? { ...styles.title, fontSize: Math.max(28, styles.title.fontSize + fontSizeAdjustment) } : undefined,
        type === "defaultSemiBold" ? { ...styles.defaultSemiBold, fontSize: Math.max(14, styles.defaultSemiBold.fontSize + fontSizeAdjustment) } : undefined,
        type === "subtitle" ? { ...styles.subtitle, fontSize: Math.max(16, styles.subtitle.fontSize + fontSizeAdjustment) } : undefined,
        type === "link"
          ? {
              ...styles.link,
              color: linkTint,
              fontSize: Math.max(14, styles.link.fontSize + fontSizeAdjustment),
            }
          : undefined,
        type === "caption" ? { ...styles.caption, fontSize: Math.max(12, styles.caption.fontSize + fontSizeAdjustment) } : undefined,
        style,
      ]}
      {...rest}
    />
  );
}

const styles = StyleSheet.create({
  default: {
    fontSize: 16,
    lineHeight: 24,
  },
  defaultSemiBold: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: "600",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    lineHeight: 36,
    letterSpacing: -0.3,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
    lineHeight: 24,
  },
  caption: {
    fontSize: 13,
    lineHeight: 18,
    fontWeight: "500",
    opacity: 0.92,
  },
  link: {
    lineHeight: 30,
    fontSize: 16,
  },
});

import React from "react";
import { View, StyleSheet, useWindowDimensions } from "react-native";

import { FinHubWordmark, FIN_HUB_WORDMARK_ASPECT } from "@/components/FinHubWordmark";
import { useThemeColor } from "@/hooks/use-theme-color";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: number;
}

export default function Logo({ size = 36, showText = true, textSize = 26 }: LogoProps) {
  const { width: windowWidth } = useWindowDimensions();
  const finColor = useThemeColor({}, "text");

  const rawHeight = showText ? Math.max(size, textSize * 1.12) : size;
  const height = Math.max(1, Math.round(Number.isFinite(rawHeight) ? rawHeight : size));

  const safeWindow = windowWidth > 0 ? windowWidth : 400;
  const maxByScreen = Math.floor(safeWindow * 0.52);
  const naturalWidth = Math.round(height * FIN_HUB_WORDMARK_ASPECT);
  const width = Math.max(1, Math.min(naturalWidth, maxByScreen));
  const scaledHeight = Math.max(1, Math.round(width / FIN_HUB_WORDMARK_ASPECT));

  return (
    <View style={styles.logoContainer}>
      <FinHubWordmark width={width} height={scaledHeight} finColor={finColor} />
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    overflow: "hidden",
  },
});

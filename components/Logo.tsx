import React from "react";
import { View, StyleSheet, Image } from "react-native";
import { useThemeColor } from "@/hooks/use-theme-color";

interface LogoProps {
  size?: number;
  showText?: boolean;
  textSize?: number;
}

export default function Logo({ size = 36, showText = true, textSize = 26 }: LogoProps) {
  const borderColor = useThemeColor({}, "border");
  const bg = useThemeColor({}, "surfaceSecondary");

  const box = Math.max(1, Math.round(size));
  // Smaller padding so the mark fills the circle more.
  const pad = Math.max(0, Math.round(box * 0.01));

  return (
    <View style={styles.logoContainer}>
      <View style={[styles.markWrap, { width: box, height: box, borderColor, backgroundColor: bg, padding: pad }]}>
        <Image
          source={require("@/assets/images/logo.png")}
          style={{ width: "100%", height: "100%" }}
          resizeMode="contain"
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  logoContainer: {
    overflow: "hidden",
  },
  markWrap: {
    borderWidth: StyleSheet.hairlineWidth,
    borderRadius: 999,
    overflow: "hidden",
  },
});

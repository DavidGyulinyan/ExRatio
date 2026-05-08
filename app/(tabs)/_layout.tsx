import { Stack } from "expo-router";
import React from "react";
import { View } from "react-native";

import { FinancialBackground } from "@/components/FinancialBackground";
import { useThemeColor } from "@/hooks/use-theme-color";

export default function TabLayout() {
  const backgroundColor = useThemeColor({}, "background");

  return (
    <View style={{ flex: 1, backgroundColor }}>
      <FinancialBackground />
      <View style={{ flex: 1, backgroundColor: "transparent" }}>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: "transparent" },
          }}
        >
          <Stack.Screen
            name="index"
            options={{
              title: "Capital",
            }}
          />
        </Stack>
      </View>
    </View>
  );
}

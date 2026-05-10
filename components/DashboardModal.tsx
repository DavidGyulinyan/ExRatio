import React from "react";
import { View, TouchableOpacity, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { ThemedText } from "./themed-text";
import { useThemeColor } from "@/hooks/use-theme-color";

interface DashboardModalProps {
  title: string;
  icon?: string;
  onClose?: () => void;
  children: React.ReactNode;
  style?: any;
}

export default function DashboardModal({
  title,
  icon,
  onClose,
  children,
  style,
}: DashboardModalProps) {
  const backgroundColor = useThemeColor({}, 'background');
  const surfaceColor = useThemeColor({}, 'surface');
  const textColor = useThemeColor({}, 'text');
  const textSecondaryColor = useThemeColor({}, 'textSecondary');
  const borderColor = useThemeColor({}, 'border');
  const shadowColor = '#000000'; // Use black for shadows

  return (
    <View style={[styles.modalContainer, style]}>
      <View style={[{ backgroundColor: surfaceColor, borderColor: borderColor, shadowColor }, styles.modalCard]}>
        <View style={[styles.sheetHandle, { backgroundColor: borderColor }]} />
        <View style={styles.modalHeader}>
          <View style={styles.modalTitleContainer}>
            {icon ? <ThemedText style={styles.modalIcon}>{icon}</ThemedText> : null}
            <ThemedText style={[{ color: textColor }, styles.modalTitle]} numberOfLines={2}>
              {title}
            </ThemedText>
          </View>
          {onClose && (
            <TouchableOpacity
              style={[{ backgroundColor: backgroundColor, borderColor: borderColor }, styles.closeButton]}
              onPress={onClose}
              accessibilityRole="button"
              accessibilityLabel="Go back"
            >
              <Ionicons name="arrow-back" size={20} color={textSecondaryColor} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.modalContent}>
          {children}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  modalContainer: {
    marginBottom: 24,
  },
  modalCard: {
    borderRadius: 22,
    borderWidth: 1,
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 22,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 6,
  },
  sheetHandle: {
    alignSelf: "center",
    width: 36,
    height: 4,
    borderRadius: 2,
    marginBottom: 14,
    opacity: 0.55,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
    gap: 12,
  },
  modalTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  modalIcon: {
    fontSize: 20,
    marginRight: 12,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    lineHeight: 24,
    flex: 1,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    marginLeft: 8,
  },
  modalContent: {
    // Content area - children will be rendered here
  },
});
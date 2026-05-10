import SortableQuickTile from "@/components/SortableQuickTile";
import { ThemedText } from "@/components/themed-text";
import { hexToRgba } from "@/constants/theme";
import { Ionicons } from "@expo/vector-icons";
import React from "react";
import {
  TouchableOpacity,
  View,
  type LayoutChangeEvent,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from "react-native";

export type DashboardSortableTileDef = {
  labelKey: string;
  icon: keyof typeof Ionicons.glyphMap;
  onPress: () => void;
  active?: boolean;
};

export type DashboardSortableTileGridSheet = {
  quickActionsGrid: ViewStyle;
  quickTile: ViewStyle;
  quickTileIconWrap: ViewStyle;
  quickTileLabel: TextStyle;
};

type DashboardSortableTileGridProps<T extends string> = {
  order: T[];
  defs: Record<T, DashboardSortableTileDef>;
  reorderMode: boolean;
  draggingId: T | null;
  onDraggingIdChange: (id: T | null) => void;
  dragIndexRef: React.MutableRefObject<number | null>;
  gridRef: React.RefObject<View | null>;
  onGridLayout: () => void;
  onFirstTileLayout: (e: LayoutChangeEvent) => void;
  onDragMove: (pageX: number, pageY: number) => void;
  t: (key: string) => string;
  gridStyles: DashboardSortableTileGridSheet;
  primaryColor: string;
  textColor: string;
  textSecondaryColor: string;
  borderColor: string;
  pageBackgroundColor: string;
  variant: "quick" | "plain";
  /** Reset drag-activation tracking when a tile grab starts / ends. */
  onDragSessionStart?: () => void;
  onDragSessionEnd?: () => void;
};

export default function DashboardSortableTileGrid<T extends string>({
  order,
  defs,
  reorderMode,
  draggingId,
  onDraggingIdChange,
  dragIndexRef,
  gridRef,
  onGridLayout,
  onFirstTileLayout,
  onDragMove,
  t,
  gridStyles,
  primaryColor,
  textColor,
  textSecondaryColor,
  borderColor,
  pageBackgroundColor,
  variant,
  onDragSessionStart,
  onDragSessionEnd,
}: DashboardSortableTileGridProps<T>) {
  return (
    <View
      ref={gridRef}
      collapsable={false}
      onLayout={onGridLayout}
      style={gridStyles.quickActionsGrid}
    >
      {order.map((id, index) => {
        const item = defs[id];
        const active = item.active === true;
        const iconWrapStyle: StyleProp<ViewStyle> = [
          gridStyles.quickTileIconWrap,
          variant === "quick"
            ? {
                backgroundColor: active
                  ? hexToRgba(primaryColor, 0.14)
                  : "transparent",
                borderWidth: 1,
                borderColor: active
                  ? hexToRgba(primaryColor, 0.45)
                  : hexToRgba(borderColor, 0.55),
              }
            : {
                backgroundColor: "transparent",
                borderWidth: 1,
                borderColor: hexToRgba(borderColor, 0.55),
              },
        ];
        const tileInner = (
          <>
            <View style={iconWrapStyle}>
              <Ionicons
                name={item.icon}
                size={24}
                color={
                  variant === "quick" && active
                    ? primaryColor
                    : textSecondaryColor
                }
              />
            </View>
            <ThemedText
              type="caption"
              numberOfLines={2}
              ellipsizeMode="tail"
              style={[
                gridStyles.quickTileLabel,
                {
                  color: textColor,
                  paddingRight: reorderMode ? 22 : 0,
                },
              ]}
            >
              {t(item.labelKey)}
            </ThemedText>
          </>
        );

        const tileShellStyle: StyleProp<ViewStyle> = [
          gridStyles.quickTile,
          variant === "quick"
            ? {
                backgroundColor: active
                  ? hexToRgba(primaryColor, 0.22)
                  : hexToRgba(pageBackgroundColor, 0.52),
                borderColor: active ? primaryColor : borderColor,
                borderWidth: active ? 2 : 1,
              }
            : {
                backgroundColor: hexToRgba(pageBackgroundColor, 0.52),
                borderColor,
                borderWidth: 1,
              },
        ];

        return (
          <SortableQuickTile
            key={id}
            reorderMode={reorderMode}
            isDragging={draggingId === id}
            handleColor={textSecondaryColor}
            onDragStart={() => {
              onDragSessionStart?.();
              dragIndexRef.current = index;
              onDraggingIdChange(id);
            }}
            onDragMove={onDragMove}
            onDragEnd={() => {
              onDraggingIdChange(null);
              dragIndexRef.current = null;
              onDragSessionEnd?.();
            }}
            style={tileShellStyle}
          >
            {reorderMode ? (
              <View
                style={{ flex: 1 }}
                onLayout={index === 0 ? onFirstTileLayout : undefined}
              >
                {tileInner}
              </View>
            ) : (
              <TouchableOpacity
                activeOpacity={0.85}
                onLayout={index === 0 ? onFirstTileLayout : undefined}
                style={{ flex: 1 }}
                onPress={item.onPress}
              >
                {tileInner}
              </TouchableOpacity>
            )}
          </SortableQuickTile>
        );
      })}
    </View>
  );
}

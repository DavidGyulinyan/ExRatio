import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef } from "react";
import {
  PanResponder,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, { LinearTransition } from "react-native-reanimated";

/** Spring layout when tiles reflow during dashboard reorder (Reanimated). */
const TILE_LAYOUT_TRANSITION = LinearTransition.springify()
  .damping(20)
  .stiffness(220)
  .mass(0.38);

type SortableQuickTileProps = {
  reorderMode: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  handleColor: string;
};

/**
 * Quick-action tile with an optional drag handle for reorder mode.
 * The handle owns the pan gesture so vertical scrolling still works on the dashboard.
 */
export default function SortableQuickTile({
  reorderMode,
  isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
  style,
  handleColor,
}: SortableQuickTileProps) {
  const callbacksRef = useRef({
    onDragStart,
    onDragMove,
    onDragEnd,
  });
  callbacksRef.current = { onDragStart, onDragMove, onDragEnd };

  const panResponder = useMemo(
    () =>
      PanResponder.create({
        onStartShouldSetPanResponder: () => reorderMode,
        onStartShouldSetPanResponderCapture: () => reorderMode,
        onMoveShouldSetPanResponder: () => false,
        onPanResponderTerminationRequest: () => false,
        onPanResponderGrant: () => {
          callbacksRef.current.onDragStart();
        },
        onPanResponderMove: (evt) => {
          callbacksRef.current.onDragMove(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY
          );
        },
        onPanResponderRelease: () => {
          callbacksRef.current.onDragEnd();
        },
        onPanResponderTerminate: () => {
          callbacksRef.current.onDragEnd();
        },
      }),
    [reorderMode]
  );

  return (
    <Animated.View
      layout={reorderMode ? TILE_LAYOUT_TRANSITION : undefined}
      style={[
        style,
        { position: "relative" },
        isDragging && {
          opacity: 0.96,
          transform: [{ scale: 1.02 }],
          zIndex: 20,
          elevation: 8,
          shadowColor: "#000",
          shadowOffset: { width: 0, height: 4 },
          shadowOpacity: 0.12,
          shadowRadius: 8,
        },
      ]}
    >
      {children}
      {reorderMode ? (
        <View
          collapsable={false}
          style={{
            position: "absolute",
            right: 4,
            top: 4,
            padding: 8,
            zIndex: 3,
          }}
          {...panResponder.panHandlers}
        >
          <Ionicons name="reorder-three" size={22} color={handleColor} />
        </View>
      ) : null}
    </Animated.View>
  );
}

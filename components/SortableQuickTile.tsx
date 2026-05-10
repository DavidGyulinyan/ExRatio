import { Ionicons } from "@expo/vector-icons";
import React, { useMemo, useRef } from "react";
import {
  PanResponder,
  Platform,
  type StyleProp,
  View,
  type ViewStyle,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";

/** Short ease-out: reads as “picked up”, not bouncy. */
const GRAB = { duration: 90, easing: Easing.out(Easing.cubic) };
const RELEASE = { duration: 130, easing: Easing.out(Easing.quad) };

const SCALE_LIFT = 0.026;

type SortableQuickTileProps = {
  reorderMode: boolean;
  isDragging: boolean;
  onDragStart: () => void;
  onDragMove: (pageX: number, pageY: number) => void;
  onDragEnd: () => void;
  children: React.ReactNode;
  style?: StyleProp<ViewStyle>;
  handleColor: string;
  /** Match dashboard `quickTile.borderRadius` so lift/elevation follow rounded shape. */
  borderRadius?: number;
};

/**
 * Quick-action tile with an optional drag handle for reorder mode.
 * The handle owns the pan gesture so vertical scrolling still works on the dashboard.
 */
export default function SortableQuickTile({
  reorderMode,
  isDragging: _isDragging,
  onDragStart,
  onDragMove,
  onDragEnd,
  children,
  style,
  handleColor,
  borderRadius = 18,
}: SortableQuickTileProps) {
  const lift = useSharedValue(0);

  /** Scale + z-index only (Android elevation on grab tended to hitch layout). */
  const animatedCardStyle = useAnimatedStyle(() => {
    const t = lift.value;
    const scale = 1 + SCALE_LIFT * t;
    const up = t > 0.01;
    return {
      transform: [{ scale }],
      zIndex: up ? 40 : 0,
    };
  });

  const cornerStyle: ViewStyle =
    Platform.OS === "ios"
      ? { borderRadius, borderCurve: "continuous" }
      : { borderRadius };

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
          lift.value = withTiming(1, GRAB);
          callbacksRef.current.onDragStart();
        },
        onPanResponderMove: (evt) => {
          callbacksRef.current.onDragMove(
            evt.nativeEvent.pageX,
            evt.nativeEvent.pageY
          );
        },
        onPanResponderRelease: () => {
          lift.value = withTiming(0, RELEASE);
          callbacksRef.current.onDragEnd();
        },
        onPanResponderTerminate: () => {
          lift.value = withTiming(0, RELEASE);
          callbacksRef.current.onDragEnd();
        },
      }),
    [reorderMode]
  );

  return (
    <Animated.View
      pointerEvents="box-none"
      style={[style, { position: "relative" }, cornerStyle, animatedCardStyle]}
    >
      {children}
      {reorderMode ? (
        <View
          collapsable={false}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            position: "absolute",
            right: 4,
            top: 4,
            padding: 8,
            zIndex: 50,
            elevation: 0,
          }}
          {...panResponder.panHandlers}
        >
          <Ionicons name="reorder-three" size={22} color={handleColor} />
        </View>
      ) : null}
    </Animated.View>
  );
}

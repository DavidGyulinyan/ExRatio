import React from "react";
import { Platform } from "react-native";
import Svg, { Rect, Text as SvgText } from "react-native-svg";

/** Wordmark layout units — scales uniformly via width/height. */
export const FIN_HUB_WORDMARK_VIEW_W = 186;
export const FIN_HUB_WORDMARK_VIEW_H = 56;
export const FIN_HUB_WORDMARK_ASPECT = FIN_HUB_WORDMARK_VIEW_W / FIN_HUB_WORDMARK_VIEW_H;

const HUB_ORANGE = "#FF9900";

const boldFont = Platform.select({
  ios: "HelveticaNeue-Bold",
  android: "sans-serif",
  default: "sans-serif",
});

export type FinHubWordmarkProps = {
  width: number;
  height: number;
  /** “Fin” — use theme text color for contrast on light/dark surfaces. */
  finColor: string;
};

export function FinHubWordmark({ width, height, finColor }: FinHubWordmarkProps) {
  return (
    <Svg
      width={width}
      height={height}
      viewBox={`0 0 ${FIN_HUB_WORDMARK_VIEW_W} ${FIN_HUB_WORDMARK_VIEW_H}`}
    >
      <SvgText
        x="0"
        y="42"
        fontSize="38"
        fontWeight="700"
        fill={finColor}
        fontFamily={boldFont}
      >
        Fin
      </SvgText>
      <Rect x="56" y="6" width="122" height="44" rx="12" ry="12" fill={HUB_ORANGE} />
      <SvgText
        x="117"
        y="42"
        fontSize="38"
        fontWeight="700"
        fill="#000000"
        textAnchor="middle"
        fontFamily={boldFont}
      >
        hub
      </SvgText>
    </Svg>
  );
}

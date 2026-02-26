declare module "react-gauge-component" {
  import React from "react";

  interface ArcConfig {
    width?: number;
    cornerRadius?: number;
    nbSubArcs?: number;
    colorArray?: string[];
    padding?: number;
    subArcsStrokeWidth?: number;
    subArcsStrokeColor?: string;
    effects?: {
      glow?: boolean;
      glowBlur?: number;
      glowSpread?: number;
    };
    gradient?: boolean;
    subArcs?: {
      limit?: number;
      color?: string;
      showTick?: boolean;
      tooltip?: object;
    }[];
  }

  interface PointerConfig {
    type?: "needle" | "blob";
    elastic?: boolean;
    animationDelay?: number;
    animationDuration?: number;
    length?: number;
    width?: number;
    baseColor?: string;
    strokeWidth?: number;
    strokeColor?: string;
    maxFps?: number;
    animationThreshold?: number;
  }

  interface TickConfig {
    value: number;
  }

  interface ValueLabelConfig {
    matchColorWithArc?: boolean;
    style?: React.CSSProperties;
    offsetY?: number;
    animateValue?: boolean;
    hide?: boolean;
    offsetX?: number;
    formatTextValue?: (value: number) => string;
  }

  interface TickLabelsConfig {
    type?: "outer" | "inner";
    hideMinMax?: boolean;
    autoSpaceTickLabels?: boolean;
    ticks?: TickConfig[];
  }

  interface LabelsConfig {
    valueLabel?: ValueLabelConfig;
    tickLabels?: TickLabelsConfig;
  }

  interface GaugeComponentProps {
    value?: number;
    type?: "radial" | "semicircle" | "grafana";
    minValue?: number;
    maxValue?: number;
    arc?: ArcConfig;
    pointer?: PointerConfig;
    labels?: LabelsConfig;
    style?: React.CSSProperties;
    className?: string;
  }

  export const GaugeComponent: React.FC<GaugeComponentProps>;
}

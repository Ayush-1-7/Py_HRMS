declare module "react-gauge-chart" {
  import React from "react";

  interface GaugeChartProps {
    id: string;
    className?: string;
    style?: React.CSSProperties;
    marginInPercent?: number;
    cornerRadius?: number;
    nrOfLevels?: number;
    percent?: number;
    arcPadding?: number;
    arcWidth?: number;
    colors?: string[];
    textColor?: string;
    needleColor?: string;
    needleBaseColor?: string;
    hideText?: boolean;
    arcsLength?: number[];
    animate?: boolean;
    animDelay?: number;
    animateDuration?: number;
    formatTextValue?: (value: number) => string;
    textComponent?: React.ReactNode;
    textComponentContainerClassName?: string;
    needleScale?: number;
    customNeedleComponent?: React.ReactNode;
    customNeedleComponentClassName?: string;
    customNeedleStyle?: React.CSSProperties;
  }

  const GaugeChart: React.FC<GaugeChartProps>;
  export default GaugeChart;
}

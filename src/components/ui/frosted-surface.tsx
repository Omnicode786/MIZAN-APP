import type { CSSProperties, HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type FrostedSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children?: ReactNode;
  borderRadius?: number;
  innerClassName?: string;
  width?: number | string;
  height?: number | string;
  borderWidth?: number;
  brightness?: number;
  opacity?: number;
  blur?: number;
  displace?: number;
  backgroundOpacity?: number;
  saturation?: number;
  distortionScale?: number;
  redOffset?: number;
  greenOffset?: number;
  blueOffset?: number;
  xChannel?: string;
  yChannel?: string;
  mixBlendMode?: CSSProperties["mixBlendMode"];
  borderGlow?: boolean;
  refractive?: boolean;
};

export function FrostedSurface({
  children,
  className,
  innerClassName,
  style,
  width,
  height,
  borderRadius,
  borderWidth: _borderWidth,
  brightness: _brightness,
  opacity: _opacity,
  blur: _blur,
  displace: _displace,
  backgroundOpacity: _backgroundOpacity,
  saturation: _saturation,
  distortionScale: _distortionScale,
  redOffset: _redOffset,
  greenOffset: _greenOffset,
  blueOffset: _blueOffset,
  xChannel: _xChannel,
  yChannel: _yChannel,
  mixBlendMode: _mixBlendMode,
  borderGlow,
  refractive: _refractive,
  ...props
}: FrostedSurfaceProps) {
  const resolvedStyle: CSSProperties = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: borderRadius ? `${borderRadius}px` : style?.borderRadius
  };

  return (
    <div
      className={cn(
        "frosted-surface relative min-w-0 overflow-hidden border",
        borderGlow && "frosted-border-glow",
        className
      )}
      style={resolvedStyle}
      {...props}
    >
      <div className={cn("relative z-10 h-full min-w-0 rounded-[inherit]", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

export default FrostedSurface;

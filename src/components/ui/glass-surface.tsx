"use client";

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type CSSProperties,
  type HTMLAttributes,
  type PointerEvent,
  type ReactNode
} from "react";
import { useTheme } from "@/components/theme-provider";
import { cn } from "@/lib/utils";

type ChannelSelector = "R" | "G" | "B" | "A";

type GlassSurfaceProps = HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  borderRadius?: number;
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
  xChannel?: ChannelSelector;
  yChannel?: ChannelSelector;
  mixBlendMode?: NonNullable<CSSProperties["mixBlendMode"]>;
  refractive?: boolean;
  borderGlow?: boolean;
  innerClassName?: string;
};

type GlassStyle = CSSProperties & {
  "--glass-frost"?: number | string;
  "--glass-saturation"?: number | string;
};

function detectBackdropSupport() {
  if (typeof window === "undefined" || typeof CSS === "undefined") {
    return false;
  }

  return (
    CSS.supports("backdrop-filter", "blur(10px)") ||
    CSS.supports("-webkit-backdrop-filter", "blur(10px)")
  );
}

function detectSvgBackdropSupport(filterId: string) {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent;
  const isSafari = /Safari/.test(userAgent) && !/Chrome|Chromium|Edg/.test(userAgent);
  const isFirefox = /Firefox/.test(userAgent);

  if (isSafari || isFirefox) {
    return false;
  }

  const probe = document.createElement("div");
  probe.style.backdropFilter = `url(#${filterId})`;
  probe.style.setProperty("-webkit-backdrop-filter", `url(#${filterId})`);

  return Boolean(probe.style.backdropFilter || probe.style.getPropertyValue("-webkit-backdrop-filter"));
}

export function GlassSurface({
  children,
  width = "100%",
  height = "auto",
  borderRadius = 28,
  borderWidth = 0.07,
  brightness = 46,
  opacity = 0.82,
  blur = 10,
  displace = 0,
  backgroundOpacity = 0.1,
  saturation = 1.12,
  distortionScale = -180,
  redOffset = 0,
  greenOffset = 10,
  blueOffset = 20,
  xChannel = "R",
  yChannel = "G",
  mixBlendMode = "difference",
  refractive = false,
  borderGlow = false,
  className,
  innerClassName,
  style,
  onPointerEnter,
  onPointerLeave,
  onPointerMove,
  ...props
}: GlassSurfaceProps) {
  const { mounted, resolvedTheme, uiMode } = useTheme();
  const isDarkMode = mounted ? resolvedTheme === "dark" : false;
  const isGlassMode = mounted ? uiMode === "glass" : true;

  const uniqueId = useId().replace(/:/g, "-");
  const filterId = `glass-filter-${uniqueId}`;
  const redGradId = `glass-red-${uniqueId}`;
  const blueGradId = `glass-blue-${uniqueId}`;
  const whiteGradId = `glass-white-${uniqueId}`;
  const glowGradId = `glass-glow-${uniqueId}`;

  const [svgSupported, setSvgSupported] = useState(false);
  const [backdropSupported, setBackdropSupported] = useState(false);
  const useSvgFilter = isGlassMode && refractive && svgSupported;

  const containerRef = useRef<HTMLDivElement | null>(null);
  const feImageRef = useRef<SVGFEImageElement | null>(null);
  const redChannelRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const greenChannelRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const blueChannelRef = useRef<SVGFEDisplacementMapElement | null>(null);
  const gaussianBlurRef = useRef<SVGFEGaussianBlurElement | null>(null);

  const resetBorderGlow = useCallback(() => {
    const element = containerRef.current;
    if (!element) return;

    element.style.setProperty("--liquid-angle", "45deg");
    element.style.setProperty("--liquid-border-opacity", isDarkMode ? "0.26" : "0.42");
    element.style.setProperty("--liquid-fill-opacity", isDarkMode ? "0.06" : "0.09");
    element.style.setProperty("--liquid-glow-opacity", isDarkMode ? "0.08" : "0.12");
  }, [isDarkMode]);

  const updateBorderGlow = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      if (!borderGlow || !isGlassMode) return;

      const element = containerRef.current;
      if (!element) return;

      const rect = element.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const y = event.clientY - rect.top;
      const cx = rect.width / 2;
      const cy = rect.height / 2;
      const dx = x - cx;
      const dy = y - cy;
      const radians = Math.atan2(dy, dx);
      let degrees = radians * (180 / Math.PI) + 90;
      if (degrees < 0) degrees += 360;

      const kx = dx === 0 ? Infinity : cx / Math.abs(dx);
      const ky = dy === 0 ? Infinity : cy / Math.abs(dy);
      const edgeProximity = Math.min(Math.max(1 / Math.min(kx, ky), 0), 1);
      const edgeStrength = Math.max(0, (edgeProximity * 100 - 30) / 70);
      const borderOpacity = isDarkMode ? 0.26 + edgeStrength * 0.54 : 0.42 + edgeStrength * 0.5;
      const fillOpacity = isDarkMode ? 0.06 + edgeStrength * 0.1 : 0.09 + edgeStrength * 0.15;
      const glowOpacity = isDarkMode ? 0.08 + edgeStrength * 0.12 : 0.12 + edgeStrength * 0.2;

      element.style.setProperty("--liquid-angle", `${degrees.toFixed(3)}deg`);
      element.style.setProperty("--liquid-border-opacity", borderOpacity.toFixed(3));
      element.style.setProperty("--liquid-fill-opacity", fillOpacity.toFixed(3));
      element.style.setProperty("--liquid-glow-opacity", glowOpacity.toFixed(3));
    },
    [borderGlow, isDarkMode, isGlassMode]
  );

  useEffect(() => {
    if (borderGlow) {
      resetBorderGlow();
    }
  }, [borderGlow, resetBorderGlow]);

  const effectiveBrightness = isGlassMode
    ? isDarkMode
      ? Math.min(brightness + 2, 46)
      : Math.min(brightness + 6, 64)
    : brightness;
  const effectiveOpacity = isGlassMode
    ? isDarkMode
      ? Math.min(opacity + 0.02, 0.8)
      : Math.min(opacity + 0.03, 0.9)
    : opacity;
  const effectiveBlur = isGlassMode
    ? isDarkMode
      ? blur + 7
      : blur + 5
    : Math.max(blur - 1, 6);
  const effectiveDisplace = isGlassMode
    ? isDarkMode
      ? Math.max(displace, 0.2)
      : Math.max(displace, 0.29)
    : Math.max(displace, 0.15);
  const effectiveSaturation = isGlassMode
    ? isDarkMode
      ? Math.max(saturation + 0.02, 1.1)
      : Math.max(saturation + 0.18, 1.24)
    : Math.max(saturation, 1.08);
  const effectiveDistortionScale = isGlassMode
    ? isDarkMode
      ? distortionScale * 0.46
      : distortionScale * 0.52
    : Math.round(distortionScale * 0.62);
  const effectiveRedOffset = isGlassMode ? (isDarkMode ? redOffset - 1 : redOffset - 2) : redOffset;
  const effectiveGreenOffset = isGlassMode ? (isDarkMode ? greenOffset + 1 : greenOffset + 3) : greenOffset;
  const effectiveBlueOffset = isGlassMode ? (isDarkMode ? blueOffset + 2 : blueOffset + 5) : blueOffset;

  const generateDisplacementMap = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();
    const actualWidth = Math.max(Math.round(rect?.width || 420), 1);
    const actualHeight = Math.max(Math.round(rect?.height || 220), 1);
    const edgeSize = Math.max(Math.min(actualWidth, actualHeight) * (borderWidth * 0.5), 1);
    const clampedRadius = Math.min(borderRadius, actualWidth / 2, actualHeight / 2);

    const svgContent = `
      <svg viewBox="0 0 ${actualWidth} ${actualHeight}" xmlns="http://www.w3.org/2000/svg">
        <defs>
          <linearGradient id="${redGradId}" x1="100%" y1="0%" x2="0%" y2="0%">
            <stop offset="0%" stop-color="#0000" />
            <stop offset="100%" stop-color="red" />
          </linearGradient>
          <linearGradient id="${blueGradId}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="#0000" />
            <stop offset="100%" stop-color="blue" />
          </linearGradient>
          <radialGradient id="${whiteGradId}" cx="18%" cy="10%" r="68%">
            <stop offset="0%" stop-color="white" stop-opacity="${isGlassMode ? (isDarkMode ? "0.09" : "0.39") : "0.24"}" />
            <stop offset="42%" stop-color="white" stop-opacity="${isGlassMode ? (isDarkMode ? "0.034" : "0.086") : "0.04"}" />
            <stop offset="100%" stop-color="white" stop-opacity="0" />
          </radialGradient>
          <radialGradient id="${glowGradId}" cx="84%" cy="12%" r="74%">
            <stop offset="0%" stop-color="${isGlassMode ? "#bae6fd" : "#c4b5fd"}" stop-opacity="${isGlassMode ? (isDarkMode ? "0.039" : "0.175") : "0.1"}" />
            <stop offset="36%" stop-color="${isGlassMode ? "#ddd6fe" : "#7dd3fc"}" stop-opacity="${isGlassMode ? (isDarkMode ? "0.016" : "0.076") : "0.035"}" />
            <stop offset="100%" stop-color="#0000" />
          </radialGradient>
        </defs>
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" fill="black" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${clampedRadius}" fill="url(#${redGradId})" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${clampedRadius}" fill="url(#${blueGradId})" style="mix-blend-mode: ${mixBlendMode}" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${clampedRadius}" fill="url(#${whiteGradId})" style="mix-blend-mode: screen" />
        <rect x="0" y="0" width="${actualWidth}" height="${actualHeight}" rx="${clampedRadius}" fill="url(#${glowGradId})" style="mix-blend-mode: screen" />
        <rect
          x="${edgeSize}"
          y="${edgeSize}"
          width="${Math.max(actualWidth - edgeSize * 2, 1)}"
          height="${Math.max(actualHeight - edgeSize * 2, 1)}"
          rx="${Math.max(clampedRadius - edgeSize, 0)}"
          fill="hsl(0 0% ${effectiveBrightness}% / ${effectiveOpacity})"
          style="filter: blur(${effectiveBlur}px)"
        />
        ${
          isGlassMode
            ? `<rect
                x="${edgeSize * 1.45}"
                y="${edgeSize * 1.2}"
                width="${Math.max(actualWidth - edgeSize * 2.9, 1)}"
                height="${Math.max(actualHeight - edgeSize * 2.4, 1)}"
                rx="${Math.max(clampedRadius - edgeSize * 1.4, 0)}"
                fill="hsl(0 0% ${Math.min(effectiveBrightness + 16, 92)}% / ${Math.min(effectiveOpacity + 0.04, 1)})"
                style="filter: blur(${Math.max(effectiveBlur - 7, 5)}px)"
              />`
            : ""
        }
      </svg>
    `;

    return `data:image/svg+xml,${encodeURIComponent(svgContent)}`;
  }, [
    blueGradId,
    borderRadius,
    borderWidth,
    effectiveBlur,
    effectiveBrightness,
    effectiveOpacity,
    glowGradId,
    isGlassMode,
    mixBlendMode,
    redGradId,
    whiteGradId
  ]);

  const updateDisplacementMap = useCallback(() => {
    if (!useSvgFilter) {
      return;
    }

    const svgMap = generateDisplacementMap();
    feImageRef.current?.setAttribute("href", svgMap);
  }, [generateDisplacementMap, useSvgFilter]);

  useEffect(() => {
    setBackdropSupported(detectBackdropSupport());
    setSvgSupported(refractive ? detectSvgBackdropSupport(filterId) : false);
  }, [filterId, refractive]);

  useEffect(() => {
    if (!useSvgFilter) {
      return;
    }

    updateDisplacementMap();

    [
      { ref: redChannelRef, offset: effectiveRedOffset },
      { ref: greenChannelRef, offset: effectiveGreenOffset },
      { ref: blueChannelRef, offset: effectiveBlueOffset }
    ].forEach(({ ref, offset }) => {
      if (!ref.current) {
        return;
      }

      ref.current.setAttribute("scale", String(effectiveDistortionScale + offset));
      ref.current.setAttribute("xChannelSelector", xChannel);
      ref.current.setAttribute("yChannelSelector", yChannel);
    });

    gaussianBlurRef.current?.setAttribute("stdDeviation", String(effectiveDisplace));
  }, [
    effectiveBlueOffset,
    effectiveDisplace,
    effectiveDistortionScale,
    effectiveGreenOffset,
    effectiveRedOffset,
    updateDisplacementMap,
    useSvgFilter,
    xChannel,
    yChannel
  ]);

  useEffect(() => {
    if (!useSvgFilter || !containerRef.current || typeof ResizeObserver === "undefined") {
      return;
    }

    let frame = 0;
    const resizeObserver = new ResizeObserver(() => {
      cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(updateDisplacementMap);
    });

    resizeObserver.observe(containerRef.current);

    return () => {
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
    };
  }, [updateDisplacementMap, useSvgFilter]);

  useEffect(() => {
    if (!useSvgFilter) {
      return;
    }

    const frame = window.requestAnimationFrame(updateDisplacementMap);
    return () => cancelAnimationFrame(frame);
  }, [height, updateDisplacementMap, useSvgFilter, width]);

  const resolvedBackgroundOpacity =
    backgroundOpacity > 0
      ? backgroundOpacity
      : isGlassMode
        ? isDarkMode
          ? 0.24
          : 0.24
        : isDarkMode
          ? 0.1
          : 0.18;

  const containerStyles: GlassStyle = {
    ...style,
    width: typeof width === "number" ? `${width}px` : width,
    height: typeof height === "number" ? `${height}px` : height,
    borderRadius: `${borderRadius}px`,
    "--glass-frost": resolvedBackgroundOpacity,
    "--glass-saturation": effectiveSaturation
  };

  if (!isGlassMode) {
    containerStyles.background = isDarkMode
      ? "linear-gradient(180deg, rgba(9, 10, 14, 0.9), rgba(0, 0, 0, 0.84))"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.92), rgba(244, 248, 255, 0.82))";
    containerStyles.border = isDarkMode
      ? "1px solid rgba(255,255,255,0.1)"
      : "1px solid rgba(226,232,240,0.88)";
    containerStyles.boxShadow = isDarkMode
      ? "0 18px 42px rgba(2, 6, 23, 0.28), 0 1px 0 rgba(255,255,255,0.05) inset"
      : "0 16px 38px rgba(148, 163, 184, 0.16), 0 1px 0 rgba(255,255,255,0.78) inset";
  } else if (useSvgFilter) {
    containerStyles.background = isDarkMode
      ? `linear-gradient(180deg, rgba(255,255,255,${Math.min(resolvedBackgroundOpacity * 0.28, 0.045)}), rgba(255,255,255,${Math.min(resolvedBackgroundOpacity * 0.12, 0.018)})), linear-gradient(135deg, rgba(8, 12, 22, 0.54), rgba(0, 0, 0, 0.68))`
      : `linear-gradient(180deg, hsl(0 0% 100% / ${Math.min(resolvedBackgroundOpacity + 0.14, 0.34)}), hsl(214 60% 98% / ${Math.min(resolvedBackgroundOpacity + 0.04, 0.22)}))`;
    containerStyles.backdropFilter = isDarkMode
      ? `url(#${filterId}) blur(8px) saturate(1.04) brightness(0.81) contrast(1.09)`
      : `url(#${filterId}) blur(7px) saturate(${Math.min(effectiveSaturation, 1.34)}) brightness(1.05)`;
    containerStyles.WebkitBackdropFilter = containerStyles.backdropFilter;
    containerStyles.border = isDarkMode
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(255,255,255,0.42)";
    containerStyles.boxShadow = isDarkMode
      ? `0 0 0 1px rgba(255,255,255,0.05) inset,
         0 1px 0 rgba(255,255,255,0.045) inset,
         0 -1px 0 rgba(255,255,255,0.018) inset,
         0 18px 44px rgba(2, 6, 23, 0.34)`
      : `0 0 0 1px rgba(255,255,255,0.16) inset,
         0 1px 0 rgba(255,255,255,0.62) inset,
         0 -1px 0 rgba(255,255,255,0.18) inset,
         0 18px 46px rgba(148, 163, 184, 0.14)`;
  } else if (backdropSupported) {
    containerStyles.background = isDarkMode
      ? "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.016)), linear-gradient(135deg, rgba(8,12,22,0.54), rgba(0,0,0,0.68))"
      : "linear-gradient(180deg, rgba(255, 255, 255, 0.62), rgba(241, 247, 255, 0.36))";
    containerStyles.backdropFilter = `blur(${Math.max(effectiveBlur + 5, 15)}px) saturate(${isDarkMode ? 1.04 : Math.max(effectiveSaturation, 1.26)}) brightness(${isDarkMode ? 0.81 : 1.04}) contrast(${isDarkMode ? 1.09 : 1})`;
    containerStyles.WebkitBackdropFilter = containerStyles.backdropFilter;
    containerStyles.border = isDarkMode
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(255,255,255,0.38)";
    containerStyles.boxShadow = isDarkMode
      ? `0 1px 0 rgba(255,255,255,0.045) inset,
         0 -1px 0 rgba(255,255,255,0.018) inset,
         0 18px 42px rgba(2, 6, 23, 0.32)`
      : `0 1px 0 rgba(255,255,255,0.58) inset,
         0 -1px 0 rgba(255,255,255,0.16) inset,
         0 16px 40px rgba(148, 163, 184, 0.14)`;
  } else {
    containerStyles.background = isDarkMode
      ? "rgba(0, 0, 0, 0.88)"
      : "rgba(255, 255, 255, 0.88)";
    containerStyles.border = isDarkMode
      ? "1px solid rgba(255,255,255,0.08)"
      : "1px solid rgba(226,232,240,0.88)";
    containerStyles.boxShadow = isDarkMode
      ? "0 18px 42px rgba(2, 6, 23, 0.28)"
      : "0 14px 34px rgba(148, 163, 184, 0.18)";
  }

  return (
    <div
      ref={containerRef}
      className={cn(
        "relative isolate min-w-0 overflow-hidden transition-[transform,box-shadow,border-color,background-color,opacity] duration-300 ease-out",
        borderGlow && "liquid-border-glow",
        className
      )}
      style={containerStyles}
      onPointerMove={(event) => {
        updateBorderGlow(event);
        onPointerMove?.(event);
      }}
      onPointerEnter={(event) => {
        updateBorderGlow(event);
        onPointerEnter?.(event);
      }}
      onPointerLeave={(event) => {
        resetBorderGlow();
        onPointerLeave?.(event);
      }}
      {...props}
    >
      {useSvgFilter ? (
        <svg
          className="pointer-events-none absolute inset-0 -z-10 h-full w-full opacity-0"
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            <filter
              id={filterId}
              colorInterpolationFilters="sRGB"
              x="-12%"
              y="-12%"
              width="124%"
              height="124%"
            >
              <feImage
                ref={feImageRef}
                x="0"
                y="0"
                width="100%"
                height="100%"
                preserveAspectRatio="none"
                result="map"
              />

              <feDisplacementMap ref={redChannelRef} in="SourceGraphic" in2="map" result="dispRed" />
              <feColorMatrix
                in="dispRed"
                type="matrix"
                values="1 0 0 0 0
                        0 0 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="red"
              />

              <feDisplacementMap ref={greenChannelRef} in="SourceGraphic" in2="map" result="dispGreen" />
              <feColorMatrix
                in="dispGreen"
                type="matrix"
                values="0 0 0 0 0
                        0 1 0 0 0
                        0 0 0 0 0
                        0 0 0 1 0"
                result="green"
              />

              <feDisplacementMap ref={blueChannelRef} in="SourceGraphic" in2="map" result="dispBlue" />
              <feColorMatrix
                in="dispBlue"
                type="matrix"
                values="0 0 0 0 0
                        0 0 0 0 0
                        0 0 1 0 0
                        0 0 0 1 0"
                result="blue"
              />

              <feBlend in="red" in2="green" mode="screen" result="rg" />
              <feBlend in="rg" in2="blue" mode="screen" result="output" />
              <feGaussianBlur ref={gaussianBlurRef} in="output" stdDeviation="0.7" />
            </filter>
          </defs>
        </svg>
      ) : null}

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-0 rounded-[inherit]",
          isGlassMode && isDarkMode
            ? "bg-[radial-gradient(circle_at_18%_12%,rgba(255,255,255,0.028),transparent_30%),radial-gradient(circle_at_86%_10%,rgba(186,230,253,0.02),transparent_24%),linear-gradient(180deg,rgba(255,255,255,0.027),rgba(255,255,255,0.007)_45%,rgba(0,0,0,0.12))]"
            : isGlassMode
              ? "bg-[radial-gradient(circle_at_14%_12%,rgba(255,255,255,0.41),transparent_32%),radial-gradient(circle_at_85%_8%,rgba(125,211,252,0.098),transparent_24%),radial-gradient(circle_at_28%_120%,rgba(196,181,253,0.076),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.044))]"
              : isDarkMode
                ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.01))]"
                : "bg-[linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.1))]"
        )}
      />

      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute inset-px rounded-[inherit]",
          isGlassMode && isDarkMode
            ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.032),rgba(255,255,255,0.012)_28%,rgba(255,255,255,0.004)_68%,rgba(0,0,0,0.14))]"
            : isGlassMode
              ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.36),rgba(255,255,255,0.12)_30%,transparent_70%)]"
              : isDarkMode
                ? "bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_28%,transparent_68%)]"
                : "bg-[linear-gradient(180deg,rgba(255,255,255,0.76),rgba(255,255,255,0.22)_34%,transparent_72%)]"
        )}
      />

      {isGlassMode ? (
        <div
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[inherit] mix-blend-screen opacity-55",
            isDarkMode
              ? "bg-[radial-gradient(circle_at_14%_10%,rgba(255,255,255,0.025),transparent_22%),radial-gradient(circle_at_86%_12%,rgba(186,230,253,0.018),transparent_20%),radial-gradient(circle_at_50%_100%,rgba(255,255,255,0.01),transparent_30%)]"
              : "bg-[radial-gradient(circle_at_12%_8%,rgba(255,255,255,0.28),transparent_24%),radial-gradient(circle_at_86%_12%,rgba(125,211,252,0.08),transparent_22%),radial-gradient(circle_at_48%_104%,rgba(251,191,36,0.035),transparent_30%)]"
          )}
        />
      ) : null}

      <div className={cn("relative z-10 h-full min-w-0 rounded-[inherit]", innerClassName)}>
        {children}
      </div>
    </div>
  );
}

export default GlassSurface;

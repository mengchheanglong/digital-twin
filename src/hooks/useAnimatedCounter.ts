"use client";

import { useEffect, useRef, useState } from "react";

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

export interface AnimatedCounterOptions {
  duration?: number;
  startFrom?: number;
  easing?: "easeOutCubic" | "easeOutBack";
  decimals?: number;
}

export function useAnimatedCounter(
  target: number,
  options: AnimatedCounterOptions = {}
): number {
  const { duration = 900, startFrom = 0, easing = "easeOutCubic", decimals = 0 } = options;
  const [current, setCurrent] = useState(startFrom);
  const rafRef = useRef<number | null>(null);
  const startTimeRef = useRef<number | null>(null);
  const easingFn = easing === "easeOutBack" ? easeOutBack : easeOutCubic;

  useEffect(() => {
    const startVal = startFrom;
    startTimeRef.current = null;

    const animate = (timestamp: number) => {
      if (startTimeRef.current === null) startTimeRef.current = timestamp;
      const elapsed = timestamp - startTimeRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const easedProgress = easingFn(progress);
      const factor = Math.pow(10, decimals);
      const value = Math.round((startVal + (target - startVal) * easedProgress) * factor) / factor;
      setCurrent(value);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration, startFrom, easing, decimals]);

  return current;
}

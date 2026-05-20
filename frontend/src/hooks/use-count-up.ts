'use client';

import { useEffect, useState } from 'react';

// Easing function: easeOutExpo
function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t);
}

export function useCountUp(
  target: number,
  duration: number = 1000,
  enabled: boolean = true
): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!enabled) {
      setCount(target);
      return;
    }

    let startTimestamp: number | null = null;
    const startValue = 0;
    const endValue = target;

    if (startValue === endValue) {
      setCount(endValue);
      return;
    }

    let animationFrameId: number;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);
      const easedProgress = easeOutExpo(progress);
      
      const currentValue = startValue + easedProgress * (endValue - startValue);
      setCount(Math.round(currentValue));

      if (progress < 1) {
        animationFrameId = requestAnimationFrame(step);
      } else {
        setCount(endValue);
      }
    };

    animationFrameId = requestAnimationFrame(step);

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [target, duration, enabled]);

  return count;
}

import { useState, useEffect, useRef } from 'react';
import { useVehicleStore } from '../store/useVehicleStore';

const DURATION = 100; // Animation duration should be close to the data update interval

export const useAnimatedValue = (targetValue: number, config: { duration?: number } = {}) => {
  const { duration = DURATION } = config;
  const isGaugeSweeping = useVehicleStore(state => state.isGaugeSweeping);
  const [currentValue, setCurrentValue] = useState(targetValue);
  const animationFrameRef = useRef<number | undefined>(undefined);
  const startTimeRef = useRef<number | undefined>(undefined);
  const startValueRef = useRef<number | undefined>(undefined);

  useEffect(() => {
    // If a gauge sweep is active, this hook should not perform its own animation.
    // Instead, it should immediately snap to the target value, which is being
    // animated by the `useSweepValue` hook. This prevents the two animations
    // from fighting each other and causing erratic, jerky movement.
    if (isGaugeSweeping) {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      setCurrentValue(targetValue);
      return; // Bypass the smoothing animation
    }

    const startAnimation = () => {
      startTimeRef.current = performance.now();
      startValueRef.current = currentValue;

      const animate = (now: number) => {
        const elapsed = now - (startTimeRef.current ?? now);
        const progress = Math.min(elapsed / duration, 1);
        
        // Ease-out cubic for a nice deceleration effect
        const easedProgress = 1 - Math.pow(1 - progress, 3); 

        const nextValue = (startValueRef.current ?? 0) + (targetValue - (startValueRef.current ?? 0)) * easedProgress;
        setCurrentValue(nextValue);

        if (progress < 1) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    // Only start a new animation if the value has changed significantly
    if (Math.abs(targetValue - currentValue) > 0.01) {
      startAnimation();
    } else {
      // Snap to the target value if it's close enough
      setCurrentValue(targetValue);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [targetValue, duration, isGaugeSweeping]);

  // On initial mount, set the value directly without animation
  useEffect(() => {
    setCurrentValue(targetValue);
  }, []);


  return currentValue;
};

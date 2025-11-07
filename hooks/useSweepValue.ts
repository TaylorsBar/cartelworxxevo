import { useState, useEffect, useRef } from 'react';
import { useVehicleStore } from '../store/useVehicleStore';

const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);

export const useSweepValue = (realValue: number | undefined, min: number, max: number) => {
  const { isGaugeSweeping, triggerGaugeSweep } = useVehicleStore(state => ({ 
    isGaugeSweeping: state.isGaugeSweeping,
    triggerGaugeSweep: state.triggerGaugeSweep
  }));
  const [displayValue, setDisplayValue] = useState(realValue ?? min);
  const animationRef = useRef<number | undefined>();

  useEffect(() => {
    triggerGaugeSweep();
  }, []);

  useEffect(() => {
    if (!isGaugeSweeping) {
      setDisplayValue(realValue ?? min);
    }
  }, [realValue, isGaugeSweeping, min]);

  useEffect(() => {
    if (isGaugeSweeping) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);

      let startTime: number | undefined;
      const sweepUpDuration = 800;
      const sweepDownDuration = 600;

      const animateUp = (timestamp: number) => {
        if (startTime === undefined) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / sweepUpDuration, 1);
        const easedProgress = easeOutCubic(progress);

        setDisplayValue(min + (max - min) * easedProgress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateUp);
        } else {
          startTime = undefined; 
          animationRef.current = requestAnimationFrame(animateDown);
        }
      };
      
      const animateDown = (timestamp: number) => {
        if (startTime === undefined) startTime = timestamp;
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / sweepDownDuration, 1);
        const easedProgress = easeOutCubic(progress);
        
        const finalValue = realValue ?? min;
        setDisplayValue(max - (max - finalValue) * easedProgress);

        if (progress < 1) {
          animationRef.current = requestAnimationFrame(animateDown);
        } else {
          setDisplayValue(finalValue); 
        }
      };
      
      animationRef.current = requestAnimationFrame(animateUp);
    }
    
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    }
  }, [isGaugeSweeping, min, max, realValue, triggerGaugeSweep]);

  return displayValue;
};


import React from 'react';

interface ModernDigitalReadoutProps {
  label: string;
  value: string;
  className?: string;
  valueClassName?: string;
  labelClassName?: string;
}

const ModernDigitalReadout: React.FC<ModernDigitalReadoutProps> = ({ label, value, className = '', valueClassName = '', labelClassName = '' }) => {
  return (
    <div className={`text-center font-display uppercase ${className}`}>
      <div 
        className={`font-bold text-[var(--theme-accent-primary)] ${valueClassName}`}
        style={{ textShadow: '0 0 10px var(--theme-glow-color), 0 0 20px var(--theme-glow-color)' }}
      >
        {value}
      </div>
      <div className={`text-gray-400 tracking-[0.2em] ${labelClassName}`}>
        {label}
      </div>
    </div>
  );
};

export default ModernDigitalReadout;
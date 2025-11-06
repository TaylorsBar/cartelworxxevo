// This file is repurposed to create a reusable GlassCard component
// for the new UI/UX redesign, as new file creation is not permitted.

import React from 'react';

interface GlassCardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

const GlassCard: React.FC<GlassCardProps> = ({ children, className = '', onClick }) => {
  return (
    <div 
        className={`glass-panel rounded-2xl transition-all duration-300 ${className}`}
        onClick={onClick}
    >
      {children}
    </div>
  );
};

export default GlassCard;

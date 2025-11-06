
import React from 'react';

interface InfoPanelProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

const InfoPanel: React.FC<InfoPanelProps> = ({ title, children, className }) => {
  return (
    <div className={`glass-panel h-full w-full p-4 flex flex-col ${className}`}>
      <h3 
        className="font-sans text-sm font-bold uppercase tracking-widest text-left text-[var(--theme-text-secondary)]"
        style={{ textShadow: '0 0 5px rgba(255,255,255,0.5)' }}
      >
          {title}
      </h3>
      <div className="flex-grow relative">
        {children}
      </div>
    </div>
  );
};

export default InfoPanel;
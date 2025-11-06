import React from 'react';

const StartupOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center animate-startup-fade-out">
            <style>{`
                @keyframes startup-fade-out {
                    0%, 80% { opacity: 1; }
                    100% { opacity: 0; pointer-events: none; }
                }
                .animate-startup-fade-out {
                    animation: startup-fade-out 5s ease-in-out forwards;
                }

                @keyframes logo-reveal {
                    0% { opacity: 0; filter: blur(12px) brightness(2); transform: scale(1.1); }
                    20% { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); }
                    80% { opacity: 1; filter: blur(0) brightness(1); transform: scale(1); }
                    100% { opacity: 0; filter: blur(12px) brightness(2); transform: scale(0.9); }
                }
                .animate-logo-reveal {
                    animation: logo-reveal 5s ease-in-out forwards;
                }

                @keyframes scan-line {
                    0%, 10%, 100% { top: -10%; }
                    5% { top: 110%; }
                }
                .scan-line-overlay::before {
                    content: '';
                    position: absolute;
                    left: 0; right: 0; height: 3px;
                    background: linear-gradient(to right, transparent, var(--theme-accent-primary), transparent);
                    box-shadow: 0 0 15px 2px var(--theme-accent-primary);
                    opacity: 0.7;
                    animation: scan-line 4.5s cubic-bezier(0.23, 1, 0.32, 1) forwards;
                    animation-delay: 0.2s;
                }
                 .scan-line-overlay::after {
                    content: '';
                    position: absolute;
                    top: 0; left: 0; right: 0; bottom: 0;
                    background-image: linear-gradient(to bottom, transparent 50%, rgba(0,0,0,0.4) 51%);
                    background-size: 100% 4px;
                    opacity: 0.3;
                    animation: flicker 3s infinite;
                 }
                 @keyframes flicker {
                    0%, 100% { opacity: 0.3; }
                    50% { opacity: 0.5; }
                 }

            `}</style>
            <div className="relative w-full max-w-2xl animate-logo-reveal">
                <div className="font-display text-8xl lg:text-9xl text-center whitespace-nowrap">
                    <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-neutral-400 to-white">CARTEL</span>
                    <span className="font-bold tracking-normal text-[var(--theme-accent-primary)]">WORX</span>
                </div>
            </div>
            <div className="absolute inset-0 scan-line-overlay"></div>
        </div>
    );
};

export default StartupOverlay;

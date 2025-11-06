import React from 'react';

const StartupOverlay: React.FC<{ isVisible: boolean }> = ({ isVisible }) => {
    if (!isVisible) return null;

    return (
        <div className="fixed inset-0 bg-black z-[100] flex items-center justify-center animate-startup-sequence">
            <style>{`
                @keyframes startup-sequence {
                    0% { opacity: 1; }
                    80% { opacity: 1; }
                    100% { opacity: 0; pointer-events: none; }
                }
                .animate-startup-sequence {
                    animation: startup-sequence 5s ease-in-out forwards;
                }

                @keyframes logo-animation {
                    0% { opacity: 0; filter: blur(10px) brightness(3); }
                    20% { opacity: 1; filter: blur(0) brightness(1); }
                    70% { opacity: 1; filter: blur(0) brightness(1); }
                    90% { opacity: 0; filter: blur(10px) brightness(3); }
                    100% { opacity: 0; }
                }
                .animate-logo {
                    animation: logo-animation 5s ease-in-out forwards;
                }

                @keyframes glitch-line {
                    0% { transform: translateY(-100%); }
                    10% { transform: translateY(100%); }
                    10.1% { transform: translateY(-100%); }
                    15% { transform: translateY(100%); }
                    15.1% { transform: translateY(-100%); }
                    100% { transform: translateY(-100%); }
                }
                .glitch-overlay::before {
                    content: '';
                    position: absolute;
                    top: 0; left: 2%; right: 2%; height: 3px;
                    background: var(--theme-accent-primary);
                    opacity: 0.5;
                    box-shadow: 0 0 10px var(--theme-accent-primary);
                    animation: glitch-line 4s infinite linear;
                }
            `}</style>
            <div className="relative animate-logo glitch-overlay">
                <div className="font-classic text-8xl whitespace-nowrap">
                    <span className="text-gray-300 tracking-tighter">Cartel</span>
                    <span className="text-[var(--theme-accent-primary)] tracking-normal">Worx</span>
                </div>
            </div>
        </div>
    );
};

export default StartupOverlay;

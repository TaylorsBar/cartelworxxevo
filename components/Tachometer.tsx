import React from 'react';
import { NavLink } from 'react-router-dom';
import GaugeIcon from './icons/GaugeIcon';
import StopwatchIcon from './icons/StopwatchIcon';
import EngineIcon from './icons/EngineIcon';
import ChatIcon from './icons/ChatIcon';
import TuningForkIcon from './icons/TuningForkIcon';

// Primary navigation items for the mobile bottom bar
const mainNav = [
    { name: 'Dashboard', href: '/', icon: GaugeIcon },
    { name: 'Race Pack', href: '/race-pack', icon: StopwatchIcon },
    { name: 'AI Engine', href: '/ai-engine', icon: EngineIcon },
    { name: 'Diagnostics', href: '/diagnostics', icon: ChatIcon },
    { name: 'Tuning', href: '/tuning', icon: TuningForkIcon },
];

const BottomNavBar: React.FC = () => {
    return (
        // The main container is only visible on smaller screens (md:hidden)
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 bg-[var(--glass-bg)] border-t border-[var(--glass-border)] backdrop-blur-lg z-20">
            <div className="grid grid-cols-5 h-full max-w-lg mx-auto">
                {mainNav.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/'}
                        className={({ isActive }) => 
                            `flex flex-col items-center justify-center gap-1 w-full h-full transition-all duration-200 relative ${isActive ? 'text-[var(--theme-accent-primary)]' : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'}`
                        }
                    >
                        {({ isActive }) => (
                            <>
                                <item.icon className="w-7 h-7" />
                                <span className="text-xs font-medium">{item.name}</span>
                                {isActive && (
                                    <div className="absolute top-0 left-1/2 -translate-x-1/2 w-10 h-1 bg-[var(--theme-accent-primary)] rounded-b-full shadow-glow-theme"></div>
                                )}
                            </>
                        )}
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavBar;

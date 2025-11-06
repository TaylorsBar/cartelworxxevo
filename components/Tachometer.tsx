import React from 'react';
import { NavLink } from 'react-router-dom';
import GaugeIcon from './icons/GaugeIcon';
import StopwatchIcon from './icons/StopwatchIcon';
import EngineIcon from './icons/EngineIcon';
import ChatIcon from './icons/ChatIcon';
import TuningForkIcon from './icons/TuningForkIcon';

const mainNav = [
    { name: 'Dashboard', href: '/', icon: GaugeIcon },
    { name: 'Race Pack', href: '/race-pack', icon: StopwatchIcon },
    { name: 'AI Engine', href: '/ai-engine', icon: EngineIcon },
    { name: 'Diagnostics', href: '/diagnostics', icon: ChatIcon },
    { name: 'Tuning', href: '/tuning', icon: TuningForkIcon },
];

const BottomNavBar: React.FC = () => {
    return (
        <nav className="md:hidden fixed bottom-0 left-0 right-0 h-20 glass-panel z-20">
            <div className="flex justify-around items-center h-full">
                {mainNav.map((item) => (
                    <NavLink
                        key={item.name}
                        to={item.href}
                        end={item.href === '/'}
                        className={({ isActive }) => 
                            `flex flex-col items-center justify-center gap-1 w-full h-full transition-colors ${isActive ? 'text-[var(--theme-accent-primary)]' : 'text-gray-400 hover:text-white'}`
                        }
                    >
                        <item.icon className="w-7 h-7" />
                        <span className="text-xs font-medium">{item.name}</span>
                    </NavLink>
                ))}
            </div>
        </nav>
    );
};

export default BottomNavBar;
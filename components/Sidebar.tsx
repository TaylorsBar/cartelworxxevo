import React from 'react';
import { NavLink } from 'react-router-dom';
import GaugeIcon from './icons/GaugeIcon';
import ChatIcon from './icons/ChatIcon';
import WrenchIcon from './icons/WrenchIcon';
import TuningForkIcon from './icons/TuningForkIcon';
import EngineIcon from './icons/EngineIcon';
import ShieldIcon from './icons/ShieldIcon';
import ARIcon from './icons/ARIcon';
import HederaIcon from './icons/HederaIcon';
import StopwatchIcon from './icons/StopwatchIcon';
import PaintBrushIcon from './icons/PaintBrushIcon';
import SoundWaveIcon from './icons/SoundWaveIcon';
import ChevronDoubleLeftIcon from './icons/ChevronDoubleLeftIcon';
import { useVehicleStore } from '../store/useVehicleStore';
import { ConnectionStatus } from '../types';
import BookOpenIcon from './gauges/DigitalDisplay'; // Repurposed for BookOpenIcon

const navigation = [
  { name: 'Dashboard', href: '/', icon: GaugeIcon },
  { name: 'Race Pack', href: '/race-pack', icon: StopwatchIcon },
  { name: 'AI Engine', href: '/ai-engine', icon: EngineIcon },
  { name: 'AR Assistant', href: '/ar-assistant', icon: ARIcon },
  { name: 'Diagnostics', href: '/diagnostics', icon: ChatIcon },
  { name: 'Logbook', href: '/logbook', icon: WrenchIcon },
  { name: 'Tuning', href: '/tuning', icon: TuningForkIcon },
  { name: 'Training', href: '/training', icon: BookOpenIcon },
  { name: 'Accessories', href: '/accessories', icon: SoundWaveIcon },
  { name: 'Appearance', href: '/appearance', icon: PaintBrushIcon },
  { name: 'Security', href: '/security', icon: ShieldIcon },
  { name: 'Hedera DLT', href: '/hedera', icon: HederaIcon },
];

interface SidebarProps {
  isCollapsed: boolean;
  onToggle: () => void;
}

const ConnectionIndicator: React.FC<{ isCollapsed: boolean }> = ({ isCollapsed }) => {
  const connectionStatus = useVehicleStore(state => state.connectionStatus);

  const statusInfo = {
    [ConnectionStatus.CONNECTED]: { color: 'var(--theme-accent-green)', text: 'Connected' },
    [ConnectionStatus.CONNECTING]: { color: 'var(--theme-accent-yellow)', text: 'Connecting' },
    [ConnectionStatus.DISCONNECTED]: { color: 'var(--theme-text-secondary)', text: 'Disconnected' },
    [ConnectionStatus.ERROR]: { color: 'var(--theme-accent-red)', text: 'Error' },
  };

  const { color, text } = statusInfo[connectionStatus];
  const isConnecting = connectionStatus === ConnectionStatus.CONNECTING;

  return (
    <div className={`flex items-center gap-3 p-3 border-t border-transparent ${isCollapsed ? 'justify-center' : 'px-4'}`} title={text}>
      <div style={{ backgroundColor: color }} className='relative w-3 h-3 rounded-full'>
        {isConnecting && <div style={{ backgroundColor: color }} className='absolute -inset-0.5 rounded-full animate-ping'></div>}
      </div>
      {!isCollapsed && <span className="text-sm font-medium text-[var(--theme-text-secondary)] transition-colors duration-300">{text}</span>}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  return (
    <aside className={`hidden md:flex sidebar-glass flex-col z-10 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="relative flex items-center justify-center h-20 overflow-hidden">
         <div className={`absolute transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 scale-90' : 'opacity-100 scale-100'}`}>
          <div className="font-display text-3xl whitespace-nowrap">
            <span className="font-bold tracking-wider text-transparent bg-clip-text bg-gradient-to-r from-neutral-300 to-white">CARTEL</span>
            <span className="font-bold tracking-normal text-[var(--theme-accent-primary)]">WORX</span>
          </div>
        </div>
        <div className={`absolute transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-100 scale-100' : 'opacity-0 scale-90'}`}>
          <div className="font-display text-3xl">
            <span className="font-black tracking-tighter text-transparent bg-clip-text bg-gradient-to-r from-neutral-300 to-white">CW</span>
          </div>
        </div>
      </div>
      
      <nav className="flex-1 p-2 space-y-1">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `group flex items-center p-3 text-sm font-medium rounded-lg translucent-hover ${isCollapsed ? 'justify-center' : ''} ${
                isActive
                  ? 'bg-[var(--theme-accent-primary)]/20 text-[var(--theme-accent-primary)]'
                  : 'text-[var(--theme-text-secondary)] hover:text-[var(--theme-text-primary)]'
              }`
            }
            title={item.name}
          >
            <item.icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
            <span className={`ml-4 whitespace-nowrap overflow-hidden transition-opacity ${isCollapsed ? 'opacity-0' : 'opacity-100'}`}>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <ConnectionIndicator isCollapsed={isCollapsed} />
        <div className="p-2">
          <button
            onClick={onToggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center justify-center w-full p-3 rounded-lg text-[var(--theme-text-secondary)] translucent-hover hover:text-[var(--theme-text-primary)]"
          >
            <ChevronDoubleLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;

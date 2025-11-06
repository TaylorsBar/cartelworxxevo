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
import BookOpenIcon from './tachometers/Tachometer'; // Repurposed for BookOpenIcon

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
    [ConnectionStatus.CONNECTED]: { color: 'bg-[var(--theme-accent-green)]', text: 'Connected' },
    [ConnectionStatus.CONNECTING]: { color: 'bg-[var(--theme-accent-yellow)]', text: 'Connecting' },
    [ConnectionStatus.DISCONNECTED]: { color: 'bg-gray-500', text: 'Disconnected' },
    [ConnectionStatus.ERROR]: { color: 'bg-[var(--theme-accent-red)]', text: 'Error' },
  };

  const { color, text } = statusInfo[connectionStatus];
  const isConnecting = connectionStatus === ConnectionStatus.CONNECTING;

  return (
    <div className={`flex items-center gap-3 p-2 border-t border-[var(--glass-border)] ${isCollapsed ? 'justify-center' : 'px-4'}`} title={text}>
      <div className={`relative w-3 h-3 rounded-full ${color}`}>
        {isConnecting && <div className={`absolute inset-0 rounded-full ${color} animate-ping`}></div>}
      </div>
      {!isCollapsed && <span className="text-sm text-gray-300">{text}</span>}
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ isCollapsed, onToggle }) => {
  return (
    <div className={`glass-panel rounded-2xl flex flex-col z-10 transition-all duration-300 ease-in-out ${isCollapsed ? 'w-20' : 'w-64'}`}>
      <div className="relative flex items-center justify-center h-24 py-4 border-b border-[var(--glass-border)] overflow-hidden">
        {/* Expanded Logo */}
        <div className={`absolute transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-0 -translate-x-4' : 'opacity-100 translate-x-0'}`}>
          <div className="font-classic text-4xl whitespace-nowrap">
            <span className="text-gray-300 tracking-tighter">Cartel</span>
            <span className="text-[var(--theme-accent-primary)] tracking-normal">Worx</span>
          </div>
        </div>
        {/* Collapsed Logo */}
        <div className={`absolute transition-all duration-300 ease-in-out ${isCollapsed ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}>
          <div className="font-classic text-4xl">
            <span className="text-gray-300 tracking-tighter">C</span>
            <span className="text-[var(--theme-accent-primary)] tracking-normal">W</span>
          </div>
        </div>
      </div>
      <nav className={`flex-1 py-4 space-y-2 transition-all duration-300 ${isCollapsed ? 'px-2' : 'px-4'}`}>
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            end={item.href === '/'}
            className={({ isActive }) =>
              `group relative flex items-center py-3 text-sm font-medium transition-all duration-200 ease-in-out btn-neumorphic ${isCollapsed ? 'px-3 justify-center' : 'px-4'} ${
                isActive
                  ? 'btn-neumorphic-active'
                  : ''
              }`
            }
            title={item.name}
          >
            <item.icon className="h-6 w-6 flex-shrink-0" aria-hidden="true" />
            <span className={`ml-3 whitespace-nowrap overflow-hidden transition-all duration-200 ${isCollapsed ? 'max-w-0 opacity-0' : 'max-w-full opacity-100'}`}>{item.name}</span>
            {isCollapsed && <span className="absolute left-full ml-4 px-2 py-1 text-xs bg-base-900 border border-base-700 rounded-md opacity-0 group-hover:opacity-100 whitespace-nowrap">{item.name}</span>}
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto">
        <ConnectionIndicator isCollapsed={isCollapsed} />
        <div className="p-2">
            <button
            onClick={onToggle}
            aria-label={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex items-center justify-center w-full p-3 text-gray-400 rounded-xl hover:bg-[var(--neumorphic-shadow-light)] hover:text-white"
            >
            <ChevronDoubleLeftIcon className={`w-6 h-6 transition-transform duration-300 ${isCollapsed ? 'rotate-180' : ''}`} />
            </button>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
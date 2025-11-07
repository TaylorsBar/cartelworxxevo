
import React, { useState, useEffect, lazy, Suspense } from 'react';
import { HashRouter, Routes, Route } from 'react-router-dom';
import Sidebar from './components/Sidebar';
import { AppearanceProvider } from './contexts/AppearanceContext';
import CoPilot from './components/CoPilot';
import { useVehicleStore } from './store/useVehicleStore';
import { ConnectionStatus } from './types';
import StartupOverlay from './components/StartupOverlay';
import BottomNavBar from './components/Tachometer'; // Repurposed for BottomNavBar
import LoadingSpinner from './components/LoadingSpinner';

// Lazy-loaded components
const Dashboard = lazy(() => import('./pages/Dashboard'));
const Diagnostics = lazy(() => import('./pages/Diagnostics'));
const MaintenanceLog = lazy(() => import('./pages/MaintenanceLog'));
const TuningPage = lazy(() => import('./pages/TuningPage'));
const AIEngine = lazy(() => import('./pages/AIEngine'));
const Security = lazy(() => import('./pages/Security'));
const ARAssistant = lazy(() => import('./pages/ARAssistant'));
const Hedera = lazy(() => import('./pages/Hedera'));
const Appearance = lazy(() => import('./pages/Appearance'));
const Accessories = lazy(() => import('./pages/Accessories'));
const RacePack = lazy(() => import('./pages/RacePack'));
const Training = lazy(() => import('./pages/LiveTuning'));

const App: React.FC = () => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const { connectionStatus, triggerGaugeSweep } = useVehicleStore(state => ({
    connectionStatus: state.connectionStatus,
    triggerGaugeSweep: state.triggerGaugeSweep,
  }));
  const [isStartingUp, setIsStartingUp] = useState(true);

  useEffect(() => {
    const sequenceTimer = setTimeout(() => {
      triggerGaugeSweep();
    }, 3500);

    const finalTimer = setTimeout(() => {
      setIsStartingUp(false);
    }, 5000);

    return () => {
      clearTimeout(sequenceTimer);
      clearTimeout(finalTimer);
    };
  }, [triggerGaugeSweep]);

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => !prev);
  };

  const mainFrameClasses = () => {
    switch (connectionStatus) {
      case ConnectionStatus.CONNECTED:
        return 'border-brand-cyan shadow-glow-theme';
      case ConnectionStatus.CONNECTING:
        return 'border-brand-yellow shadow-glow-yellow animate-pulse';
      case ConnectionStatus.ERROR:
        return 'border-brand-red shadow-glow-red';
      case ConnectionStatus.DISCONNECTED:
      default:
        return 'border-base-800 shadow-none';
    }
  };

  return (
    <AppearanceProvider>
      <HashRouter>
        <StartupOverlay isVisible={isStartingUp} />
        <div className="h-screen bg-black text-gray-200 antialiased">
          <div className="flex h-full md:gap-4 md:p-4">
            <Sidebar isCollapsed={isSidebarCollapsed} onToggle={handleToggleSidebar} />
            <div className="flex-1 flex flex-col overflow-hidden relative">
              <main className={`flex-1 overflow-hidden rounded-main theme-background border-2 transition-all duration-500 ${mainFrameClasses()}`}>
                <div className="h-full w-full bg-black/30 overflow-y-auto pb-20 md:pb-0">
                  <Suspense fallback={<LoadingSpinner />}>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/diagnostics" element={<Diagnostics />} />
                      <Route path="/logbook" element={<MaintenanceLog />} />
                      <Route path="/tuning" element={<TuningPage />} />
                      <Route path="/ai-engine" element={<AIEngine />} />
                      <Route path="/ar-assistant" element={<ARAssistant />} />
                      <Route path="/security" element={<Security />} />
                      <Route path="/hedera" element={<Hedera />} />
                      <Route path="/race-pack" element={<RacePack />} />
                      <Route path="/accessories" element={<Accessories />} />
                      <Route path="/appearance" element={<Appearance />} />
                      <Route path="/training" element={<Training />} />
                    </Routes>
                  </Suspense>
                </div>
              </main>
              <CoPilot />
            </div>
          </div>
          <BottomNavBar />
        </div>
      </HashRouter>
    </AppearanceProvider>
  );
};

export default App;

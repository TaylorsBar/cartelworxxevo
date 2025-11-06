

import React, { useContext } from 'react';
import { AppearanceContext } from '../contexts/AppearanceContext';
import RallyThemeDashboard from './dashboards/RallyThemeDashboard';
import ModernGaugeDashboard from './dashboards/ModernGaugeDashboard';
import ClassicThemeDashboard from './dashboards/ClassicThemeDashboard';
import HaltechDashboard from './dashboards/HaltechDashboard';
import MinimalistDashboard from './dashboards/MinimalistDashboard';
import Ic7Dashboard from './dashboards/Ic7Dashboard';

const Dashboard: React.FC = () => {
  const { theme } = useContext(AppearanceContext);

  const renderDashboard = () => {
    switch (theme) {
      case 'modern':
        return <ModernGaugeDashboard />;
      case 'classic':
        return <ClassicThemeDashboard />;
      case 'haltech':
        return <HaltechDashboard />;
      case 'minimalist':
        return <MinimalistDashboard />;
      case 'ic7':
        return <Ic7Dashboard />;
      case 'rally':
      default:
        return <RallyThemeDashboard />;
    }
  };

  return (
    <div className="h-full w-full">
      {renderDashboard()}
    </div>
  );
};

export default Dashboard;
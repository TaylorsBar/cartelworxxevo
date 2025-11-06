
import React from 'react';
import { Link } from 'react-router-dom';
import LockClosedIcon from './gauges/BarMeter';

interface FeatureLockProps {
  featureName: string;
  moduleName: string;
  level: number;
}

const FeatureLock: React.FC<FeatureLockProps> = ({ featureName, moduleName, level }) => (
  <div className="h-full w-full flex items-center justify-center p-8 text-center bg-black/30 rounded-lg">
    <div className="animate-fade-in">
      <LockClosedIcon className="w-16 h-16 mx-auto text-gray-500" />
      <h3 className="mt-4 text-xl font-bold font-display text-white">Unlock: {featureName}</h3>
      <p className="mt-2 text-gray-400 max-w-sm mx-auto">
        Complete the "Level {level}: {moduleName}" training module to access this feature.
      </p>
      <Link to="/training" className="btn btn-primary mt-6">
        Go to Training Center
      </Link>
    </div>
  </div>
);

export default FeatureLock;
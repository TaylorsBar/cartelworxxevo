

import React from 'react';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useUnitConversion } from '../../hooks/useUnitConversion';
import ClassicGauge from '../../components/gauges/ClassicGauge';

const ClassicThemeDashboard: React.FC = () => {
  const latestData = useVehicleStore(state => state.latestData);
  const { convertSpeed, getSpeedUnit, unitSystem } = useUnitConversion();
  const d = latestData;

  const speedConfig = unitSystem === 'imperial'
    ? { max: 180, unit: 'mph', warn: 150, red: 170 }
    : { max: 280, unit: 'km/h', warn: 245, red: 270 };

  // Invert fuelUsed to get fuelLevel
  const fuelLevel = Math.max(0, 100 - d.fuelUsed);

  return (
    <div className="flex h-full w-full items-center justify-center p-4 md:p-8">
      <div 
        className="w-full max-h-full aspect-square md:aspect-video rounded-2xl p-6 shadow-2xl flex flex-col items-center justify-center gap-6"
        style={{
          boxShadow: 'inset 0 0 30px rgba(0,0,0,0.8), 0 10px 30px rgba(0,0,0,0.5)',
        }}
      >
        <div className="w-full flex-grow flex items-center justify-center gap-6">
          <div className="w-1/2 h-full">
            <ClassicGauge
              label="RPM"
              value={d.rpm}
              min={0}
              max={8000}
              unit="x1000"
              size="large"
              warningValue={6000}
              redlineValue={7000}
            />
          </div>
           <div className="w-1/2 h-full">
            <ClassicGauge
              label="Speed"
              value={convertSpeed(d.speed)}
              min={0}
              max={speedConfig.max}
              unit={speedConfig.unit}
              size="large"
              warningValue={speedConfig.warn}
              redlineValue={speedConfig.red}
            />
          </div>
        </div>
        <div className="w-full flex-shrink-0 flex justify-center items-center gap-6 px-8">
            <div className="w-1/4 h-full">
                <ClassicGauge label="Fuel" value={fuelLevel} min={0} max={100} unit="%" size="small" dangerZone="low" redlineValue={15} warningValue={30} />
            </div>
             <div className="w-1/4 h-full">
                <ClassicGauge label="Oil Press" value={d.oilPressure * 14.5} min={0} max={100} unit="PSI" size="small" dangerZone="low" redlineValue={20} warningValue={35} />
            </div>
             <div className="w-1/4 h-full">
                <ClassicGauge label="Water Temp" value={d.engineTemp} min={40} max={120} unit="°C" size="small" coldZoneEndValue={60} warningValue={100} redlineValue={110} />
            </div>
             <div className="w-1/4 h-full">
                <ClassicGauge label="Voltage" value={d.batteryVoltage} min={10} max={16} unit="V" size="small" warningValue={12} redlineValue={15} />
            </div>
        </div>
      </div>
    </div>
  );
};

export default ClassicThemeDashboard;
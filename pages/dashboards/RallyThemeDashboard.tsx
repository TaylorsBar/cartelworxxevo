
import React from 'react';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useUnitConversion } from '../../hooks/useUnitConversion';
import CarbonTachometer from '../../components/tachometers/CarbonTachometer'; // Repurposed for the default gauge
import DataCard from '../../components/StatCard'; // Repurposed for data readouts

const RallyThemeDashboard: React.FC = () => {
    const latestData = useVehicleStore(state => state.latestData);
    const { convertSpeed, getSpeedUnit } = useUnitConversion();
    const d = latestData;
    
    // Derived values to match the data points shown in the user's image
    const mapKpa = (d.turboBoost * 100) + 101.3;
    const injectorDuty = Math.min(100, (d.rpm / 8000) * d.engineLoad * 0.9);
    const ignitionAngle = 45 - (d.rpm / 8000 * 0.8 + d.engineLoad / 100 * 0.2) * 40;

    return (
        <div className="h-full w-full p-4 md:p-6 flex items-center justify-center">
            <div className="grid grid-cols-5 w-full max-w-7xl mx-auto items-center gap-8">
                <div className="col-span-1 space-y-6">
                    <DataCard title="MAP" value={mapKpa.toFixed(0)} unit="kPa" max={250}/>
                    <DataCard title="Coolant Temp" value={d.engineTemp.toFixed(0)} unit="°C" max={120} />
                    <DataCard title="Air Temp" value={d.inletAirTemp.toFixed(0)} unit="°C" max={60} />
                    <DataCard title="Injector Duty" value={injectorDuty.toFixed(1)} unit="%" max={100} />
                </div>
                <div className="col-span-3 flex items-center justify-center">
                    <CarbonTachometer 
                        rpm={d.rpm} 
                        speed={convertSpeed(d.speed)}
                        gear={d.gear}
                        speedUnit={getSpeedUnit()}
                    />
                </div>
                <div className="col-span-1 space-y-6">
                    <DataCard title="Ignition Angle" value={ignitionAngle.toFixed(1)} unit="deg" max={50} />
                    <DataCard title="Throttle" value={d.engineLoad.toFixed(0)} unit="%" max={100} />
                    <DataCard title="Dashbatt" value={d.batteryVoltage.toFixed(1)} unit="V" max={16} />
                    <DataCard title="Speed" value={convertSpeed(d.speed).toFixed(0)} unit={getSpeedUnit()} max={280} />
                </div>
            </div>
        </div>
    );
};

export default RallyThemeDashboard;

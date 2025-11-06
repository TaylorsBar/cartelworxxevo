

import React from 'react';
import { useVehicleStore } from '../../store/useVehicleStore';
import { useUnitConversion } from '../../hooks/useUnitConversion';
import Ic7Tachometer from '../../components/dashboards/ic7/Ic7Tachometer';
import Ic7DataReadout from '../../components/dashboards/ic7/Ic7DataReadout';

const RPM_MAX = 8000;

const Ic7Dashboard: React.FC = () => {
    const latestData = useVehicleStore(state => state.latestData);
    const { convertSpeed, getSpeedUnit } = useUnitConversion();

    // Simulate missing sensor data
    const injectorDuty = Math.min(100, (latestData.rpm / RPM_MAX) * latestData.engineLoad * 0.9);
    const ignitionAngle = 45 - (latestData.rpm / RPM_MAX * 0.8 + latestData.engineLoad / 100 * 0.2) * 40;
    const mapKpa = (latestData.turboBoost * 100) + 101.3;

    return (
        <div className="flex flex-col lg:flex-row h-full w-full p-2 lg:p-4 gap-2 lg:gap-4 items-center justify-center">
            
            {/* Left Gauges */}
            <div className="w-full lg:w-1/4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-4 gap-2">
                <Ic7DataReadout 
                    label="MAP" 
                    value={mapKpa} 
                    unit="kPa"
                    min={0}
                    max={300}
                    precision={0}
                    highWarn={220}
                    highDanger={250}
                />
                <Ic7DataReadout 
                    label="Coolant Temp" 
                    value={latestData.engineTemp} 
                    unit="°C"
                    min={40}
                    max={120}
                    precision={0}
                    highWarn={100}
                    highDanger={110}
                />
                <Ic7DataReadout 
                    label="Air Temp" 
                    value={latestData.inletAirTemp} 
                    unit="°C"
                    min={0}
                    max={80}
                    precision={0}
                    highWarn={50}
                    highDanger={60}
                />
                 <Ic7DataReadout 
                    label="Injector Duty" 
                    value={injectorDuty} 
                    unit="%"
                    min={0}
                    max={100}
                    precision={0}
                    highWarn={85}
                    highDanger={95}
                />
            </div>

            {/* Center Tachometer */}
            <div className="w-full lg:w-1/2">
                <Ic7Tachometer
                    rpm={latestData.rpm}
                    speed={convertSpeed(latestData.speed)}
                    gear={latestData.speed > 1 ? latestData.gear : 0}
                    speedUnit={getSpeedUnit()}
                    trip={latestData.distance / 1000} // meters to km/miles (conversion handled in component)
                    // Warnings for indicator lights
                    checkEngine={latestData.hasActiveFault}
                    lowOilPressure={latestData.oilPressure < 1.0 && latestData.rpm > 1200}
                    highCoolantTemp={latestData.engineTemp > 105}
                    lowBattery={latestData.batteryVoltage < 12.0 && latestData.rpm > 500}
                />
            </div>

            {/* Right Gauges */}
            <div className="w-full lg:w-1/4 grid grid-cols-2 lg:grid-cols-1 lg:grid-rows-4 gap-2">
                 <Ic7DataReadout 
                    label="Ignition Angle" 
                    value={ignitionAngle} 
                    unit="deg"
                    min={-10}
                    max={50}
                    precision={0}
                />
                <Ic7DataReadout 
                    label="Throttle" 
                    value={latestData.engineLoad} 
                    unit="%"
                    min={0}
                    max={100}
                    precision={0}
                />
                <Ic7DataReadout 
                    label="DashBatt" 
                    value={latestData.batteryVoltage} 
                    unit="V"
                    min={10}
                    max={16}
                    precision={1}
                    lowWarn={12.2}
                    lowDanger={11.8}
                    highWarn={14.8}
                    highDanger={15.2}
                />
                <Ic7DataReadout 
                    label="Speed" 
                    value={convertSpeed(latestData.speed)} 
                    unit={getSpeedUnit()}
                    min={0}
                    max={300}
                    precision={0}
                />
            </div>
        </div>
    );
};

export default Ic7Dashboard;
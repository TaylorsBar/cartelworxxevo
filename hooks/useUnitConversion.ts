import { useContext } from 'react';
import { AppearanceContext } from '../contexts/AppearanceContext';

const MPH_PER_KPH = 0.621371;

export const useUnitConversion = () => {
  const { unitSystem } = useContext(AppearanceContext);

  const convertSpeed = (speedKph: number) => {
    if (unitSystem === 'imperial') {
      return speedKph * MPH_PER_KPH;
    }
    return speedKph;
  };

  const getSpeedUnit = () => {
    return unitSystem === 'imperial' ? 'mph' : 'km/h';
  };

  const getDistanceUnit = () => {
    return unitSystem === 'imperial' ? 'mi' : 'km';
  };

  return { convertSpeed, getSpeedUnit, getDistanceUnit, unitSystem };
};

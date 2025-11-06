import { SensorDataPoint } from '../types';

type PidParser = (hex: string[]) => Partial<SensorDataPoint> | null;

const pidMap: { [pid: string]: PidParser } = {
  '0C': (hex) => { // Engine RPM
    const [A, B] = hex.map(h => parseInt(h, 16));
    return { rpm: ((A * 256) + B) / 4 };
  },
  '0D': (hex) => { // Vehicle Speed
    const [A] = hex.map(h => parseInt(h, 16));
    return { speed: A };
  },
  '05': (hex) => { // Engine Coolant Temperature
    const [A] = hex.map(h => parseInt(h, 16));
    return { engineTemp: A - 40 };
  },
  '0F': (hex) => { // Intake Air Temperature
    const [A] = hex.map(h => parseInt(h, 16));
    return { inletAirTemp: A - 40 };
  },
  '0B': (hex) => { // Intake Manifold Absolute Pressure
    const [A] = hex.map(h => parseInt(h, 16));
    const kpa = A;
    const bar = kpa / 100;
    const boost = bar - 1.0; // Assuming 1 bar atmospheric pressure
    return { turboBoost: boost };
  },
  '04': (hex) => { // Calculated Engine Load
    const [A] = hex.map(h => parseInt(h, 16));
    return { engineLoad: (A * 100) / 255 };
  },
  '42': (hex) => { // Control Module Voltage
    const [A, B] = hex.map(h => parseInt(h, 16));
    return { batteryVoltage: ((A * 256) + B) / 1000 };
  },
  '0A': (hex) => { // Fuel Pressure
    const [A] = hex.map(h => parseInt(h, 16));
    const kpa = A * 3;
    return { fuelPressure: kpa / 100 }; // Convert to bar
  },
  '2F': (hex) => { // Fuel Tank Level
      const [A] = hex.map(h => parseInt(h, 16));
      const fuelLevel = (A * 100) / 255;
      return { fuelUsed: 100 - fuelLevel }; // Invert for fuelUsed
  },
  '06': (hex) => { // Short term fuel trim Bank 1
    const [A] = hex.map(h => parseInt(h, 16));
    return { shortTermFuelTrim: (A - 128) * 100 / 128 };
  },
  '07': (hex) => { // Long term fuel trim Bank 1
    const [A] = hex.map(h => parseInt(h, 16));
    return { longTermFuelTrim: (A - 128) * 100 / 128 };
  },
  '14': (hex) => { // O2 Sensor Voltage (Bank 1, Sensor 1)
    const [A] = hex.map(h => parseInt(h, 16));
    return { o2SensorVoltage: A / 200 };
  },
};

export const parseOBDResponse = (response: string): Partial<SensorDataPoint> | null => {
  const cleaned = response.replace(/\s/g, '').trim();
  
  if (cleaned.includes('NODATA')) {
    return null;
  }
  
  // A standard successful response starts with '41' (Mode 01 success)
  if (!cleaned.startsWith('41')) {
    return null;
  }

  const pid = cleaned.substring(2, 4).toUpperCase();
  const hexData = cleaned.substring(4).match(/.{1,2}/g) || [];

  const parser = pidMap[pid];
  if (parser) {
    try {
        return parser(hexData);
    } catch (e) {
        console.warn(`Error parsing PID ${pid} with data ${hexData}:`, e);
        return null;
    }
  }
  
  return null;
};

export const parseDTCResponse = (response: string): string[] => {
    const cleaned = response.replace(/\s/g, '').trim();
    // Mode 03 (DTC) response starts with 43.
    if (!cleaned.startsWith('43')) {
        return [];
    }
    
    // The hex data for codes starts after '43' and a byte indicating the number of codes.
    // e.g., 430201020304 -> 2 DTCs (P0102, B0304). We will parse all pairs after the header.
    const hexData = cleaned.substring(4).match(/.{1,2}/g) || [];
    
    const dtcs: string[] = [];
    for (let i = 0; i < hexData.length; i += 2) {
        if (i + 1 >= hexData.length) break; // Not a full pair
        
        const byte1 = hexData[i];
        const byte2 = hexData[i+1];
        if (byte1 === '00' && byte2 === '00') {
            continue; // Ignore padding bytes often at the end
        }
        
        const byte1Val = parseInt(byte1, 16);
        let firstChar = '';
        
        // First 2 bits of byte1 determine the category per SAE J1979 standard
        switch (byte1Val >> 6) {
            case 0b00: firstChar = 'P'; break; // Powertrain
            case 0b01: firstChar = 'C'; break; // Chassis
            case 0b10: firstChar = 'B'; break; // Body
            case 0b11: firstChar = 'U'; break; // Network
        }
        
        // Next 2 bits determine the type (0 for generic, 1-3 for manufacturer-specific)
        const secondChar = (byte1Val >> 4) & 0x03;
        // Last 4 bits of byte1 + byte2 form the rest of the code
        const restOfCode = (byte1Val & 0x0F).toString(16) + byte2;
        
        dtcs.push(`${firstChar}${secondChar}${restOfCode}`.toUpperCase());
    }
    
    return dtcs;
};
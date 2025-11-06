import { create } from 'zustand';
import { SensorDataPoint, TimelineEvent, ConnectionStatus, MaintenanceRecord, AuditLogEntry, HederaRecord, AuditEvent, HederaEventType, DTCInfo } from '../types';
import { obdService } from '../services/obdService';
import { getDTCInfo } from '../services/geminiService';

// --- Constants ---
const MAX_DATA_POINTS = 500;
const RPM_IDLE = 800;

// --- Store State Definition ---
interface VehicleState {
  data: SensorDataPoint[];
  latestData: SensorDataPoint;
  hasActiveFault: boolean;
  timelineEvents: TimelineEvent[];
  connectionStatus: ConnectionStatus;
  isSimulating: boolean;
  isGaugeSweeping: boolean;
  deviceName: string | null;
  errorMessage: string | null;
  maintenanceLog: MaintenanceRecord[];
  auditLog: AuditLogEntry[];
  hederaLog: HederaRecord[];
  isScanningDTCs: boolean;
  dtcResults: DTCInfo[];
  dtcError: string | null;
}

interface VehicleActions {
  setTimelineEvents: (events: TimelineEvent[]) => void;
  triggerGaugeSweep: () => void;
  connectToVehicle: () => void;
  disconnectFromVehicle: () => void;
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'verified' | 'isAiRecommendation' | 'date'>) => void;
  addAuditEvent: (event: AuditEvent, description: string, status?: 'Success' | 'Failure') => void;
  addHederaRecord: (eventType: HederaEventType, summary: string) => void;
  scanForDTCs: () => Promise<void>;
}

// --- LocalStorage Persistence ---
const loadFromStorage = <T>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error loading ${key} from localStorage`, error);
        return defaultValue;
    }
};

const saveToStorage = <T>(key: string, value: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to localStorage`, error);
    }
};

// --- Initial State ---
const generateInitialData = (): SensorDataPoint[] => {
  const data: SensorDataPoint[] = [];
  const now = Date.now();
  for (let i = MAX_DATA_POINTS; i > 0; i--) {
    data.push({
      time: now - i * 20, rpm: RPM_IDLE, speed: 0, gear: 1, fuelUsed: 19.4, inletAirTemp: 25.0, batteryVoltage: 12.7, engineTemp: 90.0, fuelTemp: 20.0, turboBoost: -0.8, fuelPressure: 3.5, oilPressure: 1.5, shortTermFuelTrim: 0, longTermFuelTrim: 1.5, o2SensorVoltage: 0.45, engineLoad: 15, distance: 0, longitudinalGForce: 0, lateralGForce: 0, latitude: -37.88, longitude: 175.55,
    });
  }
  return data;
};

const initialData = generateInitialData();
const initialState: VehicleState = {
  data: initialData,
  latestData: initialData[initialData.length - 1],
  hasActiveFault: false,
  timelineEvents: [],
  connectionStatus: ConnectionStatus.DISCONNECTED,
  isSimulating: true,
  isGaugeSweeping: false,
  deviceName: null,
  errorMessage: null,
  maintenanceLog: loadFromStorage<MaintenanceRecord[]>('cartelworx_maintenance_log', []),
  auditLog: loadFromStorage<AuditLogEntry[]>('cartelworx_audit_log', []),
  hederaLog: loadFromStorage<HederaRecord[]>('cartelworx_hedera_log', []),
  isScanningDTCs: false,
  dtcResults: [],
  dtcError: null,
};

// --- Zustand Store Creation ---
export const useVehicleStore = create<VehicleState & VehicleActions>((set, get) => ({
  ...initialState,
  setTimelineEvents: (events) => set({ timelineEvents: events }),
  triggerGaugeSweep: () => {
    set({ isGaugeSweeping: true });
    // Duration should be long enough for sweep up and down animations
    setTimeout(() => {
      set({ isGaugeSweeping: false });
    }, 1400); 
  },
  connectToVehicle: () => {
    simulationManager.stop();
    set({ isSimulating: false });
    obdService.connect();
    get().addAuditEvent(AuditEvent.DataSync, 'Attempting to connect to vehicle OBD-II adapter.');
  },
  disconnectFromVehicle: () => {
    obdService.disconnect();
    get().addAuditEvent(AuditEvent.DataSync, 'Disconnected from vehicle OBD-II adapter.');
  },
  addMaintenanceRecord: (record) => {
      const newRecord: MaintenanceRecord = {
          ...record,
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          verified: false, // Can be changed later
          isAiRecommendation: false, // User-added records are not AI recommendations
      };
      set(state => {
          const newLog = [newRecord, ...state.maintenanceLog];
          saveToStorage('cartelworx_maintenance_log', newLog);
          get().addAuditEvent(AuditEvent.DataSync, `Maintenance record added: "${record.service}"`);
          get().addHederaRecord(HederaEventType.Maintenance, `Service Added: ${record.service}`);
          return { maintenanceLog: newLog };
      });
  },
  addAuditEvent: (event, description, status: 'Success' | 'Failure' = 'Success') => {
      const newEntry: AuditLogEntry = {
          id: `audit-${Date.now()}`,
          timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
          event,
          description,
          ipAddress: '192.168.1.1 (Local)',
          status,
      };
      set(state => {
          const newLog = [newEntry, ...state.auditLog];
          saveToStorage('cartelworx_audit_log', newLog);
          return { auditLog: newLog };
      });
  },
  addHederaRecord: (eventType, summary) => {
      const newRecord: HederaRecord = {
            id: `hedera-${Date.now()}`,
            timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
            eventType,
            vin: 'JN1AZ00Z9ZT000123', // Mock VIN
            summary,
            hederaTxId: `0.0.12345@${Date.now() / 1000 | 0}.${Math.floor(Math.random() * 1e9)}`,
            dataHash: 'mock-' + Math.random().toString(36).substring(7),
      };
       set(state => {
          const newLog = [newRecord, ...state.hederaLog];
          saveToStorage('cartelworx_hedera_log', newLog);
          return { hederaLog: newLog };
      });
  },
  scanForDTCs: async () => {
    set({ isScanningDTCs: true, dtcError: null, dtcResults: [] });
    get().addAuditEvent(AuditEvent.DiagnosticQuery, 'Started ECU fault code scan.');
    try {
      const codes = await obdService.fetchDTCs();
      if (codes.length === 0) {
        set({
          dtcResults: [{ 
            code: "P0000", 
            description: "No Diagnostic Trouble Codes found in the system.", 
            severity: "Info", 
            possibleCauses: [] 
          }],
        });
        get().addAuditEvent(AuditEvent.DiagnosticQuery, `ECU scan completed. No faults found.`);
      } else {
        const results = await Promise.all(codes.map(code => getDTCInfo(code)));
        set({ dtcResults: results });
        get().addAuditEvent(AuditEvent.DiagnosticQuery, `ECU scan completed. Found codes: ${codes.join(', ')}`);
        if (results.some(r => r.severity === 'Critical')) {
            get().addHederaRecord(HederaEventType.Diagnostic, `Critical DTCs found: ${results.filter(r => r.severity === 'Critical').map(r => r.code).join(', ')}`);
        }
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during scan.";
      set({ dtcError: errorMessage });
      get().addAuditEvent(AuditEvent.DiagnosticQuery, `ECU scan failed: ${errorMessage}`, 'Failure');
    } finally {
      set({ isScanningDTCs: false });
    }
  },
}));

// --- OBD Service Subscription ---
obdService.subscribe(
  (status: ConnectionStatus, deviceName: string | null, error?: string) => {
    useVehicleStore.setState({ 
        connectionStatus: status, 
        deviceName, 
        errorMessage: error || null 
    });

    if (status === ConnectionStatus.CONNECTED) {
        useVehicleStore.getState().addAuditEvent(AuditEvent.DataSync, `Successfully connected to ${deviceName}.`);
    }

    if (status === ConnectionStatus.DISCONNECTED || status === ConnectionStatus.ERROR) {
      if (!useVehicleStore.getState().isSimulating) {
        useVehicleStore.setState({ isSimulating: true });
        simulationManager.start();
      }
    }
  },
  (update: Partial<SensorDataPoint>) => {
    const { isSimulating, data, latestData } = useVehicleStore.getState();
    if (isSimulating || !latestData) return; // Ignore OBD data if simulating or store not ready

    const now = Date.now();
    const mergedData: SensorDataPoint = { ...latestData, ...update, time: now };
    
    const deltaTimeSeconds = (now - latestData.time) / 1000.0;
    if (deltaTimeSeconds > 0) {
      const speedMetersPerSecond = mergedData.speed * (1000 / 3600);
      const prevSpeedMetersPerSecond = latestData.speed * (1000 / 3600);
      mergedData.longitudinalGForce = ((speedMetersPerSecond - prevSpeedMetersPerSecond) / deltaTimeSeconds) / 9.81;
      mergedData.distance = (latestData.distance || 0) + (speedMetersPerSecond * deltaTimeSeconds);
    }

    const updatedData = [...data, mergedData];
    const slicedData = updatedData.length > MAX_DATA_POINTS
      ? updatedData.slice(updatedData.length - MAX_DATA_POINTS)
      : updatedData;
    
    useVehicleStore.setState({ data: slicedData, latestData: mergedData });
  }
);

// --- Simulation Manager ---
const simulationManager = {
  UPDATE_INTERVAL_MS: 100, // Slower interval for less intensive simulation
  RPM_MAX: 8000,
  GEAR_RATIOS: [0, 3.6, 2.1, 1.4, 1.0, 0.8, 0.6],
  
  simState: {
    vehicleState: 0 as number, // 0: Idle, 1: Accelerating, 2: Cruising, 3: Decelerating
    stateTimeout: 0,
    lastUpdate: Date.now(),
    gpsDataRef: null as { latitude: number; longitude: number; speed: number | null } | null,
    watcherId: null as number | null,
    intervalId: null as number | null,
    simGpsAngle: 0, // Vehicle's bearing for simulation
  },

  stop() {
    if (this.simState.intervalId) {
      clearInterval(this.simState.intervalId);
      this.simState.intervalId = null;
    }
    if (this.simState.watcherId && 'geolocation' in navigator) {
      navigator.geolocation.clearWatch(this.simState.watcherId);
      this.simState.watcherId = null;
    }
    // FIX: Clear the GPS data reference to prevent holding onto stale data and fix a memory leak.
    this.simState.gpsDataRef = null;
  },

  start() {
    if (this.simState.intervalId) return;

    if ('geolocation' in navigator && !this.simState.watcherId) {
      this.simState.watcherId = navigator.geolocation.watchPosition(
        (p) => { this.simState.gpsDataRef = { latitude: p.coords.latitude, longitude: p.coords.longitude, speed: p.coords.speed }; },
        () => { this.simState.gpsDataRef = null; },
        { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 }
      );
    }

    this.simState.intervalId = window.setInterval(() => {
      if (!useVehicleStore.getState().isSimulating) {
        this.stop();
        return;
      }
      this.tick();
    }, this.UPDATE_INTERVAL_MS);
  },
  
  tick() {
      const now = Date.now();
      const deltaTimeSeconds = (now - this.simState.lastUpdate) / 1000.0;
      this.simState.lastUpdate = now;

      const { latestData, data } = useVehicleStore.getState();
      let { rpm, speed, gear, longTermFuelTrim, distance, latitude, longitude } = latestData;
      
      const currentGpsData = this.simState.gpsDataRef;

      if (currentGpsData?.speed != null && currentGpsData.speed > 0.5) {
        // Use real GPS data if available and moving
        speed = currentGpsData.speed * 3.6; // m/s to km/h
        latitude = currentGpsData.latitude;
        longitude = currentGpsData.longitude;
        if (speed < 20) gear = 1; else if (speed < 40) gear = 2; else if (speed < 70) gear = 3; else if (speed < 100) gear = 4; else if (speed < 130) gear = 5; else gear = 6;
        rpm = speed > 1 ? RPM_IDLE + (1500 * (gear-1)) + (speed % 30) * 100 : RPM_IDLE;
      } else {
        // Fallback to simulated vehicle behavior
        if (now > this.simState.stateTimeout) {
            this.simState.vehicleState = (this.simState.vehicleState + Math.floor(Math.random() * 2) + 1) % 4;
            this.simState.stateTimeout = now + 3000 + Math.random() * 5000;
        }
        switch (this.simState.vehicleState) {
          case 1: if (rpm > 4500 && gear < 6) { gear++; rpm *= 0.6; } rpm += (this.RPM_MAX / (gear * 15)) * (1 - rpm/this.RPM_MAX) + Math.random() * 50; break;
          case 2: rpm += (2500 - rpm) * 0.05; break;
          case 3: if (rpm < 2000 && gear > 1) { gear--; rpm *= 1.2; } rpm *= 0.98; speed *= 0.96; break;
          default: rpm += (RPM_IDLE - rpm) * 0.1; speed *= 0.98; if (speed < 5) gear = 1; break;
        }
        speed = (rpm / (this.GEAR_RATIOS[gear] * 300)) * (1 - (1/gear)) * 10;
        
        // --- Simulated GPS Path Logic ---
        // Creates a plausible, curved path when real GPS is unavailable
        if (speed > 1 && deltaTimeSeconds > 0) {
            const distanceMovedMeters = (speed * (1000/3600)) * deltaTimeSeconds;
            const earthRadiusMeters = 6371000;
            
            // Gently curve the path over time
            this.simState.simGpsAngle = (this.simState.simGpsAngle + (0.5 * deltaTimeSeconds)) % 360;
            const bearingRad = this.simState.simGpsAngle * Math.PI / 180;
            
            const latRad = latitude * Math.PI / 180;
            const lonRad = longitude * Math.PI / 180;
            const angularDistance = distanceMovedMeters / earthRadiusMeters;

            const newLatRad = Math.asin(Math.sin(latRad) * Math.cos(angularDistance) + Math.cos(latRad) * Math.sin(angularDistance) * Math.cos(bearingRad));
            const newLonRad = lonRad + Math.atan2(Math.sin(bearingRad) * Math.sin(angularDistance) * Math.cos(latRad), Math.cos(angularDistance) - Math.sin(latRad) * Math.sin(newLatRad));
            
            latitude = newLatRad * 180 / Math.PI;
            longitude = newLonRad * 180 / Math.PI;
        }
      }
      
      rpm = Math.max(RPM_IDLE, Math.min(rpm, this.RPM_MAX));
      speed = Math.max(0, Math.min(speed, 280));
      if (speed < 1) { speed = 0; gear = speed > 0.1 ? 1: 0; }

      const timeOfDayEffect = Math.sin(now / 20000);
      const isFaultActive = timeOfDayEffect > 0.7;
      const speedDelta = (speed - latestData.speed) * (1000/3600);
      const longitudinalGForce = deltaTimeSeconds > 0 ? (speedDelta / deltaTimeSeconds) / 9.81 : 0;
      const lateralGForce = (Math.sin(now / 2500) * (speed / 80)) * Math.min(1, rpm / 4000);

      
      const newDataPoint: SensorDataPoint = {
        time: now, rpm, speed, gear,
        fuelUsed: latestData.fuelUsed + (rpm / this.RPM_MAX) * 0.005,
        inletAirTemp: 25 + (speed / 280) * 20,
        batteryVoltage: 13.8 + (rpm > 1000 ? 0.2 : 0) - (Math.random() * 0.1) - (isFaultActive ? 0.5 : 0),
        engineTemp: 90 + (rpm / this.RPM_MAX) * 15 + (isFaultActive ? 5 : 0),
        fuelTemp: 20 + (speed / 280) * 10,
        turboBoost: -0.8 + (rpm / this.RPM_MAX) * 2.8 * (gear / 6),
        fuelPressure: 3.5 + (rpm / this.RPM_MAX) * 2,
        oilPressure: 1.5 + (rpm / this.RPM_MAX) * 5.0 - (isFaultActive ? 0.5 : 0),
        shortTermFuelTrim: 2.0 + (Math.random() - 0.5) * 4 + (isFaultActive ? 5 : 0),
        longTermFuelTrim: Math.min(10, longTermFuelTrim + (isFaultActive ? 0.01 : -0.005)),
        o2SensorVoltage: 0.1 + (0.5 + Math.sin(now / 500) * 0.4),
        engineLoad: 15 + (rpm - RPM_IDLE) / (this.RPM_MAX - RPM_IDLE) * 85,
        distance: distance + (speed * (1000 / 3600)) * deltaTimeSeconds,
        longitudinalGForce,
        lateralGForce,
        latitude,
        longitude,
      };

      const updatedData = [...data, newDataPoint];
      const slicedData = updatedData.length > MAX_DATA_POINTS ? updatedData.slice(updatedData.length - MAX_DATA_POINTS) : updatedData;
      useVehicleStore.setState({ data: slicedData, latestData: newDataPoint, hasActiveFault: isFaultActive });
  }
};

// Start the simulation by default.
simulationManager.start();
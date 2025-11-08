import { create } from 'zustand';
import { SensorDataPoint, TimelineEvent, ConnectionStatus, MaintenanceRecord, AuditLogEntry, HederaRecord, AuditEvent, HederaEventType, DTC, VehicleData, TuningRecord } from '../types';
import { obdService } from '../services/obdService';
import { getDTCInfo } from '../services/geminiService';
import { HederaService } from '../services/hederaService';
import { db, auth } from '../services/firebase'; // Assuming firebase is configured for auth and firestore
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';


const MAX_DATA_POINTS = 500;
const RPM_IDLE = 800;

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
  dtcResults: DTC[];
  dtcError: string | null;
  vehicle: VehicleData | null;
}

interface VehicleActions {
  setTimelineEvents: (events: TimelineEvent[]) => void;
  triggerGaugeSweep: () => void;
  connectToVehicle: () => void;
  disconnectFromVehicle: () => void;
  addMaintenanceRecord: (record: Omit<MaintenanceRecord, 'id' | 'verified' | 'date'>) => Promise<void>;
  addAuditEvent: (event: AuditEvent, description: string, status?: 'Success' | 'Failure') => void;
  addHederaRecord: (record: MaintenanceRecord | TuningRecord, type: 'maintenance' | 'tuning') => Promise<void>;
  scanForDTCs: () => Promise<void>;
  setVehicle: (vehicle: VehicleData) => void;
}

const loadFromStorage = <T,>(key: string, defaultValue: T): T => {
    try {
        const item = localStorage.getItem(key);
        return item ? JSON.parse(item) : defaultValue;
    } catch (error) {
        console.error(`Error loading ${key} from localStorage`, error);
        return defaultValue;
    }
};

const saveToStorage = <T,>(key: string, value: T) => {
    try {
        localStorage.setItem(key, JSON.stringify(value));
    } catch (error) {
        console.error(`Error saving ${key} to localStorage`, error);
    }
};

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
  maintenanceLog: loadFromStorage<MaintenanceRecord[]>('cartelworxx_maintenance_log', []),
  auditLog: loadFromStorage<AuditLogEntry[]>('cartelworx_audit_log', []),
  hederaLog: loadFromStorage<HederaRecord[]>('cartelworx_hedera_log', []),
  isScanningDTCs: false,
  dtcResults: [],
  dtcError: null,
  vehicle: loadFromStorage<VehicleData | null>('cartelworx_vehicle_data', null),
};

export const useVehicleStore = create<VehicleState & VehicleActions>((set, get) => ({
  ...initialState,
  setTimelineEvents: (events) => set({ timelineEvents: events }),
  triggerGaugeSweep: () => {
    set({ isGaugeSweeping: true });
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
    addMaintenanceRecord: async (record) => {
      const newRecord: MaintenanceRecord = {
          ...record,
          id: Date.now().toString(),
          date: new Date().toISOString().split('T')[0],
          verified: false,
          isAiRecommendation: record.isAiRecommendation || false,
      };
      set(state => {
          const newLog = [newRecord, ...state.maintenanceLog];
          saveToStorage('cartelworx_maintenance_log', newLog);
          get().addAuditEvent(AuditEvent.DataSync, `Maintenance record added: "${record.service}"`);
          return { maintenanceLog: newLog };
      });
      await get().addHederaRecord(newRecord, 'maintenance');
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
  addHederaRecord: async (record: MaintenanceRecord | TuningRecord, type: 'maintenance' | 'tuning') => {
    if (!auth.currentUser) {
        get().addAuditEvent('Hedera', 'Failed to log record to Hedera: User not authenticated.', 'Failure');
        return;
    }
    const hederaService = new HederaService();
    try {
        await hederaService.initialize();
        let transactionId: string;
        if (type === 'maintenance') {
            transactionId = await hederaService.logServiceRecord(record as MaintenanceRecord);
        } else {
            transactionId = await hederaService.logECUModification(record as TuningRecord);
        }

        const hederaRecord = { ...record, transactionId };

        set(state => ({
            hederaRecords: [...state.hederaRecords, hederaRecord]
        }));

        // Also save to Firestore for quick access
        await addDoc(collection(db, 'hederaRecords'), {
            ...record,
            transactionId,
            userId: auth.currentUser.uid,
            timestamp: serverTimestamp()
        });
        get().addAuditEvent('Hedera', `Successfully logged ${type} record to Hedera. TxID: ${transactionId}`);

    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.error('Hedera service error:', errorMessage);
        get().addAuditEvent('Hedera', `Failed to log ${type} record to Hedera: ${errorMessage}`, 'Failure');
    }
  },
  scanForDTCs: async () => {
    set({ isScanningDTCs: true, dtcError: null, dtcResults: [] });
    get().addAuditEvent(AuditEvent.DiagnosticQuery, 'Started ECU fault code scan.');
    try {
      const codes = await obdService.readDTC();
      if (codes.length === 0) {
        set({
          dtcResults: [{
            code: "P0000",
            description: "No Diagnostic Trouble Codes found in the system.",
            severity: "Low",
            potentialCauses: [],
            remedy: "",
          }],
        });
        get().addAuditEvent(AuditEvent.DiagnosticQuery, `ECU scan completed. No faults found.`);
      } else {
        const vehicleData = get().vehicle;
        const results = await Promise.all(codes.map(code => getDTCInfo(code.code, vehicleData ?? undefined)));
        set({ dtcResults: results });
        get().addAuditEvent(AuditEvent.DiagnosticQuery, `ECU scan completed. Found codes: ${codes.map(c => c.code).join(', ')}`);
      }
    } catch (e) {
      const errorMessage = e instanceof Error ? e.message : "An unknown error occurred during scan.";
      set({ dtcError: errorMessage });
      get().addAuditEvent(AuditEvent.DiagnosticQuery, `ECU scan failed: ${errorMessage}`, 'Failure');
    } finally {
      set({ isScanningDTCs: false });
    }
  },
  setVehicle: (vehicle: VehicleData) => {
      set({ vehicle });
      saveToStorage('cartelworx_vehicle_data', vehicle);
      get().addAuditEvent(AuditEvent.DataSync, `Vehicle profile set to ${vehicle.year} ${vehicle.make} ${vehicle.model}.`);
  }
}));

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
    if (isSimulating || !latestData) return;

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
      {...}
      useVehicleStore.setState({ data: slicedData, latestData: mergedData });
  }
);

const simulationManager = {
  UPDATE_INTERVAL_MS: 100,
  RPM_MAX: 8000,
  GEAR_RATIOS: [0, 3.6, 2.1, 1.4, 1.0, 0.8, 0.6],
  
  simState: {
    vehicleState: 0 as number, 
    stateTimeout: 0,
    lastUpdate: Date.now(),
    gpsDataRef: null as { latitude: number; longitude: number; speed: number | null } | null,
    watcherId: null as number | null,
    intervalId: null as number | null,
    simGpsAngle: 0, 
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
        speed = currentGpsData.speed * 3.6;
        latitude = currentGpsData.latitude;
        longitude = currentGpsData.longitude;
        if (speed < 20) gear = 1; else if (speed < 40) gear = 2; else if (speed < 70) gear = 3; else if (speed < 100) gear = 4; else if (speed < 130) gear = 5; else gear = 6;
        rpm = speed > 1 ? RPM_IDLE + (1500 * (gear-1)) + (speed % 30) * 100 : RPM_IDLE;
      } else {
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
        
        if (speed > 1 && deltaTimeSeconds > 0) {
            const distanceMovedMeters = (speed * (1000/3600)) * deltaTimeSeconds;
            const earthRadiusMeters = 6371000;
            
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

simulationManager.start();

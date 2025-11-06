import { ConnectionStatus, SensorDataPoint, OemProfile, Did } from '../types';
import { parseOBDResponse, parseDTCResponse } from '../utils/obdParser';

// --- Web Bluetooth Type Definitions (for no-build environments) ---
// By defining these here, we get better type safety and autocompletion
// without needing external `@types/web-bluetooth` which requires a build step.
interface BluetoothDevice extends EventTarget {
  readonly id: string;
  readonly name?: string;
  readonly gatt?: BluetoothRemoteGATTServer;
  watchAdvertisements(options?: unknown): Promise<void>;
}
interface BluetoothRemoteGATTServer {
  readonly device: BluetoothDevice;
  readonly connected: boolean;
  connect(): Promise<BluetoothRemoteGATTServer>;
  disconnect(): void;
  getPrimaryService(service: string): Promise<BluetoothRemoteGATTService>;
}
interface BluetoothRemoteGATTService {
  readonly device: BluetoothDevice;
  readonly uuid: string;
  getCharacteristic(characteristic: string): Promise<BluetoothRemoteGATTCharacteristic>;
  getCharacteristics(): Promise<BluetoothRemoteGATTCharacteristic[]>;
}
interface BluetoothRemoteGATTCharacteristic extends EventTarget {
  readonly service: BluetoothRemoteGATTService;
  readonly uuid: string;
  readonly value?: DataView;
  properties: {
      readonly broadcast: boolean;
      readonly read: boolean;
      readonly writeWithoutResponse: boolean;
      readonly write: boolean;
      readonly notify: boolean;
      readonly indicate: boolean;
      readonly authenticatedSignedWrites: boolean;
  };
  startNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  stopNotifications(): Promise<BluetoothRemoteGATTCharacteristic>;
  writeValue(value: BufferSource): Promise<void>;
}

// --- Constants ---
const ELM327_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb';
enum CommState { IDLE, POLLING, COMMAND_MODE }

// --- Callbacks ---
type StatusCallback = (status: ConnectionStatus, deviceName: string | null, error?: string) => void;
type DataCallback = (data: Partial<SensorDataPoint>) => void;

export const MOCK_OEM_PROFILES: OemProfile[] = [
    {
        oem: 'Toyota/Lexus',
        ecus: {
            ecm: { req_id: '0x7E0', resp_id: '0x7E8' },
            tcm: { req_id: '0x7E1', resp_id: '0x7E9' },
        },
        dids: {
            vin: { id: '0xF190', desc: 'VIN', decode: 'ascii', unit: 'string' },
            calibration_id: { id: '0xF187', desc: 'Calibration ID', decode: 'ascii', unit: 'string' },
            oil_temp: { id: '0x2137', desc: 'ATF/Oil Temperature', decode: 'u8', unit: '°C' },
            steering_angle: { id: '0x0250', desc: 'Steering Angle', decode: 's16', unit: 'deg' },
            boost_pressure: { id: '0x2101', desc: 'Manifold Pressure', decode: 'u16', unit: 'kPa' },
        }
    },
    {
        oem: 'BMW/Mini',
        ecus: {
            dme: { req_id: '0x7E0', resp_id: '0x7E8' },
        },
        dids: {
            vin: { id: '0xF190', desc: 'VIN', decode: 'ascii', unit: 'string' },
            sw_version: { id: '0xF188', desc: 'Software Version', decode: 'ascii', unit: 'string' },
            oil_temp: { id: '0x0B30', desc: 'Engine Oil Temperature', decode: 'u8', unit: '°C' },
            boost_pressure: { id: '0x0B31', desc: 'Boost Pressure', decode: 'u16', unit: 'kPa' },
            gear: { id: '0x0B40', desc: 'Current Gear', decode: 'u8', unit: 'raw' },
        }
    },
    {
        oem: 'Ford/Mazda',
        ecus: {
            pcm: { req_id: '0x7E0', resp_id: '0x7E8' },
        },
        dids: {
            vin: { id: '0xF190', desc: 'VIN', decode: 'ascii', unit: 'string' },
            trans_temp: { id: '0x2101', desc: 'Transmission Fluid Temp', decode: 'u8', unit: '°C' },
            fuel_pressure: { id: '0x2102', desc: 'Fuel Rail Pressure', decode: 'u16', unit: 'kPa' },
            octane_adj: { id: '0x2103', desc: 'Octane Adjust Scalar', decode: 'u8', unit: '%' },
        }
    },
    {
        oem: 'VAG (VW/Audi)',
        ecus: {
          ecm: { req_id: '0x7E0', resp_id: '0x7E8' },
          tcu: { req_id: '0x7E1', resp_id: '0x7E9' },
          abs: { req_id: '0x7E2', resp_id: '0x7EA' }
        },
        dids: {
          vin:            { id: '0xF190', desc: 'VIN', decode: 'ascii', unit: 'string' },
          sw_version:     { id: '0xF188', desc: 'Software version', decode: 'ascii', unit: 'string' },
          oil_temp:       { id: '0x2001', desc: 'Oil temperature', decode: 'scaled:s16:0.1:degC:-40', unit: '°C' },
          boost_pressure: { id: '0x2002', desc: 'Boost pressure', decode: 'scaled:u16:0.01:kPa', unit: 'kPa' },
          lambda:         { id: '0x2003', desc: 'Lambda factor', decode: 'scaled:u16:0.001:ratio', unit: 'ratio' }
        }
    },
    {
        oem: 'Mercedes-Benz',
        ecus: {
          me:   { req_id: '0x7E0', resp_id: '0x7E8' },
          tcu:  { req_id: '0x7E1', resp_id: '0x7E9' },
          esp:  { req_id: '0x7E2', resp_id: '0x7EA' }
        },
        dids: {
          vin:            { id: '0xF190', desc: 'VIN', decode: 'ascii', unit: 'string' },
          sw_version:     { id: '0xF188', desc: 'Software version', decode: 'ascii', unit: 'string' },
          coolant_temp:   { id: '0x2101', desc: 'Coolant temperature', decode: 'scaled:s16:0.1:degC:-40', unit: '°C' },
          torque:         { id: '0x2102', desc: 'Engine torque', decode: 'scaled:s16:0.1:Nm', unit: 'Nm' },
          fuel_pressure:  { id: '0x2103', desc: 'Fuel rail pressure', decode: 'scaled:u16:0.1:kPa', unit: 'kPa' }
        }
    },
    {
        oem: 'GM/Chevrolet',
        ecus: {
          pcm: { req_id: '0x7E0', resp_id: '0x7E8' },
          bcm: { req_id: '0x7E1', resp_id: '0x7E9' },
          abs: { req_id: '0x7E2', resp_id: '0x7EA' }
        },
        dids: {
          vin:            { id: '0xF190', desc: 'VIN', decode: 'ascii', unit: 'string' },
          calibration_id: { id: '0xF187', desc: 'Calibration ID', decode: 'ascii', unit: 'string' },
          cvn:            { id: '0xF189', desc: 'CVN', decode: 'ascii', unit: 'string' },
          trans_temp:     { id: '0x2210', desc: 'Transmission fluid temp', decode: 'scaled:u16:0.1:degC:-40', unit: '°C' },
          oil_pressure:   { id: '0x2211', desc: 'Oil pressure', decode: 'scaled:u16:0.01:kPa', unit: 'kPa' },
          spark_advance:  { id: '0x2212', desc: 'Spark advance', decode: 'scaled:s16:0.1:deg:-64', unit: 'deg' }
        }
    }
];

class OBDService {
  private device: BluetoothDevice | null = null;
  private deviceName: string | null = null;
  private server: BluetoothRemoteGATTServer | null = null;
  private txCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  private rxCharacteristic: BluetoothRemoteGATTCharacteristic | null = null;
  
  private pollingInterval: number | null = null;
  private statusCallback: StatusCallback = () => {};
  private dataCallback: DataCallback = () => {};
  
  private responseBuffer = '';
  private commState: CommState = CommState.IDLE;
  
  // For COMMAND_MODE
  private commandResolver: ((value: string[]) => void) | null = null;
  private commandRejecter: ((reason?: any) => void) | null = null;
  private commandTimeout: number | null = null;

  private pidsToPoll = [
    '0C', '0D', '05', '0F', '0B', '04', '42', '0A', '2F', '06', '07', '14',
  ];
  
  private sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

  subscribe(statusCallback: StatusCallback, dataCallback: DataCallback) {
    this.statusCallback = statusCallback;
    this.dataCallback = dataCallback;
  }

  private updateStatus(status: ConnectionStatus, error?: string) {
    this.statusCallback(status, this.deviceName, error);
  }
  
  private onDataReceived(data: Partial<SensorDataPoint>) {
    this.dataCallback(data);
  }
  
  private cleanupConnection() {
    this.stopPolling();
    if (this.device?.gatt?.connected) {
      this.device.gatt.disconnect();
    }
    this.device = null;
    this.deviceName = null;
    this.server = null;
    this.txCharacteristic = null;
    this.rxCharacteristic = null;
    this.commState = CommState.IDLE;
  }

  async connect() {
    if (!(navigator as any).bluetooth) {
      this.updateStatus(ConnectionStatus.ERROR, "Web Bluetooth API is not available in this browser. Please use Chrome or Edge.");
      return;
    }

    try {
      this.updateStatus(ConnectionStatus.CONNECTING);
      this.device = await (navigator as any).bluetooth.requestDevice({
        filters: [{ services: [ELM327_SERVICE_UUID] }],
        optionalServices: [ELM327_SERVICE_UUID]
      });

      this.deviceName = this.device.name || 'Unknown Device';
      this.updateStatus(ConnectionStatus.CONNECTING);

      if (!this.device.gatt) throw new Error("GATT server not available.");
      
      this.device.addEventListener('gattserverdisconnected', () => this.disconnect());
      
      this.server = await this.device.gatt.connect();
      const service = await this.server.getPrimaryService(ELM327_SERVICE_UUID);
      
      const characteristics = await service.getCharacteristics();
      this.rxCharacteristic = characteristics.find(c => c.properties.notify);
      this.txCharacteristic = characteristics.find(c => c.properties.write || c.properties.writeWithoutResponse);

      if (!this.rxCharacteristic || !this.txCharacteristic) {
        throw new Error("Could not find required TX/RX characteristics on the Bluetooth device.");
      }

      await this.rxCharacteristic.startNotifications();
      this.rxCharacteristic.addEventListener('characteristicvaluechanged', this.handleNotifications.bind(this));

      await this.initializeELM327();
      this.startPolling();
      this.updateStatus(ConnectionStatus.CONNECTED);

    } catch (error) {
      console.error("Bluetooth connection failed:", error);
      this.cleanupConnection();

      if (error instanceof DOMException && error.name === 'NotFoundError') {
        // User cancelled the device picker, which is not a system error.
        this.updateStatus(ConnectionStatus.DISCONNECTED);
      } else {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        this.updateStatus(ConnectionStatus.ERROR, errorMessage);
      }
    }
  }

  disconnect() {
    this.cleanupConnection();
    this.updateStatus(ConnectionStatus.DISCONNECTED);
  }

  async reinitialize() {
    if (!this.txCharacteristic) {
      throw new Error("Cannot re-initialize. Not connected.");
    }
    
    const wasPolling = this.commState === CommState.POLLING;
    if (wasPolling) this.stopPolling();

    try {
      console.log("Re-initializing ELM327...");
      await this.initializeELM327();
      console.log("Re-initialization complete.");
    } catch (error) {
      console.error("Failed to re-initialize ELM327", error);
      this.updateStatus(ConnectionStatus.ERROR, "Failed to re-initialize adapter.");
      throw error; // re-throw to be caught by UI
    } finally {
      if (wasPolling) this.startPolling();
    }
  }

  async fetchDTCs(): Promise<string[]> {
      if (!this.txCharacteristic || !this.rxCharacteristic) {
          throw new Error("Not connected to vehicle.");
      }
      this.stopPolling();
      this.commState = CommState.COMMAND_MODE;

      try {
        const responses = await this.executeCommand('03', 5000);
        return responses.flatMap(parseDTCResponse);
      } finally {
        this.startPolling();
      }
  }
  
  async readDid(did: Did): Promise<string> {
    if (!this.txCharacteristic) throw new Error("Not connected to vehicle.");
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 300 + Math.random() * 400));
  
    const [method, ...params] = did.decode.split(':');
    let finalValue: string | number;
  
    switch (method) {
      case 'ascii':
        if (did.id === '0xF190') finalValue = 'JN1AZ00Z9ZT000123';
        else if (did.id === '0xF187') finalValue = '4A5B6C7D8E9F0G1H';
        else finalValue = 'SW-V2.1.3-PROD';
        break;
      case 'u8':
        if (did.desc.toLowerCase().includes('temp')) finalValue = 85 + Math.random() * 5;
        else if (did.desc.toLowerCase().includes('gear')) finalValue = Math.floor(Math.random() * 6 + 1);
        else finalValue = 50 + Math.random() * 10;
        break;
      case 's16':
        finalValue = (Math.random() * 20 - 10);
        break;
      case 'u16':
        finalValue = 150 + Math.random() * 20;
        break;
      case 'scaled': {
        const [baseType, scaleStr, ...rest] = params;
        const scale = parseFloat(scaleStr) || 1.0;
        let offset = 0.0;
        if (rest.length > 0) {
            const lastParam = parseFloat(rest[rest.length - 1]);
            if (!isNaN(lastParam)) {
                offset = lastParam;
            }
        }
  
        let rawValue: number;
        // Generate a plausible mock raw value that results in a realistic final value
        if (did.desc.toLowerCase().includes('temp')) { // e.g., oil, coolant, trans
            rawValue = (95 - offset) / scale + (Math.random() - 0.5) * 10 / scale;
        } else if (did.desc.toLowerCase().includes('pressure')) { // e.g., boost, fuel
            rawValue = (180 - offset) / scale + (Math.random() - 0.5) * 40 / scale;
        } else if (did.desc.toLowerCase().includes('torque')) {
            rawValue = (250 - offset) / scale + (Math.random() - 0.5) * 80 / scale;
        } else if (did.desc.toLowerCase().includes('spark') || did.desc.toLowerCase().includes('angle')) {
            rawValue = (15 - offset) / scale + (Math.random() - 0.5) * 10 / scale;
        } else { // Generic
            rawValue = (100 - offset) / scale + (Math.random() - 0.5) * 20 / scale;
        }
  
        finalValue = rawValue * scale + offset;
        break;
      }
      default:
        return 'DECODE_ERR';
    }
  
    if (typeof finalValue === 'number') {
      const precision = did.unit.toLowerCase() === 'deg' || did.unit.toLowerCase() === 'bar' ? 1 : (Number.isInteger(finalValue) ? 0 : 2);
      return `${finalValue.toFixed(precision)} ${did.unit}`;
    }
  
    return finalValue;
  }

  private async executeCommand(command: string, timeout: number): Promise<string[]> {
    return new Promise(async (resolve, reject) => {
        this.commandResolver = resolve;
        this.commandRejecter = reject;

        this.commandTimeout = window.setTimeout(() => {
            if (this.commandRejecter) {
                this.commandRejecter(new Error(`Command '${command}' timed out after ${timeout}ms.`));
                this.resetCommandState();
            }
        }, timeout);

        this.responseBuffer = '';
        await this.writeCommand(command);
    });
  }
  
  private resetCommandState() {
      if (this.commandTimeout) clearTimeout(this.commandTimeout);
      this.commandTimeout = null;
      this.commandResolver = null;
      this.commandRejecter = null;
      this.responseBuffer = '';
  }

  private async writeCommand(cmd: string) {
    if (!this.txCharacteristic) return;
    const encoder = new TextEncoder();
    await this.txCharacteristic.writeValue(encoder.encode(cmd + '\r'));
  }

  private handleNotifications(event: Event) {
    const value = (event.target as BluetoothRemoteGATTCharacteristic).value;
    if (!value) return;
    
    const decoder = new TextDecoder();
    const str = decoder.decode(value);
    this.responseBuffer += str;

    if (this.responseBuffer.includes('>')) {
      const responses = this.responseBuffer.split('\r').filter(line => line.trim().length > 0 && line.trim() !== '>');
      
      if (this.commState === CommState.POLLING) {
        for (const response of responses) {
            const parsedData = parseOBDResponse(response);
            if (parsedData) this.onDataReceived(parsedData);
        }
      } else if (this.commState === CommState.COMMAND_MODE && this.commandResolver) {
          this.commandResolver(responses);
          this.resetCommandState();
      }
      this.responseBuffer = '';
    }
  }

  private async initializeELM327() {
    this.commState = CommState.COMMAND_MODE;
    try {
      const initCommands = [
        { cmd: 'ATZ', timeout: 3000, retries: 2, delay: 500 },
        { cmd: 'ATE0', timeout: 500, retries: 1 }, // Echo Off
        { cmd: 'ATL0', timeout: 500, retries: 1 }, // Linefeeds Off
        { cmd: 'ATH1', timeout: 500, retries: 1 }, // Headers On
        { cmd: 'ATSP0', timeout: 5000, retries: 1 },// Set Protocol to Auto
        { cmd: '0100', timeout: 2000, retries: 2 }, // Test query for PIDs
      ];
      
      for (const { cmd, timeout, retries, delay } of initCommands) {
          let lastError: any;
          for (let i = 0; i <= (retries || 0); i++) {
              try {
                  if (delay && i > 0) await this.sleep(delay);
                  const response = await this.executeCommand(cmd, timeout);
                  if (cmd !== 'ATZ' && cmd !== '0100' && !response.join('').includes('OK')) {
                      throw new Error(`Command '${cmd}' failed. Response: ${response.join('')}`);
                  }
                  lastError = null; // Clear error on success
                  break; // Move to next command
              } catch (e) {
                  lastError = e;
                  console.warn(`Attempt ${i + 1} for '${cmd}' failed:`, e);
              }
          }
          if (lastError) {
              throw lastError; // Throw if all retries for a command fail
          }
      }
    } catch (error) {
      console.error("Failed to initialize ELM327", error);
      throw new Error(`Failed during ELM327 initialization: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      this.commState = CommState.IDLE;
    }
  }

  private startPolling() {
    this.commState = CommState.POLLING;
    if (this.pollingInterval) clearInterval(this.pollingInterval);
    let pidIndex = 0;
    this.pollingInterval = window.setInterval(() => {
        if (this.txCharacteristic && this.commState === CommState.POLLING) {
            const pid = this.pidsToPoll[pidIndex];
            this.writeCommand(`01${pid}`);
            pidIndex = (pidIndex + 1) % this.pidsToPoll.length;
        }
    }, 100);
  }

  private stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
    this.commState = CommState.IDLE;
  }
}

export const obdService = new OBDService();
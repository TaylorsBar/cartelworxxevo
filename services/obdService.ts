import { BleClient, numbersToDataView, dataViewToNumbers } from '@capacitor-community/bluetooth-le';
import { DTC, SensorData, VehicleInfo, FreezeFrameData } from '../types';

// ELM327 and OBD-II constants
const ELM_PROMPT = '>';
const OBD_SERVICE_UUID = '0000ffe0-0000-1000-8000-00805f9b34fb';
const OBD_CHAR_UUID_TX = '0000ffe1-0000-1000-8000-00805f9b34fb';
const OBD_CHAR_UUID_RX = '0000ffe1-0000-1000-8000-00805f9b34fb';

class OBDService {
  private deviceId: string | null = null;
  private responseBuffer = '';
  private responseResolver: ((value: string) => void) | null = null;
  private connectionStatusCallback: ((status: 'connected' | 'connecting' | 'disconnected' | 'error', message?: string) => void) | null = null;
  private encoder = new TextEncoder();
  private decoder = new TextDecoder();

  public onConnectionStatusChange(callback: (status: 'connected' | 'connecting' | 'disconnected' | 'error', message?: string) => void) {
    this.connectionStatusCallback = callback;
  }

  public async connect(): Promise<boolean> {
    this.updateStatus('connecting', 'Requesting Bluetooth device...');
    try {
      await BleClient.initialize();
      const device = await BleClient.requestDevice({
        services: [OBD_SERVICE_UUID],
      });

      if (!device.deviceId) {
        this.updateStatus('disconnected', 'No device selected.');
        return false;
      }
      this.deviceId = device.deviceId;

      this.updateStatus('connecting', `Connecting to ${device.name}...`);
      await BleClient.connect(this.deviceId, this.onDisconnected);

      this.updateStatus('connecting', 'Starting notifications...');
      await BleClient.startNotifications(
        this.deviceId,
        OBD_SERVICE_UUID,
        OBD_CHAR_UUID_RX,
        this.handleNotifications
      );

      this.updateStatus('connecting', 'Initializing ELM327...');
      const initSuccess = await this.initializeELM();

      if (initSuccess) {
        this.updateStatus('connected', `Connected to ${device.name}`);
        return true;
      } else {
        await this.disconnect();
        this.updateStatus('error', 'Failed to initialize ELM327.');
        return false;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.updateStatus('error', message);
      console.error('Bluetooth connection failed:', error);
      return false;
    }
  }

  public async disconnect(): Promise<void> {
    if (this.deviceId) {
      await BleClient.disconnect(this.deviceId);
    }
    this.onDisconnected();
  }

  private onDisconnected = () => {
    this.deviceId = null;
    this.responseBuffer = '';
    if (this.responseResolver) {
        this.responseResolver(''); // Resolve any pending command
    }
    this.updateStatus('disconnected', 'Device disconnected.');
  }

  private handleNotifications = (value: DataView) => {
    this.responseBuffer += this.decoder.decode(value);
    if (this.responseBuffer.trim().endsWith(ELM_PROMPT)) {
      if (this.responseResolver) {
        const cleanedResponse = this.responseBuffer.trim().replace(ELM_PROMPT, '').trim();
        this.responseResolver(cleanedResponse);
        this.responseResolver = null;
        this.responseBuffer = '';
      }
    }
  }

  private updateStatus(status: 'connected' | 'connecting' | 'disconnected' | 'error', message?: string){
      if(this.connectionStatusCallback){
          this.connectionStatusCallback(status, message);
      }
  }

  public async sendCommand(command: string): Promise<string> {
    if (!this.deviceId) {
      throw new Error('Not connected to a device.');
    }

    this.responseBuffer = '';
    const responsePromise = new Promise<string>((resolve) => {
      this.responseResolver = resolve;
    });

    const data = this.encoder.encode(command + '\r');
    await BleClient.write(this.deviceId, OBD_SERVICE_UUID, OBD_CHAR_UUID_TX, numbersToDataView(data));

    const timeoutPromise = new Promise<string>((_, reject) =>
      setTimeout(() => reject(new Error(`Timeout waiting for response to command: ${command}`)), 5000)
    );

    return Promise.race([responsePromise, timeoutPromise]);
  }

  private async initializeELM(): Promise<boolean> {
    try {
      await this.sendCommand('ATZ');
      await this.sendCommand('ATE0');
      await this.sendCommand('ATL0');
      await this.sendCommand('ATSP0');
      return true;
    } catch (error) {
      console.error('Failed to initialize ELM327:', error);
      return false;
    }
  }

  async getVehicleInfo(): Promise<VehicleInfo> {
    console.log('Requesting Vehicle Information (VIN)...');
    const response = await this.sendCommand('0902');
    const lines = response.split('\r').filter(line => line.includes('49 02'));

    if (lines.length === 0) {
        throw new Error('VIN response not found or invalid.');
    }

    let hexVin = '';
    if (lines.length > 1) {
        hexVin = lines
            .map(line => line.split(':')[1]?.trim())
            .filter(Boolean)
            .map(hex => hex.replace(/ /g, ''))
            .join('');
    } else {
        hexVin = lines[0].substring(lines[0].indexOf('49 02') + 6).replace(/ /g, '');
    }

    hexVin = hexVin.replace(/\s/g, '').substring(2);

    let vin = '';
    for (let i = 0; i < hexVin.length; i += 2) {
        vin += String.fromCharCode(parseInt(hexVin.substring(i, i + 2), 16));
    }

    console.log(`VIN found: ${vin}`);
    return { vin, make: 'Unknown', model: 'Unknown', year: new Date().getFullYear(), engine: 'Unknown', mileage: 0 };
  }

  async readDTC(): Promise<DTC[]> {
    const response = await this.sendCommand('03');
    const lines = response.split('\r').filter(line => line.startsWith('43'));
    if (lines.length === 0 || lines[0].includes('NO DATA')) {
        return [];
    }

    const hexCodes = lines[0].replace('43 ', '').replace(/ /g, '');
    const dtcs: DTC[] = [];

    for (let i = 0; i < hexCodes.length; i += 4) {
        const hexCode = hexCodes.substring(i, i + 4);
        const firstChar = parseInt(hexCode[0], 16);
        const letter = ['P', 'C', 'B', 'U'][firstChar >> 2];
        const code = letter + (firstChar % 4).toString() + hexCode.substring(1);
        dtcs.push({ code, description: 'Description not available', severity: 'Info', potentialCauses:[], remedy: '' });
    }

    return dtcs;
  }
  
  async getLiveData(pids: string[]): Promise<SensorData> {
    const sensorData: SensorData = {};
    for (const pid of pids) {
        const response = await this.sendCommand(`01${pid}`);
        const lines = response.split('\r').filter(line => line.startsWith('41'));
        if (lines.length > 0) {
            const data = this.parseOBDResponse(pid, lines[0]);
            Object.assign(sensorData, data);
        }
    }
    return sensorData;
  }

  async clearDTCs(): Promise<boolean> {
    const response = await this.sendCommand('04');
    return response.includes('44');
  }

  async getFreezeFrame(): Promise<FreezeFrameData> {
    const response = await this.sendCommand('020200');
    const lines = response.split('\r').filter(line => line.startsWith('42'));
    if (lines.length === 0) {
        return {};
    }

    const freezeFrameData: FreezeFrameData = {};
    lines.forEach(line => {
        const parts = line.split(' ');
        const pid = parts[2];
        const value = this.parseOBDResponse(pid, line);
        Object.assign(freezeFrameData, value);
    });

    return freezeFrameData;
  }

  private parseOBDResponse(pid: string, response: string): SensorData {
    const parts = response.split(' ').slice(2);
    const a = parseInt(parts[0], 16);
    const b = parseInt(parts[1], 16);

    switch (pid) {
        case '0C': return { rpm: (a * 256 + b) / 4 };
        case '0D': return { speed: a };
        case '05': return { engineTemp: a - 40 };
        default: return {};
    }
  }

  async sendExtendedRequest(mode: number, pid: string): Promise<any> { throw new Error("Not implemented"); }
}

export const obdService = new OBDService();

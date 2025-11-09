
export interface SensorDataPoint {
  time: number;
  rpm: number;
  speed: number;
  gear: number;
  fuelUsed: number;
  inletAirTemp: number;
  batteryVoltage: number;
  engineTemp: number;
  fuelTemp: number;
  turboBoost: number;
  fuelPressure: number;
  oilPressure: number;
  shortTermFuelTrim: number;
  longTermFuelTrim: number;
  o2SensorVoltage: number;
  engineLoad: number;
  distance: number;
  longitudinalGForce: number;
  lateralGForce: number;
  latitude: number;
  longitude: number;
}

export enum AlertLevel {
  Info = 'Info',
  Warning = 'Warning',
  Critical = 'Critical'
}

export interface DiagnosticAlert {
  id: string;
  level: AlertLevel;
  component: string;
  message: string;
  timestamp: string;
  isFaultRelated?: boolean;
}

export interface MaintenanceRecord {
  id: string;
  date: string;
  service: string;
  notes: string;
  verified: boolean;
  isAiRecommendation: boolean;
}

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'ai';
  chunks?: GroundingChunk[];
}

export interface PredictiveIssue {
    component: string;
    rootCause: string;
    recommendedActions: string[];
    plainEnglishSummary: string;
    tsbs?: string[];
}

export interface PredictiveAnalysisResult {
    timelineEvents?: TimelineEvent[];
    error?: string;
    details?: string;
}

export interface TimelineEvent {
    id:string;
    level: AlertLevel;
    title: string;
    timeframe: string; 
    details: PredictiveIssue;
}

export interface ComponentHealth {
  componentName: string; 
  healthScore: number; 
  rulEstimate: string; 
  status: 'Good' | 'Moderate Wear' | 'Service Soon' | 'Critical';
  analysisSummary: string; 
}

export interface ComponentHealthAnalysisResult {
    components: ComponentHealth[];
}

export interface TuningParams {
    fuelMap: number;
    ignitionTiming: number[][];
    boostPressure: number[][];
}

export interface TuningSuggestion {
  suggestedParams: TuningParams & { boostPressureOffset?: number };
  analysis: {
    predictedGains: string;
    potentialRisks: string;
    safetyWarnings?: string[];
    educationalTip?: string;
  };
}

export interface SafetyReport {
    safetyScore: number;
    warnings: string[];
}

export enum AuditEvent {
    Login = 'User Login',
    AiAnalysis = 'AI Analysis',
    DataSync = 'Data Sync',
    TuningChange = 'Tuning Change',
    DiagnosticQuery = 'Diagnostic Query'
}

export interface AuditLogEntry {
  id: string;
  timestamp: string;
  event: AuditEvent;
  description: string;
  ipAddress: string;
  status: 'Success' | 'Failure';
}

export enum IntentAction {
  ShowComponent = 'SHOW_COMPONENT',
  QueryService = 'QUERY_SERVICE',
  HideComponent = 'HIDE_COMPONENT',
  Unknown = 'UNKNOWN',
}

export interface VoiceCommandIntent {
  intent: IntentAction;
  component?: string; 
  confidence: number;
}

export interface ComponentHotspot {
  id: string;
  name: string;
  cx: string;
  cy: string;
  status: 'Normal' | 'Warning' | 'Failing';
}

export enum HederaEventType {
    Maintenance = 'Maintenance',
    Tuning = 'AI Tuning',
    Diagnostic = 'Diagnostic Alert',
}

export interface HederaRecord {
    id: string;
    timestamp: string;
    eventType: HederaEventType;
    vin: string;
    summary: string;
    hederaTxId: string;
    dataHash: string; 
}

export interface GpsPoint {
    latitude: number;
    longitude: number;
}

export interface LapTime {
    lap: number;
    time: number; 
}

export interface RaceSession {
    isActive: boolean;
    startTime: number | null;
    elapsedTime: number;
    data: SensorDataPoint[];
    lapTimes: LapTime[];
    gpsPath: GpsPoint[];
    zeroToHundredKmhTime: number | null;
    zeroToSixtyMphTime: number | null;
    sixtyToHundredThirtyMphTime: number | null;
    hundredToTwoHundredKmhTime: number | null;
    quarterMileTime: number | null;
    quarterMileSpeed: number | null;
    _internal: {
        startDataPoint: SensorDataPoint | null;
        crossingTimes: { [key: string]: number | null };
    };
}

export interface SavedRaceSession {
    id: string;
    date: string;
    totalTime: number;
    maxSpeed: number;
    distance: number;
    data: SensorDataPoint[];
    zeroToHundredKmhTime: number | null;
    zeroToSixtyMphTime: number | null;
    sixtyToHundredThirtyMphTime: number | null;
    hundredToTwoHundredKmhTime: number | null;
    quarterMileTime: number | null;
    quarterMileSpeed: number | null;
    lapTimes: LapTime[];
    gpsPath: GpsPoint[];
}

export interface LeaderboardEntry {
    value: number;
    date: string;
}

export interface Leaderboard {
    zeroToHundredKmh: LeaderboardEntry | null;
    zeroToSixtyMph: LeaderboardEntry | null;
    sixtyToHundredThirtyMph: LeaderboardEntry | null;
    hundredToTwoHundredKmh: LeaderboardEntry | null;
    quarterMileTime: LeaderboardEntry | null;
    quarterMileSpeed: LeaderboardEntry | null;
}

export type UnitSystem = 'metric' | 'imperial';

export interface GroundingChunk {
    chunk: string;
    source: string;
}

export interface GroundedResponse {
  text: string;
  chunks: GroundingChunk[];
}

export enum ConnectionStatus {
  DISCONNECTED = 'Disconnected',
  CONNECTING = 'Connecting',
  CONNECTED = 'Connected',
  ERROR = 'Error',
}

export interface DTC {
    code: string;
    description: string;
    severity: 'Info' | 'Warning' | 'Critical' | 'Low' | 'Medium' | 'High';
    potentialCauses: string[];
    remedy: string;
}

export interface VehicleData {
    make: string;
    model: string;
    year: number;
    engine?: string;
    mileage?: number;
}

export type DidDecodeMethod = 
  | 'ascii'
  | 'u8'
  | 's16'
  | 'u16'
  | `scaled:${string}`;

export interface Did {
  id: string;
  desc: string;
  decode: DidDecodeMethod;
  unit: string;
}

export interface Ecu {
  req_id: string;
  resp_id: string;
}

export interface OemProfile {
  oem: string;
  ecus: Record<string, Ecu>;
  dids: Record<string, Did>;
}

export type TrainingModuleId =
  | 'obd-basics'
  | 'dtc-diagnostics'
  | 'oem-insights'
  | 'predictive-maintenance'
  | 'advanced-performance';

export interface TrainingLesson {
    title: string;
    content: string;
}

export interface TrainingModule {
    id: TrainingModuleId;
    level: number;
    title: string;
    description: string;
    unlocks: string[];
    lessons: TrainingLesson[];
    badge: string;
}

export interface FreezeFrameData {
  [key: string]: string | number;
}

export interface SensorData {
    [key: string]: any;
}

export interface DiagnosticAnalysis {
  explanation: string;
  rootCauses: string[];
  diagnosticSteps: string[];
  repairCost: string;
  severity: 'Critical' | 'Moderate' | 'Minor';
  isSafeToDrive: boolean;
}

export interface PerformanceAnalysis {
  performanceSummary: string;
  anomalies: string[];
  recommendations: string[];
}

export interface MaintenanceRecommendations {
  recommendations: MaintenanceRecord[];
}

export interface TuningRecord {
    id: string;
    timestamp: string;
    params: TuningParams;
    notes: string;
    createdBy: 'user' | 'ai';
}

export interface VehicleInfo {
    vin: string;
    make: string;
    model: string;
    year: number;
    engine: string;
    mileage: number;
}

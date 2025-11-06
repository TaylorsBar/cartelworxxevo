

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
  // New detailed OBD-II params for AI Engine
  shortTermFuelTrim: number;
  longTermFuelTrim: number;
  o2SensorVoltage: number;
  engineLoad: number;
  // For Race Pack
  distance: number;
  longitudinalGForce: number;
  lateralGForce: number;
  // For GPS
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
  isFaultRelated?: boolean; // New field for Co-Pilot context
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

// Types for the new Predictive AI Engine
export interface PredictiveIssue {
    component: string;
    rootCause: string;
    recommendedActions: string[];
    plainEnglishSummary: string;
    tsbs?: string[];
}

// FIX: Added PredictiveAnalysisResult to type the response from the AI worker.
export interface PredictiveAnalysisResult {
    timelineEvents?: TimelineEvent[];
    error?: string;
    details?: string;
}

export interface TimelineEvent {
    id:string;
    level: AlertLevel;
    title: string;
    timeframe: string; // e.g., "Immediate", "Next 3 months", "Within 5000 miles"
    details: PredictiveIssue;
}

// New types for Component Health Scoring
export interface ComponentHealth {
  componentName: string; // e.g., 'Front Brake Pads'
  healthScore: number; // 0-100
  rulEstimate: string; // e.g., 'Approx. 8,500 miles'
  status: 'Good' | 'Moderate Wear' | 'Service Soon' | 'Critical';
  analysisSummary: string; // AI-generated summary
}

export interface ComponentHealthAnalysisResult {
    components: ComponentHealth[];
}


// Types for the new AI Tuning Assistant
export interface TuningSuggestion {
  suggestedParams: {
    fuelMap: number;
    ignitionTiming: number[][];
    boostPressure: number[][];
    boostPressureOffset?: number;
  };
  analysis: {
    predictedGains: string;
    potentialRisks: string;
    safetyWarnings?: string[];
    educationalTip?: string;
  };
}


// Types for Security Audit Trail
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

// Types for AR Assistant
export enum IntentAction {
  ShowComponent = 'SHOW_COMPONENT',
  QueryService = 'QUERY_SERVICE',
  HideComponent = 'HIDE_COMPONENT',
  Unknown = 'UNKNOWN',
}

export interface VoiceCommandIntent {
  intent: IntentAction;
  component?: string; // e.g., 'o2-sensor', 'map-sensor'
  confidence: number;
}

export interface ComponentHotspot {
  id: string;
  name: string;
  cx: string;
  cy: string;
  status: 'Normal' | 'Warning' | 'Failing';
}

// Types for Hedera DLT Integration
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
    dataHash: string; // The hash of the off-chain data
}

// Types for Race Pack
export interface GpsPoint {
    latitude: number;
    longitude: number;
}

export interface LapTime {
    lap: number;
    time: number; // in milliseconds
}

export interface RaceSession {
    isActive: boolean;
    startTime: number | null;
    elapsedTime: number;
    data: SensorDataPoint[];
    lapTimes: LapTime[];
    gpsPath: GpsPoint[];
    // Standard benchmarks
    zeroToHundredKmhTime: number | null;
    zeroToSixtyMphTime: number | null;
    sixtyToHundredThirtyMphTime: number | null;
    hundredToTwoHundredKmhTime: number | null;
    quarterMileTime: number | null;
    quarterMileSpeed: number | null;
    // Internal state for benchmark calculations
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

// Types for Grounded AI responses
export interface GroundingChunk {
  web?: {
    uri?: string;
    title?: string;
  };
  maps?: {
    uri: string;
    title: string;
    placeAnswerSources?: {
        reviewSnippets: {
            text: string;
            author: string;
            uri: string;
        }[]
    }[]
  };
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

export interface DTCInfo {
    code: string;
    description: string;
    severity: 'Info' | 'Warning' | 'Critical';
    possibleCauses: string[];
}

// Types for OEM Diagnostic Profiles
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

// Types for Training & Certification
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
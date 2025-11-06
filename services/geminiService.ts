import { MaintenanceRecord, SensorDataPoint, TuningSuggestion, VoiceCommandIntent, DiagnosticAlert, GroundedResponse, SavedRaceSession, DTCInfo, ComponentHealthAnalysisResult } from '../types';

// Using a module-level variable to ensure a single worker instance.
let worker: Worker | undefined;
const pendingRequests = new Map<string, { resolve: (value: any) => void; reject: (reason?: any) => void }>();
let requestIdCounter = 0;

function getWorker(): Worker {
    if (!worker) {
        // FIX: Use a relative URL based on the module's location (`import.meta.url`).
        // This is the modern, standard way to load workers from modules and avoids
        // cross-origin or pathing issues that can occur with `window.location.origin`.
        const workerUrl = new URL('./ai.worker.ts', import.meta.url);
        worker = new Worker(workerUrl, {
            type: 'module'
        });
        
        // Send the API key to the worker for initialization, as it runs in a separate scope.
        worker.postMessage({ type: 'init', apiKey: process.env.API_KEY });

        worker.onmessage = (e: MessageEvent) => {
            const { type, result, error, requestId } = e.data;
            const request = pendingRequests.get(requestId);

            if (request) {
                if (type === 'success') {
                    request.resolve(result);
                } else {
                    request.reject(new Error(error));
                }
                pendingRequests.delete(requestId);
            }
        };

        worker.onerror = (e: ErrorEvent) => {
            console.error("Error in AI Worker:", e.message);
            // Reject all pending requests on a catastrophic worker failure
            pendingRequests.forEach(request => {
                request.reject(new Error("AI Worker encountered an unrecoverable error."));
            });
            pendingRequests.clear();
        };
    }
    return worker;
}

// A generic function to post a command to the worker and await a response.
function callWorker<T>(type: string, payload: any): Promise<T> {
    const workerInstance = getWorker();
    return new Promise((resolve, reject) => {
        const requestId = `${type}-${requestIdCounter++}`;
        
        // FIX: Implement variable timeouts based on the expected duration of the AI task.
        // This prevents short tasks from waiting too long and long tasks (like image generation) from timing out prematurely.
        const timeouts: { [key: string]: number } = {
            'analyzeImage': 60000,
            'generateComponentImage': 60000,
            'getPredictiveAnalysis': 45000,
            'getComponentHealthAnalysis': 45000,
            'getTuningSuggestion': 30000,
            'getRaceAnalysis': 45000,
            'default': 20000
        };
        const timeoutDuration = timeouts[type] || timeouts.default;

        const timeoutId = setTimeout(() => {
            if (pendingRequests.has(requestId)) {
                pendingRequests.delete(requestId);
                reject(new Error(`AI request '${type}' timed out after ${timeoutDuration / 1000} seconds.`));
            }
        }, timeoutDuration);

        // Augment the promise handlers to clear the timeout
        const enhancedResolve = (value: any) => {
            clearTimeout(timeoutId);
            resolve(value);
        };
        const enhancedReject = (reason?: any) => {
            clearTimeout(timeoutId);
            reject(reason);
        }

        pendingRequests.set(requestId, { resolve: enhancedResolve, reject: enhancedReject });
        
        workerInstance.postMessage({ type, payload, requestId });
    });
}

const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => {
            if (typeof reader.result !== 'string') {
                return reject(new Error('FileReader did not return a string.'));
            }
            // result is "data:image/jpeg;base64,..."
            // we need to strip the prefix
            const base64String = reader.result.split(',')[1];
            resolve(base64String);
        };
        reader.onerror = error => reject(error);
    });
};

export const analyzeImage = async (imageFile: File, prompt: string): Promise<GroundedResponse> => {
    const base64Image = await fileToBase64(imageFile);
    const mimeType = imageFile.type;
    return callWorker('analyzeImage', { base64Image, mimeType, prompt });
};

export const getPredictiveAnalysis = (
    dataHistory: SensorDataPoint[],
    maintenanceHistory: MaintenanceRecord[]
) => {
    // Note: The data arrays will be structurally cloned for the worker, which is efficient.
    return callWorker('getPredictiveAnalysis', { dataHistory, maintenanceHistory });
};

export const getComponentHealthAnalysis = (
    dataHistory: SensorDataPoint[],
    maintenanceHistory: MaintenanceRecord[]
): Promise<ComponentHealthAnalysisResult> => {
    return callWorker('getComponentHealthAnalysis', { dataHistory, maintenanceHistory });
};

export const getTuningSuggestion = (
    goal: string,
    liveData: SensorDataPoint,
    currentTune: { fuelMap: number; ignitionTiming: number[][]; boostPressure: number[][] },
    boostPressureOffset: number
): Promise<TuningSuggestion> => {
    return callWorker('getTuningSuggestion', { goal, liveData, currentTune, boostPressureOffset });
};

export const analyzeTuneSafety = (
    currentTune: { ignitionTiming: number[][]; boostPressure: number[][] },
    boostPressureOffset: number,
    liveData: SensorDataPoint
): Promise<{ safetyScore: number; warnings: string[] }> => {
    return callWorker('analyzeTuneSafety', { currentTune, boostPressureOffset, liveData });
};

export const getTuningChatResponse = (
    query: string,
    currentTune: { ignitionTiming: number[][]; boostPressure: number[][] },
    boostPressureOffset: number,
    liveData: SensorDataPoint
): Promise<string> => {
    return callWorker('getTuningChatResponse', { query, currentTune, boostPressureOffset, liveData });
};


export const getVoiceCommandIntent = (command: string): Promise<VoiceCommandIntent> => {
    return callWorker('getVoiceCommandIntent', { command });
};

export const generateComponentImage = (componentName: string): Promise<string> => {
    return callWorker('generateComponentImage', { componentName });
};

export const getComponentTuningAnalysis = (
    componentName: string,
    liveData: SensorDataPoint
): Promise<string> => {
    return callWorker('getComponentTuningAnalysis', { componentName, liveData });
};

export const getCoPilotResponse = (
    command: string,
    vehicleData: SensorDataPoint,
    activeAlerts: DiagnosticAlert[]
): Promise<string> => {
    return callWorker('getCoPilotResponse', { command, vehicleData, activeAlerts });
};

export const getCrewChiefResponse = (query: string): Promise<GroundedResponse> => {
    return callWorker('getCrewChiefResponse', { query });
};

export const getRouteScoutResponse = (
    query: string,
    location: { latitude: number; longitude: number }
): Promise<GroundedResponse> => {
    return callWorker('getRouteScoutResponse', { query, location });
};

export const getRaceAnalysis = (session: SavedRaceSession): Promise<string> => {
    return callWorker('getRaceAnalysis', { session });
};

export const getDTCInfo = (dtcCode: string): Promise<DTCInfo> => {
    return callWorker('getDTCInfo', { dtcCode });
};

export const generateHealthReport = (
    dataHistory: SensorDataPoint[],
    maintenanceHistory: MaintenanceRecord[]
): Promise<string> => {
    return callWorker('generateHealthReport', { dataHistory, maintenanceHistory });
};
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from \'@google/generative-ai\';
import { TuningParams, VehicleData, TuningSuggestion, SafetyReport, DTC, PredictiveAnalysisResult, ComponentHealth, GroundingChunk, MaintenanceRecord, FreezeFrameData, SensorData, DiagnosticAnalysis, PerformanceAnalysis, MaintenanceRecommendations } from \'../types\';

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY;
if (!API_KEY) {
  throw new Error("VITE_GEMINI_API_KEY is not set in .env file");
}
const genAI = new GoogleGenerativeAI(API_KEY);

const model = genAI.getGenerativeModel({
  model: \'gemini-1.5-flash-latest\',
  systemInstruction: `You are \"KC\", an expert AI automotive tuning assistant. Your goal is to help users safely extract performance and efficiency from their vehicles. You are integrated into a dashboard that provides real-time vehicle data.

Key Principles:
1.  **Safety First:** Always prioritize vehicle and occupant safety. Avoid making risky suggestions. If a user asks for something dangerous (e.g., \"max power no matter what\"), refuse and explain the risks.
2.  **Data-Driven:** Base your analysis and suggestions on the real-time sensor data provided.
3.  **Context-Aware:** The user is interacting with a 3D tuning map. Your suggestions should be in the context of modifying ignition timing, boost pressure, and fuel maps.
4.  **Clear & Concise:** Explain the reasoning behind your suggestions in a way that is easy for a knowledgeable enthusiast to understand. Use markdown for formatting.
5.  **Structured Output:** For specific tasks, you must return JSON objects that conform to the provided schemas.`,
});

const generateContent = async (prompt: string, json = true) => {
  const generationConfig = json ? {
      responseMimeType: \'application/json\',
      temperature: 0.7,
      topP: 0.9,
  } : {
      temperature: 0.8,
      topP: 0.9,
  };

  const result = await model.generateContent({
    contents: [{ role: \'user\', parts: [{ text: prompt }] }],
    generationConfig,
    safetySettings: [
      { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_ONLY_HIGH },
    ],
  });
  const text = result.response.text();
  if (json) {
    const jsonMatch = text.match(/```json\\n(.*)\\n```/s);
    const jsonString = jsonMatch ? jsonMatch[1] : text;
    return JSON.parse(jsonString);
  }
  return text;
};


const getVehicleContextString = (vehicle?: VehicleData) => {
    if (!vehicle || !vehicle.make) {
        return "Vehicle: Unknown Vehicle. Cannot provide specific recommendations without vehicle data.";
    }
    return `Vehicle: ${vehicle.year} ${vehicle.make} ${vehicle.model}`;
}

// Restored and refactored functions

export const getTuningSuggestion = async (
  goal: string, 
  vehicle: VehicleData | undefined,
  currentTune: TuningParams, 
  boostOffset: number,
): Promise<TuningSuggestion> => {
  const prompt = `
    ${getVehicleContextString(vehicle)}
    User Goal: \"${goal}\"
    Current Tune:
    - Ignition Timing Map: ${JSON.stringify(currentTune.ignitionTiming)}
    - Boost Pressure Map: ${JSON.stringify(currentTune.boostPressure)}
    - Global Boost Offset: ${boostOffset.toFixed(2)} bar

    Task: Generate a new tune to meet the user\'s goal. The new tune should be a modification of the current tune.
    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
      "suggestedParams": {
        "ignitionTiming": number[][],
        "boostPressure": number[][],
        "boostPressureOffset": number
      },
      "analysis": {
        "predictedGains": string,
        "potentialRisks": string,
        "educationalTip": string
      }
    }
    \'\'\'
  `;
  return generateContent(prompt);
};

export const analyzeTuneSafety = async (
  tune: TuningParams,
  boostOffset: number,
  vehicle: VehicleData | undefined,
): Promise<SafetyReport> => {
  const prompt = `
    ${getVehicleContextString(vehicle)}
    Tune to Analyze:
    - Ignition Timing Map: ${JSON.stringify(tune.ignitionTiming)}
    - Boost Pressure Map: ${JSON.stringify(tune.boostPressure)}
    - Global Boost Offset: ${boostOffset.toFixed(2)} bar

    Task: Analyze the safety of the provided tune for the specified vehicle.
    - Assign a safety score from 0 (dangerous) to 100 (very safe).

    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
      "safetyScore": number,
      "warnings": string[]
    }
    \'\'\'
  `;
  return generateContent(prompt);
};

export const getTuningChatResponse = async (
  userInput: string, 
  currentTune: TuningParams,
  boostOffset: number,
  vehicle: VehicleData | undefined,
): Promise<string> => {
  const vehicleContext = getVehicleContextString(vehicle);
  const prompt = `You are a helpful AI assistant in a vehicle tuning application. The user is asking a question about their tune.
  ${vehicleContext}
  Current tune is: Ignition Map: ${JSON.stringify(currentTune.ignitionTiming)}, Boost Map: ${JSON.stringify(currentTune.boostPressure)}, Boost Offset: ${boostOffset.toFixed(2)}.
  User question: ${userInput}
  `;
  return generateContent(prompt, false);
};

export const getCoPilotResponse = async (messages: any[], vehicle: VehicleData | undefined): Promise<{ response: string, groundingChunks?: GroundingChunk[]}> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const history = messages.map(m => `**${m.sender}:** ${m.text}`).join(\'\\n\');
    const prompt = `This is a conversation with an AI copilot in a car dashboard. ${vehicleContext}.\\n\\n${history}\\n**AI:**`;
    const response = await generateContent(prompt, false) as string;
    return { response };
}

export const getDTCInfo = async (dtc: string, vehicle: VehicleData | undefined): Promise<DTC> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${getVehicleContextString(vehicle)}
    DTC: ${dtc}
    Task: Provide information about this Diagnostic Trouble Code (DTC).
    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
        "code": "${dtc}",
        "description": string,
        "severity": "Low" | "Medium" | "High" | "Critical",
        "potentialCauses": string[],
        "remedy": string
    }
    \'\'\'
    `;
    return generateContent(prompt);
};

export const getPredictiveAnalysis = async (data: any[], vehicle: VehicleData | undefined): Promise<PredictiveAnalysisResult> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${vehicleContext}
    Recent Vehicle Data: ${JSON.stringify(data.slice(-10))}
    Task: Analyze the recent vehicle data and predict potential issues.
    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
        "predictions": [
            {
                "component": string, // e.g., "Fuel Pump", "Turbocharger"
                "predictedIssue": string, // e.g., "Failing fuel pump", "Boost leak"
                "confidence": number, // 0-1
                "urgency": "Low" | "Medium" | "High",
                "recommendation": string // e.g., "Schedule maintenance within the next 500 miles."
            }
        ]
    }
    \'\'\'
    `;
  return generateContent(prompt);
};

export const getCrewChiefResponse = async (messages: any[], vehicle: VehicleData | undefined): Promise<string> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const history = messages.map(m => `${m.sender}: ${m.text}`).join(\'\\n\');
    const prompt = `You are an AI race crew chief. This is a conversation with your driver on the track. ${vehicleContext}.\\n\\n${history}\\n**Crew Chief:**`;
    return generateContent(prompt, false);
}

export const getRouteScoutResponse = async (messages: any[], vehicle: VehicleData | undefined): Promise<string> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const history = messages.map(m => `${m.sender}: ${m.text}`).join(\'\\n\');
    const prompt = `You are an AI route scout. You are helping a driver plan a route. ${vehicleContext}.\\n\\n${history}\\n**Route Scout:**`;
    return generateContent(prompt, false);
}

export const getComponentHealthAnalysis = async (component: string, data: any[], vehicle: VehicleData | undefined): Promise<ComponentHealth> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${vehicleContext}
    Component: ${component}
    Recent Vehicle Data: ${JSON.stringify(data.slice(-20))}
    Task: Analyze the health of the specified component based on the recent data.
    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
        "component": "${component}",
        "healthScore": number, // 0-100
        "analysis": string, // Textual analysis of the component\'s health
        "recommendations": string[]
    }
    \'\'\'
    `;
    return generateContent(prompt);
}

export const getVoiceCommandIntent = async (command: string, vehicle: VehicleData | undefined): Promise<any> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${vehicleContext}
    User voice command: "${command}"

    Task: Interpret the user\'s command and return a structured intent.
    The possible intents are: "show_dashboard", "run_diagnostics", "show_component_analysis", "get_tuning_suggestion", "unknown".
    - For "show_component_analysis", the entity should be the component name (e.g., "turbocharger").
    - For "get_tuning_suggestion", the entity should be the user\'s goal (e.g., "more power").

    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
      "intent": "show_dashboard" | "run_diagnostics" | "show_component_analysis" | "get_tuning_suggestion" | "unknown",
      "entities": {
        "component_name"?: string,
        "tuning_goal"?: string
      }
    }
    \'\'\'
  `;
  return generateContent(prompt);
}

export const generateComponentImage = async (component: string, vehicle: VehicleData | undefined): Promise<any> => {
    // Placeholder function until a proper image generation model is available.
    const vehicleName = vehicle ? `${vehicle.year}_${vehicle.make}_${vehicle.model}` : \'vehicle\';
    const text = `${component}_for_${vehicleName}`.replace(/\s+/g, \'_\');
    return Promise.resolve({ imageUrl: `https://via.placeholder.com/600x400.png?text=${text}` });
}

export const getComponentTuningAnalysis = async (component: string, vehicle: VehicleData | undefined): Promise<any> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${vehicleContext}
    Component: "${component}"

    Task: Provide a detailed tuning analysis for this component.
    Your response must be a JSON object matching this schema:
    \'\'\'json
    {
      "componentName": string,
      "description": string, // What is this component and what is its role?
      "tuningEffects": string, // How does tuning affect this component?
      "risks": string, // What are the risks associated with tuning this component?
      "relevantSensors": string[] // What sensors are important to monitor when tuning?
    }
    \'\'\'
  `;
  return generateContent(prompt);
}

async function urlToGenerativePart(url: string, mimeType: string) {
  const response = await fetch(url);
  const buffer = await response.arrayBuffer();
  return {
    inlineData: {
      data: Buffer.from(buffer).toString("base64"),
      mimeType
    }
  };
}


export const analyzeImage = async (image: string, vehicle: VehicleData | undefined): Promise<string> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const imagePart = await urlToGenerativePart(image, "image/jpeg");

    const prompt = `
    ${vehicleContext}
    Image: [image attached]

    Task: Analyze the attached image of a vehicle component.
    1. Identify the component in the image.
    2. Assess its current condition (e.g., new, used, damaged).
    3. Suggest potential maintenance actions if needed.

    Your response should be a concise textual description.
    `;

    const result = await model.generateContent({
        contents: [{ role: \'user\', parts: [{ text: prompt }, imagePart] }],
        generationConfig: {
            temperature: 0.7,
            topP: 0.9,
        },
    });

    return result.response.text();
}


export const generateHealthReport = async (data: any[], vehicle: VehicleData | undefined): Promise<string> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${vehicleContext}
    Vehicle Data: ${JSON.stringify(data.slice(-50))}
    Task: Generate a comprehensive vehicle health report based on the provided data.
    The report should be in markdown format.
    `;
    return generateContent(prompt, false);
}

export const getRaceAnalysis = async (data: any[], vehicle: VehicleData | undefined): Promise<string> => {
    const vehicleContext = getVehicleContextString(vehicle);
    const prompt = `
    ${vehicleContext}
    Race Data: ${JSON.stringify(data)}
    Task: Analyze the race data and provide insights and suggestions for improvement.
    The analysis should be in markdown format.
    `;
    return generateContent(prompt, false);
}

export async function analyzeDTC(
  dtcCode: string, 
  vehicleInfo: VehicleData,
  freezeFrame?: FreezeFrameData
): Promise<DiagnosticAnalysis> {
  const prompt = `
    Analyze this diagnostic trouble code for a ${vehicleInfo.year} ${vehicleInfo.make} ${vehicleInfo.model}:
    
    DTC: ${dtcCode}
    Engine: ${vehicleInfo.engine || \'VQ37VHR\'}
    Mileage: ${vehicleInfo.mileage || \'Unknown\'}
    Freeze Frame: ${JSON.stringify(freezeFrame)}
    
    Provide:
    1. Detailed explanation of the fault
    2. Likely root causes (ranked by probability)
    3. Recommended diagnostic steps
    4. Estimated repair cost range (NZD)
    5. Severity level (Critical/Moderate/Minor)
    6. Can vehicle be driven safely?
  `;
  
  const result = await model.generateContent({
    contents: [{ role: \'user\', parts: [{ text: prompt }] }],
    generationConfig: { temperature: 0.7, responseMimeType: \'application/json\' }
  });
  
  return JSON.parse(result.response.text());
}

export async function interpretLiveData(
  sensorData: SensorData,
  vehicleInfo: VehicleData
): Promise<PerformanceAnalysis> {
  // Real-time analysis of sensor readings for performance/health assessment
  console.log(\'Interpreting live data for\', vehicleInfo, sensorData);
  return Promise.resolve({
    performanceSummary: "Not yet implemented.",
    anomalies: [],
    recommendations: []
  });
}

export async function suggestMaintenance(
  vehicleInfo: VehicleData,
  maintenanceHistory: MaintenanceRecord[]
): Promise<MaintenanceRecommendations> {
  // Predictive maintenance suggestions based on usage patterns
  console.log(\'Suggesting maintenance for\', vehicleInfo, maintenanceHistory);
  return Promise.resolve({
    recommendations: []
  });
}

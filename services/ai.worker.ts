import { GoogleGenAI, Type } from "@google/genai";
import { MaintenanceRecord, SensorDataPoint, TuningSuggestion, VoiceCommandIntent, DiagnosticAlert, AlertLevel, IntentAction, PredictiveAnalysisResult, GroundedResponse, SavedRaceSession, DTCInfo, ComponentHealthAnalysisResult } from '../types';

let ai: GoogleGenAI | null = null;
const isOnline = () => self.navigator.onLine;

const getPredictiveAnalysis = async (
  dataHistory: SensorDataPoint[],
  maintenanceHistory: MaintenanceRecord[]
): Promise<PredictiveAnalysisResult> => {
    if (!ai || !isOnline()) {
        await new Promise(resolve => setTimeout(resolve, 1200)); // Simulate network latency
        return { 
          timelineEvents: [
            { id: 'offline-1', level: AlertLevel.Warning, title: 'Offline: Mock Spark Plug Wear', timeframe: 'Next 3000 miles',
              details: { component: 'Spark Plugs', rootCause: 'Offline mock analysis.', recommendedActions: ['Inspect when online.'], plainEnglishSummary: "Offline mock suggestion.", tsbs: ["TSB data unavailable offline"], } }
          ]
        };
    }

    if (dataHistory.length < 2) {
        return { error: "Not enough data for trend analysis.", details: "At least two data points are required." };
    }

    const firstPoint = dataHistory[0];
    const lastPoint = dataHistory[dataHistory.length - 1];
    const durationSeconds = (lastPoint.time - firstPoint.time) / 1000;

    const dataTrendSummary = `
      - **Duration**: ${durationSeconds.toFixed(1)} seconds.
      - **RPM Range**: ${firstPoint.rpm.toFixed(0)} to ${lastPoint.rpm.toFixed(0)}.
      - **Long Term Fuel Trim Trend**: ${firstPoint.longTermFuelTrim.toFixed(1)}% to ${lastPoint.longTermFuelTrim.toFixed(1)}%.
      - **Oil Pressure Trend**: ${firstPoint.oilPressure.toFixed(1)} to ${lastPoint.oilPressure.toFixed(1)} bar.
    `;
    
    const systemInstructionForAnalysis = `You are 'KC (Karapiro Cartel)', a world-renowned race engineer and master technician specializing in predictive maintenance for high-performance vehicles, specifically a tuned 2022 Subaru WRX with 45,000 miles. Your analysis must be deeply technical, drawing correlations between disparate data points to uncover subtle, incipient failures before they occur.
- Analyze trends for anomalies (e.g., rising Long Term Fuel Trim, dropping oil pressure under load).
- Predict risks to specific components.
- Categorize the risk timeframe (e.g., 'Immediate', 'Next 1000 miles', 'Next 3 months').
- Provide a likely root cause based on the provided data.
- Suggest concrete, actionable steps for the user.
- Include a simple, plain-English summary of the problem.
- If possible, suggest relevant Technical Service Bulletin (TSB) numbers.
- You MUST output a single, valid JSON object matching the provided schema.
- If no significant issues are found, return a JSON object with an empty "timelineEvents" array.`;

    const userContent = `
        **Data Trend Summary**: ${dataTrendSummary}
        **Latest Snapshot**: RPM: ${lastPoint.rpm.toFixed(0)}, LTFT: ${lastPoint.longTermFuelTrim.toFixed(1)}%, Oil Pressure: ${lastPoint.oilPressure.toFixed(1)} bar
        **Maintenance History**: ${JSON.stringify(maintenanceHistory)}
    `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-pro",
      contents: userContent,
      config: {
        systemInstruction: systemInstructionForAnalysis,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            timelineEvents: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  id: { type: Type.STRING },
                  level: { type: Type.STRING, enum: Object.values(AlertLevel) },
                  title: { type: Type.STRING },
                  timeframe: { type: Type.STRING },
                  details: {
                    type: Type.OBJECT,
                    properties: {
                      component: { type: Type.STRING },
                      rootCause: { type: Type.STRING },
                      recommendedActions: { type: Type.ARRAY, items: { type: Type.STRING } },
                      plainEnglishSummary: { type: Type.STRING },
                      tsbs: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ["component", "rootCause", "recommendedActions", "plainEnglishSummary"],
                  }
                },
                 required: ["id", "level", "title", "timeframe", "details"],
              }
            }
          },
           required: ["timelineEvents"],
        }
      },
    });
    
    return JSON.parse(response.text);
  } catch (error) {
    console.error("Error in worker fetching predictive analysis:", error);
    return { error: "Failed to get predictive analysis.", details: error instanceof Error ? error.message : String(error) };
  }
};

const getComponentHealthAnalysis = async (payload: { dataHistory: SensorDataPoint[], maintenanceHistory: MaintenanceRecord[] }): Promise<ComponentHealthAnalysisResult> => {
    if (!ai) throw new Error("AI service not initialized.");
    const { dataHistory, maintenanceHistory } = payload;
    const latestData = dataHistory[dataHistory.length - 1];

    const systemInstruction = `You are a predictive maintenance expert for a high-performance vehicle. Your task is to analyze the provided vehicle data to estimate the health and Remaining Useful Life (RUL) of several key components. The vehicle has driven ${latestData.distance.toFixed(0)} meters (~${(latestData.distance * 0.000621371).toFixed(0)} miles).
- Analyze wear based on usage patterns (e.g., hard acceleration from G-force data, high RPM operation), age, and maintenance history.
- For each component, provide a healthScore (0-100), an RUL estimate (in miles or time), a status ('Good', 'Moderate Wear', 'Service Soon', 'Critical'), and a brief analysis summary.
- The components to analyze are: 'Front Brake Pads', 'Engine Oil', 'Battery', 'Tires'.
- Respond ONLY with the JSON object matching the schema.`;
    
    const prompt = `
        Vehicle Total Distance: ${(latestData.distance * 0.000621371).toFixed(0)} miles.
        Latest Data Snapshot: ${JSON.stringify(latestData, null, 2)}
        Maintenance History: ${JSON.stringify(maintenanceHistory, null, 2)}
        Please provide the health analysis for the specified components.
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    components: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                componentName: { type: Type.STRING },
                                healthScore: { type: Type.NUMBER },
                                rulEstimate: { type: Type.STRING },
                                status: { type: Type.STRING, enum: ['Good', 'Moderate Wear', 'Service Soon', 'Critical'] },
                                analysisSummary: { type: Type.STRING }
                            },
                             required: ["componentName", "healthScore", "rulEstimate", "status", "analysisSummary"]
                        }
                    }
                },
                required: ["components"]
            },
        }
    });

    return JSON.parse(response.text);
};

const getTuningSuggestion = async (payload: { goal: string, liveData: SensorDataPoint, currentTune: object, boostPressureOffset: number }): Promise<TuningSuggestion> => {
    if (!ai) throw new Error("AI service not initialized.");
    const { goal, liveData, currentTune, boostPressureOffset } = payload;

    const systemInstruction = `You are a master ECU tuner for a 2022 Subaru WRX. The user wants a tune for '${goal}'. Based on the live data and current tune, generate a new set of tuning parameters.
- Fuel Map: Global fuel trim percentage, from -10 to 10.
- Ignition Timing & Boost Pressure: Fill out 8x8 grids (Load % vs RPM).
- Boost Pressure Offset: You can suggest a global offset from -0.5 to 0.5 bar to apply to the entire boost map. This is useful for quick adjustments based on conditions (e.g., weather, fuel quality).
- Be realistic and safe. For 'Max Performance', be aggressive but within reasonable limits. For 'Eco Tune', prioritize efficiency.
- Provide a brief analysis of your suggested changes.
- You can choose to update the base maps, the offset, or both. If you don't want to change something, return its current value.
- Respond ONLY with the JSON object matching the schema.`;

    const prompt = `Goal: ${goal}\nCurrent Tune: ${JSON.stringify(currentTune)}\nCurrent Boost Offset: ${boostPressureOffset}\nLive Data: ${JSON.stringify(liveData)}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    suggestedParams: {
                        type: Type.OBJECT,
                        properties: {
                            fuelMap: { type: Type.NUMBER, description: 'Global fuel trim percentage, from -10 to 10.' },
                            ignitionTiming: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } }, description: '8x8 grid of ignition timing (8 rows Load, 8 cols RPM).' },
                            boostPressure: { type: Type.ARRAY, items: { type: Type.ARRAY, items: { type: Type.NUMBER } }, description: '8x8 grid of boost pressure in bar (8 rows Load, 8 cols RPM).' },
                            boostPressureOffset: { type: Type.NUMBER, description: 'Global boost pressure offset in bar, from -0.5 to 0.5.' }
                        },
                        required: ["fuelMap", "ignitionTiming", "boostPressure"],
                    },
                    analysis: {
                        type: Type.OBJECT,
                        properties: {
                            predictedGains: { type: Type.STRING },
                            potentialRisks: { type: Type.STRING },
                            safetyWarnings: { type: Type.ARRAY, items: { type: Type.STRING } },
                            educationalTip: { type: Type.STRING },
                        },
                        required: ["predictedGains", "potentialRisks"],
                    }
                },
                required: ["suggestedParams", "analysis"],
            },
        },
    });
    return JSON.parse(response.text);
};

const analyzeTuneSafety = async (payload: {currentTune: { ignitionTiming: number[][]; boostPressure: number[][] }, boostPressureOffset: number, liveData: SensorDataPoint}): Promise<{ safetyScore: number, warnings: string[] }> => {
    if (!ai) throw new Error("AI service not initialized.");
    const { currentTune, boostPressureOffset, liveData } = payload;

    const systemInstruction = `You are a master ECU tuner. Analyze the safety of the provided tune given the live sensor data. The provided 'boostPressure' map is the base map. A global 'boostPressureOffset' is also provided. The effective boost pressure is the sum of the map value and the offset. Look for dangerously high effective boost, aggressive ignition timing for the given engine load/RPM that could cause knock, or other potential issues. Provide a safety score from 0 (dangerous) to 100 (safe) and a list of specific warnings. Respond ONLY in JSON format.`;
    const prompt = `Base Tune: ${JSON.stringify(currentTune)}\nBoost Pressure Offset: ${boostPressureOffset}\nLive Data: ${JSON.stringify(liveData)}`;
    
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: {
            systemInstruction,
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    safetyScore: { type: Type.NUMBER, description: 'A safety score from 0 (very dangerous) to 100 (very safe).' },
                    warnings: { type: Type.ARRAY, items: { type: Type.STRING }, description: 'A list of specific safety concerns.' },
                },
                required: ['safetyScore', 'warnings']
            },
        },
    });
    return JSON.parse(response.text);
};

const getTuningChatResponse = async (payload: {query: string, currentTune: object, boostPressureOffset: number, liveData: SensorDataPoint}): Promise<string> => {
    if (!ai) throw new Error("AI service not initialized.");
    const { query, currentTune, boostPressureOffset, liveData } = payload;

    const systemInstruction = `You are KC, a master tuner. The user is asking a question about their current tune. Be helpful, technical, and conversational.`;
    const prompt = `Context:
- Current Base Tune: ${JSON.stringify(currentTune, null, 2)}
- Current Boost Offset: ${boostPressureOffset.toFixed(2)} bar
- Live Sensor Data: ${JSON.stringify(liveData, null, 2)}

User question: "${query}"

Your response:`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { systemInstruction },
    });
    return response.text;
};

const getVoiceCommandIntent = async (command: string): Promise<VoiceCommandIntent> => {
    if (!ai || !isOnline()) {
        // Fallback to simple regex if offline
        if (/show|display|point out/i.test(command)) {
            const match = command.match(/o2 sensor|map sensor|alternator|turbo|intake|coolant|oil filter/i);
            return { intent: IntentAction.ShowComponent, component: match ? match[0].toLowerCase().replace(/\s/g, '-') : 'turbo', confidence: 0.85 };
        }
        if (/service|maintenance/i.test(command)) { return { intent: IntentAction.QueryService, confidence: 0.9 }; }
        if (/hide|clear|reset/i.test(command)) { return { intent: IntentAction.HideComponent, confidence: 0.9 }; }
        return { intent: IntentAction.Unknown, confidence: 0.3 };
    }

    const systemInstructionForIntent = `You are an intent parser for a vehicle's AR assistant. Analyze the user's command and classify it into one of the following intents: ${Object.values(IntentAction).join(', ')}. If the intent is 'SHOW_COMPONENT', extract the component name. The valid components are: 'o2-sensor', 'map-sensor', 'alternator', 'turbo', 'intake', 'coolant', 'oil-filter'. Respond ONLY with a valid JSON object matching the schema.`;
    const prompt = `User command: "${command}"`;
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: prompt,
            config: {
                systemInstruction: systemInstructionForIntent,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        intent: { type: Type.STRING, enum: Object.values(IntentAction) },
                        component: { type: Type.STRING },
                        confidence: { type: Type.NUMBER }
                    },
                    required: ['intent', 'confidence']
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error("Error parsing voice command intent:", error);
        return { intent: IntentAction.Unknown, confidence: 0.0 };
    }
};

const generateComponentImage = async (componentName: string): Promise<string> => {
  if (!ai || !isOnline()) {
     const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="100%" height="100%" fill="#333642"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="#ffc658">Offline</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="#fff">Diagram for ${componentName}</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
  try {
    const response = await ai.models.generateImages({
      model: 'imagen-4.0-generate-001',
      prompt: `A simplified, clear, technical line drawing diagram of a car's ${componentName}. White background, black lines, minimalist style, like an engineering service manual. No text or labels.`,
      config: {
        numberOfImages: 1,
        outputMimeType: 'image/png',
        aspectRatio: '1:1',
      },
    });

    if (response.generatedImages && response.generatedImages.length > 0) {
      const base64ImageBytes: string = response.generatedImages[0].image.imageBytes;
      return `data:image/png;base64,${base64ImageBytes}`;
    } else {
      throw new Error("No image was generated by the API.");
    }
  } catch (error) {
    console.error(`Error generating image for ${componentName}:`, error);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="256" height="256" viewBox="0 0 256 256"><rect width="100%" height="100%" fill="#333642"/><text x="50%" y="45%" dominant-baseline="middle" text-anchor="middle" font-size="18" fill="#ff4d4d">Error</text><text x="50%" y="58%" dominant-baseline="middle" text-anchor="middle" font-size="14" fill="#fff">Could not generate diagram</text></svg>`;
    return `data:image/svg+xml;base64,${btoa(svg)}`;
  }
};

const getComponentTuningAnalysis = async (componentName: string, liveData: SensorDataPoint): Promise<string> => {
  if (!ai || !isOnline()) {
    return `**Offline Mode**: Cannot analyze ${componentName}.`;
  }
  const systemInstructionForTuning = `You are KC, an expert automotive performance tuner. Analyze the provided component and its live data. Provide a concise analysis (2-3 sentences) of its current state and potential tuning improvements or issues. Focus on what the live data indicates. Be direct and use markdown for formatting.`;
  const prompt = `Component: ${componentName}. Live Data Snapshot: ${JSON.stringify(liveData)}. Provide your analysis.`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: { systemInstruction: systemInstructionForTuning }
    });
    return response.text;
  } catch (error) {
    console.error(`Error generating analysis for ${componentName}:`, error);
    return `**Error**: Could not retrieve analysis for ${componentName}. Please try again.`;
  }
};

const getCoPilotResponse = async (command: string, vehicleData: SensorDataPoint, activeAlerts: DiagnosticAlert[]): Promise<string> => {
    if (!ai || !isOnline()) {
        if (/alert|warning|status/i.test(command)) {
            return "Cannot check alerts while offline.";
        }
        return "Co-pilot is offline. Please try again later.";
    }

    const systemInstructionForCopilot = `You are KC (Karapiro Cartel), a hands-free AI co-pilot in a high-performance vehicle, talking to an enthusiast driver who appreciates technical detail. Your responses should be clear and direct, but also technically rich and authoritative. Use the provided vehicle data and active alerts to give context-aware answers. For example, if the user asks "how's the car doing?" and oil pressure is low, mention that specifically. If asked for a diagnostic walkthrough for a complex fault, provide clear, step-by-step instructions. Be the expert in the passenger seat.`;
    
    const context = `
      **Current Vehicle Data:**
      - Speed: ${vehicleData.speed.toFixed(0)} km/h
      - RPM: ${vehicleData.rpm.toFixed(0)} RPM
      - Engine Temp: ${vehicleData.engineTemp.toFixed(0)}°C
      - Oil Pressure: ${vehicleData.oilPressure.toFixed(1)} bar
      - Turbo Boost: ${vehicleData.turboBoost.toFixed(2)} bar
      - Battery Voltage: ${vehicleData.batteryVoltage.toFixed(1)} V

      **Active Alerts:**
      ${activeAlerts.length > 0 ? JSON.stringify(activeAlerts) : "None"}
    `;
    
    const prompt = `Context:\n${context}\n\nDriver asks: "${command}"\n\nYour spoken response:`;

    try {
      const response = await ai.models.generateContent({
        model: "gemini-2.5-flash",
        contents: prompt,
        config: { systemInstruction: systemInstructionForCopilot }
      });
      return response.text;
    } catch (error) {
      console.error("Error fetching CoPilot response:", error);
      return "I'm having a little trouble right now. Can you ask me again?";
    }
};

const getCrewChiefResponse = async (query: string): Promise<GroundedResponse> => {
    if (!ai || !isOnline()) {
        return { text: "Crew Chief is offline. Please check your connection to search for parts.", chunks: [] };
    }
    const systemInstructionForCrewChief = `You are 'KC', a helpful Crew Chief AI. Your job is to help users find automotive parts. Use your search tool to find suppliers or information about the requested part. Provide a summary and always include the source links.`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                systemInstruction: systemInstructionForCrewChief,
                tools: [{googleSearch: {}}],
            },
        });
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text: response.text, chunks: groundingChunks };
    } catch (error) {
        console.error("Error fetching Crew Chief response:", error);
        return { text: "Sorry, I ran into an issue searching for that part. Please try again.", chunks: [] };
    }
};

const getRouteScoutResponse = async (query: string, location: { latitude: number, longitude: number }): Promise<GroundedResponse> => {
    if (!ai || !isOnline()) {
        return { text: "Route Scout is offline. Please check your connection for route suggestions.", chunks: [] };
    }
    const systemInstructionForRouteScout = `You are 'KC', an expert route scout for performance driving enthusiasts. Based on the user's current location and your access to real-time map data, suggest an interesting route in response to their query. Frame your suggestions for things like spirited drives, potential street circuits, scenic club convoys, or suitable private spots for 1/4 mile runs. Provide a conversational, helpful response and use markdown for formatting.`;

    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-flash",
            contents: query,
            config: {
                systemInstruction: systemInstructionForRouteScout,
                tools: [{googleMaps: {}}],
                toolConfig: {
                    retrievalConfig: {
                        latLng: location
                    }
                }
            },
        });

        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text: response.text, chunks: groundingChunks };
    } catch (error) {
        console.error("Error fetching Route Scout response:", error);
        return { text: "Sorry, I couldn't scout any routes right now. Please try again.", chunks: [] };
    }
};

const getRaceAnalysis = async (session: SavedRaceSession): Promise<string> => {
    if (!ai) return "AI Race Coach is unavailable.";
    
    const systemInstructionForRaceCoach = `You are 'KC', a world-class AI race engineer and driver coach. Analyze the provided race session data for a skilled enthusiast driver. Your analysis should be insightful, actionable, and encouraging.
- Start with a positive, high-level summary of the session.
- Identify the best lap and explain what made it fast (e.g., "Your best lap was Lap 3. You carried excellent speed through the chicane.").
- Pinpoint 1-2 key areas for improvement. Be specific and use data (e.g., "On your slower laps, it looks like you were braking a little too early for Turn 5, costing you a few tenths. Try using the 100m board as your braking marker.").
- Analyze performance benchmarks (0-60, 1/4 mile etc.) and comment on them.
- Conclude with an encouraging remark and a suggestion for the next session.
- Format your response using markdown for clear readability with headings and bullet points.`;
    
    // Sanitize and summarize data to send to the model
    const sessionSummary = {
        totalTime: session.totalTime,
        maxSpeed: session.maxSpeed,
        lapTimes: session.lapTimes,
        benchmarks: {
            "0-100km/h": session.zeroToHundredKmhTime,
            "0-60mph": session.zeroToSixtyMphTime,
            "1/4 Mile Time": session.quarterMileTime,
            "1/4 Mile Speed": session.quarterMileSpeed,
        }
    };

    const userContent = `Please analyze this race session data and provide coaching feedback:\n${JSON.stringify(sessionSummary, null, 2)}`;
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-2.5-pro",
            contents: userContent,
            config: { systemInstruction: systemInstructionForRaceCoach }
        });
        return response.text;
    } catch (error) {
        console.error("Error in worker fetching race analysis:", error);
        return "I'm sorry, I encountered an error while analyzing your session data.";
    }
};

const getDTCInfo = async (dtcCode: string): Promise<DTCInfo> => {
    if (!ai || !isOnline()) {
        return { code: dtcCode, description: "Could not retrieve details while offline.", severity: 'Warning', possibleCauses: ["Check your internet connection."] };
    }
    const systemInstructionForDTC = `You are an expert automotive diagnostic AI. Given a standard OBD-II Diagnostic Trouble Code (DTC), you must provide a detailed analysis. Respond ONLY with a valid JSON object matching the provided schema.`;

    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: `Analyze this DTC: ${dtcCode}`,
            config: {
                systemInstruction: systemInstructionForDTC,
                responseMimeType: 'application/json',
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        code: { type: Type.STRING },
                        description: { type: Type.STRING },
                        severity: { type: Type.STRING, enum: ['Info', 'Warning', 'Critical'] },
                        possibleCauses: { type: Type.ARRAY, items: { type: Type.STRING } },
                    },
                    required: ['code', 'description', 'severity', 'possibleCauses']
                }
            }
        });
        return JSON.parse(response.text);
    } catch (error) {
        console.error(`Error fetching info for DTC ${dtcCode}:`, error);
        return { code: dtcCode, description: "Failed to retrieve information for this code.", severity: 'Warning', possibleCauses: ["Could not connect to the AI analysis service."] };
    }
};

const generateHealthReport = async (dataHistory: SensorDataPoint[], maintenanceHistory: MaintenanceRecord[]): Promise<string> => {
    if (!ai) return "AI service is unavailable.";
    
    const systemInstruction = `You are 'KC', an expert diagnostic technician. Analyze the provided vehicle data history and maintenance log. Provide a comprehensive vehicle health report in Markdown format. Summarize the vehicle's condition, highlight any areas of concern based on data trends (e.g., fuel trims, voltages), note any overdue or upcoming maintenance, and provide a final summary of recommendations.`;
    
    // Summarize data to keep prompt concise
    const dataSummary = {
        recordCount: dataHistory.length,
        latest: dataHistory[dataHistory.length - 1],
    };

    const userContent = `Please generate a vehicle health report based on this data:\n- **Data Summary:** ${JSON.stringify(dataSummary, null, 2)}\n- **Maintenance Log:** ${JSON.stringify(maintenanceHistory, null, 2)}`;

    const response = await ai.models.generateContent({
        model: "gemini-2.5-pro",
        contents: userContent,
        config: { systemInstruction },
    });
    return response.text;
};

const analyzeImage = async (base64Image: string, mimeType: string, prompt: string): Promise<GroundedResponse> => {
    if (!ai) throw new Error("AI service not initialized.");

    const imagePart = {
        inlineData: {
            data: base64Image,
            mimeType: mimeType,
        },
    };

    const fullPrompt = `You are KC (Karapiro Cartel), an expert automotive mechanic and diagnostic technician. The user has provided an image of a car part and a question. Provide a detailed, helpful, and accurate analysis. If you see a problem, describe it clearly and suggest next steps. Use markdown for formatting.

User's question: "${prompt}"`;

    const textPart = {
        text: fullPrompt,
    };
    
    try {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-pro',
            contents: { parts: [imagePart, textPart] },
        });
        // Grounding isn't supported with images, but we check for it to be future-proof.
        const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
        return { text: response.text, chunks: groundingChunks };
    } catch (error) {
        console.error("Error analyzing image:", error);
        throw new Error("Failed to analyze the image. The model may not be able to process this image or there might be a connection issue.");
    }
};


self.onmessage = async (e: MessageEvent) => {
    // Handle initialization
    if (e.data.type === 'init') {
        const { apiKey } = e.data;
        if (apiKey) {
            try {
                ai = new GoogleGenAI({ apiKey });
                console.log("AI Worker initialized successfully.");
            } catch (error) {
                console.error("AI Worker: Failed to initialize GoogleGenAI", error);
                ai = null;
            }
        } else {
            console.error('AI Worker: API_KEY not provided in init message.');
        }
        return;
    }

    const { type, payload, requestId } = e.data;
    
    // Check if AI is initialized before processing commands
    if (!ai) {
        self.postMessage({ type: 'error', command: type, error: 'AI worker is not initialized. API_KEY might be missing or invalid.', requestId });
        return;
    }
    
    try {
        let result;
        switch (type) {
            case 'getPredictiveAnalysis':
                result = await getPredictiveAnalysis(payload.dataHistory, payload.maintenanceHistory);
                break;
            case 'getComponentHealthAnalysis':
                result = await getComponentHealthAnalysis(payload);
                break;
            case 'getTuningSuggestion':
                result = await getTuningSuggestion(payload);
                break;
            case 'analyzeTuneSafety':
                result = await analyzeTuneSafety(payload);
                break;
            case 'getTuningChatResponse':
                result = await getTuningChatResponse(payload);
                break;
            case 'getVoiceCommandIntent':
                result = await getVoiceCommandIntent(payload.command);
                break;
            case 'generateComponentImage':
                result = await generateComponentImage(payload.componentName);
                break;
            case 'getComponentTuningAnalysis':
                result = await getComponentTuningAnalysis(payload.componentName, payload.liveData);
                break;
            case 'getCoPilotResponse':
                result = await getCoPilotResponse(payload.command, payload.vehicleData, payload.activeAlerts);
                break;
            case 'getCrewChiefResponse':
                result = await getCrewChiefResponse(payload.query);
                break;
            case 'getRouteScoutResponse':
                result = await getRouteScoutResponse(payload.query, payload.location);
                break;
            case 'getRaceAnalysis':
                result = await getRaceAnalysis(payload.session);
                break;
            case 'getDTCInfo':
                result = await getDTCInfo(payload.dtcCode);
                break;
            case 'generateHealthReport':
                result = await generateHealthReport(payload.dataHistory, payload.maintenanceHistory);
                break;
            case 'analyzeImage':
                result = await analyzeImage(payload.base64Image, payload.mimeType, payload.prompt);
                break;
            default:
                throw new Error(`Unknown worker command: ${type}`);
        }
        self.postMessage({ type: 'success', command: type, result, requestId });
    } catch (error) {
        let errorMessage = error instanceof Error ? error.message : String(error);
        if (errorMessage.toLowerCase().includes('network error') || errorMessage.toLowerCase().includes('failed to fetch')) {
            errorMessage = 'Failed to connect to AI services. Please check your internet connection and try again.';
        }
        self.postMessage({ type: 'error', command: type, error: errorMessage, requestId });
    }
};
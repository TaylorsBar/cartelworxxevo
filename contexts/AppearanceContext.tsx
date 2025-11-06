import React, { createContext, useState, useEffect, useMemo, useCallback } from 'react';
import type { UnitSystem as TUnitSystem } from '../types';

// Re-export types for external use
export type { UnitSystem } from '../types';
export type Theme = 'unified-dark' | 'cyberpunk-legacy' | 'modern' | 'classic' | 'haltech' | 'minimalist' | 'ic7' | 'rally';
export type Accent = 'cyan' | 'magenta' | 'green' | 'yellow' | 'red' | 'white';
export type LEDMode = 'solid' | 'pulse' | 'music';
export type CopilotAudioOutput = 'phone' | 'stereo';

export interface LEDSettings {
  isOn: boolean;
  color: string; // hex color
  brightness: number; // 0-100
  mode: LEDMode;
}

interface AppearanceContextProps {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  accent: Accent;
  setAccent: (accent: Accent) => void;
  ledSettings: LEDSettings;
  setLedSettings: (settings: Partial<LEDSettings>) => void;
  copilotAudioOutput: CopilotAudioOutput;
  setCopilotAudioOutput: (output: CopilotAudioOutput) => void;
  unitSystem: TUnitSystem;
  setUnitSystem: (system: TUnitSystem) => void;
}

// --- DEFAULT VALUES --- //
const defaultLedSettings: LEDSettings = {
    isOn: true,
    color: '#00e5ff', // Default to the unified-dark accent color
    brightness: 80,
    mode: 'solid',
};

// --- CONTEXT CREATION --- //
export const AppearanceContext = createContext<AppearanceContextProps>({
  theme: 'unified-dark',
  setTheme: () => {},
  accent: 'cyan',
  setAccent: () => {},
  ledSettings: defaultLedSettings,
  setLedSettings: () => {},
  copilotAudioOutput: 'phone',
  setCopilotAudioOutput: () => {},
  unitSystem: 'metric',
  setUnitSystem: () => {},
});

// --- THEME & ACCENT MANAGEMENT --- //

// Define accent colors corresponding to the Accent type
const accentColors: Record<Accent, string> = {
  cyan: '#00e5ff',
  magenta: '#ff00ff',
  green: '#00ff7f',
  yellow: '#f3ff58',
  red: '#ff4d6b',
  white: '#f0f4f8',
};

/**
 * Applies theme and accent colors to the DOM.
 * This function now handles both theme attributes and dynamic accent color properties.
 */
const applyAppearance = (theme: Theme, accent: Accent) => {
  const root = document.documentElement;
  root.setAttribute('data-theme', theme);
  root.setAttribute('data-accent', accent);

  const accentColor = accentColors[accent] || accentColors.cyan;
  root.style.setProperty('--theme-accent-primary', accentColor);
};

// --- PROVIDER COMPONENT --- //

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => 
      (localStorage.getItem('app-theme') as Theme) || 'unified-dark'
  );
  const [accent, setAccentState] = useState<Accent>(() => 
      (localStorage.getItem('app-accent') as Accent) || 'cyan'
  );
  const [ledSettings, setLedSettingsState] = useState<LEDSettings>(() => {
      const saved = localStorage.getItem('app-led-settings');
      return saved ? JSON.parse(saved) : defaultLedSettings;
  });
  const [copilotAudioOutput, setCopilotAudioOutputState] = useState<CopilotAudioOutput>(() => 
    (localStorage.getItem('app-copilot-audio') as CopilotAudioOutput) || 'phone'
  );
  const [unitSystem, setUnitSystemState] = useState<TUnitSystem>(() => 
    (localStorage.getItem('app-unit-system') as TUnitSystem) || 'metric'
  );

  // --- EFFECT HOOKS to apply and persist changes --- //

  useEffect(() => {
    applyAppearance(theme, accent);
    localStorage.setItem('app-theme', theme);
  }, [theme, accent]); // Rerun when theme or accent changes

  useEffect(() => {
    localStorage.setItem('app-accent', accent);
  }, [accent]);
  
  useEffect(() => {
    localStorage.setItem('app-led-settings', JSON.stringify(ledSettings));
    const root = document.documentElement;
    if (ledSettings.isOn) {
        const { color, brightness } = ledSettings;
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const glowColor = `rgba(${r}, ${g}, ${b}, ${brightness / 100 * 0.7})`;
        root.style.setProperty('--theme-ambient-glow-color', glowColor);
    } else {
        root.style.setProperty('--theme-ambient-glow-color', 'transparent');
    }
  }, [ledSettings]);

  useEffect(() => {
    localStorage.setItem('app-copilot-audio', copilotAudioOutput);
  }, [copilotAudioOutput]);

  useEffect(() => {
    localStorage.setItem('app-unit-system', unitSystem);
  }, [unitSystem]);

  // --- STATE SETTER FUNCTIONS with callbacks --- //

  const setTheme = useCallback((newTheme: Theme) => {
    setThemeState(newTheme);
  }, []);
  
  const setAccent = useCallback((newAccent: Accent) => {
    setAccentState(newAccent);
  }, []);
  
  const setLedSettings = useCallback((newSettings: Partial<LEDSettings>) => {
    setLedSettingsState(prev => ({ ...prev, ...newSettings }));
  }, []);
  
  const setCopilotAudioOutput = useCallback((newOutput: CopilotAudioOutput) => {
      setCopilotAudioOutputState(newOutput);
  }, []);

  const setUnitSystem = useCallback((newSystem: TUnitSystem) => {
    setUnitSystemState(newSystem);
  }, []);

  // Memoize context value to prevent unnecessary re-renders
  const value = useMemo(() => ({
    theme,
    setTheme,
    accent,
    setAccent,
    ledSettings,
    setLedSettings,
    copilotAudioOutput,
    setCopilotAudioOutput,
    unitSystem,
    setUnitSystem,
  }), [theme, setTheme, accent, setAccent, ledSettings, setLedSettings, copilotAudioOutput, setCopilotAudioOutput, unitSystem, setUnitSystem]);

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
};
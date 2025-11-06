import React, { createContext, useState, useEffect, useMemo } from 'react';
// FIX: Re-export UnitSystem so other modules can import it from this context file.
// Use an alias `TUnitSystem` for internal use to avoid naming conflicts.
import type { UnitSystem as TUnitSystem } from '../types';
export type { UnitSystem } from '../types';

export type Theme = 'rally' | 'modern' | 'classic' | 'haltech' | 'minimalist' | 'ic7';
export type AccentMaterial = 'cyan' | 'brushed-brass' | 'satin-brass' | 'antique-brass' | 'carbon-fiber';
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
  accentMaterial: AccentMaterial;
  setAccentMaterial: (material: AccentMaterial) => void;
  ledSettings: LEDSettings;
  setLedSettings: (settings: Partial<LEDSettings>) => void;
  copilotAudioOutput: CopilotAudioOutput;
  setCopilotAudioOutput: (output: CopilotAudioOutput) => void;
  unitSystem: TUnitSystem;
  setUnitSystem: (system: TUnitSystem) => void;
}

const defaultLedSettings: LEDSettings = {
    isOn: true,
    color: '#00FFFF',
    brightness: 80,
    mode: 'solid',
};

export const AppearanceContext = createContext<AppearanceContextProps>({
  theme: 'rally',
  setTheme: () => {},
  accentMaterial: 'cyan',
  setAccentMaterial: () => {},
  ledSettings: defaultLedSettings,
  setLedSettings: () => {},
  copilotAudioOutput: 'phone',
  setCopilotAudioOutput: () => {},
  unitSystem: 'metric',
  setUnitSystem: () => {},
});

export const AppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [theme, setThemeState] = useState<Theme>(() => {
      return (localStorage.getItem('vehicle-theme') as Theme) || 'rally';
  });
  const [accentMaterial, setAccentMaterialState] = useState<AccentMaterial>(() => {
      return (localStorage.getItem('vehicle-accent-material') as AccentMaterial) || 'cyan';
  });
  const [ledSettings, setLedSettingsState] = useState<LEDSettings>(() => {
      const saved = localStorage.getItem('vehicle-led-settings');
      return saved ? JSON.parse(saved) : defaultLedSettings;
  });
  const [copilotAudioOutput, setCopilotAudioOutputState] = useState<CopilotAudioOutput>(() => {
    return (localStorage.getItem('vehicle-copilot-audio') as CopilotAudioOutput) || 'phone';
  });
  const [unitSystem, setUnitSystemState] = useState<TUnitSystem>(() => {
    return (localStorage.getItem('vehicle-unit-system') as TUnitSystem) || 'metric';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('vehicle-theme', theme);
  }, [theme]);
  
  useEffect(() => {
    document.documentElement.setAttribute('data-material', accentMaterial);
    localStorage.setItem('vehicle-accent-material', accentMaterial);
  }, [accentMaterial]);
  
  useEffect(() => {
    localStorage.setItem('vehicle-led-settings', JSON.stringify(ledSettings));
    const { isOn, color, brightness } = ledSettings;
    if (isOn) {
        // Construct RGBA color for the glow
        const r = parseInt(color.slice(1, 3), 16);
        const g = parseInt(color.slice(3, 5), 16);
        const b = parseInt(color.slice(5, 7), 16);
        const glowColor = `rgba(${r}, ${g}, ${b}, ${brightness / 100 * 0.8})`;
        document.documentElement.style.setProperty('--theme-ambient-glow-color', glowColor);
    } else {
        document.documentElement.style.setProperty('--theme-ambient-glow-color', 'transparent');
    }
  }, [ledSettings]);

  useEffect(() => {
    localStorage.setItem('vehicle-copilot-audio', copilotAudioOutput);
  }, [copilotAudioOutput]);

  useEffect(() => {
    localStorage.setItem('vehicle-unit-system', unitSystem);
  }, [unitSystem]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
  };
  
  const setAccentMaterial = (newMaterial: AccentMaterial) => {
    setAccentMaterialState(newMaterial);
  };
  
  const setLedSettings = (newSettings: Partial<LEDSettings>) => {
    setLedSettingsState(prev => ({ ...prev, ...newSettings }));
  };
  
  const setCopilotAudioOutput = (newOutput: CopilotAudioOutput) => {
      setCopilotAudioOutputState(newOutput);
  }

  const setUnitSystem = (newSystem: TUnitSystem) => {
    setUnitSystemState(newSystem);
  };

  const value = useMemo(() => ({
    theme,
    setTheme,
    accentMaterial,
    setAccentMaterial,
    ledSettings,
    setLedSettings,
    copilotAudioOutput,
    setCopilotAudioOutput,
    unitSystem,
    setUnitSystem,
  }), [theme, accentMaterial, ledSettings, copilotAudioOutput, unitSystem]);

  return (
    <AppearanceContext.Provider value={value}>
      {children}
    </AppearanceContext.Provider>
  );
};

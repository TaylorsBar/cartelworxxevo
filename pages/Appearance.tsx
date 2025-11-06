import React, { useContext } from 'react';
import { AppearanceContext, Theme, Accent, LEDMode, UnitSystem } from '../contexts/AppearanceContext';
import { CheckIcon } from '@heroicons/react/20/solid';

// --- CONFIGURATION DATA --- //

const themes: { id: Theme; name: string }[] = [
    { id: 'unified-dark', name: 'Unified Dark' },
    { id: 'cyberpunk-legacy', name: 'Cyberpunk Legacy' },
    { id: 'modern', name: 'Modern Performance' },
    { id: 'classic', name: 'Classic Muscle' },
    { id: 'haltech', name: 'Pro Tuner' },
    { id: 'minimalist', name: 'Minimalist EV' },
    { id: 'ic7', name: 'Race Dash IC-7' },
];

const accents: { id: Accent; name: string; style: React.CSSProperties }[] = [
    { id: 'cyan', name: 'Hyper Cyan', style: { backgroundColor: '#00e5ff' } },
    { id: 'magenta', name: 'Nitro Magenta', style: { backgroundColor: '#ff00ff' } },
    { id: 'green', name: 'Krypton Green', style: { backgroundColor: '#00ff7f' } },
    { id: 'yellow', name: 'Cyber Yellow', style: { backgroundColor: '#f3ff58' } },
    { id: 'red', name: 'Racing Red', style: { backgroundColor: '#ff4d6b' } },
    { id: 'white', name: 'Clean White', style: { backgroundColor: '#f0f4f8' } },
];

const ledModes: { id: LEDMode, name: string }[] = [
    { id: 'solid', name: 'Solid' },
    { id: 'pulse', name: 'Pulse' },
    { id: 'music', name: 'Music Sync' },
];

const unitSystems: { id: UnitSystem, name: string }[] = [
    { id: 'metric', name: 'Metric (km/h)' },
    { id: 'imperial', name: 'Imperial (mph)' },
];

// --- HELPER COMPONENTS --- //

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="glass-panel p-6">
        <h2 className="text-lg font-semibold border-b border-[var(--glass-border)] pb-3 mb-6 font-display text-[var(--theme-text-primary)]">{title}</h2>
        {children}
    </div>
);

interface SelectButtonProps<T> {
    item: { id: T; name: string };
    selectedItem: T;
    onClick: (id: T) => void;
    children: React.ReactNode;
}

function SelectButton<T>({ item, selectedItem, onClick, children }: SelectButtonProps<T>) {
    const isSelected = item.id === selectedItem;
    return (
        <div
            onClick={() => onClick(item.id)}
            className={`p-4 rounded-lg cursor-pointer border-2 transition-all duration-200 ${isSelected ? 'border-[var(--theme-accent-primary)] shadow-glow-theme bg-white/5' : 'border-transparent bg-white/5 hover:border-white/20'}`}
        >
            {children}
        </div>
    );
}

// --- MAIN COMPONENT --- //

const Appearance: React.FC = () => {
    const { 
        theme, setTheme, 
        accent, setAccent, 
        ledSettings, setLedSettings,
        unitSystem, setUnitSystem
    } = useContext(AppearanceContext);

    return (
        <div className="space-y-6 p-4">
            <div>
                <h1 className="text-2xl font-bold text-[var(--theme-text-primary)] font-display">Appearance</h1>
                <p className="text-[var(--theme-text-secondary)] mt-1">Customize the look, feel, and units of your interface.</p>
            </div>

            <Section title="Unit System">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {unitSystems.map(u => (
                         <button
                            key={u.id}
                            onClick={() => setUnitSystem(u.id)}
                            className={`px-4 py-3 rounded-lg font-semibold text-base transition-all border-2 ${unitSystem === u.id ? 'border-[var(--theme-accent-primary)] text-white shadow-glow-theme bg-[var(--theme-accent-primary)]/20' : 'border-white/10 bg-transparent text-[var(--theme-text-secondary)] hover:border-white/30 hover:text-white'}`}
                        >
                            {u.name}
                        </button>
                    ))}
                </div>
            </Section>

            <Section title="Dashboard Theme">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {themes.map(t => (
                        <SelectButton key={t.id} item={t} selectedItem={theme} onClick={setTheme}>
                            <h3 className="font-bold text-[var(--theme-text-primary)]">{t.name}</h3>
                        </SelectButton>
                    ))}
                </div>
            </Section>

            <Section title="Accent Color">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-4">
                    {accents.map(a => (
                        <div key={a.id} onClick={() => setAccent(a.id)} className="flex flex-col items-center cursor-pointer group">
                            <div
                                style={a.style}
                                className={`w-20 h-20 rounded-full border-4 flex items-center justify-center transition-all duration-200 ${accent === a.id ? 'border-white shadow-glow-theme' : 'border-transparent group-hover:scale-105'}`}
                            >
                                {accent === a.id && <CheckIcon className="w-10 h-10 text-black" />}
                            </div>
                            <p className={`mt-3 font-semibold transition-colors duration-200 ${accent === a.id ? 'text-[var(--theme-accent-primary)]' : 'text-[var(--theme-text-secondary)] group-hover:text-white'}`}>{a.name}</p>
                        </div>
                    ))}
                </div>
            </Section>

            <Section title="Interior Ambient Lighting">
                 <div className="flex justify-between items-center pb-3 mb-6">
                    <h3 className="text-md font-semibold text-[var(--theme-text-primary)]">Ambient Lighting</h3>
                     <div className="flex items-center">
                        <span className={`mr-3 text-sm font-medium ${ledSettings.isOn ? 'text-[var(--theme-text-primary)]' : 'text-[var(--theme-text-secondary)]'}`}>
                            {ledSettings.isOn ? 'On' : 'Off'}
                        </span>
                        <button
                            onClick={() => setLedSettings({ isOn: !ledSettings.isOn })}
                            className={`relative inline-flex flex-shrink-0 h-6 w-11 border-2 border-transparent rounded-full cursor-pointer transition-colors ease-in-out duration-200 focus:outline-none ${ledSettings.isOn ? 'bg-[var(--theme-accent-primary)]' : 'bg-white/10'}`}
                            role="switch"
                            aria-checked={ledSettings.isOn}
                        >
                            <span className={`pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow-lg transform ring-0 transition ease-in-out duration-200 ${ledSettings.isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                        </button>
                    </div>
                </div>
                
                <div className={`space-y-6 transition-opacity ${!ledSettings.isOn ? 'opacity-40 pointer-events-none' : ''}`}>
                    <div>
                        <h3 className="text-md font-semibold text-[var(--theme-text-secondary)] mb-3">Color</h3>
                        <div className="flex flex-wrap gap-4">
                            {accents.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => setLedSettings({ color: c.style.backgroundColor as string })}
                                    className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${ledSettings.color === c.style.backgroundColor ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                                    style={{ backgroundColor: c.style.backgroundColor }}
                                    aria-label={c.name}
                                />
                            ))}
                        </div>
                    </div>

                    <div>
                        <label htmlFor="brightness" className="block text-md font-semibold text-[var(--theme-text-secondary)] mb-2">Brightness</label>
                        <div className="flex items-center space-x-4">
                            <input
                                type="range"
                                id="brightness"
                                min="0"
                                max="100"
                                value={ledSettings.brightness}
                                onChange={e => setLedSettings({ brightness: parseInt(e.target.value) })}
                                className="w-full h-2 bg-black/20 rounded-lg appearance-none cursor-pointer accent-[var(--theme-accent-primary)]"
                            />
                            <span className="font-mono text-lg w-12 text-right text-[var(--theme-text-primary)]">{ledSettings.brightness}%</span>
                        </div>
                    </div>
                    
                     <div>
                        <h3 className="text-md font-semibold text-[var(--theme-text-secondary)] mb-3">Mode</h3>
                        <div className="flex flex-wrap gap-4">
                            {ledModes.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => setLedSettings({ mode: m.id })}
                                    className={`px-4 py-2 rounded-lg font-semibold text-sm transition-all ${ledSettings.mode === m.id ? 'bg-[var(--theme-accent-primary)] text-black shadow-md' : 'bg-white/10 text-[var(--theme-text-secondary)] hover:bg-white/20'}`}
                                >
                                    {m.name}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </Section>
        </div>
    );
};

export default Appearance;

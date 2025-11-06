import React, { useState } from 'react';
import { TrainingModule, TrainingModuleId } from '../types';
import { useTrainingStore } from '../hooks/useVehicleData';
import GlassCard from '../components/Header';
import BadgeCheckIcon from '../components/gauges/EdelbrockGauge';
import LockClosedIcon from '../components/gauges/BarMeter';

const CURRICULUM: TrainingModule[] = [
    {
        id: 'obd-basics',
        level: 1,
        title: 'OBD-II Foundations',
        description: 'Build user confidence with the basics of vehicle diagnostics.',
        unlocks: ['Live PID Dashboard'],
        lessons: [
            { title: 'What is OBD-II?', content: 'History, purpose, and the 16-pin DLC connector.' },
            { title: 'Understanding PIDs & Modes', content: 'Mode 01 basics, common PIDs (RPM, speed, coolant).' }
        ],
        badge: 'OBD Explorer'
    },
    {
        id: 'dtc-diagnostics',
        level: 2,
        title: 'Diagnostic Trouble Codes',
        description: 'Learn how to read and interpret fault codes safely.',
        unlocks: ['DTC Read/Clear', 'Freeze-Frame Data'],
        lessons: [
            { title: 'What are DTCs?', content: 'Structure (P0xxx, etc.), generic vs. manufacturer-specific.' },
            { title: 'Freeze-Frame Data', content: 'Capturing conditions when a fault occurs.' },
            { title: 'Clearing Codes Responsibly', content: 'Risks of clearing codes without fixing the root cause.' }
        ],
        badge: 'Diagnostic Pro'
    },
    {
        id: 'oem-insights',
        level: 3,
        title: 'OEM-Level Insights',
        description: 'Access manufacturer-specific data via UDS/ISO-TP.',
        unlocks: ['VIN & Calibration ID Reading', 'Advanced Telemetry (Oil Temp, Boost)'],
        lessons: [
            { title: 'UDS & ISO-TP Basics', content: 'How OEMs extend diagnostics beyond standard OBD-II.' },
            { title: 'Reading Vehicle Identifiers', content: 'Why VIN and calibration verification matters.' },
            { title: 'Accessing Advanced DIDs', content: 'Reading oil temp, boost, steering angle.' }
        ],
        badge: 'OEM Specialist'
    },
    {
        id: 'predictive-maintenance',
        level: 4,
        title: 'Predictive Maintenance',
        description: 'Understand how predictive models forecast component health.',
        unlocks: ['Component Health Scoring', 'Anomaly Detection', 'RUL Predictions'],
        lessons: [
            { title: 'From Reactive to Predictive', content: 'How AI models detect component wear.' },
            { title: 'Remaining Useful Life (RUL)', content: 'Example: Brake pad life estimation from driving style.' },
            { title: 'Anomaly Detection', content: 'Spotting abnormal fuel trims or misfire trends.' }
        ],
        badge: 'Predictive Analyst'
    },
    {
        id: 'advanced-performance',
        level: 5,
        title: 'Performance & Pro Diagnostics',
        description: 'Unlock professional-grade tools for enthusiasts and technicians.',
        unlocks: ['Track Camera Overlay', 'Session History & Comparison', 'Leaderboards'],
        lessons: [
            { title: 'Bi-Directional Tests', content: 'Safely using actuator tests like fan activation.' },
            { title: 'Performance Benchmarking', content: '0-100 km/h, lap timing, and data overlays.' },
            { title: 'CAN Bus Deep Dive', content: 'Introduction to raw CAN frames and reverse engineering.' }
        ],
        badge: 'Performance Engineer'
    }
];

const Training: React.FC = () => {
    const { completedModules, completeModule, isModuleLocked } = useTrainingStore();
    const [showQuizModal, setShowQuizModal] = useState<TrainingModule | null>(null);

    const handleTakeQuiz = (module: TrainingModule) => {
        setShowQuizModal(module);
    };

    const handleCompleteQuiz = () => {
        if (showQuizModal) {
            completeModule(showQuizModal.id);
            setShowQuizModal(null);
        }
    };

    const allModulesComplete = CURRICULUM.every(m => completedModules.has(m.id));

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Training Center</h1>
                <p className="text-gray-400 mt-1">Unlock professional features by completing training modules.</p>
            </div>

            {allModulesComplete && (
                <GlassCard className="p-6 bg-gradient-to-r from-[var(--theme-accent-primary)]/20 to-transparent animate-fade-in">
                    <div className="flex items-center gap-4">
                        <BadgeCheckIcon className="w-16 h-16 text-[var(--theme-accent-primary)]" />
                        <div>
                            <h2 className="text-xl font-bold font-display text-white">Pro Diagnostic Certified!</h2>
                            <p className="text-gray-300">Congratulations! You've completed all training modules and unlocked the full potential of the app.</p>
                        </div>
                    </div>
                </GlassCard>
            )}

            <div className="space-y-4">
                {CURRICULUM.map(module => {
                    const isCompleted = completedModules.has(module.id);
                    const isLocked = isModuleLocked(module.id, CURRICULUM);
                    return (
                        <GlassCard key={module.id} className={`p-6 transition-all duration-300 ${isLocked ? 'opacity-50' : ''}`}>
                            <div className="flex flex-col md:flex-row items-start gap-6">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-4 mb-2">
                                        <span className="text-sm font-bold text-[var(--theme-accent-primary)] bg-[var(--theme-accent-primary)]/10 px-2 py-1 rounded">LEVEL {module.level}</span>
                                        <h2 className="text-xl font-bold font-display text-white">{module.title}</h2>
                                    </div>
                                    <p className="text-gray-400 mb-4">{module.description}</p>
                                    <div className="space-y-2">
                                        <h4 className="text-sm font-semibold text-gray-300">Lessons:</h4>
                                        <ul className="list-disc list-inside text-gray-400 space-y-1">
                                            {module.lessons.map(lesson => <li key={lesson.title}>{lesson.title}</li>)}
                                        </ul>
                                    </div>
                                </div>
                                <div className="w-full md:w-64 flex-shrink-0 bg-base-900/50 p-4 rounded-lg">
                                    <h4 className="text-sm font-semibold text-gray-300 mb-2">Unlocks:</h4>
                                    <ul className="space-y-2">
                                        {module.unlocks.map(feature => (
                                            <li key={feature} className="flex items-center gap-2 text-gray-300">
                                                <BadgeCheckIcon className="w-5 h-5 text-[var(--theme-accent-primary)]" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="w-full md:w-48 flex-shrink-0 flex flex-col items-center justify-center text-center">
                                    {isCompleted ? (
                                        <div className="text-green-400 flex flex-col items-center gap-2">
                                            <BadgeCheckIcon className="w-12 h-12" />
                                            <span className="font-bold">Completed</span>
                                            <span className="text-xs text-gray-400">"{module.badge}" Badge Earned</span>
                                        </div>
                                    ) : isLocked ? (
                                        <div className="text-gray-500 flex flex-col items-center gap-2">
                                            <LockClosedIcon className="w-12 h-12" />
                                            <span className="font-bold">Locked</span>
                                            <span className="text-xs">Complete previous level</span>
                                        </div>
                                    ) : (
                                        <button onClick={() => handleTakeQuiz(module)} className="btn btn-action">
                                            Take Quiz
                                        </button>
                                    )}
                                </div>
                            </div>
                        </GlassCard>
                    );
                })}
            </div>

            {showQuizModal && (
                <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={() => setShowQuizModal(null)}>
                    <div className="w-full max-w-md bg-base-900 rounded-lg border border-[var(--theme-accent-primary)] shadow-lg p-6" onClick={(e) => e.stopPropagation()}>
                        <h2 className="text-xl font-bold font-display text-[var(--theme-accent-primary)]">Quiz: {showQuizModal.title}</h2>
                        <p className="text-gray-400 my-4">This is a mock quiz to simulate learning. In a real app, this would contain questions about the module's lessons.</p>
                        <div className="flex justify-end gap-4">
                            <button onClick={() => setShowQuizModal(null)} className="btn btn-secondary">Cancel</button>
                            <button onClick={handleCompleteQuiz} className="btn btn-success">Complete & Unlock</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Training;
import React, { useState } from 'react';
import { useVehicleStore } from '../store/useVehicleStore';
import { HederaRecord, HederaEventType } from '../types';

const Hedera: React.FC = () => {
    const hederaLog = useVehicleStore(state => state.hederaLog);
    const [verifyingRecordId, setVerifyingRecordId] = useState<string | null>(null);
    const [verificationStatus, setVerificationStatus] = useState<{ [key: string]: 'success' | 'fail' }>({});

    const handleVerify = async (recordId: string) => {
        setVerifyingRecordId(recordId);
        // Simulate hash check against DLT
        await new Promise(resolve => setTimeout(resolve, 1000));
        setVerificationStatus(prev => ({ ...prev, [recordId]: 'success' }));
        setVerifyingRecordId(null);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-100 font-display">Hedera DLT Integration</h1>
                <p className="text-gray-400 mt-1">Creating an immutable, tamper-proof audit trail for your vehicle's history.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-black text-center p-4 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg">
                    <p className="text-sm text-gray-400">Network Status</p>
                    <p className="font-semibold text-green-400">Connected to Mainnet</p>
                </div>
                <div className="bg-black text-center p-4 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg">
                    <p className="text-sm text-gray-400">Account ID</p>
                    <p className="font-mono text-gray-200">0.0.12345</p>
                </div>
                <div className="bg-black text-center p-4 rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg">
                    <p className="text-sm text-gray-400">Balance</p>
                    <p className="font-mono text-gray-200">4,501.2345 HBAR</p>
                </div>
            </div>

            {/* Recent Records */}
            <div className="bg-black rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg">
                <div className="p-4 border-b border-[var(--theme-accent-primary)]/30">
                    <h2 className="text-lg font-semibold text-gray-100 font-display">Recent Immutable Records</h2>
                    <p className="text-sm text-gray-400 mt-1">Records are automatically created for significant events like maintenance and tuning changes.</p>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-base-700/50">
                        <thead className="bg-base-800/50">
                            <tr>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Timestamp</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Event</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Summary</th>
                                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Verification</th>
                            </tr>
                        </thead>
                        <tbody className="bg-black divide-y divide-base-700/50">
                            {hederaLog.length > 0 ? hederaLog.map(rec => (
                                <tr key={rec.id} className="hover:bg-base-800/40">
                                    <td className="px-4 py-4 whitespace-nowrap text-sm font-mono text-gray-400">{rec.timestamp}</td>
                                    <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-200">{rec.eventType}</td>
                                    <td className="px-4 py-4 text-sm text-gray-300 max-w-xs truncate" title={rec.summary}>{rec.summary}</td>
                                    <td className="px-4 py-4 whitespace-nowrap">
                                        {verificationStatus[rec.id] === 'success' ? (
                                             <span className="inline-flex items-center text-green-400">
                                                <svg className="w-5 h-5 mr-1" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"></path></svg>
                                                Verified
                                            </span>
                                        ) : (
                                            <button onClick={() => handleVerify(rec.id)} disabled={verifyingRecordId === rec.id} className="bg-base-700 text-gray-200 px-3 py-1 text-xs font-semibold rounded-md hover:bg-base-600 disabled:opacity-50">
                                                {verifyingRecordId === rec.id ? 'Verifying...' : 'Verify'}
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            )) : (
                                <tr>
                                    <td colSpan={4} className="text-center py-10 text-gray-500">No DLT records found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default Hedera;
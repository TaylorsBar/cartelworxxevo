import React, { useState } from 'react';
import { useVehicleStore } from '../store/useVehicleStore';
import { generateHealthReport } from '../services/geminiService';
import { MaintenanceRecord } from '../types';
import VerifiedIcon from '../components/icons/VerifiedIcon';
import ReactMarkdown from 'react-markdown';

const AddRecordModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
    const addMaintenanceRecord = useVehicleStore(state => state.addMaintenanceRecord);
    const [service, setService] = useState('');
    const [notes, setNotes] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (service.trim() && notes.trim()) {
            addMaintenanceRecord({ service, notes });
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-md bg-base-900 rounded-lg border border-[var(--theme-accent-primary)] shadow-lg" onClick={(e) => e.stopPropagation()}>
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <h2 className="text-xl font-bold font-display text-[var(--theme-accent-primary)]">Add New Maintenance Record</h2>
                    <div>
                        <label htmlFor="service" className="block text-sm font-medium text-gray-300 mb-1">Service Performed</label>
                        <input type="text" id="service" value={service} onChange={e => setService(e.target.value)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200" required />
                    </div>
                    <div>
                        <label htmlFor="notes" className="block text-sm font-medium text-gray-300 mb-1">Notes</label>
                        <textarea id="notes" value={notes} onChange={e => setNotes(e.target.value)} className="w-full bg-base-800 border border-base-700 rounded-md px-3 py-2 text-gray-200" rows={3} required />
                    </div>
                    <div className="flex justify-end gap-4 pt-2">
                        <button type="button" onClick={onClose} className="btn btn-secondary">Cancel</button>
                        <button type="submit" className="btn btn-action">Save Record</button>
                    </div>
                </form>
            </div>
        </div>
    );
};

const HealthReportModal: React.FC<{ onClose: () => void, report: string, isLoading: boolean }> = ({ onClose, report, isLoading }) => {
    return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4" onClick={onClose}>
            <div className="w-full max-w-3xl h-[80vh] bg-base-900 rounded-lg border border-[var(--theme-accent-primary)] shadow-lg flex flex-col" onClick={(e) => e.stopPropagation()}>
                <div className="p-4 border-b border-[var(--theme-accent-primary)]/30 flex justify-between items-center">
                    <h2 className="text-xl font-bold font-display text-[var(--theme-accent-primary)]">AI Vehicle Health Report</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white text-2xl">&times;</button>
                </div>
                <div className="p-6 flex-grow overflow-y-auto">
                    {isLoading ? (
                        <div className="flex items-center justify-center h-full">
                            <div className="loader ease-linear rounded-full border-4 border-t-4 border-gray-200 h-12 w-12 animate-spin border-t-[var(--theme-accent-primary)]"></div>
                        </div>
                    ) : (
                        <div className="prose prose-invert max-w-none">
                             <ReactMarkdown>{report}</ReactMarkdown>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};


const MaintenanceLog: React.FC = () => {
    const { maintenanceLog, vehicleDataHistory } = useVehicleStore(state => ({
        maintenanceLog: state.maintenanceLog,
        vehicleDataHistory: state.data
    }));
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isReportModalOpen, setIsReportModalOpen] = useState(false);
    const [report, setReport] = useState('');
    const [isReportLoading, setIsReportLoading] = useState(false);

    const handleGenerateReport = async () => {
        setIsReportModalOpen(true);
        setIsReportLoading(true);
        setReport('');
        try {
            const result = await generateHealthReport(vehicleDataHistory, maintenanceLog);
            setReport(result);
        } catch (e) {
            setReport("Sorry, there was an error generating the health report. Please check your connection and try again.");
        } finally {
            setIsReportLoading(false);
        }
    };

    return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
            <h1 className="text-2xl font-bold text-gray-100 font-display">Maintenance Logbook</h1>
            <p className="text-gray-400 mt-1">An immutable record of your vehicle's service history.</p>
        </div>
        <button onClick={() => setIsAddModalOpen(true)} className="btn btn-primary">
            Add New Record
        </button>
      </div>
      
      <div className="bg-black rounded-lg border border-[var(--theme-accent-primary)]/30 shadow-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-base-700/50">
            <thead className="bg-base-800/50">
              <tr>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Date</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Service / Recommendation</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Notes</th>
                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Status</th>
              </tr>
            </thead>
            <tbody className="bg-black divide-y divide-base-700/50">
              {maintenanceLog.length > 0 ? maintenanceLog.map((log) => (
                <tr key={log.id} className="hover:bg-base-800/40">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-300">{log.date}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-200">
                    <div className="flex items-center">
                      {log.isAiRecommendation && <span className="text-[var(--theme-accent-primary)] mr-2 font-mono text-xs">[AI]</span>}
                      {log.isAiRecommendation ? <span className="text-[var(--theme-accent-primary)]">{log.service}</span> : log.service}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-400">{log.notes}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {log.verified ? (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-900/50 text-green-400 border border-green-700">
                        <VerifiedIcon className="w-4 h-4 mr-1.5 text-green-400" />
                        Verified
                      </span>
                    ) : (
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-900/50 text-yellow-400 border border-yellow-700">
                        Pending
                      </span>
                    )}
                  </td>
                </tr>
              )) : (
                <tr>
                    <td colSpan={4} className="text-center py-10 text-gray-500">No maintenance records found.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
       <div className="text-center mt-4">
        <button onClick={handleGenerateReport} className="text-[var(--theme-accent-primary)] font-semibold hover:underline">
            Generate Vehicle Health Report
        </button>
      </div>
      {isAddModalOpen && <AddRecordModal onClose={() => setIsAddModalOpen(false)} />}
      {isReportModalOpen && <HealthReportModal onClose={() => setIsReportModalOpen(false)} report={report} isLoading={isReportLoading} />}
    </div>
  );
};

export default MaintenanceLog;
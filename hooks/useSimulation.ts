
import { create } from 'zustand';

interface SimulationState {
  isSimulationMode: boolean;
  toggleSimulationMode: () => void;
  setSimulationMode: (isSimulation: boolean) => void;
}

const useSimulationStore = create<SimulationState>((set) => ({
  isSimulationMode: import.meta.env.MODE !== 'production',
  toggleSimulationMode: () => set((state) => ({ isSimulationMode: !state.isSimulationMode })),
  setSimulationMode: (isSimulation: boolean) => set({ isSimulationMode: isSimulation }),
}));

export default useSimulationStore;

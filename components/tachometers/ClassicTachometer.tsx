

import React, { useState, useMemo, useRef, useEffect } from 'react';

// Icons defined inside the component file for self-containment
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>;
const MinusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M18 12H6" /></svg>;
const SmoothIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" /></svg>;


interface InteractiveTuningMapProps {
  title: string;
  data: number[][];
  xAxisLabels: string[];
  yAxisLabels: string[];
  onChange: (row: number, col: number, value: number) => void;
}

const InteractiveTuningMap: React.FC<InteractiveTuningMapProps> = ({ title, data, xAxisLabels, yAxisLabels, onChange }) => {
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState('');
  const [brushMode, setBrushMode] = useState<'add' | 'subtract' | 'smooth' | null>(null);
  const [isBrushing, setIsBrushing] = useState(false);
  const mapRef = useRef<HTMLDivElement>(null);

  const { minVal, maxVal } = useMemo(() => {
    const allValues = data.flat();
    return { minVal: Math.min(...allValues), maxVal: Math.max(...allValues, Math.min(...allValues) + 1) };
  }, [data]);

  const getColorForValue = (value: number) => {
    const ratio = (value - minVal) / (maxVal - minVal);
    const hue = 240 - (ratio * 240); // 240 (blue) for low, 0 (red) for high
    return `hsl(${hue}, 90%, 55%)`;
  };

  const handleCellClick = (row: number, col: number) => {
    if (brushMode) return;
    setEditingCell({ row, col });
    setEditValue(data[row][col].toFixed(2));
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setEditValue(e.target.value);
  };

  const handleInputBlur = () => {
    if (editingCell) {
      const value = parseFloat(editValue);
      if (!isNaN(value)) {
        onChange(editingCell.row, editingCell.col, value);
      }
      setEditingCell(null);
    }
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleInputBlur();
    } else if (e.key === 'Escape') {
      setEditingCell(null);
    }
  };
  
  const handleBrush = (row: number, col: number) => {
      if (!isBrushing || !brushMode) return;
      
      let newValue = data[row][col];
      switch(brushMode) {
          case 'add':
              newValue += 0.5;
              break;
          case 'subtract':
              newValue -= 0.5;
              break;
          case 'smooth':
              let total = newValue;
              let count = 1;
              for (let r = -1; r <= 1; r++) {
                  for (let c = -1; c <= 1; c++) {
                      if (r === 0 && c === 0) continue;
                      const neighborRow = row + r;
                      const neighborCol = col + c;
                      if (data[neighborRow] && data[neighborRow][neighborCol] !== undefined) {
                          total += data[neighborRow][neighborCol];
                          count++;
                      }
                  }
              }
              newValue = total / count;
              break;
      }
      onChange(row, col, parseFloat(newValue.toFixed(2)));
  };

  useEffect(() => {
    const handleMouseUp = () => setIsBrushing(false);
    window.addEventListener('mouseup', handleMouseUp);
    return () => window.removeEventListener('mouseup', handleMouseUp);
  }, []);

  const toggleBrushMode = (mode: 'add' | 'subtract' | 'smooth') => {
    setBrushMode(prev => prev === mode ? null : mode);
  }

  const ToolButton: React.FC<{ mode: 'add' | 'subtract' | 'smooth', children: React.ReactNode }> = ({ mode, children }) => (
      <button 
        onClick={() => toggleBrushMode(mode)}
        className={`btn btn-secondary p-2 ${brushMode === mode ? 'btn-neumorphic-active' : ''}`}
        title={mode.charAt(0).toUpperCase() + mode.slice(1)}
      >
          {children}
      </button>
  );

  return (
    <div className="space-y-4" style={{ perspective: '1000px' }}>
      <h3 className="text-lg font-semibold text-center mb-2 font-display">{title}</h3>
      <div className="flex justify-center items-center gap-4">
        <span className="text-sm text-gray-400">Brush Tools:</span>
        <ToolButton mode="add"><PlusIcon /></ToolButton>
        <ToolButton mode="subtract"><MinusIcon /></ToolButton>
        <ToolButton mode="smooth"><SmoothIcon /></ToolButton>
      </div>

      <div ref={mapRef} style={{ transform: 'rotateX(25deg) rotateZ(-10deg)', transformStyle: 'preserve-3d' }}>
        <div 
          className="grid gap-px p-2 bg-base-900/50 border border-[var(--glass-border)] rounded-lg shadow-lg"
          style={{ gridTemplateColumns: `50px repeat(${xAxisLabels.length}, 1fr)` }}
          onMouseDown={(e) => { if (brushMode) {e.preventDefault(); setIsBrushing(true); } }}
          onMouseLeave={() => setIsBrushing(false)}
        >
          {/* Corner piece */}
          <div className="text-xs text-gray-500 flex items-end justify-end p-1">Load %</div>
          {/* X-axis labels (RPM) */}
          {xAxisLabels.map((label, colIndex) => (
            <div key={`x-${colIndex}`} className="text-center font-mono text-xs text-gray-400 p-1">{label}</div>
          ))}

          {/* Y-axis labels and data grid */}
          {yAxisLabels.map((yLabel, rowIndex) => (
            <React.Fragment key={`row-${rowIndex}`}>
              <div className="text-center font-mono text-xs text-gray-400 p-1 flex items-center justify-center">{yLabel}</div>
              {data[rowIndex].map((value, colIndex) => {
                const isEditing = editingCell?.row === rowIndex && editingCell?.col === colIndex;
                return (
                  <div
                    key={`cell-${rowIndex}-${colIndex}`}
                    className="relative text-center text-white font-mono rounded-sm transition-transform duration-100 ease-in-out hover:scale-110 hover:z-10"
                    style={{
                      backgroundColor: getColorForValue(value),
                      textShadow: '1px 1px 2px black',
                      cursor: brushMode ? 'crosshair' : 'pointer',
                    }}
                    onClick={() => handleCellClick(rowIndex, colIndex)}
                    onMouseEnter={() => handleBrush(rowIndex, colIndex)}
                  >
                    {isEditing ? (
                      <input
                        type="number"
                        step="0.1"
                        value={editValue}
                        onChange={handleInputChange}
                        onBlur={handleInputBlur}
                        onKeyDown={handleInputKeyDown}
                        autoFocus
                        className="absolute inset-0 w-full h-full text-center bg-transparent border-2 border-[var(--theme-accent-primary)] z-20"
                      />
                    ) : (
                      <span className="p-1 text-sm">{value.toFixed(1)}</span>
                    )}
                  </div>
                )
              })}
            </React.Fragment>
          ))}
        </div>
      </div>
      <div className="text-center text-xs text-gray-500 -mt-2">RPM</div>
    </div>
  );
};

export default InteractiveTuningMap;
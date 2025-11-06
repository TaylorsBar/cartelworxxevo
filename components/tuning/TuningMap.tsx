import React from 'react';

interface TuningMapProps {
  title: string;
  data: number[][];
  xAxisLabels: string[];
  yAxisLabels: string[];
  onChange: (row: number, col: number, value: number) => void;
}

const TuningMap: React.FC<TuningMapProps> = ({ title, data, xAxisLabels, yAxisLabels, onChange }) => {
  const allValues = data.flat();
  const minVal = Math.min(...allValues);
  const maxVal = Math.max(...allValues, minVal + 1); // Avoid division by zero

  const getColorForValue = (value: number) => {
    const ratio = (value - minVal) / (maxVal - minVal);
    const hue = (1 - ratio) * 240; // 240 (blue) for low, 0 (red) for high
    return `hsl(${hue}, 80%, 50%)`;
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>, row: number, col: number) => {
    const value = parseFloat(e.target.value);
    if (!isNaN(value)) {
      onChange(row, col, value);
    }
  };

  return (
    <div>
      <h3 className="text-md font-semibold text-center mb-2 font-display">{title}</h3>
      <div className="grid gap-1" style={{ gridTemplateColumns: `40px repeat(${xAxisLabels.length}, 1fr)` }}>
        {/* Corner piece */}
        <div className="text-xs text-gray-500 flex items-end justify-end p-1">Load %</div>
        {/* X-axis labels (RPM) */}
        {xAxisLabels.map((label, colIndex) => (
          <div key={`x-${colIndex}`} className="text-center font-mono text-xs text-gray-400 bg-base-800/50 p-1 rounded-sm">{label}</div>
        ))}

        {/* Y-axis labels and data grid */}
        {yAxisLabels.map((yLabel, rowIndex) => (
          <React.Fragment key={`row-${rowIndex}`}>
            <div className="text-center font-mono text-xs text-gray-400 bg-base-800/50 p-1 rounded-sm flex items-center justify-center">{yLabel}</div>
            {data[rowIndex].map((value, colIndex) => (
              <input
                key={`cell-${rowIndex}-${colIndex}`}
                type="number"
                step="0.1"
                value={value.toFixed(1)}
                onChange={(e) => handleInputChange(e, rowIndex, colIndex)}
                className="w-full text-center bg-base-900 border text-white font-mono rounded-sm"
                style={{
                  backgroundColor: getColorForValue(value),
                  borderColor: 'rgba(255, 255, 255, 0.1)',
                  textShadow: '1px 1px 2px black',
                }}
              />
            ))}
          </React.Fragment>
        ))}
      </div>
       <div className="text-center text-xs text-gray-500 mt-1">RPM</div>
    </div>
  );
};

export default TuningMap;
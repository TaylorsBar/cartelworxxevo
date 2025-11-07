
import React from 'react';
import { GroundingChunk } from '../types';

interface GroundingSourcesProps {
    chunks: GroundingChunk[];
}

const GroundingSources: React.FC<GroundingSourcesProps> = ({ chunks }) => {
    return (
        <div className="mt-4 border-t border-base-700 pt-2">
            <h4 className="text-xs font-semibold text-gray-400 mb-2">Sources:</h4>
            <div className="space-y-2">
                {chunks.map((chunk, index) => {
                    return (
                        <a 
                            key={index} 
                            href={chunk.source} 
                            target="_blank" 
                            rel="noopener noreferrer" 
                            className="block text-xs text-blue-400 hover:underline truncate"
                            title={chunk.source}
                        >
                            [{index + 1}] {chunk.source}
                        </a>
                    );
                })}
            </div>
        </div>
    );
};

export default GroundingSources;

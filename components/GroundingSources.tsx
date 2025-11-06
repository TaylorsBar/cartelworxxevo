
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
                    if (chunk.web) {
                        return (
                            <a 
                                key={index} 
                                href={chunk.web.uri} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="block text-xs text-blue-400 hover:underline truncate"
                                title={chunk.web.title}
                            >
                                [{index + 1}] {chunk.web.title}
                            </a>
                        );
                    }
                    if (chunk.maps) {
                        return (
                            <div key={index} className="text-xs">
                                <a 
                                    href={chunk.maps.uri}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-400 hover:underline"
                                    title={chunk.maps.title}
                                >
                                    [{index + 1}] {chunk.maps.title}
                                </a>
                                {chunk.maps.placeAnswerSources?.[0]?.reviewSnippets?.map((review, rIndex) => (
                                    <blockquote key={rIndex} className="mt-1 pl-2 border-l-2 border-base-600 text-gray-500 italic">
                                        "{review.text}" - {review.author}
                                    </blockquote>
                                ))}
                            </div>
                        )
                    }
                    return null;
                })}
            </div>
        </div>
    );
};

export default GroundingSources;

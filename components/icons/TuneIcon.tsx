
import React from 'react';

const TuneIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 6V4m0 16v-2m-6-8v-2m0 12V10m12 12V10m0-2V4m-6 4h.01M6 14h.01M18 14h.01" />
  </svg>
);

export default TuneIcon;
import React from 'react';

const HederaIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 12H16" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M8 9V15" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M16 9V15" />
  </svg>
);

export default HederaIcon;
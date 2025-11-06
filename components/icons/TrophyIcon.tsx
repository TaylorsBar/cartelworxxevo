import React from 'react';

const TrophyIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} {...props}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 3v2m6-2v2M9 19v-6a2 2 0 012-2h2a2 2 0 012 2v6m-6 0h6M6.75 19.5a.75.75 0 01.75-.75h9.5a.75.75 0 01.75.75v.25a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75v-.25zM12 12a3 3 0 100-6 3 3 0 000 6z" />
  </svg>
);

export default TrophyIcon;

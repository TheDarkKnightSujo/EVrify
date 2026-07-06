import React from 'react';

const LoadingPage = () => {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#1F3E2E] text-white">
      <div className="flex items-center space-x-3 mb-10">
        {/* Leaf/Lightning Icon */}
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center rounded-bl-none transform -rotate-45 relative overflow-hidden">
          <div className="transform rotate-45 text-[#1F3E2E]">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8">
              <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
            </svg>
          </div>
        </div>
        
        {/* VoltPath Text */}
        <h1 className="text-4xl font-serif tracking-tight">VoltPath</h1>
      </div>

      <div className="relative w-72 mb-4">
        {/* Battery Container */}
        <div className="h-10 w-full border-2 border-white rounded-lg p-0.5 flex relative z-10">
          <div className="h-full bg-gradient-to-r from-green-400 to-emerald-500 rounded flex items-center justify-center text-sm font-semibold relative overflow-hidden" style={{ width: '99%' }}>
            99%
          </div>
        </div>
        {/* Battery Nub */}
        <div className="absolute right-[-6px] top-1/2 transform -translate-y-1/2 w-1.5 h-4 bg-white rounded-r z-0"></div>
      </div>
      
      <p className="text-sm font-medium tracking-wide text-gray-300">Charging VoltPath...</p>
    </div>
  );
};

export default LoadingPage;

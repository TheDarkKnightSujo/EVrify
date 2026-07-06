import React from 'react';

const ElectricityFlowAnimation = () => {
  return (
    <div className="relative w-full max-w-3xl h-48 mx-auto flex items-center justify-between px-10 my-16 bg-[#1F3E2E] rounded-3xl overflow-hidden shadow-2xl">
      {/* Station */}
      <div className="z-10 flex flex-col items-center">
        <div className="w-16 h-20 bg-white rounded-lg flex flex-col items-center justify-center shadow-lg border-b-4 border-gray-300">
          <div className="w-6 h-6 bg-[#489d73] rounded-full flex items-center justify-center text-white mb-1">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="w-8 h-2 bg-gray-200 rounded mt-2"></div>
        </div>
        <p className="text-white text-xs mt-3 font-semibold uppercase tracking-wider">Fast Charger</p>
      </div>

      {/* Electricity Cable & Flow */}
      <div className="absolute left-32 right-32 h-1 bg-gray-700/50 rounded flex items-center">
        {/* Animated glowing dots representing electricity */}
        <div className="absolute w-full h-full overflow-hidden">
          <div className="h-full w-12 bg-gradient-to-r from-transparent via-[#489d73] to-[#7be6af] shadow-[0_0_10px_#489d73] animate-[flow_1.5s_linear_infinite]"></div>
        </div>
      </div>

      {/* EV */}
      <div className="z-10 flex flex-col items-center">
        <div className="relative">
          {/* Simple Car Shape */}
          <div className="w-24 h-10 bg-white rounded-t-xl rounded-b-md shadow-lg relative border-b-4 border-gray-300">
            {/* Windows */}
            <div className="absolute top-2 left-4 right-4 h-4 bg-gray-800 rounded-sm"></div>
            {/* Wheels */}
            <div className="absolute -bottom-2 left-3 w-5 h-5 bg-gray-900 rounded-full border-2 border-gray-300"></div>
            <div className="absolute -bottom-2 right-3 w-5 h-5 bg-gray-900 rounded-full border-2 border-gray-300"></div>
          </div>
        </div>
        <p className="text-white text-xs mt-4 font-semibold uppercase tracking-wider">Your EV</p>
      </div>

      <style>{`
        @keyframes flow {
          0% { transform: translateX(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateX(500%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default ElectricityFlowAnimation;

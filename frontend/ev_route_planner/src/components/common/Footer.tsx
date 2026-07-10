import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="bg-[#122B20] text-white pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 md:gap-16 mb-24">
          <div className="md:col-span-5">
            <div className="flex items-center space-x-2 text-white mb-6">
              <div className="w-6 h-6 bg-white rounded-full flex items-center justify-center rounded-bl-none transform -rotate-45 relative overflow-hidden">
                <div className="transform rotate-45 text-[#122B20]">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
              <span className="text-xl font-serif font-bold tracking-tight">EVrify</span>
            </div>
            <h3 className="text-2xl font-serif italic text-white/90 mb-6">EVrify your route.</h3>
            <p className="text-white/60 text-[15px] leading-relaxed max-w-sm">
              An India-first EV route planner powered by AI-scored charging station reliability. Built as an open-source portfolio project.
            </p>
          </div>
          
          <div className="md:col-span-3">
            <h4 className="text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">EXPLORE</h4>
            <ul className="space-y-4">
              <li><Link to="/" className="text-white/70 hover:text-white transition-colors">Home</Link></li>
              <li><Link to="/planner" className="text-white/70 hover:text-white transition-colors">Route Planner</Link></li>
              <li><Link to="/how-it-works" className="text-white/70 hover:text-white transition-colors">How It Works</Link></li>
            </ul>
          </div>
          
          <div className="md:col-span-4">
            <h4 className="text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">OPEN SOURCE</h4>
            <a href="https://github.com/TheDarkKnightSujo" target="_blank" rel="noopener noreferrer" className="flex items-center text-white/70 hover:text-white transition-colors mb-6">
              <svg viewBox="0 0 24 24" className="w-4 h-4 mr-2" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
              github.com/TheDarkKnightSujo
            </a>
            <p className="text-white/50 text-[13px] leading-relaxed">
              Data: Google Maps · Reddit · Team-BHP · Play Store · PlugShare · Google News
            </p>
          </div>
        </div>
        
        <div className="border-t border-white/10 pt-8 flex flex-col md:flex-row items-center justify-between text-[13px] text-white/40">
          <p>Built by @TheDarkKnightSujo · Open source · MIT License</p>
          <p className="mt-4 md:mt-0">© 2026 EVrify</p>
        </div>
      </div>
    </footer>
  );
};

export default Footer;

import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Menu, X } from 'lucide-react';

const Navbar = () => {
  const location = useLocation();
  const isPlanner = location.pathname === '/planner';
  const [isOpen, setIsOpen] = useState(false);

  return (
    <nav className="w-full bg-[#F4F0E6] relative z-50">
      <div className="flex items-center justify-between px-8 py-6">
        <Link to="/" className="flex items-center space-x-2 text-[#1A3C2E]">
          <div className="w-8 h-8 bg-[#1A3C2E] rounded-full flex items-center justify-center rounded-bl-none transform -rotate-45 relative overflow-hidden">
            <div className="transform rotate-45 text-white">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z" clipRule="evenodd" />
              </svg>
            </div>
          </div>
          <span className="text-2xl font-serif font-bold tracking-tight">EVrify</span>
        </Link>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8">
          <Link 
            to="/how-it-works" 
            className={`text-[15px] font-medium transition-colors ${location.pathname === '/how-it-works' ? 'text-[#1A3C2E]' : 'text-gray-500 hover:text-[#1A3C2E]'}`}
          >
            How It Works
          </Link>
          <Link 
            to="/planner" 
            className={`text-[15px] font-medium transition-colors ${isPlanner ? 'text-[#1A3C2E]' : 'text-gray-500 hover:text-[#1A3C2E]'}`}
          >
            Route Planner
          </Link>
          <a href="https://github.com/TheDarkKnightSujo" target="_blank" rel="noopener noreferrer" className="text-gray-500 hover:text-[#1A3C2E]">
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
            </svg>
          </a>
          <Link 
            to="/planner" 
            className="bg-[#4CAF7D] text-[#1A3C2E] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#4CAF7D]/90 transition-colors flex items-center"
          >
            Plan Your Route <span className="ml-2 font-normal">→</span>
          </Link>
        </div>

        {/* Mobile Hamburger Button */}
        <div className="flex md:hidden items-center">
          <button 
            onClick={() => setIsOpen(!isOpen)}
            className="text-[#1A3C2E] hover:text-[#4CAF7D] transition-colors focus:outline-none p-1"
          >
            {isOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Navigation Dropdown */}
      {isOpen && (
        <div className="md:hidden bg-[#F4F0E6] border-t border-[#1A3C2E]/10 px-8 py-6 flex flex-col space-y-4 shadow-lg absolute w-full left-0 top-full z-50">
          <Link 
            to="/how-it-works" 
            onClick={() => setIsOpen(false)}
            className={`text-lg font-medium transition-colors ${location.pathname === '/how-it-works' ? 'text-[#1A3C2E]' : 'text-gray-500 hover:text-[#1A3C2E]'}`}
          >
            How It Works
          </Link>
          <Link 
            to="/planner" 
            onClick={() => setIsOpen(false)}
            className={`text-lg font-medium transition-colors ${isPlanner ? 'text-[#1A3C2E]' : 'text-gray-500 hover:text-[#1A3C2E]'}`}
          >
            Route Planner
          </Link>
          <div className="flex items-center gap-6 pt-2">
            <a 
              href="https://github.com/TheDarkKnightSujo" 
              target="_blank" 
              rel="noopener noreferrer" 
              className="text-gray-500 hover:text-[#1A3C2E]"
            >
              <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor">
                <path d="M12 2C6.477 2 2 6.477 2 12c0 4.42 2.865 8.166 6.839 9.489.5.092.682-.217.682-.482 0-.237-.008-.866-.013-1.7-2.782.603-3.369-1.34-3.369-1.34-.454-1.156-1.11-1.462-1.11-1.462-.908-.62.069-.608.069-.608 1.003.07 1.531 1.03 1.531 1.03.892 1.529 2.341 1.087 2.91.831.092-.646.35-1.086.636-1.336-2.22-.253-4.555-1.11-4.555-4.943 0-1.091.39-1.984 1.029-2.683-.103-.253-.446-1.27.098-2.647 0 0 .84-.269 2.75 1.025A9.578 9.578 0 0112 6.836c.85.004 1.705.114 2.504.336 1.909-1.294 2.747-1.025 2.747-1.025.546 1.377.203 2.394.1 2.647.64.699 1.028 1.592 1.028 2.683 0 3.842-2.339 4.687-4.566 4.935.359.309.678.919.678 1.852 0 1.336-.012 2.415-.012 2.743 0 .267.18.578.688.48C19.138 20.161 22 16.416 22 12c0-5.523-4.477-10-10-10z" />
              </svg>
            </a>
            <Link 
              to="/planner" 
              onClick={() => setIsOpen(false)}
              className="bg-[#4CAF7D] text-[#1A3C2E] px-5 py-2.5 rounded-full font-bold text-sm hover:bg-[#4CAF7D]/90 transition-colors flex items-center"
            >
              Plan Your Route <span className="ml-2 font-normal">→</span>
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;

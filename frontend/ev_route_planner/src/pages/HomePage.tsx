import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';
import { Link } from 'react-router-dom';

const HomePage = () => {
  return (
    <div className="min-h-screen bg-[#F4F0E6] font-sans text-[#1A3C2E] overflow-x-hidden selection:bg-[#4CAF7D]/30">
      <Navbar />

      {/* Hero Section */}
      <section className="max-w-7xl mx-auto px-6 pt-16 pb-24 grid grid-cols-1 md:grid-cols-12 gap-12 items-center">
        {/* Left Content */}
        <div className="md:col-span-7 flex flex-col items-start text-left">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-[#1A3C2E]/5 border border-[#1A3C2E]/10 text-xs font-bold tracking-widest text-[#1A3C2E] mb-8">
            <span className="w-1.5 h-1.5 bg-[#4CAF7D] rounded-full"></span>
            INDIA-FIRST · OPEN SOURCE
          </div>
          
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-[#1A3C2E] mb-8">
            Plan your EV<br />journey<br />
            <span className="font-serif italic text-[#4CAF7D] font-normal">with confidence.</span>
          </h1>
          
          <p className="text-[17px] text-[#1A3C2E]/80 leading-relaxed max-w-lg mb-10">
            VoltPath scores every charging station in India using real reviews from Google Maps, Reddit, and Team-BHP — so you always know what to expect before you arrive.
          </p>
          
          <div className="flex flex-wrap gap-4 mb-16">
            <Link to="/planner" className="px-6 py-3.5 rounded-full bg-[#1A3C2E] text-white font-semibold hover:bg-[#1A3C2E]/90 transition-colors flex items-center">
              Plan a Route <span className="ml-2">→</span>
            </Link>
            <button className="px-6 py-3.5 rounded-full border border-[#1A3C2E]/20 text-[#1A3C2E] font-semibold hover:bg-[#1A3C2E]/5 transition-colors">
              See How It Works
            </button>
          </div>
          
          {/* Stats */}
          <div className="flex items-center gap-8">
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1A3C2E]/70">
              <div className="w-5 h-5 rounded-full bg-[#4CAF7D]/20 text-[#4CAF7D] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-3 h-3" strokeWidth="3"><polyline points="20 6 9 17 4 12"></polyline></svg>
              </div>
              500+ Indian stations scored
            </div>
            <div className="flex items-center gap-2 text-sm font-semibold text-[#1A3C2E]/70">
              <div className="w-5 h-5 rounded-full bg-[#4CAF7D]/20 text-[#4CAF7D] flex items-center justify-center">
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>
              </div>
              6 live review sources
            </div>
          </div>
        </div>

        {/* Right Graphic - Blocky EV */}
        <div className="md:col-span-5 flex justify-center items-center relative h-[400px]">
          {/* Shadow ellipse */}
          <div className="absolute bottom-16 w-64 h-16 bg-black/10 rounded-[100%] blur-sm"></div>
          
          {/* CSS Isometric Car */}
          <div className="relative w-64 h-48 z-10 -mt-12">
            {/* Main Body */}
            <div className="absolute bottom-10 left-4 w-56 h-20 bg-[#122B20] rounded-sm border-t border-l border-[#1A3C2E]/50">
              {/* Headlights */}
              <div className="absolute top-8 left-4 w-6 h-3 bg-[#E6F4ED] rounded-sm shadow-[0_0_10px_#4CAF7D]"></div>
              <div className="absolute top-8 right-4 w-6 h-3 bg-[#E6F4ED] rounded-sm shadow-[0_0_10px_#4CAF7D]"></div>
              {/* Grille accent */}
              <div className="absolute top-10 left-1/2 -translate-x-1/2 w-1.5 h-1.5 bg-[#4CAF7D] rounded-full"></div>
            </div>
            
            {/* Top Cabin */}
            <div className="absolute bottom-30 left-12 w-40 h-16 bg-[#0B1A13] rounded-t-sm skew-x-12 transform -translate-x-4 border-t border-l border-[#1A3C2E]/50"></div>
            
            {/* Wheels */}
            <div className="absolute bottom-6 left-8 w-12 h-14 bg-black rounded-lg transform -skew-y-12"></div>
            <div className="absolute bottom-6 right-8 w-12 h-14 bg-black rounded-lg transform skew-y-12"></div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="max-w-7xl mx-auto px-6 py-24 border-t border-[#1A3C2E]/5">
        <div className="mb-16">
          <p className="text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-4">THE DIFFERENCE</p>
          <h2 className="text-5xl md:text-6xl font-bold text-[#1A3C2E]">
            Built <span className="font-serif italic text-[#4CAF7D] font-normal">differently.</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Card 1 */}
          <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transform transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 mb-8 rounded-full border-2 border-[#1A3C2E]/10 flex items-center justify-center text-[#1A3C2E]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                <circle cx="12" cy="10" r="3" strokeDasharray="2 2"></circle>
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Know before you go</h3>
            <p className="text-[#1A3C2E]/70 leading-relaxed">
              Every station gets a 0–100 reliability score built from hundreds of real reviews, weighted by recency.
            </p>
          </div>

          {/* Card 2 */}
          <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transform transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 mb-8 rounded-full border-2 border-[#1A3C2E]/10 flex items-center justify-center text-[#1A3C2E]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path>
                <path d="M12 8v4" strokeDasharray="2 2"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Built for Indian roads</h3>
            <p className="text-[#1A3C2E]/70 leading-relaxed">
              Our routing engine accounts for India's sparse charging network, extreme heat's effect on range, and a 30 km search radius at every stop.
            </p>
          </div>

          {/* Card 3 */}
          <div className="bg-white rounded-3xl p-10 shadow-[0_8px_30px_rgb(0,0,0,0.04)] transform transition-transform hover:-translate-y-1">
            <div className="w-12 h-12 mb-8 rounded-full border-2 border-[#1A3C2E]/10 flex items-center justify-center text-[#1A3C2E]">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="1.5">
                <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.59-9.21l5.25 4.24"></path>
              </svg>
            </div>
            <h3 className="text-2xl font-serif font-bold mb-4">Data that stays current</h3>
            <p className="text-[#1A3C2E]/70 leading-relaxed">
              A GitHub Actions pipeline scrapes 6 sources every Sunday and re-scores every station automatically.
            </p>
          </div>
        </div>
      </section>

      {/* Score Section */}
      <section className="bg-[#163327] text-white py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <p className="text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">WHAT IS A RELIABILITY SCORE?</p>
          <h2 className="text-5xl md:text-6xl font-bold mb-24 max-w-2xl leading-[1.1]">
            A single number that <span className="font-serif italic text-[#4CAF7D] font-normal">tells the truth.</span>
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16 text-center border-t border-white/10 pt-16">
            <div>
              <div className="text-8xl font-bold text-[#4CAF7D] font-mono tracking-tighter mb-4">100</div>
              <div className="text-sm font-bold tracking-widest uppercase text-white/80">POSITIVE REVIEWS</div>
            </div>
            <div>
              <div className="text-8xl font-bold text-[#4CAF7D]/60 font-mono tracking-tighter mb-4">50</div>
              <div className="text-sm font-bold tracking-widest uppercase text-white/80">MIXED REVIEWS</div>
            </div>
            <div>
              <div className="text-8xl font-bold text-[#4CAF7D]/30 font-mono tracking-tighter mb-4">0</div>
              <div className="text-sm font-bold tracking-widest uppercase text-white/80">BROKEN REPORTS</div>
            </div>
          </div>
          
          <p className="mt-20 max-w-xl text-white/70 text-lg leading-relaxed">
            Scores are recency-weighted — a broken report last week matters more than a great review from six months ago.
          </p>
        </div>
      </section>

      {/* Pre-footer CTA */}
      <section className="max-w-7xl mx-auto px-6 py-24">
        <div className="bg-[#F4F0E6] rounded-[2.5rem] border border-[#1A3C2E]/10 p-12 md:p-16 flex flex-col md:flex-row items-center justify-between gap-8 shadow-sm">
          <div>
            <h2 className="text-4xl font-serif font-bold text-[#1A3C2E] mb-4">Ready to plan your next road trip?</h2>
            <p className="text-lg text-[#1A3C2E]/70">Try it with Mumbai → Goa or Delhi → Agra.</p>
          </div>
          <Link to="/planner" className="shrink-0 px-8 py-4 rounded-full bg-[#1A3C2E] text-white font-semibold hover:bg-[#1A3C2E]/90 transition-colors shadow-lg">
            Open Route Planner →
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default HomePage;

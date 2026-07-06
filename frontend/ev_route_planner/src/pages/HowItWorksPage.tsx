import React from 'react';
import Navbar from '../components/common/Navbar';
import Footer from '../components/common/Footer';

const HowItWorksPage = () => {
  return (
    <div className="min-h-screen bg-[#F4F0E6] font-sans text-[#1A3C2E] overflow-x-hidden selection:bg-[#4CAF7D]/30 relative">
      
      {/* Abstract Background Topo Lines */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-20" 
           style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0,100 Q150,150 300,100 T600,100 T900,100 T1200,100' fill='none' stroke='%231A3C2E' stroke-width='1'/%3E%3Cpath d='M0,200 Q150,250 300,200 T600,200 T900,200 T1200,200' fill='none' stroke='%231A3C2E' stroke-width='1'/%3E%3C/svg%3E")`, backgroundSize: 'cover' }}>
      </div>

      {/* Animated Charging Wire connecting the steps */}
      <div className="absolute top-[350px] left-0 w-full h-[3000px] pointer-events-none z-0 hidden lg:block overflow-hidden">
        <svg className="w-full h-full opacity-70" viewBox="0 0 1000 3000" preserveAspectRatio="none">
           <filter id="glow">
              <feGaussianBlur stdDeviation="6" result="coloredBlur"/>
              <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
              </feMerge>
           </filter>
           
           {/* Faint Base Wire */}
           <path d="M 650 0 C 800 150, 150 250, 250 450 C 350 650, 850 700, 750 950 C 650 1200, 150 1250, 250 1450 C 350 1650, 850 1700, 750 1950 C 650 2200, 300 2300, 500 2450" fill="none" stroke="#4CAF7D" strokeWidth="8" opacity="0.1" />
           
           {/* Glowing Animated Electricity Flow */}
           <path d="M 650 0 C 800 150, 150 250, 250 450 C 350 650, 850 700, 750 950 C 650 1200, 150 1250, 250 1450 C 350 1650, 850 1700, 750 1950 C 650 2200, 300 2300, 500 2450" fill="none" stroke="#4CAF7D" strokeWidth="10" className="wire-flow-animate" filter="url(#glow)" strokeLinecap="round" />
        </svg>
      </div>

      <Navbar />

      <div className="max-w-7xl mx-auto px-6 relative z-10">
        
        {/* Header Section */}
        <section className="pt-24 pb-32 max-w-3xl">
          <p className="text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">UNDER THE HOOD</p>
          <h1 className="text-6xl md:text-7xl font-bold tracking-tight leading-[1.1] text-[#1A3C2E] mb-8">
            Six sources.<br />
            One score. <span className="font-serif italic text-[#4CAF7D] font-normal">Zero guesswork.</span>
          </h1>
          <p className="text-xl text-[#1A3C2E]/80 leading-relaxed max-w-2xl">
            Here is exactly how VoltPath turns thousands of raw reviews into a number you can trust.
          </p>
        </section>

        {/* Step 01 */}
        <section className="py-24 border-t border-[#1A3C2E]/10 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4CAF7D]/10 text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">
              STEP 01 · WE START WITH EVERY CHARGER IN INDIA
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-[#4CAF7D] flex items-center justify-center text-[#4CAF7D]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="2"><ellipse cx="12" cy="5" rx="9" ry="3"></ellipse><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
              </div>
              <h2 className="text-4xl font-serif font-bold text-[#1A3C2E]">Station Database</h2>
            </div>
            <p className="text-lg text-[#1A3C2E]/80 leading-relaxed">
              We seed a PostgreSQL + PostGIS database with every public charging station in India — coordinates, connector types, network operator, and power output.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="bg-[#FAF9F5] p-12 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#1A3C2E]/5 w-full max-w-md aspect-video flex items-center justify-center relative overflow-hidden">
               {/* India outline approximation with dots */}
               <svg viewBox="0 0 100 100" className="w-48 h-48 opacity-80">
                 <path d="M50 10 L60 20 L70 15 L80 40 L70 60 L60 90 L40 85 L20 60 L30 40 L20 20 Z" fill="none" stroke="#1A3C2E" strokeWidth="1" strokeDasharray="4 2"/>
                 {/* Green dots */}
                 <circle cx="55" cy="30" r="1.5" fill="#4CAF7D" />
                 <circle cx="65" cy="45" r="1" fill="#4CAF7D" />
                 <circle cx="45" cy="55" r="2" fill="#4CAF7D" />
                 <circle cx="35" cy="40" r="1.5" fill="#4CAF7D" />
                 <circle cx="50" cy="70" r="1.5" fill="#4CAF7D" />
                 <circle cx="30" cy="50" r="1" fill="#4CAF7D" />
                 <circle cx="60" cy="80" r="2" fill="#4CAF7D" />
               </svg>
            </div>
          </div>
        </section>

        {/* Step 02 */}
        <section className="py-24 border-t border-[#1A3C2E]/10 flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4CAF7D]/10 text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">
              STEP 02 · REAL-TIME REVIEW COLLECTION
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-[#4CAF7D] flex items-center justify-center text-[#4CAF7D]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>
              </div>
              <h2 className="text-4xl font-serif font-bold text-[#1A3C2E]">Review Scraping</h2>
            </div>
            <p className="text-lg text-[#1A3C2E]/80 leading-relaxed">
              Our automated pipeline continuously scrapes and normalizes check-ins, ratings, and written reviews from Google Maps, Team-BHP, PlugShare, and the Play Store.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="bg-[#FAF9F5] p-8 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#1A3C2E]/5 w-full max-w-md aspect-video flex flex-col gap-3">
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#1A3C2E]/5 flex items-center justify-between">
                <span className="font-bold text-[#1A3C2E] text-sm">Google Maps</span>
                <span className="text-[#4CAF7D] text-xs font-bold bg-[#4CAF7D]/10 px-2 py-1 rounded">2,400+ reviews</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#1A3C2E]/5 flex items-center justify-between">
                <span className="font-bold text-[#1A3C2E] text-sm">PlugShare</span>
                <span className="text-[#4CAF7D] text-xs font-bold bg-[#4CAF7D]/10 px-2 py-1 rounded">1,800+ check-ins</span>
              </div>
              <div className="bg-white p-4 rounded-xl shadow-sm border border-[#1A3C2E]/5 flex items-center justify-between">
                <span className="font-bold text-[#1A3C2E] text-sm">Team-BHP</span>
                <span className="text-[#4CAF7D] text-xs font-bold bg-[#4CAF7D]/10 px-2 py-1 rounded">800+ posts</span>
              </div>
            </div>
          </div>
        </section>

        {/* Step 03 */}
        <section className="py-24 border-t border-[#1A3C2E]/10 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4CAF7D]/10 text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">
              STEP 03 · A LANGUAGE MODEL READS EVERY REVIEW
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-[#4CAF7D] flex items-center justify-center text-[#4CAF7D]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="2"><rect x="4" y="4" width="16" height="16" rx="2" ry="2"></rect><rect x="9" y="9" width="6" height="6"></rect><line x1="9" y1="1" x2="9" y2="4"></line><line x1="15" y1="1" x2="15" y2="4"></line><line x1="9" y1="20" x2="9" y2="23"></line><line x1="15" y1="20" x2="15" y2="23"></line><line x1="20" y1="9" x2="23" y2="9"></line><line x1="20" y1="14" x2="23" y2="14"></line><line x1="1" y1="9" x2="4" y2="9"></line><line x1="1" y1="14" x2="4" y2="14"></line></svg>
              </div>
              <h2 className="text-4xl font-serif font-bold text-[#1A3C2E] leading-tight">AI Sentiment<br />Classification</h2>
            </div>
            <p className="text-lg text-[#1A3C2E]/80 leading-relaxed">
              Each review is sent to Groq's LLaMA 3 inference API with a strict prompt. It classifies the review as positive / neutral / negative and extracts issue tags (broken, slow, occupied, clean, cheap).
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="bg-[#FAF9F5] p-4 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#1A3C2E]/5 w-full max-w-lg">
              <div className="bg-[#122B20] rounded-xl p-6 text-[13px] font-mono shadow-inner text-[#4CAF7D]/90">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b border-white/10 text-white/50">
                  <span className="w-2 h-2 rounded-full bg-[#4CAF7D]"></span>
                  llama-3 · classify_review()
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <div className="text-white/40 mb-2 uppercase text-[10px] tracking-widest">RAW REVIEW</div>
                    <p className="text-white/80 leading-relaxed mb-2">"One charger has been down for a week. Attendant said parts are on the way but this is my second visit."</p>
                    <div className="text-white/40 text-[11px]">— Team-BHP · 6 days ago</div>
                  </div>
                  <div>
                    <div className="text-white/40 mb-2 uppercase text-[10px] tracking-widest">CLASSIFICATION</div>
                    <div>{'{'}</div>
                    <div className="pl-4">
                      "sentiment": "negative",<br />
                      "score": 0,<br />
                      "tags": ["broken", "repeat_issue"],<br />
                      "confidence": 0.94
                    </div>
                    <div>{'}'}</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 04 */}
        <section className="py-24 border-t border-[#1A3C2E]/10 flex flex-col md:flex-row-reverse items-center gap-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4CAF7D]/10 text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">
              STEP 04 · RECENCY-WEIGHTED SCORING
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-[#4CAF7D] flex items-center justify-center text-[#4CAF7D]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>
              <h2 className="text-4xl font-serif font-bold text-[#1A3C2E]">Reliability Scoring</h2>
            </div>
            <p className="text-lg text-[#1A3C2E]/80 leading-relaxed">
              Sentiment points are averaged, but recent reviews weigh more. A broken report last week matters much more than a great review from six months ago.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="bg-[#FAF9F5] p-8 md:p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#1A3C2E]/5 w-full max-w-md">
              <p className="text-[#4CAF7D] text-[10px] font-bold tracking-widest uppercase mb-4">RELIABILITY SCORE</p>
              <div className="font-mono text-sm font-bold text-[#1A3C2E] mb-8 p-4 bg-white rounded-lg border border-[#1A3C2E]/5 shadow-sm">
                score = Σ(sentiment_pts × recency_weight) / total_reviews
              </div>
              
              <div className="space-y-2 text-sm font-mono text-[#1A3C2E]/70 border-b border-[#1A3C2E]/10 pb-4 mb-4">
                <div className="flex justify-between"><span>Positive</span><span className="text-[#4CAF7D] font-bold">100 pts</span></div>
                <div className="flex justify-between"><span>Neutral</span><span className="text-[#1A3C2E] font-bold">50 pts</span></div>
                <div className="flex justify-between"><span>Negative</span><span className="text-red-500 font-bold">0 pts</span></div>
              </div>
              
              <div className="space-y-2 text-sm font-mono text-[#1A3C2E]/70">
                <div className="flex justify-between"><span>Last 30 days</span><span className="font-bold">2.0× weight</span></div>
                <div className="flex justify-between"><span>Last 90 days</span><span className="font-bold">1.5× weight</span></div>
                <div className="flex justify-between"><span>Older</span><span className="font-bold">1.0× weight</span></div>
              </div>
            </div>
          </div>
        </section>

        {/* Step 05 */}
        <section className="py-24 border-t border-[#1A3C2E]/10 flex flex-col md:flex-row items-center gap-16">
          <div className="md:w-1/2">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-[#4CAF7D]/10 text-[#4CAF7D] text-xs font-bold tracking-widest uppercase mb-6">
              STEP 05 · CONSTRAINT-AWARE ROUTING
            </div>
            <div className="flex items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-full border-2 border-[#4CAF7D] flex items-center justify-center text-[#4CAF7D]">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="w-6 h-6" strokeWidth="2"><path d="M9 18l6-6-6-6"></path></svg>
              </div>
              <h2 className="text-4xl font-serif font-bold text-[#1A3C2E]">Route Planning</h2>
            </div>
            <p className="text-lg text-[#1A3C2E]/80 leading-relaxed">
              The router evaluates candidate segments one by one, respecting your car's range (with a 15% safety buffer), heat penalties, and a 30 km search radius at every stop — preferring high-reliability stations.
            </p>
          </div>
          <div className="md:w-1/2 flex justify-center">
            <div className="bg-[#FAF9F5] p-10 rounded-[2rem] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-[#1A3C2E]/5 w-full max-w-md">
               <div className="relative pt-6 pb-2">
                 {/* Timeline Line */}
                 <div className="absolute top-8 left-0 right-0 h-1 bg-[#4CAF7D]"></div>
                 
                 {/* Nodes */}
                 <div className="relative flex justify-between">
                   <div className="flex flex-col items-center">
                     <div className="w-4 h-4 bg-[#1A3C2E] rounded-full z-10 mb-2"></div>
                     <span className="text-xs font-bold text-[#1A3C2E]">Start</span>
                   </div>
                   
                   <div className="flex flex-col items-center">
                     <div className="w-4 h-4 bg-[#4CAF7D] rounded-full z-10 mb-2 border-2 border-white"></div>
                     <span className="text-xs font-bold text-[#1A3C2E]">82</span>
                   </div>
                   
                   <div className="flex flex-col items-center">
                     <div className="w-4 h-4 bg-orange-400 rounded-full z-10 mb-2 border-2 border-white"></div>
                     <span className="text-xs font-bold text-[#1A3C2E]">58</span>
                   </div>
                   
                   <div className="flex flex-col items-center">
                     <div className="w-4 h-4 bg-[#4CAF7D] rounded-full z-10 mb-2 border-2 border-white"></div>
                     <span className="text-xs font-bold text-[#1A3C2E]">78</span>
                   </div>
                   
                   <div className="flex flex-col items-center">
                     <div className="w-4 h-4 bg-[#1A3C2E] rounded-full z-10 mb-2"></div>
                     <span className="text-xs font-bold text-[#1A3C2E]">End</span>
                   </div>
                 </div>
               </div>
            </div>
          </div>
        </section>

        {/* Ending */}
        <section className="py-24 flex justify-center">
          <div className="bg-white p-12 rounded-[2rem] shadow-xl border border-[#1A3C2E]/5 text-center transform transition-transform hover:-translate-y-2">
            <div className="w-16 h-16 mx-auto bg-[#4CAF7D]/10 rounded-full flex items-center justify-center text-[#4CAF7D] mb-6">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-8 h-8"><path d="M11 21l-1-1 3-9H8l10-9 1 1-3 9h5l-10 9z"></path></svg>
            </div>
            <h3 className="text-3xl font-serif font-bold text-[#1A3C2E] mb-2">Fully charged.</h3>
            <p className="text-[#1A3C2E]/60 text-sm font-medium">The cable connects here.</p>
          </div>
        </section>
        
      </div>
      
      <Footer />
    </div>
  );
};

export default HowItWorksPage;

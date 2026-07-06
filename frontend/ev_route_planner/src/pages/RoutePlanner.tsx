import React, { useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import Navbar from '../components/common/Navbar';
import { Zap, MapPin } from 'lucide-react';

const RoutePlanner = () => {
  return (
    <div className="flex flex-col h-screen bg-[#F8F6F0]">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <div className="w-96 bg-[#F8F6F0] flex flex-col p-8 overflow-y-auto z-10 shadow-lg">
          <p className="text-sm font-semibold tracking-widest text-[#489d73] mb-2 uppercase">Plan your route</p>
          <h1 className="text-4xl font-serif text-[#1F3E2E] mb-8 leading-tight">
            Where are you <span className="text-[#489d73] italic">headed?</span>
          </h1>

          <div className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Vehicle</label>
              <select className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] shadow-sm appearance-none">
                <option>Tata Nexon EV · 312 km</option>
                <option>MG ZS EV · 461 km</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Claimed Range (km)</label>
              <input type="number" defaultValue={312} className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] shadow-sm" />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Origin</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="e.g. Mumbai" className="w-full bg-white border border-gray-200 rounded-lg p-3 pl-10 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] shadow-sm" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Destination</label>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input type="text" placeholder="e.g. Goa" className="w-full bg-white border border-gray-200 rounded-lg p-3 pl-10 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] shadow-sm" />
              </div>
            </div>

            <button className="w-full bg-[#1F3E2E] text-white rounded-lg p-4 font-medium flex items-center justify-center hover:bg-[#152e21] transition-colors shadow-md mt-4">
              <Zap className="w-4 h-4 mr-2" />
              Find best route
            </button>

            <div className="flex gap-2 pt-4">
              <button className="bg-white border border-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded flex items-center hover:bg-gray-50">
                <span className="text-blue-500 mr-1 text-[10px]">↗</span> Mumbai - Goa
              </button>
              <button className="bg-white border border-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded flex items-center hover:bg-gray-50">
                <span className="text-blue-500 mr-1 text-[10px]">↗</span> Delhi - Agra
              </button>
            </div>
          </div>
        </div>

        {/* Right Map Area */}
        <div className="flex-1 relative z-0">
          <MapContainer center={[20.5937, 78.9629]} zoom={5} className="w-full h-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;

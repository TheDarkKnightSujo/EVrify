import { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import Navbar from '../components/common/Navbar';
import { Zap, MapPin, ArrowLeft, Thermometer, ShieldAlert, Loader2, CheckCircle, AlertTriangle } from 'lucide-react';
import L from 'leaflet';


// Types matching the backend API
interface Station {
  id: number;
  name: string;
  lat: number;
  lng: number;
  reliability_score: number | null;
  address: string;
  connector_types: string[];
  distance_from_route_m: number;
}

interface RoutePlan {
  origin: { name: string; lat: number; lng: number };
  destination: { name: string; lat: number; lng: number };
  total_distance_km: number;
  effective_range_km: number;
  weather_multiplier: number;
  stops: Station[];
  warnings: string[];
}

interface Review {
  text: string;
  sentiment: string;
  issues: string[];
  source: string;
  date: string | null;
}

interface StationDetails {
  id: number;
  name: string;
  address: string;
  reliability_score: number | null;
  connector_types: string[];
  network_operator: string | null;
  lat: number;
  lng: number;
  reviews: Review[];
}

// Preset vehicle configurations
const VEHICLES = [
  { name: 'Tata Nexon EV', range: 312 },
  { name: 'MG ZS EV', range: 461 },
  { name: 'Ather 450X', range: 150 },
  { name: 'Ola S1 Pro', range: 195 },
  { name: 'Custom Vehicle', range: 250 },
];

const API_BASE = 'http://localhost:8000';

// Custom Map Controller to handle bounds adjustment
const MapController = ({ points }: { points: [number, number][] }) => {
  const map = useMap();
  useEffect(() => {
    if (points && points.length > 0) {
      const bounds = L.latLngBounds(points);
      map.fitBounds(bounds, { padding: [80, 80], maxZoom: 14 });
    }
  }, [points, map]);
  return null;
};

// Custom DivIcons for Leaflet Map
const getOriginIcon = () => L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="flex items-center justify-center w-8 h-8 bg-rose-500/20 border-2 border-rose-600 rounded-full shadow-lg">
      <div class="w-3.5 h-3.5 bg-rose-600 rounded-full animate-ping absolute"></div>
      <div class="w-3 h-3 bg-rose-600 rounded-full relative"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const getDestinationIcon = () => L.divIcon({
  className: 'bg-transparent',
  html: `
    <div class="flex items-center justify-center w-8 h-8 bg-blue-500/20 border-2 border-blue-600 rounded-full shadow-lg">
      <div class="w-3 h-3 bg-blue-600 rounded-full relative"></div>
    </div>
  `,
  iconSize: [32, 32],
  iconAnchor: [16, 16],
});

const getStationIcon = (score: number | null, isSelected: boolean) => {
  let colorClass = 'border-emerald-600 bg-emerald-500';
  let ringClass = 'bg-emerald-500/20';
  
  if (score === null) {
    colorClass = 'border-gray-500 bg-gray-400';
    ringClass = 'bg-gray-400/20';
  } else if (score < 40) {
    colorClass = 'border-rose-600 bg-rose-500';
    ringClass = 'bg-rose-500/20';
  } else if (score < 75) {
    colorClass = 'border-amber-600 bg-amber-500';
    ringClass = 'bg-amber-500/20';
  }

  const borderScale = isSelected ? 'scale-125 border-3 ring-4 ring-[#1F3E2E]/30' : 'hover:scale-110';

  return L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="flex items-center justify-center w-10 h-10 rounded-full ${ringClass} border-2 ${colorClass.replace('bg-', 'border-')} shadow-md ${borderScale} transition-all duration-300">
        <div class="w-7 h-7 rounded-full ${colorClass} flex items-center justify-center text-white text-[10px] font-bold">
          ⚡
        </div>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20],
  });
};

const RoutePlanner = () => {
  // Form states
  const [selectedVehicle, setSelectedVehicle] = useState(VEHICLES[0].name);
  const [claimedRange, setClaimedRange] = useState(VEHICLES[0].range);
  const [origin, setOrigin] = useState('');
  const [destination, setDestination] = useState('');
  const [isCustomRange, setIsCustomRange] = useState(false);

  // App running states
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routePlan, setRoutePlan] = useState<RoutePlan | null>(null);

  // Details drawer states
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [stationDetails, setStationDetails] = useState<StationDetails | null>(null);
  const [loadingReviews, setLoadingReviews] = useState(false);

  // Sync range input with vehicle select
  const handleVehicleChange = (vehicleName: string) => {
    setSelectedVehicle(vehicleName);
    const vehicle = VEHICLES.find(v => v.name === vehicleName);
    if (vehicle) {
      setClaimedRange(vehicle.range);
      setIsCustomRange(vehicleName === 'Custom Vehicle');
    }
  };

  // Submit route request to backend
  const handleFindRoute = async (customOrigin?: string, customDest?: string) => {
    const o = customOrigin || origin;
    const d = customDest || destination;

    if (!o.trim() || !d.trim()) {
      setError('Please provide both origin and destination.');
      return;
    }

    setLoading(true);
    setError(null);
    setSelectedStationId(null);
    setStationDetails(null);

    try {
      const response = await fetch(`${API_BASE}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_name: selectedVehicle,
          claimed_range_km: claimedRange,
          origin: o,
          destination: d,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || 'Failed to plan route');
      }

      const data = await response.json();
      setRoutePlan(data);
    } catch (err: any) {
      setError(err.message || 'An error occurred during routing.');
    } finally {
      setLoading(false);
    }
  };

  // Fetch reviews for a specific station
  const handleSelectStation = async (stationId: number) => {
    setSelectedStationId(stationId);
    setLoadingReviews(true);
    try {
      const response = await fetch(`${API_BASE}/api/stations/${stationId}`);
      if (!response.ok) throw new Error('Failed to load station details');
      const data = await response.json();
      setStationDetails(data);
    } catch (err: any) {
      console.error(err);
    } finally {
      setLoadingReviews(false);
    }
  };

  // Preset button action
  const handlePreset = (orig: string, dest: string) => {
    setOrigin(orig);
    setDestination(dest);
    handleFindRoute(orig, dest);
  };

  // Gather all points for map controller auto-bounds
  const getMapPoints = (): [number, number][] => {
    if (!routePlan) return [];
    const points: [number, number][] = [
      [routePlan.origin.lat, routePlan.origin.lng],
      [routePlan.destination.lat, routePlan.destination.lng]
    ];
    routePlan.stops.forEach(s => {
      points.push([s.lat, s.lng]);
    });
    return points;
  };

  // Get source color / tag text
  const formatSource = (src: string) => {
    if (src.startsWith('mouthshut_')) return { text: 'MouthShut', color: 'bg-amber-100 text-amber-800 border-amber-200' };
    if (src.startsWith('trustpilot_')) return { text: 'Trustpilot', color: 'bg-indigo-100 text-indigo-800 border-indigo-200' };
    if (src.startsWith('nitter_tweet')) return { text: 'Twitter', color: 'bg-sky-100 text-sky-800 border-sky-200' };
    switch (src) {
      case 'play_store': return { text: 'Google Play Store', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'teambhp': return { text: 'Team-BHP Forums', color: 'bg-slate-200 text-slate-800 border-slate-300' };
      case 'reddit': return { text: 'Reddit r/IndianEVs', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'news': return { text: 'Google News', color: 'bg-gray-100 text-gray-800 border-gray-200' };
      case 'google_maps': return { text: 'Google Maps Reviews', color: 'bg-red-100 text-red-800 border-red-200' };
      case 'plugshare': return { text: 'PlugShare', color: 'bg-teal-100 text-teal-800 border-teal-200' };
      default: return { text: src.toUpperCase(), color: 'bg-gray-100 text-gray-800 border-gray-200' };
    }
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F6F0]">
      <Navbar />
      
      <div className="flex flex-1 overflow-hidden relative">
        {/* Left Sidebar: Form / Plan / Reviews Drawer */}
        <div className="w-100 bg-[#F8F6F0] flex flex-col overflow-y-auto z-10 shadow-2xl relative border-r border-[#1F3E2E]/10">
          
          {/* View State A: Loading reviews (show loading indicator overlay) or Review Details */}
          {selectedStationId !== null ? (
            <div className="flex flex-col h-full">
              {/* Back Header */}
              <div className="p-6 border-b border-[#1F3E2E]/10 flex items-center gap-3 bg-[#F3EFE6]">
                <button 
                  onClick={() => { setSelectedStationId(null); setStationDetails(null); }}
                  className="p-2 rounded-full hover:bg-[#1F3E2E]/5 text-[#1F3E2E] transition-colors hover:cursor-pointer"
                >
                  <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                  <p className="text-xs font-semibold tracking-wider text-gray-500 uppercase">Station Details</p>
                  <h3 className="font-serif text-lg text-[#1F3E2E] font-bold line-clamp-1">
                    {stationDetails ? stationDetails.name : 'Loading...'}
                  </h3>
                </div>
              </div>

              {loadingReviews ? (
                <div className="flex-1 flex flex-col items-center justify-center gap-3 p-8">
                  <Loader2 className="w-8 h-8 animate-spin text-[#489d73]" />
                  <p className="text-sm font-medium text-gray-600">Retrieving aggregated reviews...</p>
                </div>
              ) : stationDetails ? (
                <div className="flex-1 flex flex-col p-6 overflow-y-auto">
                  {/* Reliability Score Card */}
                  <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 mb-6 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-1">Reliability Score</p>
                      <div className="flex items-baseline gap-1">
                        <span className="text-4xl font-extrabold tracking-tight text-[#1F3E2E]">
                          {stationDetails.reliability_score !== null ? Math.round(stationDetails.reliability_score) : 'N/A'}
                        </span>
                        {stationDetails.reliability_score !== null && <span className="text-sm text-gray-400">/ 100</span>}
                      </div>
                      <p className="text-xs text-gray-500 mt-2">Recency-weighted sentiment score</p>
                    </div>
                    {/* Score colored ring */}
                    <div className="w-16 h-16 rounded-full flex items-center justify-center font-bold text-sm relative border-4 border-gray-100">
                      {stationDetails.reliability_score !== null ? (
                        <>
                          <div 
                            className={`absolute inset-0 rounded-full border-4 border-transparent ${
                              stationDetails.reliability_score >= 75 ? 'border-t-emerald-500 border-r-emerald-500' :
                              stationDetails.reliability_score >= 40 ? 'border-t-amber-500 border-r-amber-500' : 'border-t-rose-500 border-r-rose-500'
                            }`}
                            style={{ transform: 'rotate(-45deg)' }}
                          />
                          <span className="relative z-10 text-xs font-bold">
                            {stationDetails.reliability_score >= 75 ? 'Good' :
                             stationDetails.reliability_score >= 40 ? 'Fair' : 'Poor'}
                          </span>
                        </>
                      ) : (
                        <span className="text-gray-400 text-xs">Unscored</span>
                      )}
                    </div>
                  </div>

                  {/* Station Info details */}
                  <div className="space-y-4 mb-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Network Operator</h4>
                      <p className="text-sm font-semibold text-[#1F3E2E]">{stationDetails.network_operator || 'Independent / Unknown'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Address</h4>
                      <p className="text-sm text-gray-600 leading-relaxed">{stationDetails.address || 'Address not listed'}</p>
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">Available Connectors</h4>
                      <div className="flex flex-wrap gap-1.5">
                        {stationDetails.connector_types && stationDetails.connector_types.length > 0 ? (
                          stationDetails.connector_types.map((type, idx) => (
                            <span key={idx} className="bg-[#1F3E2E]/5 border border-[#1F3E2E]/15 text-[#1F3E2E] text-[10px] font-bold tracking-wider px-2 py-1 rounded">
                              {type}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-gray-500 italic">No connector info available</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Reviews List */}
                  <div>
                    <h4 className="font-serif text-lg text-[#1F3E2E] font-bold mb-4 flex items-center gap-2">
                      User Reviews 
                      <span className="bg-[#1F3E2E]/10 text-[#1F3E2E] font-sans text-xs px-2 py-0.5 rounded-full">
                        {stationDetails.reviews.length}
                      </span>
                    </h4>

                    {stationDetails.reviews.length === 0 ? (
                      <div className="text-center py-10 bg-white rounded-2xl border border-dashed border-gray-200 p-6">
                        <AlertTriangle className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-sm font-medium text-gray-500">No review posts collected yet.</p>
                        <p className="text-xs text-gray-400 mt-1">Our scraping workflow runs weekly to ingest new review content.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {stationDetails.reviews.map((rev, idx) => {
                          const srcInfo = formatSource(rev.source);
                          return (
                            <div key={idx} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 flex flex-col gap-2.5">
                              <div className="flex items-center justify-between text-[11px]">
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-bold ${srcInfo.color}`}>
                                  {srcInfo.text}
                                </span>
                                {rev.date && (
                                  <span className="text-gray-400 font-medium">
                                    {new Date(rev.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-gray-700 leading-relaxed">
                                "{rev.text}"
                              </p>
                              <div className="flex items-center justify-between border-t border-gray-55 pt-2 text-[10px] font-bold uppercase tracking-wider">
                                <span className={`flex items-center gap-1 ${
                                  rev.sentiment === 'positive' ? 'text-emerald-600' :
                                  rev.sentiment === 'negative' ? 'text-rose-600' : 'text-gray-500'
                                }`}>
                                  <span className={`w-1.5 h-1.5 rounded-full ${
                                    rev.sentiment === 'positive' ? 'bg-emerald-500' :
                                    rev.sentiment === 'negative' ? 'bg-rose-500' : 'bg-gray-400'
                                  }`}></span>
                                  {rev.sentiment}
                                </span>

                                {rev.issues && rev.issues.length > 0 && (
                                  <div className="flex gap-1">
                                    {rev.issues.map((issue, iIdx) => (
                                      <span key={iIdx} className="bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded text-[8px]">
                                        {issue}
                                      </span>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-8 text-center text-sm text-gray-500">Failed to load station details.</div>
              )}
            </div>
          ) : (
            /* View State B: Route Inputs & Planned Route List */
            <div className="p-8 flex flex-col gap-6">
              <div>
                <p className="text-sm font-semibold tracking-widest text-[#489d73] mb-2 uppercase">Plan your route</p>
                <h1 className="text-4xl font-serif text-[#1F3E2E] leading-tight font-bold">
                  Where are you <span className="text-[#489d73] italic">headed?</span>
                </h1>
              </div>

              {/* Form Input fields */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Vehicle</label>
                  <select 
                    value={selectedVehicle} 
                    onChange={(e) => handleVehicleChange(e.target.value)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-3.5 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm appearance-none cursor-pointer"
                  >
                    {VEHICLES.map((v, idx) => (
                      <option key={idx} value={v.name}>{v.name} · {v.range} km</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Claimed Range (km)</label>
                  <input 
                    type="number" 
                    value={claimedRange}
                    disabled={!isCustomRange}
                    onChange={(e) => setClaimedRange(parseInt(e.target.value) || 0)}
                    className="w-full bg-white border border-gray-200 rounded-lg p-3.5 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm disabled:bg-gray-100 disabled:text-gray-400" 
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Origin</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Mumbai" 
                      value={origin}
                      onChange={(e) => setOrigin(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3.5 pl-11 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm" 
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 tracking-wider mb-2 uppercase">Destination</label>
                  <div className="relative">
                    <MapPin className="absolute left-3.5 top-1/2 transform -translate-y-1/2 w-4.5 h-4.5 text-gray-400" />
                    <input 
                      type="text" 
                      placeholder="e.g. Goa" 
                      value={destination}
                      onChange={(e) => setDestination(e.target.value)}
                      className="w-full bg-white border border-gray-200 rounded-lg p-3.5 pl-11 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm" 
                    />
                  </div>
                </div>

                {error && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-600 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  onClick={() => handleFindRoute()}
                  disabled={loading}
                  className="w-full bg-[#1F3E2E] text-white rounded-lg p-4 font-semibold flex items-center justify-center hover:bg-[#152e21] disabled:bg-gray-400 transition-colors shadow-md mt-4 cursor-pointer"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Planning optimal route...
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 mr-2" />
                      Find best route
                    </>
                  )}
                </button>

                <div className="flex gap-2 pt-2">
                  <button 
                    onClick={() => handlePreset('Mumbai', 'Goa')}
                    className="bg-white border border-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="text-blue-500 mr-1 text-[10px]">↗</span> Mumbai - Goa
                  </button>
                  <button 
                    onClick={() => handlePreset('Delhi', 'Agra')}
                    className="bg-white border border-gray-200 text-xs text-gray-600 px-3 py-1.5 rounded flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="text-blue-500 mr-1 text-[10px]">↗</span> Delhi - Agra
                  </button>
                </div>
              </div>

              {/* View planned route details */}
              {routePlan && (
                <div className="mt-4 space-y-6 pt-6 border-t border-[#1F3E2E]/10">
                  <h2 className="font-serif text-2xl text-[#1F3E2E] font-bold">Planned Route</h2>

                  {/* Summary Card */}
                  <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm space-y-3.5">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div className="border-r border-gray-100 pr-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Total Distance</p>
                        <p className="text-xl font-extrabold text-[#1F3E2E]">{routePlan.total_distance_km} <span className="text-xs font-normal text-gray-500">km</span></p>
                      </div>
                      <div className="pl-2">
                        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Effective Range</p>
                        <p className="text-xl font-extrabold text-[#1F3E2E]">{routePlan.effective_range_km} <span className="text-xs font-normal text-gray-500">km</span></p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-3 border-t border-gray-50 text-xs font-semibold text-gray-500">
                      <div className="flex items-center gap-1.5">
                        <Thermometer className="w-4 h-4 text-amber-500" />
                        <span>Temp Adjust</span>
                      </div>
                      <span className={`px-2 py-0.5 rounded font-bold ${
                        routePlan.weather_multiplier < 1.0 
                          ? 'bg-amber-50 text-amber-700' 
                          : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {Math.round(routePlan.weather_multiplier * 100)}% ({routePlan.weather_multiplier}x)
                      </span>
                    </div>
                  </div>

                  {/* Warnings */}
                  {routePlan.warnings && routePlan.warnings.length > 0 && (
                    <div className="space-y-2">
                      {routePlan.warnings.map((w, idx) => (
                        <div key={idx} className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-800 flex items-start gap-2.5 shadow-sm">
                          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5 animate-pulse" />
                          <div>
                            <span className="font-bold">Segment Issue:</span>
                            <p className="mt-1 leading-relaxed">{w}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Stop sequence */}
                  <div>
                    <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">Stops Sequence ({routePlan.stops.length})</h3>
                    {routePlan.stops.length === 0 ? (
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-2xl text-xs font-medium text-emerald-800 flex items-center gap-2">
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        <span>No charging stops needed for this range. Safe trip!</span>
                      </div>
                    ) : (
                      <div className="relative border-l-2 border-[#1F3E2E]/10 pl-5 ml-3 space-y-6">
                        {routePlan.stops.map((stop, idx) => (
                          <div key={idx} className="relative group">
                            {/* Dot indicator */}
                            <div className={`absolute -left-[29px] top-1.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                              stop.reliability_score !== null && stop.reliability_score >= 75 ? 'border-emerald-500' :
                              stop.reliability_score !== null && stop.reliability_score >= 40 ? 'border-amber-500' : 'border-rose-500'
                            }`}>
                              <div className={`w-1.5 h-1.5 rounded-full ${
                                stop.reliability_score !== null && stop.reliability_score >= 75 ? 'bg-emerald-500' :
                                stop.reliability_score !== null && stop.reliability_score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                              }`}></div>
                            </div>

                            {/* Stop details container */}
                            <div 
                              onClick={() => handleSelectStation(stop.id)}
                              className="bg-white rounded-2xl p-4 border border-gray-100 shadow-sm cursor-pointer hover:border-[#489d73] hover:shadow-md transition-all duration-200 text-left"
                            >
                              <div className="flex items-start justify-between gap-2 mb-1.5">
                                <h4 className="font-serif font-bold text-sm text-[#1F3E2E] group-hover:text-[#489d73] transition-colors leading-tight line-clamp-1">
                                  {stop.name}
                                </h4>
                                <span className={`shrink-0 text-[10px] font-extrabold px-1.5 py-0.5 rounded ${
                                  stop.reliability_score !== null && stop.reliability_score >= 75 ? 'bg-emerald-50 text-emerald-700' :
                                  stop.reliability_score !== null && stop.reliability_score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  Score: {stop.reliability_score !== null ? Math.round(stop.reliability_score) : 'N/A'}
                                </span>
                              </div>

                              <p className="text-xs text-gray-500 line-clamp-1 mb-2.5">{stop.address || 'Address not listed'}</p>

                              <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                                <span>+{Math.round(stop.distance_from_route_m / 1000)} km detour</span>
                                <div className="flex gap-1 max-w-[60%] overflow-hidden text-ellipsis whitespace-nowrap">
                                  {stop.connector_types && stop.connector_types.slice(0, 2).map((c, cIdx) => (
                                    <span key={cIdx} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[8px]">
                                      {c}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right Map Area */}
        <div className="flex-1 relative z-0">
          <MapContainer center={[20.5937, 78.9629]} zoom={5} className="w-full h-full" zoomControl={false}>
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            {/* MapController to handle bounds fitting */}
            {routePlan && <MapController points={getMapPoints()} />}

            {/* Origin & Destination Markers */}
            {routePlan && (
              <>
                <Marker 
                  position={[routePlan.origin.lat, routePlan.origin.lng]} 
                  icon={getOriginIcon()}
                >
                  <Popup>
                    <div className="text-xs font-semibold p-1">
                      <p className="font-bold text-gray-800 uppercase tracking-widest text-[9px]">Origin</p>
                      <p className="text-sm font-serif text-[#1F3E2E] mt-0.5">{routePlan.origin.name}</p>
                    </div>
                  </Popup>
                </Marker>

                <Marker 
                  position={[routePlan.destination.lat, routePlan.destination.lng]} 
                  icon={getDestinationIcon()}
                >
                  <Popup>
                    <div className="text-xs font-semibold p-1">
                      <p className="font-bold text-gray-800 uppercase tracking-widest text-[9px]">Destination</p>
                      <p className="text-sm font-serif text-[#1F3E2E] mt-0.5">{routePlan.destination.name}</p>
                    </div>
                  </Popup>
                </Marker>

                {/* Polyline Route Path */}
                <Polyline 
                  positions={getMapPoints()} 
                  color="#1F3E2E" 
                  weight={4} 
                  opacity={0.8}
                  dashArray="5, 10"
                />
              </>
            )}

            {/* Stops / Charging Station Markers */}
            {routePlan && routePlan.stops.map((stop, idx) => (
              <Marker 
                key={idx}
                position={[stop.lat, stop.lng]} 
                icon={getStationIcon(stop.reliability_score, selectedStationId === stop.id)}
                eventHandlers={{
                  click: () => handleSelectStation(stop.id)
                }}
              >
                <Popup>
                  <div className="text-xs p-1 text-left">
                    <p className="font-bold text-gray-400 uppercase tracking-wider text-[8px] mb-0.5">Charging Stop {idx + 1}</p>
                    <p className="text-sm font-serif font-bold text-[#1F3E2E] mb-1 leading-tight">{stop.name}</p>
                    <p className="text-xs font-bold text-gray-600 mb-1.5">Reliability Score: {stop.reliability_score !== null ? `${Math.round(stop.reliability_score)}/100` : 'N/A'}</p>
                    <button 
                      onClick={() => handleSelectStation(stop.id)}
                      className="text-xs text-[#489d73] font-bold hover:underline cursor-pointer"
                    >
                      View reviews & details
                    </button>
                  </div>
                </Popup>
              </Marker>
            ))}
          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default RoutePlanner;

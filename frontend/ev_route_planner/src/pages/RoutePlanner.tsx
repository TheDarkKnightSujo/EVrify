import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, Polyline, useMap } from 'react-leaflet';
import Navbar from '../components/common/Navbar';
import { Zap, MapPin, ArrowLeft, Thermometer, ShieldAlert, Loader2, CheckCircle, AlertTriangle, Map, List } from 'lucide-react';
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
  candidate_stations?: Station[];
  warnings: string[];
  route_geometry?: [number, number][];
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
  { name: 'BYD Atto 3', range: 521 },
  { name: 'Hyundai Ioniq 5', range: 631 },
  { name: 'Other Vehicle',  },
];

const API_BASE = import.meta.env.VITE_API_BASE || 
  (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:8000'
    : 'https://evrify.onrender.com');

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
  });
};

const getAvailableStationIcon = (score: number | null) => {
  let indicatorColor = 'bg-emerald-500';
  if (score === null) {
    indicatorColor = 'bg-gray-400';
  } else if (score < 40) {
    indicatorColor = 'bg-rose-500';
  } else if (score < 75) {
    indicatorColor = 'bg-amber-500';
  }

  return L.divIcon({
    className: 'bg-transparent',
    html: `
      <div class="flex items-center justify-center w-8 h-8 rounded-full border border-gray-400 bg-white hover:scale-115 shadow-sm transition-all duration-300 relative">
        <div class="w-6 h-6 rounded-full bg-gray-100/80 flex items-center justify-center text-gray-500 text-[9px] font-bold">
          ⚡
        </div>
        <span class="absolute top-0 right-0 w-2.5 h-2.5 rounded-full border border-white ${indicatorColor}"></span>
      </div>
    `,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

const RoutePlanner = () => {
  const location = useLocation();
  const isShareView = location.pathname === '/share';
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
  const [activeMobileTab, setActiveMobileTab] = useState<'inputs' | 'stops' | 'map'>('inputs');

  // Custom charger selection mode states
  const [pickOwnChargers, setPickOwnChargers] = useState(true);
  const [selectedCustomStopIds, setSelectedCustomStopIds] = useState<number[]>([]);
  const [candidateStations, setCandidateStations] = useState<Station[]>([]);
  const [operatorFilter, setOperatorFilter] = useState<'all' | 'chargezone' | 'statiq'>('all');

  // Custom confirmed route and share states
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [gapErrors, setGapErrors] = useState<{ from: string; to: string; distance: number }[]>([]);
  const [showCopySuccess, setShowCopySuccess] = useState(false);

  const getShareLink = () => {
    if (!routePlan) return '';
    const params = new URLSearchParams();
    params.set('shared', 'true');
    params.set('origin', routePlan.origin.name);
    params.set('destination', routePlan.destination.name);
    params.set('vehicle', selectedVehicle);
    params.set('range', String(claimedRange));
    params.set('stops', selectedCustomStopIds.join(','));
    return `${window.location.origin}/share?${params.toString()}`;
  };

  const handleCopyLink = async () => {
    const link = getShareLink();
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setShowCopySuccess(true);
      setTimeout(() => setShowCopySuccess(false), 1800);
    } catch {
      setError('Could not copy the share link. Please copy it manually.');
    }
  };

  // Helper to parse gap errors from warnings
  const parseGapErrors = (warnings: string[]) => {
    const gaps: { from: string; to: string; distance: number }[] = [];
    const regex = /The segment from '([^']+)' to '([^']+)' is approximately ([\d.]+) km/;
    if (warnings) {
      for (const w of warnings) {
        const match = w.match(regex);
        if (match) {
          gaps.push({
            from: match[1],
            to: match[2],
            distance: parseFloat(match[3])
          });
        }
      }
    }
    return gaps;
  };

  // Helper to load shared route on mount
  const handleLoadSharedRoute = async (o: string, d: string, vehicle: string, range: number, stops: number[]) => {
    setLoading(true);
    setError(null);
    setSelectedStationId(null);
    setStationDetails(null);
    try {
      const response = await fetch(`${API_BASE}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_name: vehicle,
          claimed_range_km: range,
          origin: o,
          destination: d,
          pick_own_chargers: true,
          custom_stops: stops,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || 'Failed to plan route');
      }

      const data = await response.json();
      setRoutePlan(data);
      if (data.candidate_stations) {
        setCandidateStations(data.candidate_stations);
      }
      setActiveMobileTab('map');
    } catch (err: any) {
      setError(err.message || 'An error occurred during routing.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('shared') !== 'true') return;

    const urlOrigin = params.get('origin') || '';
    const urlDest = params.get('destination') || '';
    const urlVehicle = params.get('vehicle') || '';
    const urlRange = parseInt(params.get('range') || '0', 10);
    const stopsParam = params.get('stops');
    const urlStops = stopsParam ? stopsParam.split(',').filter(Boolean).map(Number) : [];

    if (urlOrigin && urlDest) {
      setOrigin(urlOrigin);
      setDestination(urlDest);
      if (urlVehicle) setSelectedVehicle(urlVehicle);
      if (urlRange) setClaimedRange(urlRange);
      setSelectedCustomStopIds(urlStops);
      setPickOwnChargers(true);
      setIsConfirmed(true);
      handleLoadSharedRoute(urlOrigin, urlDest, urlVehicle, urlRange, urlStops);
    }
  }, [location.pathname, location.search]);

  // Sync range input with vehicle select
  const handleVehicleChange = (vehicleName: string) => {
    setSelectedVehicle(vehicleName);
    const vehicle = VEHICLES.find(v => v.name === vehicleName);
    if (vehicle) {
      const newRange = vehicle.range || 250;
      if (vehicleName === 'Other Vehicle') {
        setIsCustomRange(true);
      } else {
        setClaimedRange(newRange);
        setIsCustomRange(false);
      }
      
      // If a route plan is already active, trigger recalculation with the new range
      if (origin.trim() && destination.trim() && routePlan) {
        setTimeout(() => {
          const stopsToSend = pickOwnChargers ? selectedCustomStopIds : [];
          fetch(`${API_BASE}/api/route`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              vehicle_name: vehicleName,
              claimed_range_km: newRange,
              origin: origin,
              destination: destination,
              pick_own_chargers: pickOwnChargers,
              custom_stops: stopsToSend
            })
          })
          .then(res => {
            if (!res.ok) throw new Error('Recalculation failed');
            return res.json();
          })
          .then(data => {
            setRoutePlan(data);
            if (data.candidate_stations) {
              setCandidateStations(data.candidate_stations);
            }
          })
          .catch(err => console.error('Vehicle change route update failed:', err));
        }, 50);
      }
    }
  };

  // Submit route request to backend
  const handleFindRoute = async (customOrigin?: string, customDest?: string, forceNoCustomStops?: boolean) => {
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

    const stopsToSend = forceNoCustomStops ? [] : selectedCustomStopIds;
    if (forceNoCustomStops) {
      setSelectedCustomStopIds([]);
      setCandidateStations([]);
    }

    try {
      const response = await fetch(`${API_BASE}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_name: selectedVehicle,
          claimed_range_km: claimedRange,
          origin: o,
          destination: d,
          pick_own_chargers: pickOwnChargers,
          custom_stops: stopsToSend,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || 'Failed to plan route');
      }

      const data = await response.json();
      setRoutePlan(data);
      if (data.candidate_stations) {
        setCandidateStations(data.candidate_stations);
      } else {
        setCandidateStations([]);
      }
      setActiveMobileTab('map');
    } catch (err: any) {
      setError(err.message || 'An error occurred during routing.');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleCustomStop = async (stationId: number) => {
    let newCustomStops = [...selectedCustomStopIds];
    if (newCustomStops.includes(stationId)) {
      newCustomStops = newCustomStops.filter(id => id !== stationId);
    } else {
      newCustomStops.push(stationId);
    }
    setSelectedCustomStopIds(newCustomStops);
    
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(`${API_BASE}/api/route`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vehicle_name: selectedVehicle,
          claimed_range_km: claimedRange,
          origin: origin,
          destination: destination,
          pick_own_chargers: true,
          custom_stops: newCustomStops,
        }),
      });

      if (!response.ok) {
        const errDetail = await response.json();
        throw new Error(errDetail.detail || 'Failed to update stops route');
      }

      const data = await response.json();
      setRoutePlan(data);
      if (data.candidate_stations) {
        setCandidateStations(data.candidate_stations);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred during route recalculation.');
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePickOwnChargers = (val: boolean) => {
    setPickOwnChargers(val);
    setSelectedCustomStopIds([]);
    setCandidateStations([]);
    
    if (origin.trim() && destination.trim() && routePlan) {
      setTimeout(() => {
        handleFindRoute(origin, destination, true);
      }, 50);
    }
  };

  // Fetch reviews for a specific station
  const handleSelectStation = async (stationId: number) => {
    setSelectedStationId(stationId);
    setLoadingReviews(true);
    setActiveMobileTab('stops');
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
    setSelectedCustomStopIds([]);
    setCandidateStations([]);
    handleFindRoute(orig, dest, true);
  };

  // Gather all points for map controller auto-bounds
  const getMapPoints = (): [number, number][] => {
    if (!routePlan) return [];
    if (routePlan.route_geometry && routePlan.route_geometry.length > 0) {
      return routePlan.route_geometry as [number, number][];
    }
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
    if (!src) return { text: 'Unknown', color: 'bg-gray-100 text-gray-800 border-gray-200' };
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

  const getTopRatedStations = () => {
    return [...candidateStations].sort((a, b) => {
      const scoreA = a.reliability_score ?? -1;
      const scoreB = b.reliability_score ?? -1;
      return scoreB - scoreA;
    });
  };

  const chargeZoneStations = candidateStations.filter(s => 
    s.name.toLowerCase().includes('chargezone') || 
    s.name.toLowerCase().includes('charge zone') ||
    (s.address && s.address.toLowerCase().includes('chargezone')) ||
    (s.address && s.address.toLowerCase().includes('charge zone'))
  );
  
  const statiqStations = candidateStations.filter(s => 
    s.name.toLowerCase().includes('statiq') ||
    (s.address && s.address.toLowerCase().includes('statiq'))
  );

  const getFilteredStations = () => {
    let list = getTopRatedStations();
    if (operatorFilter === 'chargezone') {
      list = list.filter(s => 
        s.name.toLowerCase().includes('chargezone') || 
        s.name.toLowerCase().includes('charge zone') ||
        (s.address && s.address.toLowerCase().includes('chargezone')) ||
        (s.address && s.address.toLowerCase().includes('charge zone'))
      );
    } else if (operatorFilter === 'statiq') {
      list = list.filter(s => 
        s.name.toLowerCase().includes('statiq') ||
        (s.address && s.address.toLowerCase().includes('statiq'))
      );
    }
    return list;
  };

  return (
    <div className="flex flex-col h-screen bg-[#F8F6F0]">
      <Navbar />
      
      {/* Floating horizontal bar at the top (after Find best route is selected) */}
      {routePlan && (
        <div className="bg-white/95 backdrop-blur border-b border-[#1F3E2E]/10 p-3 px-6 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4 z-20 shrink-0 select-none">
          <div className="flex flex-wrap items-center gap-4 text-xs font-semibold text-[#1F3E2E]">
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-400">FROM</span>
              <span className="bg-[#1F3E2E]/5 px-2.5 py-1 rounded border border-[#1F3E2E]/10">{routePlan.origin.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-400">TO</span>
              <span className="bg-[#1F3E2E]/5 px-2.5 py-1 rounded border border-[#1F3E2E]/10">{routePlan.destination.name}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-gray-400">VEHICLE</span>
              <span className="bg-[#1F3E2E]/5 px-2.5 py-1 rounded border border-[#1F3E2E]/10">{selectedVehicle} ({claimedRange} km)</span>
            </div>
            <div className="flex items-center gap-2 border-l border-gray-200 pl-4">
              <span className="font-bold text-gray-400">INTERACTIVE MODE</span>
              <span className={`px-2 py-0.5 rounded font-bold text-[10px] uppercase ${pickOwnChargers ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>
                {pickOwnChargers ? 'ON' : 'OFF'}
              </span>
              <span className="text-[10px] font-medium text-gray-400">
                Expected safe range: {routePlan.effective_range_km} km
              </span>
            </div>
          </div>
          
          {!isShareView ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs font-bold mr-2">
              <span className="text-[10px] text-gray-400 font-medium">Pick own chargers:</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={pickOwnChargers} 
                  onChange={(e) => handleTogglePickOwnChargers(e.target.checked)}
                  className="sr-only peer" 
                />
                <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#489d73]"></div>
              </label>
            </div>
            {!isShareView && (
              <button
                onClick={() => {
                  setRoutePlan(null);
                  setOrigin('');
                  setDestination('');
                  setSelectedCustomStopIds([]);
                  setCandidateStations([]);
                  setIsConfirmed(false);
                  setGapErrors([]);
                  setPickOwnChargers(true);
                  window.history.pushState({}, '', window.location.pathname);
                }}
                className="px-3.5 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold rounded-lg text-xs transition-colors hover:cursor-pointer"
              >
                New Plan
              </button>
            )}
          </div>
          ) : null}
        </div>
      )}
      
      <div className="flex flex-1 overflow-hidden relative">
        <div className={`bg-[#F8F6F0] flex flex-col shrink-0 ${
          routePlan 
            ? (activeMobileTab === 'inputs' ? 'w-full flex md:flex md:w-96 h-full border-r border-[#1F3E2E]/10 overflow-hidden' : 'hidden md:flex md:w-96 h-full border-r border-[#1F3E2E]/10 overflow-hidden') 
            : 'w-full flex md:w-96 p-6 gap-6 overflow-y-auto border-r border-[#1F3E2E]/10'
        }`}>
          {!routePlan ? (
            <>
              <div>
                <p className="text-sm font-semibold tracking-widest text-[#489d73] mb-2 uppercase">Plan your route</p>
                <h1 className="text-3xl font-serif text-[#1F3E2E] leading-tight font-bold">
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
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm hover:cursor-pointer"
                  >
                    {VEHICLES.map((v, idx) => (
                      <option key={idx} value={v.name}>
                        {v.range ? `${v.name} · ${v.range} km` : v.name}
                      </option>
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
                    className="w-full bg-white border border-gray-200 rounded-lg p-3 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm disabled:bg-gray-100 disabled:text-gray-400" 
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
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 pl-11 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm" 
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
                      className="w-full bg-white border border-gray-200 rounded-lg p-3 pl-11 text-sm text-gray-800 focus:outline-none focus:border-[#489d73] focus:ring-1 focus:ring-[#489d73] shadow-sm" 
                    />
                  </div>
                </div>

                {!isShareView && (
                  <div className="flex items-center justify-between p-3.5 rounded-xl bg-white border border-gray-100 shadow-sm select-none">
                    <div className="flex flex-col gap-0.5">
                      <span className="text-xs font-bold text-gray-800 uppercase tracking-wide">Interactive Stops</span>
                      <span className="text-[10px] text-gray-400 font-medium">Choose charging stations manually</span>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        checked={pickOwnChargers} 
                        onChange={(e) => handleTogglePickOwnChargers(e.target.checked)}
                        className="sr-only peer" 
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#489d73]"></div>
                    </label>
                  </div>
                )}

                {error && (
                  <div className="p-3.5 rounded-lg bg-rose-50 border border-rose-200 text-xs font-medium text-rose-600 flex items-start gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button 
                  onClick={() => handleFindRoute()}
                  disabled={loading}
                  className="w-full bg-[#1F3E2E] text-white rounded-lg p-3.5 font-semibold flex items-center justify-center hover:bg-[#152e21] disabled:bg-gray-400 transition-colors shadow-md mt-4 cursor-pointer"
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

                <div className="flex gap-2 pt-1">
                  <button 
                    onClick={() => handlePreset('Mumbai', 'Delhi')}
                    className="bg-white border border-gray-200 text-[10px] font-bold text-gray-600 px-2.5 py-1.5 rounded flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="text-blue-500 mr-1 text-[9px]">↗</span> Mumbai - Delhi
                  </button>
                  <button 
                    onClick={() => handlePreset('Delhi', 'Agra')}
                    className="bg-white border border-gray-200 text-[10px] font-bold text-gray-600 px-2.5 py-1.5 rounded flex items-center hover:bg-gray-50 cursor-pointer"
                  >
                    <span className="text-blue-500 mr-1 text-[9px]">↗</span> Delhi - Agra
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col h-full overflow-hidden p-5 gap-4">
              <div>
                <p className="text-sm font-semibold tracking-widest text-[#489d73] mb-1 uppercase">Top Rated Chargers</p>
                <h2 className="text-xl font-serif text-[#1F3E2E] font-bold">Best reviews on path</h2>
              </div>
              
              {/* Operator Filter Tabs */}
              <div className="flex gap-1.5 p-1 bg-gray-200/50 rounded-lg text-[10px] font-bold select-none shrink-0">
                <button
                  onClick={() => setOperatorFilter('all')}
                  className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                    operatorFilter === 'all' 
                      ? 'bg-[#1F3E2E] text-white shadow-sm' 
                      : 'text-gray-500 hover:text-gray-800'
                  }`}
                >
                  All ({candidateStations.length})
                </button>
                <button
                  onClick={() => setOperatorFilter('chargezone')}
                  className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                    operatorFilter === 'chargezone' 
                      ? 'bg-emerald-600 text-white shadow-sm' 
                      : 'text-emerald-700 hover:bg-emerald-50'
                  }`}
                >
                  ChargeZone ({chargeZoneStations.length})
                </button>
                <button
                  onClick={() => setOperatorFilter('statiq')}
                  className={`flex-1 py-1.5 rounded-md text-center transition-all cursor-pointer ${
                    operatorFilter === 'statiq' 
                      ? 'bg-indigo-600 text-white shadow-sm' 
                      : 'text-indigo-700 hover:bg-indigo-50'
                  }`}
                >
                  Statiq ({statiqStations.length})
                </button>
              </div>

              {/* List of stations */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {getFilteredStations().length === 0 ? (
                  <div className="text-center py-10 bg-white rounded-xl border border-dashed border-gray-200 p-4">
                    <AlertTriangle className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                    <p className="text-xs font-semibold text-gray-500">No matching stations</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Try changing filters or range</p>
                  </div>
                ) : (
                  getFilteredStations().map((station) => {
                    const isSelectedStop = selectedCustomStopIds.includes(station.id);
                    const isChargeZone = station.name.toLowerCase().includes('chargezone') || 
                                         station.name.toLowerCase().includes('charge zone') ||
                                         (station.address && station.address.toLowerCase().includes('chargezone')) ||
                                         (station.address && station.address.toLowerCase().includes('charge zone'));
                    const isStatiq = station.name.toLowerCase().includes('statiq') ||
                                     (station.address && station.address.toLowerCase().includes('statiq'));
                    
                    return (
                      <div 
                        key={station.id}
                        onClick={() => handleSelectStation(station.id)}
                        className={`bg-white border rounded-xl p-3.5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer text-left relative group ${
                          selectedStationId === station.id ? 'border-emerald-500 ring-1 ring-emerald-500' : 'border-gray-100'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2 mb-1.5">
                          <div className="flex flex-col gap-1 max-w-[70%]">
                            {isChargeZone ? (
                              <span className="self-start text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-100">
                                ChargeZone
                              </span>
                            ) : isStatiq ? (
                              <span className="self-start text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 border border-indigo-100">
                                Statiq
                              </span>
                            ) : (
                              <span className="self-start text-[8px] font-extrabold uppercase tracking-wider px-1.5 py-0.5 rounded bg-gray-50 text-gray-500 border border-gray-100">
                                Public
                              </span>
                            )}
                            <h4 className="font-serif text-sm font-bold text-[#1F3E2E] group-hover:text-[#489d73] transition-colors leading-tight line-clamp-1">
                              {station.name}
                            </h4>
                          </div>
                          <div className="flex flex-col items-end gap-1 shrink-0">
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                              station.reliability_score !== null && station.reliability_score >= 75 ? 'bg-emerald-50 text-emerald-700' :
                              station.reliability_score !== null && station.reliability_score >= 40 ? 'bg-amber-50 text-amber-700' : 
                              station.reliability_score !== null ? 'bg-rose-50 text-rose-700' : 'bg-gray-50 text-gray-400'
                            }`}>
                              Score: {station.reliability_score !== null ? Math.round(station.reliability_score) : 'N/A'}
                            </span>
                          </div>
                        </div>
                        
                        <p className="text-[11px] text-gray-500 line-clamp-1 mb-2.5">{station.address || 'Address not listed'}</p>
                        
                        <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                          <span>+{Math.round(station.distance_from_route_m / 1000)} km detour</span>
                          {!isConfirmed ? (
                            <button
                              onClick={async (e) => {
                                e.stopPropagation();
                                if (!pickOwnChargers) {
                                  setPickOwnChargers(true);
                                  setSelectedCustomStopIds([station.id]);
                                  setLoading(true);
                                  try {
                                    const response = await fetch(`${API_BASE}/api/route`, {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({
                                        vehicle_name: selectedVehicle,
                                        claimed_range_km: claimedRange,
                                        origin: origin,
                                        destination: destination,
                                        pick_own_chargers: true,
                                        custom_stops: [station.id],
                                      }),
                                    });
                                    const data = await response.json();
                                    setRoutePlan(data);
                                    if (data.candidate_stations) setCandidateStations(data.candidate_stations);
                                  } catch (err) {
                                    console.error(err);
                                  } finally {
                                    setLoading(false);
                                  }
                                } else {
                                  handleToggleCustomStop(station.id);
                                }
                              }}
                              className={`px-2 py-1 rounded text-[8px] font-extrabold cursor-pointer border shadow-sm transition-all ${
                                isSelectedStop 
                                  ? 'bg-rose-50 border-rose-200 text-rose-600 hover:bg-rose-100' 
                                  : 'bg-[#489d73] border-[#3b825e] text-white hover:bg-[#3b825e]'
                              }`}
                            >
                              {isSelectedStop ? 'Remove Stop' : 'Add Stop'}
                            </button>
                          ) : (
                            isSelectedStop && (
                              <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-1 rounded text-[8px] font-extrabold select-none">
                                ✓ Confirmed Stop
                              </span>
                            )
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right Sidebar: Charging Stop Details & Reviews */}
        {routePlan && (
          <div className={`bg-[#F8F6F0] flex flex-col overflow-hidden z-10 border-l border-[#1F3E2E]/10 shrink-0 ${
            activeMobileTab === 'stops' ? 'w-full flex md:flex md:w-96' : 'hidden md:flex md:w-96'
          }`}>
            {selectedStationId !== null ? (
              /* View State A: Loading reviews or Review Details */
              <div className="flex flex-col h-full overflow-hidden">
                {/* Back Header */}
                <div className="p-5 border-b border-[#1F3E2E]/10 flex items-center gap-3 bg-[#F3EFE6]">
                  <button 
                    onClick={() => { setSelectedStationId(null); setStationDetails(null); }}
                    className="p-1.5 rounded-full hover:bg-[#1F3E2E]/5 text-[#1F3E2E] transition-colors hover:cursor-pointer"
                  >
                    <ArrowLeft className="w-4.5 h-4.5" />
                  </button>
                  <div className="overflow-hidden">
                    <p className="text-[10px] font-bold tracking-wider text-gray-400 uppercase">Station Details</p>
                    <h3 className="font-serif text-base text-[#1F3E2E] font-bold truncate">
                      {stationDetails ? stationDetails.name : 'Loading...'}
                    </h3>
                  </div>
                </div>

                {loadingReviews ? (
                  <div className="flex-1 flex flex-col items-center justify-center gap-2 p-6">
                    <Loader2 className="w-7 h-7 animate-spin text-[#489d73]" />
                    <p className="text-xs font-medium text-gray-500">Retrieving aggregated reviews...</p>
                  </div>
                ) : stationDetails ? (
                  <div className="flex-1 flex flex-col p-5 overflow-y-auto">
                    {/* Reliability Score Card */}
                    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 mb-4 flex items-center justify-between">
                      <div>
                        <p className="text-[9px] font-bold text-gray-400 uppercase tracking-widest mb-0.5">Reliability Score</p>
                        <div className="flex items-baseline gap-0.5">
                          <span className="text-3xl font-extrabold tracking-tight text-[#1F3E2E]">
                            {stationDetails.reliability_score !== null ? Math.round(stationDetails.reliability_score) : 'N/A'}
                          </span>
                          {stationDetails.reliability_score !== null && <span className="text-xs text-gray-400">/ 100</span>}
                        </div>
                        <p className="text-[10px] text-gray-400 mt-1">Recency-weighted sentiment score</p>
                      </div>
                      {/* Score colored ring */}
                      <div className="w-14 h-14 rounded-full flex items-center justify-center font-bold text-xs relative border-4 border-gray-100">
                        {stationDetails.reliability_score !== null ? (
                          <>
                            <div 
                              className={`absolute inset-0 rounded-full border-4 border-transparent ${
                                stationDetails.reliability_score >= 75 ? 'border-t-emerald-500 border-r-emerald-500' :
                                stationDetails.reliability_score >= 40 ? 'border-t-amber-500 border-r-amber-500' : 'border-t-rose-500 border-r-rose-500'
                              }`}
                              style={{ transform: 'rotate(-45deg)' }}
                            />
                            <span className="relative z-10 text-[10px] font-bold">
                              {stationDetails.reliability_score >= 75 ? 'Good' :
                               stationDetails.reliability_score >= 40 ? 'Fair' : 'Poor'}
                            </span>
                          </>
                        ) : (
                          <span className="text-gray-400 text-[10px]">Unscored</span>
                        )}
                      </div>
                    </div>

                    {/* Station Info details */}
                    <div className="space-y-3 mb-5 text-xs">
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Network Operator</h4>
                        <p className="font-semibold text-[#1F3E2E]">{stationDetails.network_operator || 'Independent / Unknown'}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Address</h4>
                        <p className="text-gray-600 leading-relaxed">{stationDetails.address || 'Address not listed'}</p>
                      </div>
                      <div>
                        <h4 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-1">Available Connectors</h4>
                        <div className="flex flex-wrap gap-1">
                          {stationDetails.connector_types && stationDetails.connector_types.length > 0 ? (
                            stationDetails.connector_types.map((type, idx) => (
                              <span key={idx} className="bg-[#1F3E2E]/5 border border-[#1F3E2E]/15 text-[#1F3E2E] text-[9px] font-bold tracking-wider px-1.5 py-0.5 rounded">
                                {type}
                              </span>
                            ))
                          ) : (
                            <span className="text-gray-400 italic">No connector info available</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Reviews List */}
                    <div>
                      <h4 className="font-serif text-base text-[#1F3E2E] font-bold mb-3 flex items-center gap-1.5">
                        User Reviews 
                        <span className="bg-[#1F3E2E]/10 text-[#1F3E2E] font-sans text-xs px-2 py-0.5 rounded-full">
                          {stationDetails.reviews.length}
                        </span>
                      </h4>

                      {stationDetails.reviews.length === 0 ? (
                        <div className="text-center py-8 bg-white rounded-xl border border-dashed border-gray-200 p-4">
                          <AlertTriangle className="w-7 h-7 text-gray-300 mx-auto mb-1.5" />
                          <p className="text-xs font-semibold text-gray-500">No review posts collected yet.</p>
                          <p className="text-[10px] text-gray-400 mt-0.5">Our weekly scraper pipeline aggregates recent posts.</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {stationDetails.reviews.map((rev, idx) => {
                            const srcInfo = formatSource(rev.source);
                            return (
                              <div key={idx} className="bg-white rounded-xl p-3 shadow-sm border border-gray-100 flex flex-col gap-2">
                                <div className="flex items-center justify-between text-[10px]">
                                  <span className={`px-1.5 py-0.5 rounded-full border text-[9px] font-bold ${srcInfo.color}`}>
                                    {srcInfo.text}
                                  </span>
                                  {rev.date && (
                                    <span className="text-gray-400 font-medium">
                                      {new Date(rev.date).toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' })}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-gray-700 leading-relaxed">
                                  "{rev.text}"
                                </p>
                                <div className="flex items-center justify-between border-t border-gray-50 pt-2 text-[9px] font-bold uppercase tracking-wider">
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
                                        <span key={iIdx} className="bg-rose-50 border border-rose-200 text-rose-700 px-1.5 py-0.5 rounded text-[7px]">
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
                  <div className="p-6 text-center text-xs text-gray-500">Failed to load station details.</div>
                )}
              </div>
            ) : (
              /* View State B: Stops sequence list */
              <div className="p-5 flex flex-col h-full overflow-hidden">
                <div className="mb-4">
                  <h3 className="font-serif text-lg text-[#1F3E2E] font-bold">Stops Sequence ({routePlan.stops.length})</h3>
                  <p className="text-[10px] text-gray-400 font-semibold tracking-wider uppercase mt-1">
                    {pickOwnChargers ? 'Your selected charging locations' : 'Recommended charging locations'}
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto pr-1">
                  {routePlan.stops.length === 0 ? (
                    routePlan.total_distance_km <= routePlan.effective_range_km ? (
                      <div className="p-4 bg-emerald-50/50 border border-emerald-100 rounded-xl text-xs font-semibold text-emerald-800 flex items-center gap-2">
                        <CheckCircle className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                        <span>No charging stops needed for this range. Safe trip!</span>
                      </div>
                    ) : (
                      <div className="p-4 bg-rose-50/50 border border-rose-100 rounded-xl text-xs font-semibold text-rose-850 flex items-start gap-2">
                        <AlertTriangle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                        <div>
                          <span className="font-bold">Not Feasible:</span>
                          <p className="mt-0.5 leading-relaxed text-[11px] text-rose-700">Route requires charging, but no stations were found within vehicle range.</p>
                        </div>
                      </div>
                    )
                  ) : (
                    <div className="relative border-l-2 border-[#1F3E2E]/10 pl-5 ml-3 space-y-4 pt-1">
                      {routePlan.stops.map((stop, idx) => (
                        <div key={idx} className="relative group">
                          {/* Dot indicator */}
                          <div className={`absolute -left-[29px] top-1.5 w-4.5 h-4.5 rounded-full border-2 bg-white flex items-center justify-center ${
                            stop.reliability_score !== null && stop.reliability_score >= 75 ? 'border-emerald-500' :
                            stop.reliability_score !== null && stop.reliability_score >= 40 ? 'border-amber-500' : 'border-rose-500'
                          }`}>
                            <div className={`w-1.5 h-1.5 rounded-full ${
                              stop.reliability_score !== null && stop.reliability_score >= 75 ? 'bg-emerald-500' :
                              stop.reliability_score !== null && stop.reliability_score >= 40 ? 'bg-amber-500' : 'bg-rose-500'
                            }`}></div>
                          </div>

                          <div 
                            onClick={() => handleSelectStation(stop.id)}
                            className="bg-white border border-gray-100 rounded-xl p-3.5 hover:shadow-md hover:border-gray-200 transition-all cursor-pointer text-left"
                          >
                            <div className="flex items-start justify-between gap-1 mb-1">
                              <h4 className="font-serif text-sm font-bold text-[#1F3E2E] group-hover:text-[#489d73] transition-colors leading-tight line-clamp-1">
                                {stop.name}
                              </h4>
                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                  stop.reliability_score !== null && stop.reliability_score >= 75 ? 'bg-emerald-50 text-emerald-700' :
                                  stop.reliability_score !== null && stop.reliability_score >= 40 ? 'bg-amber-50 text-amber-700' : 'bg-rose-50 text-rose-700'
                                }`}>
                                  Score: {stop.reliability_score !== null ? Math.round(stop.reliability_score) : 'N/A'}
                                </span>
                                {!isShareView && pickOwnChargers && !isConfirmed && (
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleToggleCustomStop(stop.id);
                                    }}
                                    className="p-0.5 px-1 bg-rose-50 text-rose-500 hover:bg-rose-100 hover:text-rose-700 rounded text-[9px] font-bold transition-all cursor-pointer"
                                    title="Remove Stop"
                                  >
                                    ✕
                                  </button>
                                )}
                              </div>
                            </div>

                            <p className="text-[11px] text-gray-500 line-clamp-1 mb-2">{stop.address || 'Address not listed'}</p>

                            <div className="flex items-center justify-between text-[9px] font-extrabold uppercase tracking-wider text-gray-400">
                              <span>+{Math.round(stop.distance_from_route_m / 1000)} km detour</span>
                              <div className="flex gap-1 max-w-[65%] overflow-hidden">
                                {stop.connector_types && stop.connector_types.slice(0, 2).map((c, cIdx) => (
                                  <span key={cIdx} className="bg-[#1F3E2E]/5 text-[#1F3E2E] px-1 py-0.5 rounded text-[8px]">
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

                {/* Range Gap / Feasibility Alerts */}
                {!isShareView && gapErrors.length > 0 && (
                  <div className="p-4 bg-rose-50 border border-rose-200 rounded-xl mb-3 text-xs font-semibold text-rose-850 flex flex-col gap-2 shrink-0">
                    <div className="flex items-center gap-1.5 text-rose-700">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
                      <span className="font-serif font-bold text-sm">Safe Range Limit Exceeded</span>
                    </div>
                    <p className="text-[10px] text-rose-600 leading-normal font-medium">
                      Some sections are too far apart for your range. Please pick an intermediate charger on the map between:
                    </p>
                    <div className="space-y-1.5 mt-1">
                      {gapErrors.map((err, errIdx) => (
                        <div key={errIdx} className="bg-white border border-rose-100 p-2.5 rounded-lg flex flex-col gap-0.5 shadow-sm text-left">
                          <div className="flex items-center justify-between text-[8px] font-extrabold text-gray-400 uppercase tracking-widest">
                            <span>Section #{errIdx + 1}</span>
                            <span className="text-rose-600 font-bold">{err.distance.toFixed(1)} km</span>
                          </div>
                          <div className="flex items-center gap-1 font-bold text-gray-700 text-[10px]">
                            <span className="truncate max-w-[110px]">{err.from}</span>
                            <span className="text-gray-300">➜</span>
                            <span className="truncate max-w-[110px]">{err.to}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Confirm & Share Controls */}
                {!isShareView && pickOwnChargers ? (
                  !isConfirmed ? (
                    <button
                      onClick={() => {
                        if (selectedCustomStopIds.length === 0 && routePlan.total_distance_km > routePlan.effective_range_km) {
                          setError("Please select at least one charging stop on the map to confirm your route.");
                          return;
                        }
                        const gaps = parseGapErrors(routePlan.warnings);
                        if (gaps.length > 0) {
                          setGapErrors(gaps);
                        } else {
                          setGapErrors([]);
                          setIsConfirmed(true);
                          setError(null);
                        }
                      }}
                      className="w-full bg-[#1F3E2E] text-white rounded-lg p-3.5 font-bold hover:bg-[#152e21] transition-colors shadow-md text-xs shrink-0 flex items-center justify-center gap-2 cursor-pointer mt-2"
                    >
                      <Zap className="w-4 h-4 text-emerald-400 animate-pulse" />
                      Confirm Custom Route
                    </button>
                  ) : (
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mt-2 flex flex-col gap-2 shrink-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-emerald-800">
                          <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-600" />
                          <span className="font-serif font-bold text-sm">Route Confirmed!</span>
                        </div>
                        <button
                          onClick={() => {
                            setIsConfirmed(false);
                            setGapErrors([]);
                          }}
                          className="text-[10px] text-gray-400 hover:text-gray-600 font-extrabold underline cursor-pointer"
                        >
                          Modify Route
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-700 leading-normal font-medium">
                        Your route is locked and ready. Copy the shareable link below to share this exact path and selected stations:
                      </p>
                      <div className="flex gap-1.5 mt-1">
                        <input
                          type="text"
                          readOnly
                          value={getShareLink()}
                          className="flex-1 bg-white border border-gray-200 rounded-lg p-2 text-[10px] text-gray-500 font-semibold focus:outline-none select-all truncate"
                        />
                        <button
                          onClick={handleCopyLink}
                          className={`px-3 py-2 rounded-lg text-[10px] font-bold text-white transition-all shadow-sm flex items-center gap-1 cursor-pointer shrink-0 ${
                            showCopySuccess ? 'bg-emerald-600' : 'bg-[#1F3E2E] hover:bg-[#152e21]'
                          }`}
                        >
                          {showCopySuccess ? 'Copied!' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  )
                ) : (
                  <div className="mt-2 shrink-0">
                    <button
                      onClick={handleCopyLink}
                      className={`w-full py-3 rounded-lg text-xs font-bold text-white transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer ${
                        showCopySuccess ? 'bg-emerald-600' : 'bg-[#1F3E2E] hover:bg-[#152e21]'
                      }`}
                    >
                      {showCopySuccess ? (
                        <>
                          <CheckCircle className="w-4.5 h-4.5" />
                          Link Copied to Clipboard!
                        </>
                      ) : (
                        <>
                          <Map className="w-4.5 h-4.5" />
                          Share This Route
                        </>
                      )}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Right Map Area */}
        <div className={`flex-1 relative z-0 ${isShareView ? 'w-full h-full block' : activeMobileTab === 'map' ? 'w-full h-full block' : 'hidden md:block'}`}>
          <MapContainer
            center={[20.5937, 78.9629]}
            zoom={5}
            className="w-full h-full"
            zoomControl={!isShareView}
            dragging={!isShareView}
            scrollWheelZoom={!isShareView}
            doubleClickZoom={!isShareView}
            touchZoom={!isShareView}
            boxZoom={!isShareView}
            keyboard={!isShareView}
          >
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

                <Polyline 
                  positions={getMapPoints()} 
                  color="#1F3E2E" 
                  weight={5} 
                  opacity={0.85}
                />
              </>
            )}

            {/* Stops / Charging Station Markers */}
            {routePlan && (!pickOwnChargers || isShareView) && routePlan.stops.map((stop, idx) => (
              <Marker 
                key={stop.id}
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

            {/* Candidate / Interactive Stop Selection Markers */}
            {routePlan && !isShareView && pickOwnChargers && candidateStations.map((station) => {
              const isSelected = selectedCustomStopIds.includes(station.id);
              const stopIndex = routePlan.stops.findIndex(s => s.id === station.id);
              return (
                <Marker
                  key={station.id}
                  position={[station.lat, station.lng]}
                  icon={isSelected 
                    ? getStationIcon(station.reliability_score, selectedStationId === station.id)
                    : getAvailableStationIcon(station.reliability_score)
                  }
                  eventHandlers={{
                    click: () => handleSelectStation(station.id)
                  }}
                >
                  <Popup>
                    <div className="text-xs p-1 text-left">
                      <p className="font-bold text-gray-400 uppercase tracking-wider text-[8px] mb-0.5">
                        {isSelected ? `Charging Stop #${stopIndex + 1}` : 'Available Charger'}
                      </p>
                      <p className="text-sm font-serif font-bold text-[#1F3E2E] mb-1 leading-tight">{station.name}</p>
                      <p className="text-xs font-bold text-gray-600 mb-1.5">
                        Reliability Score: {station.reliability_score !== null ? `${Math.round(station.reliability_score)}/100` : 'N/A'}
                      </p>
                      
                      <div className="flex flex-col gap-2 mt-2">
                        <button
                          onClick={() => handleToggleCustomStop(station.id)}
                          className={`w-full py-1.5 rounded text-center text-xs font-bold text-white transition-colors cursor-pointer ${
                            isSelected ? 'bg-rose-500 hover:bg-rose-600' : 'bg-[#489d73] hover:bg-[#3b825e]'
                          }`}
                        >
                          {isSelected ? 'Remove Stop' : 'Add Stop'}
                        </button>
                        <button 
                          onClick={() => handleSelectStation(station.id)}
                          className="text-xs text-[#489d73] font-bold hover:underline text-center mt-1 cursor-pointer"
                        >
                          View reviews & details
                        </button>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              );
            })}
          </MapContainer>
        </div>
      </div>

      {/* Mobile Bottom Navigation Bar */}
      {routePlan && !isShareView && (
        <div className="md:hidden bg-[#FAF9F5] border-t border-[#1F3E2E]/10 flex items-center justify-around py-3 px-6 z-20 shrink-0">
          <button
            onClick={() => setActiveMobileTab('inputs')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              activeMobileTab === 'inputs' ? 'text-[#489d73]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <MapPin className="w-5 h-5" />
            <span>Plan</span>
          </button>
          
          <button
            onClick={() => setActiveMobileTab('map')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold ${
              activeMobileTab === 'map' ? 'text-[#489d73]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <Map className="w-5 h-5" />
            <span>Map</span>
          </button>
          
          <button
            onClick={() => setActiveMobileTab('stops')}
            className={`flex flex-col items-center gap-1 text-[11px] font-bold relative ${
              activeMobileTab === 'stops' ? 'text-[#489d73]' : 'text-gray-400 hover:text-gray-600'
            }`}
          >
            <List className="w-5 h-5" />
            <span>Stops</span>
            {routePlan.stops.length > 0 && (
              <span className="absolute -top-1 -right-2 bg-[#489d73] text-white text-[9px] w-4 h-4 rounded-full flex items-center justify-center font-bold">
                {routePlan.stops.length}
              </span>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default RoutePlanner;

// Updated TripDetailSimplified.jsx with star for trip saving (no more favorites)
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, MapPin, Calendar, Users, Clock, Route, ChevronDown, ChevronUp, 
  Star, Search, CheckSquare, Camera, Map, List, Check, Trash2 
} from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import ModernPlaceSearch from '../places/ModernPlaceSearch';
import TripMemories from '../media/TripMemories';
import TripChecklist from './TripChecklist';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import googleMapsService from '../../services/googleMaps';

const TripDetailSimplified = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Main state
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Tab state
  const [activeTab, setActiveTab] = useState('overview');
  
  // Map and route state
  const [selectedStop, setSelectedStop] = useState(0);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapMode, setMapMode] = useState('route');
  const [stopCoordinates, setStopCoordinates] = useState([]);
  
  // Expandable stops state
  const [expandedStop, setExpandedStop] = useState(null);
  
  // Trip places state (removed favorites)
  const [savedTripPlaces, setSavedTripPlaces] = useState([]);
  const [tripPlacesByStop, setTripPlacesByStop] = useState({});

  // POI saving state (enabled by default for seamless experience)
  const [poiSavingEnabled, setPOISavingEnabled] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTripDetail();
    fetchSavedTripPlaces();
  }, [id, user, authLoading]);

  // Fetch saved trip places
  const fetchSavedTripPlaces = async () => {
    try {
      const response = await api.get(`/trips/${id}/places/`);
      setSavedTripPlaces(response.data);
      
      // Group by stop
      const byStop = {};
      response.data.forEach(place => {
        if (!byStop[place.stop_index]) {
          byStop[place.stop_index] = [];
        }
        byStop[place.stop_index].push(place);
      });
      setTripPlacesByStop(byStop);
    } catch (error) {
      console.error('Failed to fetch saved trip places:', error);
    }
  };

  // Enhanced save place to trip function for POI clicks
  const handleSavePlaceToTrip = async (placeData) => {
    try {
      console.log('💾 Saving place to trip:', placeData);
      
      const response = await api.post(`/trips/${id}/places/`, placeData);
      
      // Update local state
      const newPlace = response.data;
      setSavedTripPlaces(prev => [...prev, newPlace]);
      
      setTripPlacesByStop(prev => ({
        ...prev,
        [newPlace.stop_index]: [...(prev[newPlace.stop_index] || []), newPlace]
      }));
      
      console.log('✅ Place saved successfully:', newPlace.name);
      return newPlace;
      
    } catch (error) {
      console.error('❌ Failed to save place:', error);
      if (error.response?.data?.code === 'DUPLICATE_PLACE') {
        throw new Error('This place is already saved to your trip.');
      } else {
        throw error;
      }
    }
  };

  // Delete saved place function
  const handleDeleteSavedPlace = async (place) => {
    try {
      console.log('🗑️ Deleting place from trip:', place.name);
      
      await api.delete(`/trips/${id}/places/${place.id}/`);
      
      // Update local state
      setSavedTripPlaces(prev => prev.filter(p => p.id !== place.id));
      
      setTripPlacesByStop(prev => ({
        ...prev,
        [place.stop_index]: (prev[place.stop_index] || []).filter(p => p.id !== place.id)
      }));
      
      console.log('✅ Place deleted successfully:', place.name);
      
    } catch (error) {
      console.error('❌ Failed to delete place:', error);
      alert('Failed to delete place. Please try again.');
    }
  };

  const fetchTripDetail = async () => {
    try {
      const response = await api.get(`/trips/${id}/`);
      const tripData = response.data;
      setTrip(tripData);
      
      if (tripData.route_data) {
        try {
          const parsedRoute = JSON.parse(tripData.route_data);
          setRoute(parsedRoute);
          await reconstructRouteInfo(tripData, parsedRoute);
        } catch (e) {
          console.error('Failed to parse route data:', e);
        }
      }
    } catch (err) {
      setError('Failed to load trip details');
      console.error('Error fetching trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const reconstructRouteInfo = async (tripData, parsedRoute) => {
    try {
      const isFlightRoute = tripData.total_distance > 3000;
      const locations = [
        tripData.start_location,
        ...(tripData.waypoints || []).filter(wp => wp && wp.trim()),
        tripData.end_location
      ];

      const coordinates = [];
      for (const [index, location] of locations.entries()) {
        try {
          const coords = await googleMapsService.geocodeAddress(location);
          coordinates.push(coords);
        } catch (error) {
          console.warn(`Failed to geocode ${location}:`, error);
          const fallbackCoords = getFallbackCoordinates(location);
          coordinates.push(fallbackCoords);
        }
      }

      setStopCoordinates(coordinates);

      const routeInfo = {
        isFlightRoute,
        routeType: isFlightRoute ? 'flight' : 'driving',
        coordinates,
        bounds: isFlightRoute ? calculateBounds(coordinates) : parsedRoute.routes?.[0]?.bounds,
        totalDistance: tripData.total_distance,
        totalDuration: tripData.total_duration
      };

      setRouteInfo(routeInfo);
    } catch (error) {
      console.error('Failed to reconstruct route info:', error);
    }
  };

  // Fallback coordinates for common locations when geocoding fails
  const getFallbackCoordinates = (location) => {
    const fallbacks = {
      'singapore': { lat: 1.3521, lng: 103.8198, formatted_address: 'Singapore' },
      'malaysia': { lat: 3.1390, lng: 101.6869, formatted_address: 'Kuala Lumpur, Malaysia' },
      'kuala lumpur': { lat: 3.1390, lng: 101.6869, formatted_address: 'Kuala Lumpur, Malaysia' },
      'taiwan': { lat: 25.0330, lng: 121.5654, formatted_address: 'Taipei, Taiwan' },
      'japan': { lat: 35.6762, lng: 139.6503, formatted_address: 'Tokyo, Japan' },
      'hong kong': { lat: 22.3193, lng: 114.1694, formatted_address: 'Hong Kong' },
      'thailand': { lat: 13.7563, lng: 100.5018, formatted_address: 'Bangkok, Thailand' },
    };

    const key = location.toLowerCase().trim();
    
    for (const [fallbackKey, coords] of Object.entries(fallbacks)) {
      if (key.includes(fallbackKey) || fallbackKey.includes(key)) {
        return coords;
      }
    }
    
    return {
      lat: 1.3521,
      lng: 103.8198,
      formatted_address: location || 'Unknown Location'
    };
  };

  const calculateBounds = (coordinates) => {
    if (coordinates.length === 0) return null;
    
    let north = coordinates[0].lat;
    let south = coordinates[0].lat;
    let east = coordinates[0].lng;
    let west = coordinates[0].lng;

    coordinates.forEach(coord => {
      north = Math.max(north, coord.lat);
      south = Math.min(south, coord.lat);
      east = Math.max(east, coord.lng);
      west = Math.min(west, coord.lng);
    });

    return { north, south, east, west };
  };

  const createStops = () => {
    if (!trip) return [];
    
    const stops = [
      {
        id: 'start',
        name: trip.start_location,
        type: 'start',
        description: 'Starting point of your journey'
      }
    ];

    trip.waypoints?.forEach((waypoint, index) => {
      if (waypoint && waypoint.trim()) {
        stops.push({
          id: `waypoint-${index}`,
          name: waypoint.trim(),
          type: 'waypoint',
          description: `Stop ${index + 1}`
        });
      }
    });

    stops.push({
      id: 'end',
      name: trip.end_location,
      type: 'end',
      description: 'Final destination'
    });

    return stops;
  };

  const handleStopClick = (stopIndex) => {
    setSelectedStop(stopIndex);
    if (stopCoordinates && stopCoordinates[stopIndex]) {
      setMapMode('stop');
    }
  };

  const showFullRoute = () => {
    setMapMode('route');
    setExpandedStop(null);
  };

  // Handle expanding/collapsing stops
  const toggleStopExpansion = (stopIndex) => {
    if (expandedStop === stopIndex) {
      setExpandedStop(null);
    } else {
      setExpandedStop(stopIndex);
      setSelectedStop(stopIndex);
      if (stopCoordinates && stopCoordinates[stopIndex]) {
        setMapMode('stop');
      }
    }
  };

  // Handle place click - navigate to place on map
  const handlePlaceClick = useCallback((place) => {
    if (window.navigateToPlace) {
      window.navigateToPlace(place);
    }
    console.log('Navigating to place:', place);
  }, []);

  // Handle saved place click - convert to proper format and navigate
  const handleSavedPlaceClick = useCallback((savedPlace) => {
    const placeForNavigation = {
      id: savedPlace.place_id,
      name: savedPlace.name,
      address: savedPlace.address,
      location: {
        lat: savedPlace.latitude,
        lng: savedPlace.longitude
      },
      rating: savedPlace.rating,
      types: savedPlace.types,
      phone: savedPlace.phone,
      website: savedPlace.website
    };
    
    handlePlaceClick(placeForNavigation);
  }, [handlePlaceClick]);

  // Enhanced getMapConfig with POI click support
  const getMapConfig = () => {
    // Add saved trip places as bookmarks for map display
    const allBookmarkedPlaces = [];
    
    savedTripPlaces.forEach(place => {
      allBookmarkedPlaces.push({
        id: place.place_id,
        name: place.name,
        address: place.address,
        location: {
          lat: place.latitude,
          lng: place.longitude
        },
        rating: place.rating,
        types: place.types,
        phone: place.phone,
        website: place.website,
        userRatingsTotal: place.user_ratings_total,
        stopIndex: place.stop_index,
        isVisited: place.is_visited,
        userNotes: place.user_notes
      });
    });

    if (mapMode === 'stop' && stopCoordinates && stopCoordinates[selectedStop]) {
      const stopCoord = stopCoordinates[selectedStop];
      
      // Filter bookmarks for current stop
      const currentStopPlaces = allBookmarkedPlaces.filter(
        place => place.stopIndex === selectedStop
      );
      
      return {
        center: { lat: stopCoord.lat, lng: stopCoord.lng },
        zoom: 14,
        route: null,
        routeInfo: null,
        markers: [{
          position: { lat: stopCoord.lat, lng: stopCoord.lng },
          title: stopCoord.formatted_address || stops[selectedStop]?.name || 'Stop Location'
        }],
        bookmarkedPlaces: currentStopPlaces,
        showBookmarks: true,
        // POI click configuration
        enablePOIClick: poiSavingEnabled,
        currentStopIndex: selectedStop,
        tripId: id,
        onSavePlaceToTrip: handleSavePlaceToTrip
      };
    } else {
      return {
        center: null,
        zoom: 10,
        route: route,
        routeInfo: routeInfo,
        markers: [],
        bookmarkedPlaces: allBookmarkedPlaces,
        showBookmarks: true,
        // POI click configuration for full route view
        enablePOIClick: poiSavingEnabled,
        currentStopIndex: selectedStop,
        tripId: id,
        onSavePlaceToTrip: handleSavePlaceToTrip
      };
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  const getStopIcon = (stop, index) => {
    if (stop.type === 'start') return 'S';
    if (stop.type === 'end') return 'E';
    return index;
  };

  const getStopIconColor = (stop, index) => {
    if (selectedStop === index && mapMode === 'stop') {
      return 'bg-green-500 text-white';
    }
    
    switch (stop.type) {
      case 'start': return 'bg-green-500 text-white';
      case 'end': return 'bg-red-500 text-white';
      default: return 'bg-blue-500 text-white';
    }
  };

  const handleTripUpdate = (updatedTrip) => {
    setTrip(updatedTrip);
  };

  // Enhanced place search component (star saves to trip, no favorites)
  const EnhancedPlaceSearchWithTrip = ({ 
    location, 
    stopIndex,
    savedTripPlaces 
  }) => {
    return (
      <ModernPlaceSearch
        location={location}
        onCategorySearch={(places, categoryId) => {
          // Handle category search results if needed
        }}
        onPlaceClick={handlePlaceClick}
        onSavePlaceToTrip={async (placeData) => {
          const placeToSave = {
            ...placeData,
            stop_index: stopIndex
          };
          return await handleSavePlaceToTrip(placeToSave);
        }}
        savedTripPlaces={savedTripPlaces.filter(place => place.stop_index === stopIndex)}
        currentStopIndex={stopIndex}
      />
    );
  };

  if (authLoading || loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">
            {authLoading ? 'Checking authentication...' : 'Loading trip details...'}
          </p>
        </div>
      </div>
    );
  }

  if (error || !trip) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">{error || 'Trip not found'}</p>
          <button
            onClick={() => navigate('/saved-trips')}
            className="mt-4 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            Back to Saved Trips
          </button>
        </div>
      </div>
    );
  }

  const stops = createStops();
  const mapConfig = getMapConfig();

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center justify-between mb-4">
          <button
            onClick={() => navigate('/saved-trips')}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Saved Trips
          </button>
          
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate(`/trip/${trip.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Trip
            </button>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">{trip.title}</h1>
        
        {/* Trip Type Badge and Stats */}
        <div className="flex items-center gap-2 mb-6">
          {trip.trip_type_display && (
            <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm font-medium rounded-full">
              {trip.trip_type_display}
            </span>
          )}
          {trip.checklist_progress !== undefined && (
            <span className="inline-block px-3 py-1 bg-green-100 text-green-800 text-sm font-medium rounded-full">
              {trip.checklist_progress}% Complete
            </span>
          )}
          {savedTripPlaces.length > 0 && (
            <span className="inline-block px-3 py-1 bg-yellow-100 text-yellow-800 text-sm font-medium rounded-full">
              {savedTripPlaces.length} Places Saved
            </span>
          )}
        </div>

        {/* Trip Info Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Calendar className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Duration</span>
            </div>
            <p className="text-sm text-blue-700">
              {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
            </p>
            {trip.duration_days > 0 && (
              <p className="text-lg font-bold text-blue-900">{trip.duration_days} days</p>
            )}
          </div>

          <div className={`p-4 rounded-lg ${routeInfo?.isFlightRoute ? 'bg-orange-50' : 'bg-green-50'}`}>
            <div className="flex items-center gap-2 mb-2">
              <Route className={`w-5 h-5 ${routeInfo?.isFlightRoute ? 'text-orange-600' : 'text-green-600'}`} />
              <span className={`font-medium ${routeInfo?.isFlightRoute ? 'text-orange-800' : 'text-green-800'}`}>
                {routeInfo?.isFlightRoute ? 'Flight Distance' : 'Driving Distance'}
              </span>
            </div>
            <p className={`text-2xl font-bold ${routeInfo?.isFlightRoute ? 'text-orange-900' : 'text-green-900'}`}>
              {trip.total_distance} km
            </p>
          </div>

          <div className="bg-purple-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Clock className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-800">
                {routeInfo?.isFlightRoute ? 'Flight Time' : 'Travel Time'}
              </span>
            </div>
            <p className="text-2xl font-bold text-purple-900">
              {formatDuration(trip.total_duration)}
            </p>
          </div>

          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <Users className="w-5 h-5 text-blue-600" />
              <span className="font-medium text-blue-800">Travelers</span>
            </div>
            <p className="text-2xl font-bold text-blue-900">
              {trip.travelers} {trip.travelers === 1 ? 'person' : 'people'}
            </p>
          </div>
        </div>

        {/* Flight Route Notice */}
        {routeInfo?.isFlightRoute && (
          <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600">✈️</div>
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Flight Route</h4>
                <p className="text-sm text-yellow-700">
                  This route covers long distances and requires air travel. 
                  The map shows flight paths as dotted lines with estimated flight times.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="border-b border-gray-200">
          <nav className="flex">
            <button
              onClick={() => setActiveTab('overview')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'overview'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Map className="w-4 h-4" />
              Route & Places
              {savedTripPlaces.length > 0 && (
                <span className="ml-1 px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full">
                  {savedTripPlaces.length}
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('checklist')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'checklist'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <CheckSquare className="w-4 h-4" />
              Trip Checklist
              {trip.checklist_progress !== undefined && (
                <span className="ml-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
                  {trip.checklist_progress}%
                </span>
              )}
            </button>
            
            <button
              onClick={() => setActiveTab('memories')}
              className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'memories'
                  ? 'border-blue-500 text-blue-600 bg-blue-50'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Camera className="w-4 h-4" />
              Memories
            </button>
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
              {/* Left Side - Expandable Stops List */}
              <div className="overflow-y-auto">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Route Stops ({stops.length})
                  </h2>
                  
                  {/* View Toggle */}
                  <div className="flex gap-2">
                    <button
                      onClick={showFullRoute}
                      className={`px-3 py-1 text-sm rounded-lg transition-colors ${
                        mapMode === 'route' 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                      }`}
                    >
                      Full Route
                    </button>
                    <span className="text-sm text-gray-500 self-center">
                      {mapMode === 'stop' ? `Stop ${selectedStop + 1}` : 'All Stops'}
                    </span>
                  </div>
                </div>
                
                {/* Expandable Stops */}
                <div className="space-y-3">
                  {stops.map((stop, index) => {
                    const isExpanded = expandedStop === index;
                    const currentLocation = stopCoordinates[index];
                    const stopSavedPlaces = tripPlacesByStop[index] || [];
                    
                    return (
                      <div
                        key={stop.id}
                        className={`rounded-lg border-2 transition-all ${
                          selectedStop === index
                            ? mapMode === 'stop'
                              ? 'border-green-500 bg-green-50'
                              : 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Stop Header */}
                        <div
                          onClick={() => handleStopClick(index)}
                          className="p-4 cursor-pointer"
                        >
                          <div className="flex items-start gap-3">
                            {/* Stop Number/Icon */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                              getStopIconColor(stop, index)
                            }`}>
                              {getStopIcon(stop, index)}
                            </div>

                            <div className="flex-1">
                              <h3 className="font-semibold text-gray-900 mb-1">{stop.name}</h3>
                              <p className="text-sm text-gray-600 mb-2">{stop.description}</p>
                              
                              {/* Show counts */}
                              <div className="flex items-center gap-3 text-xs mb-2">
                                {stopSavedPlaces.length > 0 && (
                                  <div className="flex items-center gap-1 text-green-600">
                                    <MapPin className="w-3 h-3" />
                                    <span>{stopSavedPlaces.length} saved place{stopSavedPlaces.length !== 1 ? 's' : ''}</span>
                                  </div>
                                )}
                              </div>
                              
                              {/* Click hints */}
                              <div className="text-xs text-blue-600">
                                💡 Click to view on map and explore nearby places
                              </div>
                            </div>

                            {/* Expand/Collapse button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleStopExpansion(index);
                              }}
                              className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronUp className="w-5 h-5" />
                              ) : (
                                <ChevronDown className="w-5 h-5" />
                              )}
                            </button>
                          </div>
                        </div>

                        {/* Expanded Content */}
                        {isExpanded && currentLocation && (
                          <div className="px-4 pb-4 border-t border-gray-200 bg-gray-50">
                            <div className="pt-4 space-y-4">
                              <h4 className="font-medium text-gray-800 flex items-center gap-2">
                                <Search className="w-4 h-4" />
                                Explore {stop.name}
                              </h4>
                              
                              {/* Enhanced Places Search (Star saves to trip) */}
                              <EnhancedPlaceSearchWithTrip
                                location={currentLocation}
                                stopIndex={index}
                                savedTripPlaces={stopSavedPlaces}
                              />
                              
                              {/* Show saved places for this stop with DELETE BUTTON */}
                              {stopSavedPlaces.length > 0 && (
                                <div className="mt-4">
                                  <h5 className="font-medium text-gray-800 mb-2 flex items-center gap-2">
                                    <MapPin className="w-4 h-4 text-green-600" />
                                    Saved Places ({stopSavedPlaces.length})
                                  </h5>
                                  <div className="space-y-2">
                                    {stopSavedPlaces.map(place => (
                                      <div 
                                        key={place.id} 
                                        className="bg-white rounded-lg p-3 border border-green-200 hover:border-green-300 hover:shadow-sm transition-all group"
                                      >
                                        <div className="flex items-start justify-between">
                                          <div 
                                            className="flex-1 cursor-pointer"
                                            onClick={() => handleSavedPlaceClick(place)}
                                          >
                                            <h6 className="font-medium text-gray-900">{place.name}</h6>
                                            <p className="text-sm text-gray-600">{place.address}</p>
                                            {place.rating && (
                                              <div className="flex items-center gap-1 text-sm mt-1">
                                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                                <span>{place.rating.toFixed(1)}</span>
                                                {place.user_ratings_total && (
                                                  <span className="text-gray-500">({place.user_ratings_total})</span>
                                                )}
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center gap-2 ml-3">
                                            <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                                              Saved
                                            </span>
                                            {/* DELETE BUTTON */}
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                if (window.confirm(`Remove "${place.name}" from your trip?`)) {
                                                  handleDeleteSavedPlace(place);
                                                }
                                              }}
                                              className="opacity-0 group-hover:opacity-100 p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded transition-all"
                                              title="Remove from trip"
                                            >
                                              <Trash2 className="w-3 h-3" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right Side - Enhanced Map with POI Click Support */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">Route Map</h2>
                  <div className="flex items-center gap-3">
                    {mapMode === 'stop' && (
                      <button
                        onClick={showFullRoute}
                        className="text-sm text-blue-600 hover:text-blue-700 underline"
                      >
                        ← Back to Full Route
                      </button>
                    )}
                    <div className="text-sm text-gray-600">
                      {mapMode === 'stop' 
                        ? `📍 ${stops[selectedStop]?.name}` 
                        : `🗺️ Complete Route`
                      }
                    </div>
                  </div>
                </div>
                
                <div className="h-full">
                  <GoogleMap
                    center={mapConfig.center}
                    zoom={mapConfig.zoom}
                    route={mapConfig.route}
                    routeInfo={mapConfig.routeInfo}
                    markers={mapConfig.markers}
                    bookmarkedPlaces={mapConfig.bookmarkedPlaces}
                    showBookmarks={mapConfig.showBookmarks}
                    onPlaceClick={handlePlaceClick}
                    // POI click props
                    enablePOIClick={mapConfig.enablePOIClick}
                    currentStopIndex={mapConfig.currentStopIndex}
                    tripId={mapConfig.tripId}
                    onSavePlaceToTrip={mapConfig.onSavePlaceToTrip}
                    className="w-full h-[500px] rounded-lg"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Checklist Tab */}
          {activeTab === 'checklist' && (
            <TripChecklist 
              trip={trip} 
              onUpdate={handleTripUpdate}
            />
          )}

          {/* Memories Tab */}
          {activeTab === 'memories' && (
            <TripMemories 
              tripId={trip.id} 
              stops={stops} 
              stopCoordinates={stopCoordinates}
              selectedStop={selectedStop}
              onStopSelect={setSelectedStop}
            />
          )}
        </div>
      </div>

      {/* Trip Summary */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Trip Summary</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Route Details</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Start:</span> {trip.start_location}</p>
              <p><span className="font-medium">End:</span> {trip.end_location}</p>
              {trip.waypoints && trip.waypoints.filter(wp => wp.trim()).length > 0 && (
                <p><span className="font-medium">Waypoints:</span> {trip.waypoints.filter(wp => wp.trim()).length}</p>
              )}
              {trip.trip_type_display && (
                <p><span className="font-medium">Trip Type:</span> {trip.trip_type_display}</p>
              )}
              {savedTripPlaces.length > 0 && (
                <p><span className="font-medium">Saved Places:</span> {savedTripPlaces.length} locations</p>
              )}
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Travel Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Total Distance:</span> {trip.total_distance} km</p>
              <p><span className="font-medium">Estimated Time:</span> {formatDuration(trip.total_duration)}</p>
              <p><span className="font-medium">Route Type:</span> {routeInfo?.isFlightRoute ? 'Flight Route' : 'Driving Route'}</p>
              {trip.checklist_data && (
                <p><span className="font-medium">Checklist:</span> {trip.checklist_data.length} items ({trip.checklist_progress}% complete)</p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailSimplified;
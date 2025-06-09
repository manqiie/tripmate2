// src/components/trip/TripDetailSimplified.jsx - Simplified and modular version
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Clock, Route } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import StopPanel from '../places/StopPanel';
import placesService from '../../services/placesService';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import googleMapsService from '../../services/googleMaps';
import DebugSearchTest from '../test/DebugSearchTest';

const TripDetailSimplified = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  
  // Main state
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Map and route state
  const [selectedStop, setSelectedStop] = useState(0);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [mapMode, setMapMode] = useState('route'); // 'route' or 'stop'
  const [stopCoordinates, setStopCoordinates] = useState([]);
  
  // Places API state
  const [placesReady, setPlacesReady] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTripDetail();
    initializePlaces();
  }, [id, user, authLoading]);

  const initializePlaces = async () => {
    // Since Places API works via REST (user confirmed), force enable it
    setPlacesReady(true);
    console.log('✅ Places API enabled (confirmed working via REST)');
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
      for (const location of locations) {
        try {
          const coords = await googleMapsService.geocodeAddress(location);
          coordinates.push(coords);
        } catch (error) {
          console.warn(`Failed to geocode ${location}:`, error);
          coordinates.push({
            lat: 0, lng: 0,
            formatted_address: location
          });
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
  };

  const getMapConfig = () => {
    if (mapMode === 'stop' && stopCoordinates && stopCoordinates[selectedStop]) {
      const stopCoord = stopCoordinates[selectedStop];
      return {
        center: { lat: stopCoord.lat, lng: stopCoord.lng },
        zoom: 14,
        route: null,
        routeInfo: null,
        markers: [{
          position: { lat: stopCoord.lat, lng: stopCoord.lng },
          title: stopCoord.formatted_address || stops[selectedStop]?.name || 'Stop Location'
        }]
      };
    } else {
      return {
        center: null,
        zoom: 10,
        route: route,
        routeInfo: routeInfo,
        markers: []
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
          
          <button
            onClick={() => navigate(`/trip/${trip.id}/edit`)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Edit Trip
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">{trip.title}</h1>

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

        {/* Debug Test - Remove after fixing */}
        <DebugSearchTest />

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

        {/* Places API Status - removed since we know it works */}
      </div>

      {/* Main Content - Stops and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Left Side - Stops List with Places */}
        <StopPanel
          stops={stops}
          selectedStop={selectedStop}
          onStopClick={handleStopClick}
          onShowFullRoute={showFullRoute}
          stopCoordinates={stopCoordinates}
          mapMode={mapMode}
        />

        {/* Right Side - Map */}
        <div className="bg-white rounded-xl shadow-lg p-6">
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
              className="w-full h-[500px] rounded-lg"
            />
          </div>
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
            </div>
          </div>
          
          <div>
            <h4 className="font-semibold text-gray-800 mb-2">Travel Information</h4>
            <div className="space-y-2 text-sm">
              <p><span className="font-medium">Total Distance:</span> {trip.total_distance} km</p>
              <p><span className="font-medium">Estimated Time:</span> {formatDuration(trip.total_duration)}</p>
              <p><span className="font-medium">Trip Type:</span> {routeInfo?.isFlightRoute ? 'Flight Route' : 'Driving Route'}</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripDetailSimplified;
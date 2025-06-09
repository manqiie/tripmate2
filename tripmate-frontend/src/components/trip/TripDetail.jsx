// src/components/trip/TripDetail.jsx - FIXED VERSION for flight routes
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Clock, Route, Star, Camera, Coffee, Utensils, Bed } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import googleMapsService from '../../services/googleMaps';

const TripDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [trip, setTrip] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedStop, setSelectedStop] = useState(0);
  const [route, setRoute] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTripDetail();
  }, [id, user]);

  const fetchTripDetail = async () => {
    try {
      const response = await api.get(`/trips/${id}/`);
      const tripData = response.data;
      setTrip(tripData);
      
      // Handle route data - need to reconstruct flight route info
      if (tripData.route_data) {
        try {
          const parsedRoute = JSON.parse(tripData.route_data);
          setRoute(parsedRoute);
          
          // FIXED: Reconstruct route info for flight routes
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

  // FIXED: Reconstruct the route info including coordinates for flight routes
  const reconstructRouteInfo = async (tripData, parsedRoute) => {
    try {
      console.log('🔧 Reconstructing route info for trip:', tripData.title);
      
      const isFlightRoute = tripData.total_distance > 3000;
      
      if (isFlightRoute) {
        console.log('✈️ Reconstructing flight route...');
        
        // Geocode all locations to get coordinates
        const locations = [
          tripData.start_location,
          ...(tripData.waypoints || []).filter(wp => wp && wp.trim()),
          tripData.end_location
        ];

        console.log('📍 Geocoding locations:', locations);
        
        const coordinates = [];
        for (const location of locations) {
          try {
            const coords = await googleMapsService.geocodeAddress(location);
            coordinates.push(coords);
            console.log(`✅ Geocoded ${location}:`, coords);
          } catch (error) {
            console.warn(`⚠️ Failed to geocode ${location}:`, error);
            // Use a fallback coordinate if geocoding fails
            coordinates.push({
              lat: 0,
              lng: 0,
              formatted_address: location
            });
          }
        }

        // Calculate bounds for flight route
        let bounds = null;
        if (coordinates.length > 0) {
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

          bounds = { north, south, east, west };
        }

        // Set the reconstructed route info
        const flightRouteInfo = {
          isFlightRoute: true,
          routeType: 'flight',
          coordinates: coordinates,
          bounds: bounds,
          totalDistance: tripData.total_distance,
          totalDuration: tripData.total_duration
        };

        console.log('✅ Flight route info reconstructed:', flightRouteInfo);
        setRouteInfo(flightRouteInfo);

      } else {
        // For driving routes, the original route data should work
        console.log('🚗 Using driving route data as-is');
        setRouteInfo({
          isFlightRoute: false,
          routeType: 'driving',
          totalDistance: tripData.total_distance,
          totalDuration: tripData.total_duration
        });
      }

    } catch (error) {
      console.error('❌ Failed to reconstruct route info:', error);
      // Fallback route info
      setRouteInfo({
        isFlightRoute: tripData.total_distance > 3000,
        routeType: tripData.total_distance > 3000 ? 'flight' : 'driving',
        totalDistance: tripData.total_distance,
        totalDuration: tripData.total_duration
      });
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

  // Create stops array from trip data
  const getStops = () => {
    if (!trip) return [];
    
    const stops = [
      {
        id: 'start',
        name: trip.start_location,
        type: 'start',
        description: 'Starting point of your journey'
      }
    ];

    // Add waypoints
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

    // Add destination
    stops.push({
      id: 'end',
      name: trip.end_location,
      type: 'end',
      description: 'Final destination'
    });

    return stops;
  };

  const stops = getStops();

  // Simple recommendations based on location type
  const getRecommendations = (stop) => {
    const recommendations = [
      { icon: Camera, name: 'Photo Spots', count: '5+' },
      { icon: Utensils, name: 'Restaurants', count: '12+' },
      { icon: Coffee, name: 'Cafes', count: '8+' },
      { icon: Bed, name: 'Hotels', count: '15+' },
    ];
    
    return recommendations;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading trip details...</p>
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
          
          <div className="flex gap-3">
            <button
              onClick={() => navigate(`/trip/${trip.id}/edit`)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Edit Trip
            </button>
          </div>
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

      {/* Main Content - Stops and Map */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[600px]">
        {/* Left Side - Stops List */}
        <div className="bg-white rounded-xl shadow-lg p-6 overflow-y-auto">
          <h2 className="text-xl font-bold text-gray-900 mb-4">
            Route Stops ({stops.length})
          </h2>
          
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <div
                key={stop.id}
                onClick={() => setSelectedStop(index)}
                className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  selectedStop === index
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  {/* Stop Number/Icon */}
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                    stop.type === 'start' ? 'bg-green-500 text-white' :
                    stop.type === 'end' ? 'bg-red-500 text-white' :
                    'bg-blue-500 text-white'
                  }`}>
                    {stop.type === 'start' ? 'S' : 
                     stop.type === 'end' ? 'E' : 
                     index}
                  </div>

                  <div className="flex-1">
                    <h3 className="font-semibold text-gray-900 mb-1">{stop.name}</h3>
                    <p className="text-sm text-gray-600 mb-3">{stop.description}</p>

                    {/* Recommendations - Only show when selected */}
                    {selectedStop === index && (
                      <div className="mt-3 pt-3 border-t border-gray-200">
                        <h4 className="text-sm font-medium text-gray-700 mb-2">Nearby Places</h4>
                        <div className="grid grid-cols-2 gap-2">
                          {getRecommendations(stop).map((rec, recIndex) => (
                            <div
                              key={recIndex}
                              className="flex items-center gap-2 p-2 bg-white rounded border hover:bg-gray-50 cursor-pointer"
                            >
                              <rec.icon className="w-4 h-4 text-blue-600" />
                              <div>
                                <p className="text-xs font-medium text-gray-700">{rec.name}</p>
                                <p className="text-xs text-gray-500">{rec.count}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Rating/Star */}
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-yellow-500 fill-current" />
                    <span className="text-sm text-gray-600">4.5</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side - Map */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-gray-900">Route Map</h2>
            <div className="text-sm text-gray-600">
              Viewing: {stops[selectedStop]?.name}
            </div>
          </div>
          
          <div className="h-full">
            {/* FIXED: Pass the reconstructed routeInfo to GoogleMap */}
            <GoogleMap
              route={route}
              routeInfo={routeInfo} // This now includes coordinates for flight routes
              className="w-full h-[500px] rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Additional Trip Info */}
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

export default TripDetail;
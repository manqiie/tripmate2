//src/components/TripEdit.jsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, MapPin, Calendar, Users, Plus, X, Route, Save, Clock } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import googleMapsService from '../../services/googleMaps';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const TripEditWithChecklist = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [originalTrip, setOriginalTrip] = useState(null);
  const [tripData, setTripData] = useState({
    title: '',
    startLocation: '',
    endLocation: '',
    startDate: '',
    endDate: '',
    travelers: 2,
    waypoints: [],
    tripType: 'leisure'
  });
  
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [calculating, setCalculating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }
    fetchTripData();
  }, [id, user]);

  const fetchTripData = async () => {
    try {
      const response = await api.get(`/trips/${id}/`);
      const trip = response.data;
      
      setOriginalTrip(trip);
      setTripData({
        title: trip.title,
        startLocation: trip.start_location,
        endLocation: trip.end_location,
        startDate: trip.start_date,
        endDate: trip.end_date,
        travelers: trip.travelers,
        waypoints: trip.waypoints || [],
        tripType: trip.trip_type || 'leisure'
      });

      if (trip.route_data) {
        try {
          const parsedRoute = JSON.parse(trip.route_data);
          setRouteResult({
            route: parsedRoute,
            totalDistance: trip.total_distance,
            totalDuration: trip.total_duration,
            isFlightRoute: trip.total_distance > 3000
          });
        } catch (e) {
          console.error('Failed to parse route data:', e);
        }
      }
    } catch (err) {
      setError('Failed to load trip data');
      console.error('Error fetching trip:', err);
    } finally {
      setLoading(false);
    }
  };

  const addWaypoint = () => {
    setTripData({
      ...tripData,
      waypoints: [...tripData.waypoints, '']
    });
  };

  const removeWaypoint = async (index) => {
    const stopIndex = index + 1;
    
    try {
      const response = await api.get(`/trips/${id}/media/?stop_index=${stopIndex}`);
      const mediaCount = response.data.length;
      
      if (mediaCount > 0) {
        const confirmed = window.confirm(
          `This stop has ${mediaCount} uploaded photo/video/audio file(s). ` +
          `Removing this stop will also delete all associated media. ` +
          `Are you sure you want to continue?`
        );
        
        if (!confirmed) {
          return;
        }
        
        for (const media of response.data) {
          await api.delete(`/trips/${id}/media/${media.id}/`);
        }
      }
      
      const newWaypoints = tripData.waypoints.filter((_, i) => i !== index);
      setTripData({ ...tripData, waypoints: newWaypoints });
      
      if (mediaCount > 0) {
        alert(`Waypoint removed and ${mediaCount} media file(s) deleted.`);
      }
      
    } catch (error) {
      console.error('Error checking/removing waypoint media:', error);
      const newWaypoints = tripData.waypoints.filter((_, i) => i !== index);
      setTripData({ ...tripData, waypoints: newWaypoints });
    }
  };

  const updateWaypoint = (index, value) => {
    const newWaypoints = [...tripData.waypoints];
    newWaypoints[index] = value;
    setTripData({ ...tripData, waypoints: newWaypoints });
  };

  const calculateDuration = () => {
    if (tripData.startDate && tripData.endDate) {
      const start = new Date(tripData.startDate);
      const end = new Date(tripData.endDate);
      const diffTime = Math.abs(end - start);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      return diffDays;
    }
    return 0;
  };

  const handleRecalculateRoute = async () => {
    setCalculating(true);
    setError('');

    try {
      const validWaypoints = tripData.waypoints.filter(wp => wp.trim() !== '');
      
      const result = await googleMapsService.calculateOptimizedRoute(
        tripData.startLocation,
        tripData.endLocation,
        validWaypoints
      );

      setRouteResult(result);
    } catch (err) {
      console.error('Route calculation error:', err);
      setError(err.message);
    } finally {
      setCalculating(false);
    }
  };

  const handleUpdateChecklist = async () => {
    try {
      await api.post(`/trips/${id}/checklist/regenerate/`, {
        merge_with_existing: true
      });
      
      return true; // Success
    } catch (error) {
      console.error('Failed to update checklist:', error);
      return false; // Failure
    }
  };

  const handleSaveTrip = async () => {
    if (!tripData.title.trim()) {
      setError('Please enter a trip title');
      return;
    }

    setSaving(true);
    setError('');

    try {
      const tripDataToSave = {
        title: tripData.title,
        start_location: tripData.startLocation,
        end_location: tripData.endLocation,
        start_date: tripData.startDate,
        end_date: tripData.endDate,
        travelers: tripData.travelers,
        waypoints: tripData.waypoints.filter(wp => wp.trim() !== ''),
        trip_type: tripData.tripType,
        ...(routeResult?.route && {
          route_data: JSON.stringify(routeResult.route),
          total_distance: routeResult?.totalDistance || 0,
          total_duration: routeResult?.totalDuration || 0
        })
      };

      await api.patch(`/trips/${id}/`, tripDataToSave);
      
      // Check if trip details changed and automatically update checklist
      const hasChanges = (
        tripData.tripType !== originalTrip?.trip_type ||
        tripData.travelers !== originalTrip?.travelers ||
        calculateDuration() !== originalTrip?.duration_days ||
        tripData.startLocation !== originalTrip?.start_location ||
        tripData.endLocation !== originalTrip?.end_location ||
        JSON.stringify(tripData.waypoints) !== JSON.stringify(originalTrip?.waypoints)
      );
      
      if (hasChanges) {
        const checklistUpdated = await handleUpdateChecklist();
        if (checklistUpdated) {
          alert('Trip updated successfully! Your checklist has been automatically updated to match your changes.');
        } else {
          alert('Trip updated successfully! Note: Checklist update failed, but your trip changes were saved.');
        }
      } else {
        alert('Trip updated successfully!');
      }
      
      navigate(`/trip/${id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading trip data...</p>
        </div>
      </div>
    );
  }

  if (!originalTrip) {
    return (
      <div className="max-w-7xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Error</h2>
          <p className="text-red-700">Trip not found</p>
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
            onClick={() => navigate(`/trip/${id}`)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            Back to Trip Details
          </button>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">Edit Trip</h1>
        <p className="text-gray-600">Update your trip details and personalized checklist</p>
      </div>

      {/* Edit Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Trip Information</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Trip Details */}
          <div className="space-y-4">
            {/* Trip Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Title
              </label>
              <input
                type="text"
                value={tripData.title}
                onChange={(e) => setTripData({ ...tripData, title: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter trip title"
              />
            </div>

            {/* Trip Type Selector */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Trip Type
              </label>
              <select
                value={tripData.tripType}
                onChange={(e) => setTripData({ ...tripData, tripType: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="leisure">Leisure & Vacation</option>
                <option value="business">Business & Work</option>
                <option value="adventure">Adventure & Outdoor</option>
                <option value="family">Family Trip</option>
                <option value="romantic">Romantic Getaway</option>
                <option value="educational">Educational & Cultural</option>
                <option value="medical">Medical & Health</option>
                <option value="religious">Religious & Pilgrimage</option>
                <option value="sports">Sports & Events</option>
                <option value="backpacking">Backpacking & Budget</option>
              </select>
            </div>

            {/* Start Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                Start Location
              </label>
              <input
                type="text"
                value={tripData.startLocation}
                onChange={(e) => setTripData({ ...tripData, startLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter starting location"
              />
            </div>

            {/* End Location */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <MapPin className="w-4 h-4 inline mr-1" />
                End Location
              </label>
              <input
                type="text"
                value={tripData.endLocation}
                onChange={(e) => setTripData({ ...tripData, endLocation: e.target.value })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Enter destination"
              />
            </div>

            {/* Waypoints */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Waypoints (Stops between start and end)
                </label>
                <button
                  type="button"
                  onClick={addWaypoint}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Stop
                </button>
              </div>
              
              {tripData.waypoints.length > 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
                  <div className="flex items-start gap-2">
                    <div className="text-yellow-600">⚠️</div>
                    <div className="text-sm text-yellow-700">
                      <strong>Note:</strong> Removing a waypoint will also delete all photos, videos, and audio files uploaded for that stop.
                    </div>
                  </div>
                </div>
              )}
              
              {tripData.waypoints.map((waypoint, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={waypoint}
                    onChange={(e) => updateWaypoint(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Stop ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                    title="Remove this stop (will delete associated media)"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
              <p className="text-xs text-gray-500 mt-1">
                Add stops between your start and end locations. Your photos and memories will be preserved when changing locations.
              </p>
            </div>
          </div>

          {/* Right Column - Date & Travel Info */}
          <div className="space-y-4">
            {/* Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="w-4 h-4 inline mr-1" />
                  Start Date
                </label>
                <input
                  type="date"
                  value={tripData.startDate}
                  onChange={(e) => setTripData({ ...tripData, startDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Date
                </label>
                <input
                  type="date"
                  value={tripData.endDate}
                  onChange={(e) => setTripData({ ...tripData, endDate: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Duration Display */}
            {tripData.startDate && tripData.endDate && (
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-blue-800 font-medium">
                  Duration: {calculateDuration()} days
                </p>
              </div>
            )}

            {/* Travelers */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                <Users className="w-4 h-4 inline mr-1" />
                Number of Travelers
              </label>
              <select
                value={tripData.travelers}
                onChange={(e) => setTripData({ ...tripData, travelers: parseInt(e.target.value) })}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                  <option key={num} value={num}>{num} {num === 1 ? 'Traveler' : 'Travelers'}</option>
                ))}
              </select>
            </div>

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handleRecalculateRoute}
                disabled={calculating}
                className="w-full bg-orange-600 text-white py-3 px-4 rounded-lg hover:bg-orange-700 disabled:bg-orange-400 flex items-center justify-center gap-2"
              >
                {calculating ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Route className="w-5 h-5" />
                    Recalculate Route
                  </>
                )}
              </button>

              <button
                onClick={handleSaveTrip}
                disabled={saving}
                className="w-full bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 disabled:bg-green-400 flex items-center justify-center gap-2"
              >
                {saving ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Save className="w-5 h-5" />
                    Save Changes
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Route Information */}
      {routeResult && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">
            {calculating ? 'Recalculating Route...' : 'Current Route Information'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className={`p-4 rounded-lg ${routeResult.isFlightRoute ? 'bg-orange-50' : 'bg-blue-50'}`}>
              <div className="flex items-center gap-2">
                <Route className={`w-5 h-5 ${routeResult.isFlightRoute ? 'text-orange-600' : 'text-blue-600'}`} />
                <span className={`font-medium ${routeResult.isFlightRoute ? 'text-orange-800' : 'text-blue-800'}`}>
                  {routeResult.isFlightRoute ? 'Flight Distance' : 'Driving Distance'}
                </span>
              </div>
              <p className={`text-2xl font-bold ${routeResult.isFlightRoute ? 'text-orange-900' : 'text-blue-900'}`}>
                {routeResult.totalDistance} km
              </p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">
                  {routeResult.isFlightRoute ? 'Flight Time' : 'Driving Time'}
                </span>
              </div>
              <p className="text-2xl font-bold text-green-900">
                {Math.floor(routeResult.totalDuration / 60)}h {routeResult.totalDuration % 60}m
              </p>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5 text-purple-600" />
                <span className="font-medium text-purple-800">Total Stops</span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {2 + tripData.waypoints.filter(wp => wp.trim() !== '').length}
              </p>
            </div>
          </div>
          
          <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="text-yellow-600">💡</div>
              <div>
                <h4 className="font-medium text-yellow-800 mb-1">Route Update</h4>
                <p className="text-sm text-yellow-700">
                  {calculating 
                    ? 'Recalculating your route with the updated waypoints...'
                    : 'Click "Recalculate Route" if you added new waypoints to update the route information.'
                  }
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Map Preview */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Route Preview</h3>
        <GoogleMap
          route={routeResult?.route}
          routeInfo={routeResult}
          className="w-full h-96 rounded-lg"
        />
      </div>
    </div>
  );
};

export default TripEditWithChecklist;
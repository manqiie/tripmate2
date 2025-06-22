//src/component/TripPlanner.jsx
import React, { useState } from 'react';
import { MapPin, Calendar, Users, Plus, X, Route, Save, Clock, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import TripTypeSelector from './TripTypeSelector';
import googleMapsService from '../../services/googleMaps';
import { useAuth } from '../../contexts/AuthContext';
import api from '../../services/api';

const TripPlanner = () => {
  const { user } = useAuth();
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
  const [previewChecklist, setPreviewChecklist] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showChecklistPreview, setShowChecklistPreview] = useState(false);
  const [expandedCategories, setExpandedCategories] = useState({});

  const addWaypoint = () => {
    setTripData({
      ...tripData,
      waypoints: [...tripData.waypoints, '']
    });
  };

  const removeWaypoint = (index) => {
    const newWaypoints = tripData.waypoints.filter((_, i) => i !== index);
    setTripData({ ...tripData, waypoints: newWaypoints });
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

  // Preview checklist for selected trip type
  const handlePreviewChecklist = async () => {
    try {
      const response = await api.post('/trips/checklist/generate/', {
        trip_type: tripData.tripType,
        duration_days: calculateDuration(),
        travelers: tripData.travelers,
        international: isInternationalTrip()
      });
      
      setPreviewChecklist(response.data.checklist);
      setShowChecklistPreview(true);
      
      // Expand all categories by default when showing preview
      const grouped = groupChecklistByCategory(response.data.checklist);
      const allExpanded = {};
      Object.keys(grouped).forEach(category => {
        allExpanded[category] = true;
      });
      setExpandedCategories(allExpanded);
    } catch (error) {
      console.error('Failed to generate checklist preview:', error);
    }
  };

  const toggleCategory = (category) => {
    setExpandedCategories(prev => ({
      ...prev,
      [category]: !prev[category]
    }));
  };

  const isInternationalTrip = () => {
    const locations = [
      tripData.startLocation,
      tripData.endLocation,
      ...tripData.waypoints.filter(wp => wp.trim())
    ].join(' ').toLowerCase();
    
    return locations.includes('singapore') && (
      locations.includes('malaysia') || 
      locations.includes('thailand') ||
      locations.includes('japan') ||
      locations.includes('korea')
    );
  };

  const handlePlanTrip = async () => {
    if (!tripData.startLocation || !tripData.endLocation) {
      setError('Please enter both start and end locations');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const validWaypoints = tripData.waypoints.filter(wp => wp.trim() !== '');
      
      const result = await googleMapsService.calculateOptimizedRoute(
        tripData.startLocation,
        tripData.endLocation,
        validWaypoints
      );

      console.log('Route calculation result:', result);
      setRouteResult(result);
      
    } catch (err) {
      console.error('Route calculation error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveTrip = async () => {
    if (!user) {
      setError('Please login to save trips');
      return;
    }

    if (!tripData.title.trim()) {
      setError('Please enter a trip title');
      return;
    }

    if (!routeResult?.route) {
      setError('Please plan the route first');
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
        route_data: JSON.stringify(routeResult.route),
        total_distance: routeResult?.totalDistance || 0,
        total_duration: routeResult?.totalDuration || 0,
        generate_checklist: true
      };

      await api.post('/trips/', tripDataToSave);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save trip');
    } finally {
      setSaving(false);
    }
  };

  const groupChecklistByCategory = (checklist) => {
    const grouped = {};
    checklist.forEach(item => {
      const category = item.category || 'general';
      if (!grouped[category]) {
        grouped[category] = [];
      }
      grouped[category].push(item);
    });
    return grouped;
  };

  const getChecklistCategories = () => {
    return {
      documents: { name: 'Documents & Legal', icon: '📄', color: 'blue' },
      booking: { name: 'Bookings & Reservations', icon: '🏨', color: 'green' },
      health: { name: 'Health & Medical', icon: '🏥', color: 'red' },
      finance: { name: 'Money & Finance', icon: '💳', color: 'yellow' },
      packing: { name: 'Packing & Gear', icon: '🧳', color: 'orange' },
      planning: { name: 'Planning & Research', icon: '📋', color: 'indigo' },
      safety: { name: 'Safety & Emergency', icon: '🚨', color: 'red' },
      coordination: { name: 'Group Coordination', icon: '👥', color: 'blue' }
    };
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Trip Planning Form */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Plan Your Trip</h2>
        
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-4">
            {error}
          </div>
        )}

        {saved && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg mb-4">
            Trip saved successfully with personalized checklist!
          </div>
        )}

        {!user && (
          <div className="bg-blue-50 border border-blue-200 text-blue-800 p-4 rounded-lg mb-4">
            <div className="flex items-start gap-3">
              <div className="text-blue-600">ℹ️</div>
              <div>
                <h4 className="font-medium mb-1">Sign in to Save Your Trip</h4>
                <p className="text-sm text-blue-700">
                  You can plan and view your complete route without an account, but you'll need to 
                  <a href="/auth" className="font-medium underline hover:text-blue-900 mx-1">sign in</a>
                  to save your trip plans and access them later.
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Left Column - Trip Details */}
          <div className="space-y-4">
            {/* Trip Title */}
            {user && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Trip Title
                </label>
                <input
                  type="text"
                  value={tripData.title}
                  onChange={(e) => setTripData({ ...tripData, title: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter trip title (required to save)"
                />
              </div>
            )}

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
                  Waypoints (Optional)
                </label>
                <button
                  type="button"
                  onClick={addWaypoint}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  Add Waypoint
                </button>
              </div>
              {tripData.waypoints.map((waypoint, index) => (
                <div key={index} className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={waypoint}
                    onChange={(e) => updateWaypoint(index, e.target.value)}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder={`Waypoint ${index + 1}`}
                  />
                  <button
                    type="button"
                    onClick={() => removeWaypoint(index)}
                    className="p-2 text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
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

            {/* Checklist Preview Button - Temporarily Disabled */}
            {/* 
            <div className="bg-gray-50 p-4 rounded-lg">
              <h4 className="font-semibold text-gray-900 mb-2">Personalized Checklist</h4>
              <p className="text-sm text-gray-600 mb-3">
                Get a customized checklist based on your trip type, duration, and travelers.
              </p>
              <button
                onClick={handlePreviewChecklist}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                <CheckSquare className="w-4 h-4" />
                Preview Checklist
              </button>
            </div>
            */}

            {/* Action Buttons */}
            <div className="space-y-3">
              <button
                onClick={handlePlanTrip}
                disabled={loading}
                className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
              >
                {loading ? (
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Route className="w-5 h-5" />
                    Plan Route
                  </>
                )}
              </button>

              {user && routeResult && (
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
                      Save Trip with Checklist
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Checklist Preview Section - Temporarily Disabled */}
      {/* 
      {showChecklistPreview && previewChecklist && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-2xl font-bold text-gray-900">Checklist Preview</h3>
              <p className="text-gray-600">
                Personalized for {tripData.tripType} trip • {previewChecklist.length} items
              </p>
            </div>
            <button
              onClick={() => setShowChecklistPreview(false)}
              className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
            >
              <X className="w-6 h-6" />
            </button>
          </div>
          
          <div className="space-y-4">
            {Object.entries(groupChecklistByCategory(previewChecklist)).map(([category, items]) => {
              const categoryInfo = getChecklistCategories()[category] || {
                name: category,
                icon: '📋',
                color: 'gray'
              };
              
              const isExpanded = expandedCategories[category];
              
              return (
                <div key={category} className="border border-gray-200 rounded-lg">
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xl">{categoryInfo.icon}</span>
                      <div className="text-left">
                        <h4 className="font-semibold text-gray-900">{categoryInfo.name}</h4>
                        <p className="text-sm text-gray-500">{items.length} items</p>
                      </div>
                    </div>
                    {isExpanded ? (
                      <ChevronUp className="w-5 h-5 text-gray-400" />
                    ) : (
                      <ChevronDown className="w-5 h-5 text-gray-400" />
                    )}
                  </button>
                  
                  {isExpanded && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-2">
                        {items.map((item, index) => (
                          <div key={index} className="flex items-start gap-3 p-2 bg-white rounded border">
                            <div className="w-4 h-4 border border-gray-300 rounded mt-0.5 flex-shrink-0"></div>
                            <div className="flex-1">
                              <span className="text-sm text-gray-900">{item.text}</span>
                              {item.priority && (
                                <span className={`ml-2 px-2 py-0.5 text-xs rounded-full ${
                                  item.priority === 'high' ? 'bg-red-100 text-red-700' :
                                  item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {item.priority}
                                </span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          
          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <p className="text-sm text-blue-700">
              💡 This checklist will be automatically created when you save your trip. 
              You can customize it later by adding, removing, or modifying items.
            </p>
          </div>
        </div>
      )}
      */}

      {/* Route Information */}
      {routeResult && (
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h3 className="text-xl font-bold text-gray-900 mb-4">Route Information</h3>
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
                <span className="font-medium text-purple-800">
                  {routeResult.isFlightRoute ? 'Airports' : 'Stops'}
                </span>
              </div>
              <p className="text-2xl font-bold text-purple-900">
                {2 + tripData.waypoints.filter(wp => wp.trim() !== '').length}
              </p>
            </div>
          </div>
          
          {/* Flight Route Notice */}
          {routeResult.isFlightRoute && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <div className="flex items-start gap-3">
                <div className="text-yellow-600">✈️</div>
                <div>
                  <h4 className="font-medium text-yellow-800 mb-1">Flight Route Detected</h4>
                  <p className="text-sm text-yellow-700">
                    This route covers long distances across continents and requires air travel. 
                    The map shows flight paths as dotted lines with estimated flight times.
                  </p>
                  <p className="text-xs text-yellow-600 mt-2">
                    💡 Flight times are estimates based on commercial aviation speeds (~900 km/h)
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Map */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold text-gray-900 mb-4">Route Map</h3>
        <GoogleMap
          route={routeResult?.route}
          routeInfo={routeResult}
          className="w-full h-96 rounded-lg"
        />
      </div>
    </div>
  );
};

export default TripPlanner;
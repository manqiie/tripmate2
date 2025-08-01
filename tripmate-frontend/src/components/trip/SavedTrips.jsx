// src/components/trip/SavedTrips.jsx - Updated with navigate for edit button
import React, { useState, useEffect } from 'react';
import { Search, MapPin, Calendar, Users, Edit, Trash2, Eye, Route, Clock } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../../services/api';

const SavedTrips = () => {
  const navigate = useNavigate();
  const [trips, setTrips] = useState([]);
  const [filteredTrips, setFilteredTrips] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState(null);

  useEffect(() => {
    fetchTrips();
    fetchStats();
  }, []);

  useEffect(() => {
    filterTrips();
  }, [trips, searchTerm]);

  const fetchTrips = async () => {
    try {
      const response = await api.get('/trips/');
      setTrips(response.data);
    } catch (err) {
      setError('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.get('/trips/stats/');
      setStats(response.data);
    } catch (err) {
      console.error('Failed to load stats:', err);
    }
  };

  const filterTrips = () => {
    if (!searchTerm.trim()) {
      setFilteredTrips(trips);
    } else {
      const filtered = trips.filter(trip =>
        trip.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.start_location.toLowerCase().includes(searchTerm.toLowerCase()) ||
        trip.end_location.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredTrips(filtered);
    }
  };

  const handleDeleteTrip = async (tripId) => {
    if (!window.confirm('Are you sure you want to delete this trip?')) {
      return;
    }

    try {
      await api.delete(`/trips/${tripId}/`);
      setTrips(trips.filter(trip => trip.id !== tripId));
      fetchStats(); // Refresh stats
    } catch (err) {
      setError('Failed to delete trip');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set';
    return new Date(dateString).toLocaleDateString();
  };

  const formatDuration = (minutes) => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m`;
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading your trips...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header with Stats */}
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">My Saved Trips</h1>
        
       

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search trips by title, start, or destination..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 p-4 rounded-lg">
          {error}
        </div>
      )}

      {/* Trips Grid */}
      {filteredTrips.length === 0 ? (
        <div className="bg-white rounded-xl shadow-lg p-12 text-center">
          <MapPin className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">
            {searchTerm ? 'No trips found' : 'No saved trips yet'}
          </h3>
          <p className="text-gray-500 mb-6">
            {searchTerm 
              ? 'Try adjusting your search terms'
              : 'Start planning your first trip to see it here'
            }
          </p>
          {!searchTerm && (
            <button 
              onClick={() => window.location.href = '/'}
              className="inline-flex items-center gap-2 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <MapPin className="w-5 h-5" />
              Plan New Trip
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTrips.map((trip) => (
            <div key={trip.id} className="bg-white rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow">
              <div className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-xl font-semibold text-gray-900 truncate pr-2">
                    {trip.title}
                  </h3>
                  <div className="flex gap-2">
                    <Link
                      to={`/trip/${trip.id}`}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="View Trip"
                    >
                      <Eye className="w-4 h-4" />
                    </Link>
                    <button
                      onClick={() => navigate(`/trip/${trip.id}/edit`)}
                      className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                      title="Edit Trip"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteTrip(trip.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Delete Trip"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{trip.start_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <MapPin className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm truncate">{trip.end_location}</span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Calendar className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">
                      {formatDate(trip.start_date)} - {formatDate(trip.end_date)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 text-gray-600">
                    <Users className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">
                      {trip.travelers} {trip.travelers === 1 ? 'Traveler' : 'Travelers'}
                    </span>
                  </div>
                </div>

                {(trip.total_distance > 0 || trip.total_duration > 0) && (
                  <div className="mt-4 pt-4 border-t border-gray-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {trip.total_distance > 0 && (
                        <div>
                          <span className="text-gray-500">Distance:</span>
                          <p className="font-medium">{trip.total_distance} km</p>
                        </div>
                      )}
                      {trip.total_duration > 0 && (
                        <div>
                          <span className="text-gray-500">Duration:</span>
                          <p className="font-medium">{formatDuration(trip.total_duration)}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {trip.duration_days > 0 && (
                  <div className="mt-3">
                    <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                      {trip.duration_days} {trip.duration_days === 1 ? 'day' : 'days'}
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SavedTrips;
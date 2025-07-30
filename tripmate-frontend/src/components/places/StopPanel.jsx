// src/components/places/StopPanel.jsx - Enhanced with trip saving functionality
import React, { useState, useEffect } from 'react';
import { MapPin, Star, Search, Plus, Check } from 'lucide-react';
import ModernPlaceSearch from './ModernPlaceSearch';
import FavoritesManager from './FavoritesManager';

const StopPanel = ({ 
  stops, 
  selectedStop, 
  onStopClick, 
  onShowFullRoute,
  stopCoordinates,
  mapMode,
  tripId, // NEW: Trip ID for saving places to trip
  onPlaceSavedToTrip, // NEW: Callback when place is saved to trip
  savedTripPlaces = [] // NEW: Places already saved to this trip
}) => {
  const [favorites, setFavorites] = useState([]);
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [savingToTrip, setSavingToTrip] = useState({}); // NEW: Track saving state per place

  // Load favorites from localStorage
  useEffect(() => {
    const savedFavorites = localStorage.getItem('tripmate_favorites');
    if (savedFavorites) {
      try {
        setFavorites(JSON.parse(savedFavorites));
      } catch (e) {
        console.error('Error loading favorites:', e);
      }
    }
  }, []);

  // Save favorites to localStorage
  const saveFavorites = (newFavorites) => {
    setFavorites(newFavorites);
    localStorage.setItem('tripmate_favorites', JSON.stringify(newFavorites));
  };

  const handleToggleFavorite = (place) => {
    const existingIndex = favorites.findIndex(fav => fav.id === place.id);
    let newFavorites;
    
    if (existingIndex >= 0) {
      // Remove from favorites
      newFavorites = favorites.filter(fav => fav.id !== place.id);
    } else {
      // Add to favorites
      newFavorites = [...favorites, place];
    }
    
    saveFavorites(newFavorites);
  };

  const handleRemoveFavorite = (place) => {
    const newFavorites = favorites.filter(fav => fav.id !== place.id);
    saveFavorites(newFavorites);
  };

  const handlePlaceSelect = (place) => {
    setSelectedPlace(place);
    // You can emit this to parent to show on map
    console.log('Selected place:', place);
  };

  // NEW: Save place to trip
  const handleSavePlaceToTrip = async (place) => {
    if (!tripId || selectedStop === null) {
      console.error('Cannot save place: missing tripId or selectedStop');
      return;
    }

    setSavingToTrip(prev => ({ ...prev, [place.id]: true }));

    try {
      // Create a simplified place object for saving to trip
      const placeToSave = {
        place_id: place.id,
        name: place.name,
        address: place.address,
        rating: place.rating,
        user_ratings_total: place.userRatingsTotal,
        types: place.types,
        location: place.location,
        phone: place.phone,
        website: place.website,
        stop_index: selectedStop
      };

      // Call the parent callback to handle the API call
      if (onPlaceSavedToTrip) {
        await onPlaceSavedToTrip(placeToSave);
      }

      console.log('✅ Place saved to trip successfully:', place.name);
    } catch (error) {
      console.error('❌ Failed to save place to trip:', error);
      alert('Failed to save place to trip. Please try again.');
    } finally {
      setSavingToTrip(prev => ({ ...prev, [place.id]: false }));
    }
  };

  // NEW: Check if place is already saved to trip
  const isPlaceSavedToTrip = (placeId) => {
    return savedTripPlaces.some(savedPlace => savedPlace.place_id === placeId);
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

  const currentLocation = stopCoordinates && stopCoordinates[selectedStop] 
    ? stopCoordinates[selectedStop] 
    : null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6 overflow-y-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-bold text-gray-900">
          Route Stops ({stops.length})
        </h2>
        
        {/* View Toggle */}
        <div className="flex gap-2">
          <button
            onClick={onShowFullRoute}
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
      
      {/* Stops List */}
      <div className="space-y-3 mb-6">
        {stops.map((stop, index) => (
          <div
            key={stop.id}
            onClick={() => onStopClick(index)}
            className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${
              selectedStop === index
                ? mapMode === 'stop'
                  ? 'border-green-500 bg-green-50'
                  : 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
            }`}
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
                
                {/* Click hint */}
                <div className="text-xs text-blue-600">
                  💡 Click to explore places nearby
                </div>
              </div>

              {/* Rating Display */}
              <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-500 fill-current" />
                <span className="text-sm text-gray-600">4.5</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Places Section - Only show when a stop is selected */}
      {mapMode === 'stop' && currentLocation && (
        <div className="border-t border-gray-200 pt-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Explore {stops[selectedStop]?.name}
          </h3>
          
          {/* Modern Places Search */}
          <div className="mb-6">
            <ModernPlaceSearch
              location={currentLocation}
              favorites={favorites}
              onToggleFavorite={handleToggleFavorite}
              tripId={tripId} // NEW: Pass tripId to ModernPlaceSearch
              onSavePlaceToTrip={handleSavePlaceToTrip} // NEW: Pass save function
              isPlaceSavedToTrip={isPlaceSavedToTrip} // NEW: Pass check function
              savingToTrip={savingToTrip} // NEW: Pass saving state
            />
          </div>
          
          {/* Favorites for this location */}
          <FavoritesManager
            favorites={favorites}
            onRemoveFavorite={handleRemoveFavorite}
            onPlaceSelect={handlePlaceSelect}
            tripId={tripId} // NEW: Pass tripId to FavoritesManager
            onSavePlaceToTrip={handleSavePlaceToTrip} // NEW: Pass save function
            isPlaceSavedToTrip={isPlaceSavedToTrip} // NEW: Pass check function
            savingToTrip={savingToTrip} // NEW: Pass saving state
          />
        </div>
      )}
    </div>
  );
};

export default StopPanel;
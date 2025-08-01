// Enhanced StopPanel.jsx 
import React, { useState, useEffect } from 'react';
import { MapPin, Star, Search, Check, Navigation, Eye, Trash2 } from 'lucide-react';
import ModernPlaceSearch from './ModernPlaceSearch';

const StopPanel = ({ 
  stops, 
  selectedStop, 
  onStopClick, 
  onShowFullRoute,
  stopCoordinates,
  mapMode,
  tripId,
  onPlaceSavedToTrip,
  savedTripPlaces = [],
  onCategorySearch, // Callback for category search results
  onNavigateToPlace // Callback to navigate to a place on map
}) => {
  const [selectedPlace, setSelectedPlace] = useState(null);
  const [savingToTrip, setSavingToTrip] = useState({});
  const [nearbySearchResults, setNearbySearchResults] = useState([]); // Category search results
  const [activeCategory, setActiveCategory] = useState(null); // Currently active category

  // Handle category search results
  const handleCategorySearch = (places, categoryId) => {
    setNearbySearchResults(places);
    setActiveCategory(categoryId);
    
    // Notify parent component to show these places on the map
    if (onCategorySearch) {
      onCategorySearch(places, categoryId);
    }
  };

  // Handle place click (from search results)
  const handlePlaceClick = (place) => {
    setSelectedPlace(place);
    
    // Navigate to place on map
    if (onNavigateToPlace) {
      onNavigateToPlace(place);
    }
    
    console.log('Selected place:', place);
  };

  // Save place to trip
  const handleSavePlaceToTrip = async (place) => {
    if (!tripId || selectedStop === null) {
      console.error('Cannot save place: missing tripId or selectedStop');
      return;
    }

    setSavingToTrip(prev => ({ ...prev, [place.place_id]: true }));

    try {
      const placeToSave = {
        place_id: place.place_id,
        name: place.name,
        address: place.address,
        rating: place.rating,
        user_ratings_total: place.user_ratings_total,
        types: place.types,
        location: place.location,
        phone: place.phone,
        website: place.website,
        stop_index: selectedStop
      };

      if (onPlaceSavedToTrip) {
        await onPlaceSavedToTrip(placeToSave);
      }

      console.log('✅ Place saved to trip successfully:', place.name);
    } catch (error) {
      console.error('❌ Failed to save place to trip:', error);
      alert('Failed to save place to trip. Please try again.');
    } finally {
      setSavingToTrip(prev => ({ ...prev, [place.place_id]: false }));
    }
  };

  // Check if place is already saved to trip
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

  // Enhanced place search component (no more favorites, star saves to trip)
  const EnhancedPlaceSearchWithTrip = ({ 
    location, 
    stopIndex,
    savedTripPlaces 
  }) => {
    return (
      <ModernPlaceSearch
        location={location}
        onCategorySearch={handleCategorySearch}
        onPlaceClick={handlePlaceClick}
        onSavePlaceToTrip={handleSavePlaceToTrip}
        savedTripPlaces={savedTripPlaces.filter(place => place.stop_index === stopIndex)}
        currentStopIndex={stopIndex}
        renderExtraActions={(place) => {
          const isAlreadySaved = savedTripPlaces.some(
            saved => saved.place_id === place.id && saved.stop_index === stopIndex
          );
          
          return (
            <div className="flex items-center gap-1">
              {/* Navigate to place button */}
              <button
                onClick={async (e) => {
                  e.stopPropagation();
                  handlePlaceClick(place);
                }}
                className="flex items-center gap-1 px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 transition-colors"
                title="View on map"
              >
                <Eye className="w-3 h-3" />
                View
              </button>
            </div>
          );
        }}
      />
    );
  };

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
                
                {/* Show saved places count for this stop */}
                {savedTripPlaces.filter(place => place.stop_index === index).length > 0 && (
                  <div className="flex items-center gap-1 text-xs text-green-600 mb-2">
                    <MapPin className="w-3 h-3" />
                    <span>{savedTripPlaces.filter(place => place.stop_index === index).length} saved place{savedTripPlaces.filter(place => place.stop_index === index).length !== 1 ? 's' : ''}</span>
                  </div>
                )}
                
                {/* Click hint */}
                <div className="text-xs text-blue-600">
                  💡 Click to explore and save places nearby
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
          
          {/* Enhanced Places Search (Star saves to trip) */}
          <div className="mb-6">
            <EnhancedPlaceSearchWithTrip
              location={currentLocation}
              stopIndex={selectedStop}
              savedTripPlaces={savedTripPlaces}
            />
          </div>

          {/* Category Search Results */}
          {nearbySearchResults.length > 0 && activeCategory && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-800 flex items-center gap-2">
                  <Search className="w-4 h-4 text-blue-600" />
                  {activeCategory.replace(/_/g, ' ')} nearby ({nearbySearchResults.length})
                </h4>
                <button
                  onClick={() => {
                    setNearbySearchResults([]);
                    setActiveCategory(null);
                    if (onCategorySearch) {
                      onCategorySearch([], null);
                    }
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  Clear
                </button>
              </div>
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {nearbySearchResults.slice(0, 10).map(place => (
                  <div
                    key={place.id}
                    className="bg-gray-50 rounded-lg p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                    onClick={() => handlePlaceClick(place)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h5 className="font-medium text-gray-900 truncate">{place.name}</h5>
                          {place.rating && (
                            <div className="flex items-center gap-1">
                              <Star className="w-3 h-3 text-yellow-500 fill-current" />
                              <span className="text-xs text-gray-600">{place.rating.toFixed(1)}</span>
                            </div>
                          )}
                        </div>
                        <p className="text-sm text-gray-600 truncate">{place.address}</p>
                        {place.types && place.types.length > 0 && (
                          <span className="inline-block mt-1 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                            {place.types[0].replace(/_/g, ' ')}
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-1 ml-2">
                        {/* Navigate button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlaceClick(place);
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          title="View on map"
                        >
                          <Navigation className="w-4 h-4" />
                        </button>
                        
                        {/* Save to trip star button */}
                        {!isPlaceSavedToTrip(place.id) ? (
                          <button
                            onClick={async (e) => {
                              e.stopPropagation();
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
                              await handleSavePlaceToTrip(placeToSave);
                            }}
                            disabled={savingToTrip[place.id]}
                            className="p-1 text-gray-400 hover:text-yellow-500 hover:bg-yellow-50 rounded disabled:opacity-50 transition-colors"
                            title="Save to trip"
                          >
                            {savingToTrip[place.id] ? (
                              <div className="animate-spin rounded-full h-4 w-4 border-b border-yellow-500"></div>
                            ) : (
                              <Star className="w-4 h-4" />
                            )}
                          </button>
                        ) : (
                          <div className="p-1 text-green-600" title="Already saved to trip">
                            <Check className="w-4 h-4" />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Saved Trip Places for this stop */}
          {savedTripPlaces.filter(place => place.stop_index === selectedStop).length > 0 && (
            <div className="mb-6">
              <h4 className="font-medium text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-green-600" />
                Saved Places for this Stop ({savedTripPlaces.filter(place => place.stop_index === selectedStop).length})
              </h4>
              
              <div className="space-y-2">
                {savedTripPlaces
                  .filter(place => place.stop_index === selectedStop)
                  .map(place => (
                    <div
                      key={place.id}
                      className="bg-green-50 border border-green-200 rounded-lg p-3 hover:bg-green-100 transition-colors cursor-pointer group"
                      onClick={() => handlePlaceClick({
                        id: place.place_id,
                        name: place.name,
                        address: place.address,
                        rating: place.rating,
                        userRatingsTotal: place.user_ratings_total,
                        types: place.types,
                        location: {
                          lat: place.latitude,
                          lng: place.longitude
                        },
                        phone: place.phone,
                        website: place.website
                      })}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h5 className="font-medium text-gray-900">{place.name}</h5>
                            {place.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-gray-600">{place.rating.toFixed(1)}</span>
                              </div>
                            )}
                          </div>
                          <p className="text-sm text-gray-600">{place.address}</p>
                          {place.types && place.types.length > 0 && (
                            <span className="inline-block mt-1 text-xs bg-green-100 text-green-700 px-2 py-1 rounded">
                              {place.types[0]?.replace(/_/g, ' ')}
                            </span>
                          )}
                          {place.user_notes && (
                            <p className="text-xs text-gray-500 mt-1 italic">"{place.user_notes}"</p>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-1 ml-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePlaceClick({
                                id: place.place_id,
                                name: place.name,
                                address: place.address,
                                rating: place.rating,
                                userRatingsTotal: place.user_ratings_total,
                                types: place.types,
                                location: {
                                  lat: place.latitude,
                                  lng: place.longitude
                                },
                                phone: place.phone,
                                website: place.website
                              });
                            }}
                            className="p-1 text-green-600 hover:bg-green-100 rounded"
                            title="View on map"
                          >
                            <Navigation className="w-4 h-4" />
                          </button>
                          
                          <div className="p-1 text-green-600" title="Saved to trip">
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Usage Tips */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">💡 How to use:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Search for specific places or use category filters (hotel, restaurant, etc.)</li>
              <li>• Click the star ⭐ to save places to your trip itinerary</li>
              <li>• Click "View" 👁️ to see the place on the map</li>
              <li>• Saved places will appear as markers on your map</li>
              <li>• Green checkmark ✅ means the place is already saved</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};

export default StopPanel;
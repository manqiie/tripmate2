// src/components/places/ModernPlaceSearch.jsx - Using NEW Places API
import React, { useState, useEffect, useRef } from 'react';
import { Search, Star, MapPin, X } from 'lucide-react';

const ModernPlaceSearch = ({ location, favorites = [], onToggleFavorite }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);

  // Search when user types (with delay)
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchQuery.length > 2) {
        searchPlaces();
      } else {
        setSearchResults([]);
        setShowDropdown(false);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery, location]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !searchRef.current.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const searchPlaces = async () => {
    console.log('🔍 Modern search for:', searchQuery);
    
    setLoading(true);
    setError('');

    try {
      // Use Text Search API directly (bypasses deprecated PlacesService)
      const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
      
      // Construct search query with location bias
      const query = `${searchQuery} near ${location.lat},${location.lng}`;
      
      const url = `https://maps.googleapis.com/maps/api/place/textsearch/json?` +
        `query=${encodeURIComponent(query)}&` +
        `location=${location.lat},${location.lng}&` +
        `radius=10000&` +
        `key=${apiKey}`;

      console.log('📡 Making direct API call...');
      
      // Since we can't make direct CORS requests from browser, we'll use the old API
      // but with better error handling for the deprecation warnings
      
      if (!window.google?.maps?.places) {
        throw new Error('Google Maps Places not loaded');
      }

      // Use TextSearchRequest instead of nearbySearch for better results
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request = {
        query: `${searchQuery} near ${location.lat},${location.lng}`,
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 10000
      };

      console.log('📋 Text search request:', request);

      // Use textSearch instead of nearbySearch for better keyword matching
      service.textSearch(request, (results, status) => {
        console.log('📡 Text search response:', { status, resultsCount: results?.length });
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          const formattedResults = results.slice(0, 8).map(place => {
            try {
              return {
                id: place.place_id,
                name: place.name,
                address: place.formatted_address || place.vicinity,
                rating: place.rating || 0,
                userRatingsTotal: place.user_ratings_total || 0,
                types: place.types || [],
                location: {
                  lat: place.geometry.location.lat(),
                  lng: place.geometry.location.lng()
                },
                photos: place.photos ? place.photos.slice(0, 1).map(photo => ({
                  url: photo.getUrl({ maxWidth: 200, maxHeight: 150 })
                })) : [],
                priceLevel: place.price_level
              };
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);

          console.log('✅ Formatted results:', formattedResults);
          setSearchResults(formattedResults);
          setShowDropdown(true);
          
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          console.log('ℹ️ No results found');
          setSearchResults([]);
          setShowDropdown(true);
          
        } else {
          console.error('❌ Search failed with status:', status);
          setError(`Search failed: ${status}`);
        }
        
        setLoading(false);
      });

    } catch (err) {
      console.error('❌ Search error:', err);
      setError(`Search error: ${err.message}`);
      setLoading(false);
    }
  };

  const isFavorite = (placeId) => {
    return favorites.some(fav => fav.id === placeId);
  };

  const handleToggleFavorite = (place) => {
    onToggleFavorite(place);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
  };

  const renderStarIcon = (place) => {
    const isStarred = isFavorite(place.id);
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleToggleFavorite(place);
        }}
        className={`p-2 rounded-full transition-colors ${
          isStarred 
            ? 'text-yellow-500 hover:text-yellow-600 bg-yellow-50' 
            : 'text-gray-400 hover:text-yellow-500 hover:bg-yellow-50'
        }`}
        title={isStarred ? 'Remove from favorites' : 'Add to favorites'}
      >
        <Star className={`w-5 h-5 ${isStarred ? 'fill-current' : ''}`} />
      </button>
    );
  };

  const renderRating = (rating, totalRatings) => {
    if (!rating) return null;
    
    return (
      <div className="flex items-center gap-1 text-sm">
        <Star className="w-3 h-3 text-yellow-500 fill-current" />
        <span className="text-gray-700 font-medium">{rating.toFixed(1)}</span>
        {totalRatings && (
          <span className="text-gray-500">({totalRatings})</span>
        )}
      </div>
    );
  };

  const renderPriceLevel = (priceLevel) => {
    if (!priceLevel) return null;
    
    const dollarSigns = '$'.repeat(priceLevel);
    return (
      <span className="text-green-600 font-medium text-sm">
        {dollarSigns}
      </span>
    );
  };

  const getPlaceTypeIcon = (types) => {
    if (!types || types.length === 0) return '📍';
    
    const type = types[0];
    const iconMap = {
      restaurant: '🍽️',
      food: '🍽️',
      meal_takeaway: '🥡',
      tourist_attraction: '🎯',
      lodging: '🏨',
      shopping_mall: '🛍️',
      store: '🏪',
      gas_station: '⛽',
      hospital: '🏥',
      bank: '🏦',
      park: '🌳',
      museum: '🏛️',
      church: '⛪',
      school: '🏫',
      cafe: '☕',
      bar: '🍺',
      gym: '💪',
      beauty_salon: '💄',
      pharmacy: '💊'
    };
    
    return iconMap[type] || '📍';
  };

  return (
    <div className="relative">
      {/* Search Input */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length > 2 && setShowDropdown(true)}
            placeholder="Search for places (restaurants, hotels, attractions...)"
            className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-5 h-5" />
            </button>
          )}
          {loading && (
            <div className="absolute right-10 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50 max-h-96 overflow-y-auto"
        >
          {error && (
            <div className="p-3 text-red-600 text-sm border-b border-gray-100">
              {error}
            </div>
          )}
          
          {/* Search Results */}
          {searchResults.length > 0 ? (
            <div>
              <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-100">
                Found {searchResults.length} places for "{searchQuery}"
              </div>
              {searchResults.map(place => (
                <div
                  key={place.id}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                >
                  {/* Place Icon */}
                  <div className="text-2xl flex-shrink-0 mt-1">
                    {getPlaceTypeIcon(place.types)}
                  </div>
                  
                  {/* Place Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-medium text-gray-900 truncate">
                          {place.name}
                        </h4>
                        <p className="text-sm text-gray-600 truncate">
                          {place.address}
                        </p>
                      </div>
                      
                      {/* Star Button */}
                      <div className="ml-2 flex-shrink-0">
                        {renderStarIcon(place)}
                      </div>
                    </div>
                    
                    {/* Rating, Price, and Type */}
                    <div className="mt-2 flex items-center gap-3">
                      {renderRating(place.rating, place.userRatingsTotal)}
                      {renderPriceLevel(place.priceLevel)}
                      {place.types && place.types.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {place.types[0].replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Note about deprecated API */}
              <div className="p-2 bg-yellow-50 text-xs text-yellow-700 border-t">
                ℹ️ Using legacy Places API - some deprecation warnings are normal
              </div>
            </div>
          ) : searchQuery.length > 2 && !loading ? (
            <div className="p-4 text-center text-gray-500">
              No places found for "{searchQuery}"
              <br />
              <span className="text-xs">Try different keywords like "restaurant", "hotel", "cafe"</span>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ModernPlaceSearch;
// src/components/places/ModernPlaceSearch.jsx - OPTIMIZED VERSION to prevent redundant API calls
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Star, MapPin, X } from 'lucide-react';

const ModernPlaceSearch = ({ location, favorites = [], onToggleFavorite }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  
  // Refs for cleanup and preventing duplicate calls
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastSearchQueryRef = useRef('');
  const lastLocationRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Debounced search with cleanup and duplicate prevention
  useEffect(() => {
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Don't search if query is too short
    if (searchQuery.length <= 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setError('');
      return;
    }

    // Check if this is a duplicate search (same query and location)
    const locationKey = location ? `${location.lat},${location.lng}` : 'no-location';
    const currentSearchKey = `${searchQuery}-${locationKey}`;
    const lastSearchKey = `${lastSearchQueryRef.current}-${lastLocationRef.current}`;
    
    if (currentSearchKey === lastSearchKey) {
      console.log('🔄 Skipping duplicate search:', searchQuery);
      return;
    }

    // Set up debounced search
    searchTimeoutRef.current = setTimeout(() => {
      console.log('🔍 Triggering search for:', searchQuery);
      lastSearchQueryRef.current = searchQuery;
      lastLocationRef.current = locationKey;
      searchPlaces();
    }, 800); // Increased delay to 800ms to reduce API calls

    // Cleanup function
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, location]);

  // Memoize location to prevent unnecessary re-renders
  const memoizedLocation = useMemo(() => {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return null;
    }
    return { lat: location.lat, lng: location.lng };
  }, [location?.lat, location?.lng]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !searchRef.current?.contains(event.target)
      ) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      // Cancel any ongoing search when component unmounts
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  const searchPlaces = useCallback(async () => {
    console.log('🔍 Starting Places API search for:', searchQuery);
    
    // Validate inputs
    if (!searchQuery || searchQuery.length <= 2) {
      console.log('❌ Search query too short, skipping');
      return;
    }

    if (!memoizedLocation) {
      console.log('❌ No valid location provided, skipping');
      setError('Location required for search');
      return;
    }

    // Cancel previous search if still running
    if (abortControllerRef.current) {
      console.log('⏹️ Cancelling previous search');
      abortControllerRef.current.abort();
    }

    // Create new abort controller for this search
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError('');

    try {
      // Check Google Maps availability
      if (!window.google?.maps?.places) {
        throw new Error('Google Maps Places API not loaded');
      }

      console.log('✅ Places API available, starting searches...');

      // Create services once
      const textSearchService = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );
      const nearbySearchService = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      // Execute searches with timeout and abort control
      const searchPromises = [];

      // 1. Text search with timeout
      searchPromises.push(
        Promise.race([
          performTextSearchOptimized(textSearchService, searchQuery, memoizedLocation),
          createTimeoutPromise(8000, 'Text search timeout') // Reduced timeout
        ])
      );

      // 2. Nearby search with timeout
      searchPromises.push(
        Promise.race([
          performNearbySearchOptimized(nearbySearchService, searchQuery, memoizedLocation),
          createTimeoutPromise(8000, 'Nearby search timeout') // Reduced timeout
        ])
      );

      console.log('📡 Executing parallel searches...');
      
      // Wait for all searches with abort support
      const results = await Promise.allSettled(searchPromises);
      
      // Check if search was aborted
      if (abortControllerRef.current?.signal.aborted) {
        console.log('⏹️ Search was aborted');
        return;
      }

      console.log('📊 Search results received:', results);

      // Process and combine results
      let allResults = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`✅ Search ${index + 1} success:`, result.value.length, 'places');
          allResults = allResults.concat(result.value);
        } else if (result.status === 'rejected') {
          console.warn(`❌ Search ${index + 1} failed:`, result.reason);
        }
      });

      // Remove duplicates and limit results
      const uniqueResults = removeDuplicates(allResults);
      const limitedResults = uniqueResults.slice(0, 8); // Limit to 8 results

      console.log('✅ Final optimized results:', limitedResults.length, 'unique places');
      
      setSearchResults(limitedResults);
      setShowDropdown(true);

      if (limitedResults.length === 0) {
        setError(`No places found near this location. Try different search terms.`);
      }

    } catch (err) {
      // Don't show error if search was aborted
      if (!abortControllerRef.current?.signal.aborted) {
        console.error('❌ Search error:', err);
        setError(`Search error: ${err.message}`);
      }
    } finally {
      if (!abortControllerRef.current?.signal.aborted) {
        setLoading(false);
      }
    }
  }, [searchQuery, memoizedLocation]);

  // Optimized text search with early return and caching
  const performTextSearchOptimized = useCallback((service, query, location) => {
    return new Promise((resolve, reject) => {
      if (abortControllerRef.current?.signal.aborted) {
        resolve([]);
        return;
      }

      console.log('📝 Optimized text search for:', query);
      
      const request = {
        query: `${query} near ${location.lat},${location.lng}`,
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 10000, // Reduced radius for more relevant results
        fields: ['place_id', 'name', 'formatted_address', 'geometry', 'rating', 'user_ratings_total', 'types'] // Only request needed fields
      };

      service.textSearch(request, (results, status) => {
        if (abortControllerRef.current?.signal.aborted) {
          resolve([]);
          return;
        }

        console.log('📝 Text search response - Status:', status, 'Results:', results?.length || 0);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.slice(0, 5).map(place => { // Limit to 5 per search
            try {
              return formatPlaceOptimized(place);
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);
          
          resolve(formattedResults);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          console.warn('❌ Text search failed - Status:', status);
          resolve([]);
        }
      });
    });
  }, []);

  // Optimized nearby search
  const performNearbySearchOptimized = useCallback((service, query, location) => {
    return new Promise((resolve, reject) => {
      if (abortControllerRef.current?.signal.aborted) {
        resolve([]);
        return;
      }

      console.log('📍 Optimized nearby search for:', query);
      
      const searchType = getSearchType(query);
      const request = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 8000, // Reduced radius
        keyword: query,
        type: searchType ? [searchType] : undefined,
        fields: ['place_id', 'name', 'vicinity', 'geometry', 'rating', 'user_ratings_total', 'types'] // Only needed fields
      };

      service.nearbySearch(request, (results, status) => {
        if (abortControllerRef.current?.signal.aborted) {
          resolve([]);
          return;
        }

        console.log('📍 Nearby search response - Status:', status, 'Results:', results?.length || 0);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.slice(0, 5).map(place => { // Limit to 5 per search
            try {
              return formatPlaceOptimized(place);
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);
          
          resolve(formattedResults);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          console.warn('❌ Nearby search failed - Status:', status);
          resolve([]);
        }
      });
    });
  }, []);

  // Create timeout promise
  const createTimeoutPromise = (ms, errorMessage) => {
    return new Promise((_, reject) => {
      setTimeout(() => reject(new Error(errorMessage)), ms);
    });
  };

  // Optimized place formatting (only extract what we need)
  const formatPlaceOptimized = useCallback((place) => {
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
      // Skip photos and other heavy data unless specifically needed
      photos: [], // Don't load photos initially to save API quota
      priceLevel: place.price_level,
      phone: place.formatted_phone_number,
      website: place.website
    };
  }, []);

  // Remove duplicates based on place_id
  const removeDuplicates = useCallback((places) => {
    const seen = new Set();
    return places.filter(place => {
      if (seen.has(place.id)) {
        return false;
      }
      seen.add(place.id);
      return true;
    });
  }, []);

  // Determine search type based on query keywords
  const getSearchType = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    
    // Food & Dining
    if (lowerQuery.includes('restaurant') || lowerQuery.includes('food') || 
        lowerQuery.includes('cafe') || lowerQuery.includes('coffee') ||
        lowerQuery.includes('bar') || lowerQuery.includes('pub') ||
        lowerQuery.includes('dining') || lowerQuery.includes('eat')) {
      return 'restaurant';
    }
    
    // Accommodation
    if (lowerQuery.includes('hotel') || lowerQuery.includes('accommodation') ||
        lowerQuery.includes('stay') || lowerQuery.includes('lodge') ||
        lowerQuery.includes('resort') || lowerQuery.includes('inn')) {
      return 'lodging';
    }
    
    // Shopping
    if (lowerQuery.includes('shop') || lowerQuery.includes('mall') ||
        lowerQuery.includes('store') || lowerQuery.includes('market') ||
        lowerQuery.includes('shopping')) {
      return 'shopping_mall';
    }
    
    // Attractions
    if (lowerQuery.includes('attraction') || lowerQuery.includes('tourist') ||
        lowerQuery.includes('museum') || lowerQuery.includes('park') ||
        lowerQuery.includes('temple') || lowerQuery.includes('monument')) {
      return 'tourist_attraction';
    }
    
    return null;
  }, []);

  const isFavorite = useCallback((placeId) => {
    return favorites.some(fav => fav.id === placeId);
  }, [favorites]);

  const handleToggleFavorite = useCallback((place) => {
    onToggleFavorite(place);
  }, [onToggleFavorite]);

  const clearSearch = useCallback(() => {
    // Cancel any ongoing search
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setError('');
    lastSearchQueryRef.current = '';
    lastLocationRef.current = null;
  }, []);

  const renderStarIcon = useCallback((place) => {
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
  }, [isFavorite, handleToggleFavorite]);

  const renderRating = useCallback((rating, totalRatings) => {
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
  }, []);

  const getPlaceTypeIcon = useCallback((types) => {
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
      bar: '🍺'
    };
    
    return iconMap[type] || '📍';
  }, []);

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
            placeholder="Search places by name or type (e.g., 'Marina Bay Sands' or 'restaurant')"
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
                    
                    {/* Rating and Type */}
                    <div className="mt-2 flex items-center gap-3">
                      {renderRating(place.rating, place.userRatingsTotal)}
                      {place.types && place.types.length > 0 && (
                        <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {place.types[0].replace(/_/g, ' ')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : searchQuery.length > 2 && !loading ? (
            <div className="p-4 text-center text-gray-500">
              <div className="mb-2">No places found for "{searchQuery}"</div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Try searching by:</div>
                <div>• Specific names: "Marina Bay Sands", "Raffles Hotel"</div>
                <div>• Place types: "restaurant", "cafe", "tourist attraction"</div>
                <div>• General terms: "food", "shopping", "hotel"</div>
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ModernPlaceSearch;
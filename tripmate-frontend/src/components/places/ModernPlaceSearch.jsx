// Fixed ModernPlaceSearch.jsx - Category Click Issue Resolved
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Star, MapPin, X, Filter, Hotel, Utensils, ShoppingBag, Car, Plane, Hospital, Check } from 'lucide-react';

const ModernPlaceSearch = ({ 
  location, 
  onCategorySearch, // Callback for category-based search
  onPlaceClick, // Callback when a place is clicked
  renderExtraActions,
  // Trip saving props (replacing favorites)
  onSavePlaceToTrip,
  savedTripPlaces = [],
  currentStopIndex
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  const [savingStates, setSavingStates] = useState({}); // Track saving state per place
  
  // Refs for cleanup and preventing duplicate calls
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastSearchQueryRef = useRef('');
  const lastLocationRef = useRef(null);
  const searchTimeoutRef = useRef(null);
  const lastCategorySearchRef = useRef(null);

  // Category definitions with Google Places API types
  const categoryDefinitions = [
    {
      id: 'restaurant',
      name: 'Restaurants',
      icon: Utensils,
      color: 'blue',
      googleTypes: ['restaurant', 'meal_takeaway', 'food'],
      keywords: ['restaurant', 'food', 'dining', 'eat', 'cafe', 'bar', 'pub']
    },
    {
      id: 'lodging',
      name: 'Hotels',
      icon: Hotel,
      color: 'blue',
      googleTypes: ['lodging'],
      keywords: ['hotel', 'accommodation', 'stay', 'lodge', 'resort', 'inn', 'motel']
    },
    {
      id: 'tourist_attraction',
      name: 'Attractions',
      icon: MapPin,
      color: 'blue',
      googleTypes: ['tourist_attraction', 'museum', 'park'],
      keywords: ['attraction', 'tourist', 'museum', 'park', 'temple', 'monument', 'landmark']
    },
    {
      id: 'shopping_mall',
      name: 'Shopping',
      icon: ShoppingBag,
      color: 'blue',
      googleTypes: ['shopping_mall', 'store'],
      keywords: ['shop', 'mall', 'store', 'market', 'shopping', 'retail']
    },
    {
      id: 'gas_station',
      name: 'Gas Stations',
      icon: Car,
      color: 'blue',
      googleTypes: ['gas_station'],
      keywords: ['gas', 'fuel', 'petrol', 'station']
    },
    {
      id: 'hospital',
      name: 'Healthcare',
      icon: Hospital,
      color: 'blue',
      googleTypes: ['hospital', 'doctor', 'pharmacy'],
      keywords: ['hospital', 'doctor', 'clinic', 'pharmacy', 'medical', 'health']
    }
  ];

  // Memoize location to prevent unnecessary re-renders
  const memoizedLocation = useMemo(() => {
    if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
      return null;
    }
    return { lat: location.lat, lng: location.lng };
  }, [location?.lat, location?.lng]);

  // FIXED: Category search logic - properly handles dropdown visibility
  const handleCategoryClick = useCallback(async (category) => {
    if (!memoizedLocation) {
      setError('Location required for category search');
      return;
    }

    // Clear any pending search timeouts
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // Abort any ongoing searches
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // FIXED: Set states immediately to show loading state and close category filter
    setSelectedCategory(category);
    setLoading(true);
    setError('');
    setShowCategoryFilter(false);
    setShowDropdown(true); // FIXED: Ensure dropdown shows immediately
    setSearchResults([]); // Clear previous results while loading

    // Update refs to prevent duplicate search prevention
    const timestamp = Date.now();
    lastCategorySearchRef.current = `${category.id}-${timestamp}`;

    try {
      console.log(`🔍 Searching for ${category.name} near location`);
      
      // Check Google Maps availability
      if (!window.google?.maps?.places) {
        throw new Error('Google Maps Places API not loaded');
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      // Use primary Google type for the search
      const primaryType = category.googleTypes[0];
      
      const request = {
        location: new window.google.maps.LatLng(memoizedLocation.lat, memoizedLocation.lng),
        radius: 5000, // 5km radius
        type: primaryType,
        keyword: category.name.toLowerCase()
      };

      // Perform nearby search
      service.nearbySearch(request, (results, status) => {
        // FIXED: Always update loading state and maintain dropdown visibility
        setLoading(false);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.slice(0, 20).map(place => {
            try {
              return formatPlaceForCategory(place);
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);
          
          console.log(`✅ Found ${formattedResults.length} ${category.name}`);
          setSearchResults(formattedResults);
          
          // Notify parent component about category search results
          if (onCategorySearch) {
            onCategorySearch(formattedResults, category.id);
          }
          
          // FIXED: Keep dropdown open with results
          setShowDropdown(true);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSearchResults([]);
          setShowDropdown(true); // FIXED: Still show dropdown with "no results" message
          setError(`No ${category.name.toLowerCase()} found in this area`);
        } else {
          console.error(`❌ Category search failed: ${status}`);
          setError(`Failed to search for ${category.name.toLowerCase()}`);
          setShowDropdown(true); // FIXED: Show dropdown with error message
        }
      });

    } catch (err) {
      console.error('Category search error:', err);
      setError(`Category search failed: ${err.message}`);
      setLoading(false);
      setShowDropdown(true); // FIXED: Show dropdown with error message
    }
  }, [memoizedLocation, onCategorySearch]);

  // Format place data specifically for category searches
  const formatPlaceForCategory = useCallback((place) => {
    return {
      id: place.place_id,
      place_id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
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
      priceLevel: place.price_level,
      phone: place.formatted_phone_number,
      website: place.website,
      openingHours: place.opening_hours?.isOpen?.() || null
    };
  }, []);

  // FIXED: Enhanced debounced search with better category handling
  useEffect(() => {
    // Don't interfere with category searches
    if (lastCategorySearchRef.current) {
      return;
    }

    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (searchQuery.length <= 2) {
      setSearchResults([]);
      setShowDropdown(false);
      setError('');
      setSelectedCategory(null);
      return;
    }

    // Auto-detect category from search query
    const detectedCategory = detectCategoryFromQuery(searchQuery);
    if (detectedCategory && detectedCategory !== selectedCategory) {
      setSelectedCategory(detectedCategory);
    }

    const locationKey = memoizedLocation ? `${memoizedLocation.lat},${memoizedLocation.lng}` : 'no-location';
    const currentSearchKey = `${searchQuery}-${locationKey}`;
    const lastSearchKey = `${lastSearchQueryRef.current}-${lastLocationRef.current}`;
    
    if (currentSearchKey === lastSearchKey) {
      return;
    }

    searchTimeoutRef.current = setTimeout(() => {
      lastSearchQueryRef.current = searchQuery;
      lastLocationRef.current = locationKey;
      
      if (detectedCategory) {
        // If category detected, do category search
        handleCategoryClick(detectedCategory);
      } else {
        // Otherwise do regular search
        searchPlaces();
      }
    }, 500);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [searchQuery, memoizedLocation]);

  // Detect category from search query
  const detectCategoryFromQuery = useCallback((query) => {
    const lowerQuery = query.toLowerCase();
    
    for (const category of categoryDefinitions) {
      if (category.keywords.some(keyword => lowerQuery.includes(keyword))) {
        return category;
      }
    }
    return null;
  }, []);

  // Regular place search (for non-category searches)
  const searchPlaces = useCallback(async () => {
    if (!searchQuery || searchQuery.length <= 2 || !memoizedLocation) {
      return;
    }

    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError('');
    setShowDropdown(true); // FIXED: Show dropdown immediately when searching

    try {
      if (!window.google?.maps?.places) {
        throw new Error('Google Maps Places API not loaded');
      }

      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      const request = {
        location: new window.google.maps.LatLng(memoizedLocation.lat, memoizedLocation.lng),
        radius: 10000,
        keyword: searchQuery,
        type: ['establishment']
      };

      service.nearbySearch(request, (results, status) => {
        if (abortControllerRef.current?.signal.aborted) return;

        setLoading(false);

        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.slice(0, 8).map(place => {
            try {
              return formatPlaceForCategory(place);
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);
          
          setSearchResults(formattedResults);
          
          if (formattedResults.length === 0) {
            setError(`No places found for "${searchQuery}"`);
          }
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSearchResults([]);
          setError(`No results found for "${searchQuery}"`);
        } else {
          setError(`Search failed: ${status}`);
        }
      });

    } catch (err) {
      if (!abortControllerRef.current?.signal.aborted) {
        setError(`Search error: ${err.message}`);
        setLoading(false);
      }
    }
  }, [searchQuery, memoizedLocation, formatPlaceForCategory]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (
        dropdownRef.current && 
        !dropdownRef.current.contains(event.target) &&
        !searchRef.current?.contains(event.target)
      ) {
        setShowDropdown(false);
        setShowCategoryFilter(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  // Check if place is already saved to trip
  const isPlaceSavedToTrip = useCallback((placeId) => {
    return savedTripPlaces.some(saved => saved.place_id === placeId);
  }, [savedTripPlaces]);

  // Handle saving place to trip (via star icon)
  const handleSavePlaceToTrip = useCallback(async (place) => {
    if (!onSavePlaceToTrip) {
      console.warn('No onSavePlaceToTrip callback provided');
      return;
    }

    // Set saving state
    setSavingStates(prev => ({ ...prev, [place.id]: true }));

    try {
      const placeData = {
        place_id: place.id,
        name: place.name,
        address: place.address,
        rating: place.rating,
        user_ratings_total: place.userRatingsTotal,
        types: place.types,
        location: place.location,
        phone: place.phone,
        website: place.website,
        stop_index: currentStopIndex
      };

      await onSavePlaceToTrip(placeData);
      console.log('✅ Place saved to trip:', place.name);
      
    } catch (error) {
      console.error('❌ Failed to save place to trip:', error);
      // You might want to show an error message to the user here
    } finally {
      setSavingStates(prev => ({ ...prev, [place.id]: false }));
    }
  }, [onSavePlaceToTrip, currentStopIndex]);

  const clearSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    setSearchQuery('');
    setSearchResults([]);
    setShowDropdown(false);
    setError('');
    setSelectedCategory(null);
    lastSearchQueryRef.current = '';
    lastLocationRef.current = null;
    lastCategorySearchRef.current = null;
    
    // Clear category search results from map
    if (onCategorySearch) {
      onCategorySearch([], null);
    }
  }, [onCategorySearch]);

  const handlePlaceClick = useCallback((place) => {
    if (onPlaceClick) {
      onPlaceClick(place);
    }
  }, [onPlaceClick]);

  // Modified star icon renderer - now for trip saving instead of favorites
  const renderStarIcon = useCallback((place) => {
    const isAlreadySaved = isPlaceSavedToTrip(place.id);
    const isSaving = savingStates[place.id];
    
    if (isSaving) {
      return (
        <button
          disabled
          className="p-2 rounded-full bg-gray-100 text-gray-400 cursor-not-allowed"
          title="Saving to trip..."
        >
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
        </button>
      );
    }
    
    if (isAlreadySaved) {
      return (
        <button
          disabled
          className="p-2 rounded-full text-green-600 bg-green-50 cursor-default"
          title="Already saved to trip"
        >
          <Check className="w-5 h-5" />
        </button>
      );
    }
    
    return (
      <button
        onClick={(e) => {
          e.stopPropagation();
          handleSavePlaceToTrip(place);
        }}
        className="p-2 rounded-full transition-colors text-gray-400 hover:text-yellow-500 hover:bg-yellow-50"
        title="Save to trip"
      >
        <Star className="w-5 h-5" />
      </button>
    );
  }, [isPlaceSavedToTrip, savingStates, handleSavePlaceToTrip]);

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
      {/* Search Input with Category Filter */}
      <div ref={searchRef} className="relative">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.length > 2 && setShowDropdown(true)}
            placeholder="Search places or try: hotel, restaurant, tourist attraction..."
            className="w-full pl-10 pr-20 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          
          {/* Category Filter Button */}
          <button
            onClick={() => setShowCategoryFilter(!showCategoryFilter)}
            className={`absolute right-10 top-1/2 transform -translate-y-1/2 p-1 rounded ${
              selectedCategory ? 'text-blue-600 bg-blue-50' : 'text-gray-400 hover:text-gray-600'
            }`}
            title="Filter by category"
          >
            <Filter className="w-4 h-4" />
          </button>
          
          {searchQuery && (
            <button
              onClick={clearSearch}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          {loading && (
            <div className="absolute right-24 top-1/2 transform -translate-y-1/2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
            </div>
          )}
        </div>
      </div>

      {/* Category Filter Dropdown */}
      {showCategoryFilter && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          <div className="p-3">
            <h4 className="font-medium text-gray-700 mb-3">Search by Category</h4>
            <div className="grid grid-cols-2 gap-2">
              {categoryDefinitions.map((category) => {
                const Icon = category.icon;
                const isSelected = selectedCategory?.id === category.id;
                
                return (
                  <button
                    key={category.id}
                    onClick={() => handleCategoryClick(category)}
                    className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                      isSelected
                        ? `bg-${category.color}-50 text-${category.color}-700 border border-${category.color}-200`
                        : 'hover:bg-gray-50 border border-transparent'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isSelected ? `text-${category.color}-600` : 'text-gray-500'}`} />
                    <span className="text-sm font-medium">{category.name}</span>
                  </button>
                );
              })}
            </div>
            
            {selectedCategory && (
              <div className="mt-3 pt-3 border-t border-gray-200">
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    setShowCategoryFilter(false);
                    clearSearch();
                  }}
                  className="text-sm text-blue-600 hover:text-blue-700 underline"
                >
                  Clear category filter
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Search Results Dropdown */}
      {showDropdown && (
        <div 
          ref={dropdownRef}
          className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-40 max-h-96 overflow-y-auto"
        >
          {/* Selected Category Header */}
          {selectedCategory && (
            <div className={`px-3 py-2 bg-${selectedCategory.color}-50 border-b border-gray-100`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <selectedCategory.icon className={`w-4 h-4 text-${selectedCategory.color}-600`} />
                  <span className={`text-sm font-medium text-${selectedCategory.color}-800`}>
                    {selectedCategory.name} near you
                  </span>
                </div>
                <button
                  onClick={() => {
                    setSelectedCategory(null);
                    clearSearch();
                  }}
                  className={`p-1 text-${selectedCategory.color}-600 hover:text-${selectedCategory.color}-700 rounded`}
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="p-4 text-center">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600 mx-auto mb-2"></div>
              <div className="text-sm text-gray-600">
                Searching for {selectedCategory ? selectedCategory.name.toLowerCase() : 'places'}...
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="p-3 text-red-600 text-sm border-b border-gray-100">
              {error}
            </div>
          )}
          
          {/* Search Results */}
          {!loading && searchResults.length > 0 && (
            <div>
              <div className="px-3 py-2 bg-gray-50 text-sm font-medium text-gray-700 border-b border-gray-100">
                Found {searchResults.length} {selectedCategory ? selectedCategory.name.toLowerCase() : 'places'}
                {searchQuery && !selectedCategory && ` for "${searchQuery}"`}
              </div>
              {searchResults.map(place => (
                <div
                  key={place.id}
                  onClick={() => handlePlaceClick(place)}
                  className="flex items-start gap-3 p-3 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 cursor-pointer"
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
                      
                      {/* Action Buttons Container - Only Star Button Now */}
                      <div className="ml-2 flex-shrink-0 flex items-center gap-1">
                        {/* Star Button (now for trip saving) */}
                        {renderStarIcon(place)}
                        
                        {/* Extra Actions */}
                        {renderExtraActions && renderExtraActions(place)}
                      </div>
                    </div>
                    
                    {/* Rating, Type, and Status */}
                    <div className="mt-2 flex items-center gap-3">
                      {renderRating(place.rating, place.userRatingsTotal)}
                      
                      {place.types && place.types.length > 0 && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          selectedCategory 
                            ? `bg-${selectedCategory.color}-50 text-${selectedCategory.color}-600`
                            : 'bg-blue-50 text-blue-600'
                        }`}>
                          {place.types[0].replace(/_/g, ' ')}
                        </span>
                      )}
                      
                      {/* Opening Hours Status */}
                      {place.openingHours !== null && (
                        <span className={`text-xs px-2 py-1 rounded ${
                          place.openingHours 
                            ? 'bg-green-50 text-green-600' 
                            : 'bg-red-50 text-red-600'
                        }`}>
                          {place.openingHours ? 'Open' : 'Closed'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* No Results State */}
          {!loading && searchResults.length === 0 && (searchQuery.length > 2 || selectedCategory) && !error && (
            <div className="p-4 text-center text-gray-500">
              <div className="mb-2">
                No {selectedCategory ? selectedCategory.name.toLowerCase() : 'places'} found
                {searchQuery && !selectedCategory && ` for "${searchQuery}"`}
              </div>
              <div className="text-xs text-gray-400 space-y-1">
                <div>Try searching for:</div>
                <div>• Specific categories: "hotel", "restaurant", "tourist attraction"</div>
                <div>• Specific names: "Marina Bay Sands", "Raffles Hotel"</div>
                <div>• Or use the category filter above</div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModernPlaceSearch;
// Enhanced ModernPlaceSearch.jsx with category search functionality
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Search, Star, MapPin, X, Filter, Hotel, Utensils, ShoppingBag, Car, Plane, Hospital } from 'lucide-react';

const ModernPlaceSearch = ({ 
  location, 
  favorites = [], 
  onToggleFavorite,
  onCategorySearch, // NEW: Callback for category-based search
  onPlaceClick, // NEW: Callback when a place is clicked
  renderExtraActions
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [error, setError] = useState('');
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [showCategoryFilter, setShowCategoryFilter] = useState(false);
  
  // Refs for cleanup and preventing duplicate calls
  const searchRef = useRef(null);
  const dropdownRef = useRef(null);
  const abortControllerRef = useRef(null);
  const lastSearchQueryRef = useRef('');
  const lastLocationRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  // Category definitions with Google Places API types
  const categoryDefinitions = [
    {
      id: 'restaurant',
      name: 'Restaurants',
      icon: Utensils,
      color: 'red',
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
      color: 'green',
      googleTypes: ['tourist_attraction', 'museum', 'park'],
      keywords: ['attraction', 'tourist', 'museum', 'park', 'temple', 'monument', 'landmark']
    },
    {
      id: 'shopping_mall',
      name: 'Shopping',
      icon: ShoppingBag,
      color: 'purple',
      googleTypes: ['shopping_mall', 'store'],
      keywords: ['shop', 'mall', 'store', 'market', 'shopping', 'retail']
    },
    {
      id: 'gas_station',
      name: 'Gas Stations',
      icon: Car,
      color: 'orange',
      googleTypes: ['gas_station'],
      keywords: ['gas', 'fuel', 'petrol', 'station']
    },
    {
      id: 'hospital',
      name: 'Healthcare',
      icon: Hospital,
      color: 'pink',
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

  // Category search logic
  const handleCategoryClick = useCallback(async (category) => {
    if (!memoizedLocation) {
      setError('Location required for category search');
      return;
    }

    setSelectedCategory(category);
    setLoading(true);
    setError('');
    setShowCategoryFilter(false);

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
          
          setShowDropdown(true);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSearchResults([]);
          setShowDropdown(true);
          setError(`No ${category.name.toLowerCase()} found in this area`);
        } else {
          console.error(`❌ Category search failed: ${status}`);
          setError(`Failed to search for ${category.name.toLowerCase()}`);
        }
        setLoading(false);
      });

    } catch (err) {
      console.error('Category search error:', err);
      setError(`Category search failed: ${err.message}`);
      setLoading(false);
    }
  }, [memoizedLocation, onCategorySearch]);

  // Format place data specifically for category searches
  const formatPlaceForCategory = useCallback((place) => {
    return {
      id: place.place_id,
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

  // Enhanced debounced search with category detection
  useEffect(() => {
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
  }, [searchQuery, memoizedLocation, selectedCategory, handleCategoryClick]);

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
          setShowDropdown(true);
          
          if (formattedResults.length === 0) {
            setError(`No places found for "${searchQuery}"`);
          }
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          setSearchResults([]);
          setShowDropdown(true);
          setError(`No results found for "${searchQuery}"`);
        } else {
          setError(`Search failed: ${status}`);
        }
        setLoading(false);
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

  const isFavorite = useCallback((placeId) => {
    return favorites.some(fav => fav.id === placeId);
  }, [favorites]);

  const handleToggleFavorite = useCallback((place) => {
    onToggleFavorite(place);
  }, [onToggleFavorite]);

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

          {error && (
            <div className="p-3 text-red-600 text-sm border-b border-gray-100">
              {error}
            </div>
          )}
          
          {/* Search Results */}
          {searchResults.length > 0 ? (
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
                      
                      {/* Action Buttons Container */}
                      <div className="ml-2 flex-shrink-0 flex items-center gap-1">
                        {/* Star Button */}
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
          ) : searchQuery.length > 2 && !loading ? (
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
          ) : null}
        </div>
      )}
    </div>
  );
};

export default ModernPlaceSearch;
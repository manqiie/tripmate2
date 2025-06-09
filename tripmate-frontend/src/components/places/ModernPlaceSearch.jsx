// src/components/places/ModernPlaceSearch.jsx - Complete Enhanced Version
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
    console.log('🔍 Enhanced search for:', searchQuery);
    console.log('📍 Search location:', location);
    
    setLoading(true);
    setError('');

    try {
      if (!window.google?.maps?.places) {
        throw new Error('Google Maps Places not loaded');
      }

      // Validate location data
      if (!location || typeof location.lat !== 'number' || typeof location.lng !== 'number') {
        throw new Error(`Invalid location data: ${JSON.stringify(location)}`);
      }

      if (location.lat === 0 && location.lng === 0) {
        throw new Error('Location coordinates are (0,0) - geocoding may have failed');
      }

      // Create service
      const service = new window.google.maps.places.PlacesService(
        document.createElement('div')
      );

      console.log('🔍 Starting searches with valid location:', location);

      // Enhanced search strategy - try multiple approaches with timeout
      const searchPromises = [];

      // 1. Text search for name-based queries (like "Marina Bay Sands")
      searchPromises.push(
        Promise.race([
          performTextSearch(service, searchQuery, location),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Text search timeout')), 10000)
          )
        ])
      );

      // 2. Nearby search for type-based queries (like "restaurant", "hotel")
      searchPromises.push(
        Promise.race([
          performNearbySearch(service, searchQuery, location),
          new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Nearby search timeout')), 10000)
          )
        ])
      );

      // Execute both searches
      const results = await Promise.allSettled(searchPromises);
      
      console.log('🔍 Search results:', results);

      // Combine and deduplicate results
      let allResults = [];
      results.forEach((result, index) => {
        if (result.status === 'fulfilled' && result.value) {
          console.log(`✅ Search ${index + 1} success:`, result.value.length, 'places');
          allResults = allResults.concat(result.value);
        } else if (result.status === 'rejected') {
          console.warn(`❌ Search ${index + 1} failed:`, result.reason);
        }
      });

      // Remove duplicates based on place_id
      const uniqueResults = [];
      const seenIds = new Set();
      
      allResults.forEach(place => {
        if (!seenIds.has(place.id)) {
          seenIds.add(place.id);
          uniqueResults.push(place);
        }
      });

      // Sort by relevance (rating, then distance)
      uniqueResults.sort((a, b) => {
        // Prioritize higher ratings
        if (a.rating !== b.rating) {
          return (b.rating || 0) - (a.rating || 0);
        }
        // Then by total reviews
        return (b.userRatingsTotal || 0) - (a.userRatingsTotal || 0);
      });

      console.log('✅ Final enhanced search results:', uniqueResults.length, 'places');
      setSearchResults(uniqueResults.slice(0, 10)); // Limit to top 10
      setShowDropdown(true);

      // If no results, provide helpful message
      if (uniqueResults.length === 0) {
        setError(`No places found near this location. Try different search terms.`);
      }

    } catch (err) {
      console.error('❌ Enhanced search error:', err);
      setError(`Search error: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Text search for name-based queries
  const performTextSearch = (service, query, location) => {
    return new Promise((resolve) => {
      console.log('🔍 Text search for:', query, 'at location:', location);
      
      const request = {
        query: `${query} near ${location.lat},${location.lng}`,
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 15000
      };

      console.log('📋 Text search request:', request);

      service.textSearch(request, (results, status) => {
        console.log('📋 Text search response - Status:', status, 'Results:', results?.length || 0);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.slice(0, 8).map(place => {
            try {
              return formatPlace(place);
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);
          
          console.log('✅ Text search formatted results:', formattedResults.length);
          resolve(formattedResults);
        } else {
          console.warn('❌ Text search failed or no results - Status:', status);
          resolve([]);
        }
      });
    });
  };

  // Nearby search for type-based queries
  const performNearbySearch = (service, query, location) => {
    return new Promise((resolve) => {
      console.log('🔍 Nearby search for:', query, 'at location:', location);
      
      // Determine search type based on query
      const searchType = getSearchType(query);
      console.log('🏷️ Detected search type:', searchType);
      
      const request = {
        location: new window.google.maps.LatLng(location.lat, location.lng),
        radius: 10000,
        keyword: query,
        type: searchType ? [searchType] : undefined
      };

      console.log('📋 Nearby search request:', request);

      service.nearbySearch(request, (results, status) => {
        console.log('📋 Nearby search response - Status:', status, 'Results:', results?.length || 0);
        
        if (status === window.google.maps.places.PlacesServiceStatus.OK && results) {
          const formattedResults = results.slice(0, 8).map(place => {
            try {
              return formatPlace(place);
            } catch (formatError) {
              console.error('Error formatting place:', formatError);
              return null;
            }
          }).filter(Boolean);
          
          console.log('✅ Nearby search formatted results:', formattedResults.length);
          resolve(formattedResults);
        } else {
          console.warn('❌ Nearby search failed or no results - Status:', status);
          resolve([]);
        }
      });
    });
  };

  // Determine search type based on query keywords
  const getSearchType = (query) => {
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
    
    // Transportation
    if (lowerQuery.includes('gas') || lowerQuery.includes('fuel') ||
        lowerQuery.includes('petrol') || lowerQuery.includes('station')) {
      return 'gas_station';
    }
    
    // Health
    if (lowerQuery.includes('hospital') || lowerQuery.includes('clinic') ||
        lowerQuery.includes('pharmacy') || lowerQuery.includes('medical')) {
      return 'hospital';
    }
    
    // Return null for name-based searches
    return null;
  };

  // Format place data consistently
  const formatPlace = (place) => {
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
      priceLevel: place.price_level,
      phone: place.formatted_phone_number,
      website: place.website
    };
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
      pharmacy: '💊',
      night_club: '🎭',
      movie_theater: '🎬',
      zoo: '🦁',
      aquarium: '🐠',
      art_gallery: '🎨',
      spa: '🧘',
      casino: '🎰',
      bowling_alley: '🎳',
      amusement_park: '🎢',
      stadium: '🏟️',
      library: '📚',
      post_office: '📮',
      police: '👮',
      fire_station: '🚒',
      embassy: '🏛️',
      courthouse: '⚖️',
      city_hall: '🏛️',
      subway_station: '🚇',
      train_station: '🚂',
      bus_station: '🚌',
      airport: '✈️',
      taxi_stand: '🚕',
      car_rental: '🚗',
      parking: '🅿️',
      bicycle_store: '🚲',
      hardware_store: '🔨',
      electronics_store: '📱',
      book_store: '📚',
      clothing_store: '👕',
      shoe_store: '👟',
      jewelry_store: '💎',
      florist: '🌸',
      pet_store: '🐕',
      real_estate_agency: '🏠',
      insurance_agency: '🛡️',
      travel_agency: '🧳',
      lawyer: '⚖️',
      accounting: '📊',
      dentist: '🦷',
      veterinary_care: '🐾',
      hair_care: '💇',
      laundry: '🧺',
      locksmith: '🔑',
      plumber: '🔧',
      electrician: '⚡',
      painter: '🎨',
      moving_company: '📦',
      storage: '📦',
      funeral_home: '⚱️',
      cemetery: '🪦'
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
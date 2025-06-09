// src/components/places/FavoritesManager.jsx - Manage favorite places
import React from 'react';
import { Star, MapPin, Trash2, ExternalLink, Phone, Globe } from 'lucide-react';

const FavoritesManager = ({ favorites, onRemoveFavorite, onPlaceSelect }) => {
  if (favorites.length === 0) {
    return (
      <div className="text-center py-8 text-gray-500">
        <Star className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm">No favorite places yet</p>
        <p className="text-xs text-gray-400">Search and star places to save them here</p>
      </div>
    );
  }

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

  const getPlaceIcon = (types) => {
    if (!types || types.length === 0) return '📍';
    
    const type = types[0];
    const iconMap = {
      restaurant: '🍽️',
      tourist_attraction: '🎯',
      lodging: '🏨',
      shopping_mall: '🛍️',
      gas_station: '⛽',
      hospital: '🏥',
      bank: '🏦',
      park: '🌳',
      museum: '🏛️',
      church: '⛪',
      school: '🏫'
    };
    
    return iconMap[type] || '📍';
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-800">
          Favorite Places ({favorites.length})
        </h4>
      </div>
      
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {favorites.map((place) => (
          <div
            key={place.id}
            className="group bg-white border border-gray-200 rounded-lg p-3 hover:shadow-md transition-all"
          >
            <div className="flex items-start gap-3">
              {/* Place Icon */}
              <div className="text-2xl flex-shrink-0 mt-1">
                {getPlaceIcon(place.types)}
              </div>
              
              {/* Place Info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <h5 className="font-medium text-gray-900 truncate">
                      {place.name}
                    </h5>
                    <p className="text-sm text-gray-600 truncate">
                      {place.address}
                    </p>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => onPlaceSelect(place)}
                      className="p-1 text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="View on map"
                    >
                      <MapPin className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onRemoveFavorite(place)}
                      className="p-1 text-red-600 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="Remove from favorites"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
                
                {/* Rating and Type */}
                <div className="mt-2 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    {renderRating(place.rating, place.userRatingsTotal)}
                    {place.types && place.types.length > 0 && (
                      <span className="text-xs text-blue-600 bg-blue-50 px-2 py-1 rounded">
                        {place.types[0].replace(/_/g, ' ')}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Contact Info */}
                {(place.phone || place.website) && (
                  <div className="mt-2 flex items-center gap-3 text-xs text-gray-500">
                    {place.phone && (
                      <div className="flex items-center gap-1">
                        <Phone className="w-3 h-3" />
                        <span>{place.phone}</span>
                      </div>
                    )}
                    {place.website && (
                      <a
                        href={place.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-blue-600 hover:text-blue-700"
                      >
                        <Globe className="w-3 h-3" />
                        <span>Website</span>
                        <ExternalLink className="w-2 h-2" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default FavoritesManager;
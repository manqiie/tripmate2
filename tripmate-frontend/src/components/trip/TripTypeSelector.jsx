import React, { useState } from 'react';
import { 
  BookOpen, Building, MapPin, Users, Heart, Palette, 
  Backpack, Crown, Car, UserCheck, ChevronRight, Info
} from 'lucide-react';

const TripTypeSelector = ({ value, onChange, onPreview }) => {
  const [showDetails, setShowDetails] = useState(false);
  const [selectedForDetails, setSelectedForDetails] = useState(null);

  const tripTypes = [
    {
      value: 'leisure',
      label: 'Leisure/Vacation',
      icon: BookOpen,
      color: 'blue',
      description: 'Relaxing vacation, sightseeing, and leisure activities',
      features: ['Standard travel documentation', 'Accommodation booking', 'Activity planning', 'Relaxation essentials'],
      examples: 'Beach vacation, city breaks, resort stays'
    },
    {
      value: 'business',
      label: 'Business Trip',
      icon: Building,
      color: 'gray',
      description: 'Professional travel for meetings, conferences, or work',
      features: ['Business documentation', 'Professional attire', 'Meeting preparation', 'Expense tracking'],
      examples: 'Conferences, client meetings, training'
    },
    {
      value: 'adventure',
      label: 'Adventure/Outdoor',
      icon: MapPin,
      color: 'green',
      description: 'Outdoor activities, hiking, and adventure sports',
      features: ['Specialized gear', 'Safety equipment', 'Weather planning', 'Emergency preparation'],
      examples: 'Hiking, camping, mountain climbing, skiing'
    },
    {
      value: 'family',
      label: 'Family Trip',
      icon: Users,
      color: 'orange',
      description: 'Travel with children and extended family members',
      features: ['Family documentation', 'Child-friendly planning', 'Entertainment for kids', 'Safety for families'],
      examples: 'Family vacations, visiting relatives, theme parks'
    },
    {
      value: 'romantic',
      label: 'Romantic Getaway',
      icon: Heart,
      color: 'pink',
      description: 'Couples travel for special occasions and romance',
      features: ['Special reservations', 'Romantic activities', 'Photography planning', 'Surprise elements'],
      examples: 'Honeymoon, anniversary, date trips'
    },
    {
      value: 'cultural',
      label: 'Cultural/Historical',
      icon: Palette,
      color: 'purple',
      description: 'Museums, historical sites, and cultural experiences',
      features: ['Cultural research', 'Appropriate attire', 'Language preparation', 'Educational planning'],
      examples: 'Museum tours, historical sites, cultural festivals'
    },
    {
      value: 'backpacking',
      label: 'Backpacking',
      icon: Backpack,
      color: 'emerald',
      description: 'Budget travel with minimal luggage and flexibility',
      features: ['Lightweight packing', 'Budget planning', 'Hostel booking', 'Extended travel preparation'],
      examples: 'Gap year travel, budget exploration, extended trips'
    },
    {
      value: 'luxury',
      label: 'Luxury Travel',
      icon: Crown,
      color: 'yellow',
      description: 'Premium experiences with high-end accommodations',
      features: ['Premium bookings', 'Concierge services', 'Luxury items', 'Exclusive experiences'],
      examples: 'Five-star resorts, private tours, luxury cruises'
    },
    {
      value: 'road_trip',
      label: 'Road Trip',
      icon: Car,
      color: 'red',
      description: 'Self-drive adventures and scenic routes',
      features: ['Vehicle preparation', 'Route planning', 'Road safety', 'Entertainment for journey'],
      examples: 'Cross-country drives, scenic routes, car camping'
    },
    {
      value: 'group',
      label: 'Group Travel',
      icon: UserCheck,
      color: 'indigo',
      description: 'Coordinated travel with friends or organized groups',
      features: ['Group coordination', 'Shared bookings', 'Activity planning', 'Communication tools'],
      examples: 'Friend trips, tour groups, team building'
    }
  ];

  const selectedType = tripTypes.find(type => type.value === value);

  const handleSelect = (typeValue) => {
    onChange(typeValue);
  };

  const handlePreview = (type) => {
    setSelectedForDetails(type);
    setShowDetails(true);
    if (onPreview) {
      onPreview(type);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-3">
          Select Trip Type
        </label>
        <p className="text-sm text-gray-500 mb-4">
          Choose the type of trip to get a personalized checklist with relevant items for your journey.
        </p>
      </div>

      {/* Trip Type Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
        {tripTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = value === type.value;
          
          return (
            <div
              key={type.value}
              className={`relative group cursor-pointer rounded-lg border-2 p-4 transition-all ${
                isSelected
                  ? `border-${type.color}-500 bg-${type.color}-50`
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
              onClick={() => handleSelect(type.value)}
            >
              <div className="flex items-start gap-3">
                <Icon className={`w-6 h-6 flex-shrink-0 ${
                  isSelected ? `text-${type.color}-600` : 'text-gray-400'
                }`} />
                
                <div className="flex-1 min-w-0">
                  <h3 className={`font-medium text-sm ${
                    isSelected ? `text-${type.color}-900` : 'text-gray-900'
                  }`}>
                    {type.label}
                  </h3>
                  <p className={`text-xs mt-1 ${
                    isSelected ? `text-${type.color}-700` : 'text-gray-500'
                  }`}>
                    {type.description}
                  </p>
                </div>

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePreview(type);
                  }}
                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-200 rounded"
                  title="Preview checklist"
                >
                  <Info className="w-4 h-4 text-gray-400" />
                </button>
              </div>

              {/* Selection indicator */}
              {isSelected && (
                <div className={`absolute -top-1 -right-1 w-6 h-6 bg-${type.color}-500 rounded-full flex items-center justify-center`}>
                  <ChevronRight className="w-4 h-4 text-white rotate-90" />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Selected Type Summary */}
      {selectedType && (
        <div className={`mt-6 p-4 bg-${selectedType.color}-50 border border-${selectedType.color}-200 rounded-lg`}>
          <div className="flex items-start gap-3">
            <selectedType.icon className={`w-6 h-6 text-${selectedType.color}-600 flex-shrink-0`} />
            <div>
              <h4 className={`font-semibold text-${selectedType.color}-900`}>
                {selectedType.label} Selected
              </h4>
              <p className={`text-sm text-${selectedType.color}-700 mt-1`}>
                {selectedType.description}
              </p>
              <div className="mt-3">
                <h5 className={`text-sm font-medium text-${selectedType.color}-800 mb-2`}>
                  Your checklist will include:
                </h5>
                <ul className="grid grid-cols-2 gap-1">
                  {selectedType.features.map((feature, index) => (
                    <li key={index} className={`text-xs text-${selectedType.color}-700 flex items-center gap-1`}>
                      <span className="w-1 h-1 bg-current rounded-full flex-shrink-0"></span>
                      {feature}
                    </li>
                  ))}
                </ul>
              </div>
              <p className={`text-xs text-${selectedType.color}-600 mt-2`}>
                <strong>Examples:</strong> {selectedType.examples}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Details Modal */}
      {showDetails && selectedForDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full max-h-96 overflow-y-auto">
            <div className="p-6">
              <div className="flex items-start gap-3 mb-4">
                <selectedForDetails.icon className={`w-8 h-8 text-${selectedForDetails.color}-600`} />
                <div>
                  <h3 className="text-xl font-bold text-gray-900">
                    {selectedForDetails.label}
                  </h3>
                  <p className="text-gray-600 mt-1">
                    {selectedForDetails.description}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Checklist Features</h4>
                  <ul className="space-y-2">
                    {selectedForDetails.features.map((feature, index) => (
                      <li key={index} className="flex items-center gap-2 text-sm text-gray-700">
                        <div className={`w-2 h-2 bg-${selectedForDetails.color}-500 rounded-full flex-shrink-0`}></div>
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Perfect For</h4>
                  <p className="text-sm text-gray-700">{selectedForDetails.examples}</p>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    handleSelect(selectedForDetails.value);
                    setShowDetails(false);
                  }}
                  className={`flex-1 px-4 py-2 bg-${selectedForDetails.color}-600 text-white rounded-lg hover:bg-${selectedForDetails.color}-700 transition-colors`}
                >
                  Select This Type
                </button>
                <button
                  onClick={() => setShowDetails(false)}
                  className="px-4 py-2 bg-gray-200 text-gray-800 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TripTypeSelector;
// src/pages/HomePage.jsx
import React, { useState } from 'react';
import { MapPin, Route, Camera, MessageCircle, Calendar, Users, ChevronDown } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { user } = useAuth();
  const [tripData, setTripData] = useState({

    duration: '7',
    travelers: '2'
  });

  const [showDateDropdown, setShowDateDropdown] = useState(false);
  const [showTravelersDropdown, setShowTravelersDropdown] = useState(false);

  const handleInputChange = (e) => {
    setTripData({
      ...tripData,
      [e.target.name]: e.target.value
    });
  };

  const handlePlanTrip = () => {
    console.log('Planning trip:', tripData);
    // Handle trip planning logic here
  };

  const features = [
    {
      icon: Route,
      title: 'Smart Route Planning',
      description: 'Our AI optimizes your travel route to minimize distance and maximize your experience'
    },
    {
      icon: MapPin,
      title: 'Interactive Maps',
      description: 'Visualize your entire trip on Google Maps with all your destinations marked'
    },
    {
      icon: Camera,
      title: 'Photo Memories',
      description: 'Upload and geotag photos to create a beautiful visual story of your journey'
    },
    {
      icon: MessageCircle,
      title: 'AI Travel Assistant',
      description: 'Ask questions about any destination and get instant, helpful answers'
    }
  ];

  return (
    <div className="space-y-16">
      {/* Hero Section */}
      <section className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          YOUR ULTIMATE TRIP PLANNER
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Plan & book your dream trip
        </p>
        
        {/* Trip Planning Form */}
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-lg p-2">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {/* Start Location */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-600 text-left mb-1 ml-4">
                Start at:
              </label>
              <input
                type="text"
                name="startLocation"
                value={tripData.startLocation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-gray-900 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter starting location"
              />
            </div>

            {/* End Location */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-600 text-left mb-1 ml-4">
                End at:
              </label>
              <input
                type="text"
                name="endLocation"
                value={tripData.endLocation}
                onChange={handleInputChange}
                className="w-full px-4 py-3 text-gray-900 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Enter destination"
              />
            </div>

            {/* Dates/Duration */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-600 text-left mb-1 ml-4">
                Dates / Duration
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowDateDropdown(!showDateDropdown)}
                  className="w-full px-4 py-3 text-gray-900 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                >
                  <span>{tripData.duration} days</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showDateDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                    {['3', '5', '7', '10', '14', '21', '30'].map((days) => (
                      <button
                        key={days}
                        onClick={() => {
                          setTripData({ ...tripData, duration: days });
                          setShowDateDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        {days} days
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Travelers */}
            <div className="relative">
              <label className="block text-sm font-medium text-gray-600 text-left mb-1 ml-4">
                Travelers:
              </label>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowTravelersDropdown(!showTravelersDropdown)}
                  className="w-full px-4 py-3 text-gray-900 bg-white border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
                >
                  <span>Adults: {tripData.travelers}</span>
                  <ChevronDown className="w-4 h-4" />
                </button>
                {showTravelersDropdown && (
                  <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-10 mt-1">
                    {['1', '2', '3', '4', '5', '6+'].map((count) => (
                      <button
                        key={count}
                        onClick={() => {
                          setTripData({ ...tripData, travelers: count });
                          setShowTravelersDropdown(false);
                        }}
                        className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                      >
                        Adults: {count}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Start Planning Button */}
            <div className="flex items-end">
              <button
                onClick={handlePlanTrip}
                className="w-full bg-slate-700 text-white py-3 px-6 rounded-lg hover:bg-slate-800 transition-colors font-medium"
              >
                Start Planning
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section>
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Everything You Need for the Perfect Trip
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="bg-white p-6 rounded-xl shadow-md hover:shadow-xl transition-shadow">
              <feature.icon className="w-12 h-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 bg-gray-900 text-white rounded-2xl">
        <h2 className="text-4xl font-bold mb-4">Ready for Your Next Adventure?</h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of travelers who plan smarter with TripMate
        </p>
        {!user && (
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-lg font-medium"
          >
            Sign Up Now
          </Link>
        )}
      </section>
    </div>
  );
};

export default HomePage;
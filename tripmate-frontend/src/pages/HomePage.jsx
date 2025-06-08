// src/pages/HomePage.jsx - Updated with debug component
import React, { useState } from 'react';
import { MapPin, Route, Camera, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TripPlanner from '../components/trip/TripPlanner';

// Import the debug components
import GoogleMap from '../components/maps/GoogleMap';
import googleMapsService from '../services/googleMaps';
import FlightRouteDebug from '../components/debug/FlightRouteDebug';

// Debug component (temporary)
const SimpleFlightTest = () => {
  const [routeResult, setRouteResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const testRoute = async () => {
    setLoading(true);
    try {
      const result = await googleMapsService.calculateOptimizedRoute(
        'Malaysia',
        'Japan',
        []
      );
      console.log('🧪 Test result:', result);
      setRouteResult(result);
    } catch (error) {
      console.error('❌ Test failed:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <FlightRouteDebug />
      
      <div className="bg-white rounded-xl shadow-lg p-6">
        <h3 className="text-xl font-bold mb-4">Flight Route Visual Test</h3>
        
        <button
          onClick={testRoute}
          disabled={loading}
          className="mb-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400"
        >
          {loading ? 'Testing...' : 'Test Malaysia → Japan Flight'}
        </button>

        {routeResult && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg">
            <div className="text-blue-800">
              <p>Route Type: {routeResult.routeType}</p>
              <p>Is Flight: {routeResult.isFlightRoute ? 'Yes' : 'No'}</p>
              <p>Has Route Data: {routeResult.route ? 'Yes' : 'No'}</p>
            </div>
          </div>
        )}

        <GoogleMap
          route={routeResult?.route}
          routeInfo={routeResult}
          className="w-full h-96 rounded-lg"
        />
      </div>
    </div>
  );
};

const HomePage = () => {
  const { user } = useAuth();
  const [showTripPlanner, setShowTripPlanner] = useState(false);
  const [showDebug, setShowDebug] = useState(false); // Add debug toggle

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

  // Show debug component if enabled
  if (showDebug) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowDebug(false)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
          <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">
            🧪 Debug Mode
          </div>
        </div>
        <SimpleFlightTest />
      </div>
    );
  }

  if (showTripPlanner) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowTripPlanner(false)}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            ← Back to Home
          </button>
        </div>
        <TripPlanner />
      </div>
    );
  }

  return (
    <div className="space-y-16">
      {/* Debug Button (temporary) */}
      <div className="fixed top-20 right-4 z-50">
        <button
          onClick={() => setShowDebug(true)}
          className="bg-yellow-500 text-white px-3 py-2 rounded-lg shadow-lg hover:bg-yellow-600 text-sm font-medium"
        >
          🧪 Debug Flight Routes
        </button>
      </div>

      {/* Hero Section */}
      <section className="text-center py-16 bg-gradient-to-br from-blue-50 to-indigo-100 rounded-2xl">
        <h1 className="text-5xl font-bold text-gray-900 mb-4">
          YOUR ULTIMATE TRIP PLANNER
        </h1>
        <p className="text-xl text-gray-600 mb-12 max-w-2xl mx-auto">
          Plan & book your dream trip with optimized routes and Google Maps integration
        </p>
        
        <div className="space-y-4">
          <button
            onClick={() => setShowTripPlanner(true)}
            className="px-8 py-4 bg-blue-600 text-white text-lg font-medium rounded-lg hover:bg-blue-700 transition-colors shadow-lg hover:shadow-xl"
          >
            Start Planning Your Trip
          </button>
          
          {user && (
            <div>
              <Link 
                to="/saved-trips" 
                className="inline-flex items-center gap-2 px-6 py-3 bg-white text-blue-600 border border-blue-600 rounded-lg hover:bg-blue-50 transition-colors"
              >
                <MapPin className="w-5 h-5" />
                View Saved Trips
              </Link>
            </div>
          )}
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

      {/* How It Works */}
      <section className="bg-gray-50 rounded-2xl p-8">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          How TripMate Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              1
            </div>
            <h3 className="text-xl font-semibold mb-2">Enter Your Destinations</h3>
            <p className="text-gray-600">Add your starting point, destination, and any waypoints you want to visit</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              2
            </div>
            <h3 className="text-xl font-semibold mb-2">Get Optimized Route</h3>
            <p className="text-gray-600">Our system calculates the best route to minimize travel time and distance</p>
          </div>
          <div className="text-center">
            <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-2xl font-bold mx-auto mb-4">
              3
            </div>
            <h3 className="text-xl font-semibold mb-2">Save & Share</h3>
            <p className="text-gray-600">Save your trip plans and access them anytime, anywhere</p>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="text-center py-16 bg-gray-900 text-white rounded-2xl">
        <h2 className="text-4xl font-bold mb-4">Ready for Your Next Adventure?</h2>
        <p className="text-xl mb-8 opacity-90">
          Join thousands of travelers who plan smarter with TripMate
        </p>
        {!user ? (
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-lg font-medium"
          >
            Sign Up Now
          </Link>
        ) : (
          <button
            onClick={() => setShowTripPlanner(true)}
            className="inline-flex items-center gap-2 px-8 py-4 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors text-lg font-medium"
          >
            <Route className="w-5 h-5" />
            Plan Your Next Trip
          </button>
        )}
      </section>
    </div>
  );
};

export default HomePage;
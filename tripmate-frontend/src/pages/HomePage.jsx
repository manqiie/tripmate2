// src/pages/HomePage.jsx
import React from 'react';
import { MapPin, Route, Camera, MessageCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const HomePage = () => {
  const { user } = useAuth();

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
          Plan Your Perfect Trip with TripMate
        </h1>
        <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
          Create optimized travel routes, capture memories, and explore destinations 
          with our intelligent trip planning platform
        </p>
        {user ? (
          <Link 
            to="/trips/new" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-lg"
          >
            <MapPin className="w-6 h-6" />
            Start Planning
          </Link>
        ) : (
          <Link 
            to="/auth" 
            className="inline-flex items-center gap-2 px-8 py-4 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-lg font-medium shadow-lg"
          >
            Get Started Free
          </Link>
        )}
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

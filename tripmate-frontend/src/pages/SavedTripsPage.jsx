// src/pages/SavedTripsPage.jsx - Fixed version
import React from 'react';
import { Navigate } from 'react-router-dom';
import SavedTrips from '../components/trip/SavedTrips';
import { useAuth } from '../contexts/AuthContext';

const SavedTripsPage = () => {
  const { user, loading } = useAuth();

  // Show loading while auth context is initializing
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Checking authentication...</p>
        </div>
      </div>
    );
  }

  // Only redirect after auth context has loaded and confirmed no user
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <SavedTrips />;
};

export default SavedTripsPage;
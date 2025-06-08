// src/pages/SavedTripsPage.jsx
import React from 'react';
// import { Navigate } from 'react-router-dom';
import SavedTrips from '../components/trip/SavedTrips';
import { useAuth } from '../contexts/AuthContext';

const SavedTripsPage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    window.location.href = '/auth';
    return null;
  }

  return <SavedTrips />;
};

export default SavedTripsPage;
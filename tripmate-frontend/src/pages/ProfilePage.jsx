// src/pages/ProfilePage.jsx
import React from 'react';
import { Navigate } from 'react-router-dom';
import ProfileForm from '../components/auth/ProfileForm';
import { useAuth } from '../contexts/AuthContext';

const ProfilePage = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="text-gray-600">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return (
    <div className="max-w-4xl mx-auto">
      <ProfileForm />
    </div>
  );
};

export default ProfilePage;

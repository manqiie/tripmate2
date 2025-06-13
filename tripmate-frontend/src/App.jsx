// src/App.jsx - Updated with Place Q&A route
import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Layout from './components/layout/Layout';
import HomePage from './pages/HomePage';
import AuthPage from './pages/AuthPage';
import ProfilePage from './pages/ProfilePage';
import SavedTripsPage from './pages/SavedTripsPage';
import TripDetailPage from './pages/TripDetailPage';
import TripEditPage from './pages/TripEditPage';
import PlaceQNAPage from './pages/PlaceQNAPage'; // NEW

function App() {
  return (
    <Router>
      <AuthProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/auth" element={<AuthPage />} />
            <Route path="/profile" element={<ProfilePage />} />
            <Route path="/saved-trips" element={<SavedTripsPage />} />
            <Route path="/trip/:id" element={<TripDetailPage />} />
            <Route path="/trip/:id/edit" element={<TripEditPage />} />
            <Route path="/place-qna" element={<PlaceQNAPage />} /> {/* NEW */}
          </Routes>
        </Layout>
      </AuthProvider>
    </Router>
  );
}

export default App;
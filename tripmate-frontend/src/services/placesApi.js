// src/services/placesApi.js - API service for trip places
import api from './api';

export const placesApi = {
  // Get all saved places for a trip
  getTripPlaces: async (tripId, stopIndex = null) => {
    const params = stopIndex !== null ? { stop_index: stopIndex } : {};
    const response = await api.get(`/trips/${tripId}/places/`, { params });
    return response.data;
  },

  // Save a single place to a trip
  savePlaceToTrip: async (tripId, placeData) => {
    const response = await api.post(`/trips/${tripId}/places/`, placeData);
    return response.data;
  },

  // Update place details (user notes, visited status, etc.)
  updateTripPlace: async (tripId, placeId, updateData) => {
    const response = await api.put(`/trips/${tripId}/places/${placeId}/`, updateData);
    return response.data;
  },

  // Remove place from trip
  removePlaceFromTrip: async (tripId, placeId) => {
    const response = await api.delete(`/trips/${tripId}/places/${placeId}/`);
    return response.data;
  },

  // Get map data for all places in a trip
  getTripPlacesMapData: async (tripId) => {
    const response = await api.get(`/trips/${tripId}/places/map-data/`);
    return response.data;
  },

  // Bulk save multiple places
  bulkSavePlaces: async (tripId, placesArray) => {
    const response = await api.post(`/trips/${tripId}/places/bulk/`, {
      places: placesArray
    });
    return response.data;
  }
};

export default placesApi;
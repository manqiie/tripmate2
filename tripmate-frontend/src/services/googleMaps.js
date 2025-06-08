// src/services/googleMaps.js
const GOOGLE_MAPS_API_KEY = 'AIzaSyCvEVHX8NeeHlZlFt1yzw8iwJC-WfjjaKA';

class GoogleMapsService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
  }

  // Load Google Maps API
  loadGoogleMaps() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Get route between two locations
  async getRoute(startLocation, endLocation, waypoints = []) {
    await this.loadGoogleMaps();

    return new Promise((resolve, reject) => {
      const directionsService = new window.google.maps.DirectionsService();

      const waypointObjects = waypoints.map(waypoint => ({
        location: waypoint,
        stopover: true
      }));

      directionsService.route({
        origin: startLocation,
        destination: endLocation,
        waypoints: waypointObjects,
        optimizeWaypoints: true,
        travelMode: window.google.maps.TravelMode.DRIVING,
      }, (result, status) => {
        if (status === 'OK') {
          resolve(result);
        } else {
          reject(new Error(`Directions request failed: ${status}`));
        }
      });
    });
  }

  // Geocode address to get coordinates
  async geocodeAddress(address) {
    await this.loadGoogleMaps();

    return new Promise((resolve, reject) => {
      const geocoder = new window.google.maps.Geocoder();
      
      geocoder.geocode({ address }, (results, status) => {
        if (status === 'OK' && results[0]) {
          resolve({
            lat: results[0].geometry.location.lat(),
            lng: results[0].geometry.location.lng(),
            formatted_address: results[0].formatted_address
          });
        } else {
          reject(new Error(`Geocoding failed: ${status}`));
        }
      });
    });
  }

  // Calculate optimized route for multiple destinations
  async calculateOptimizedRoute(startLocation, endLocation, waypoints = []) {
    try {
      const route = await this.getRoute(startLocation, endLocation, waypoints);
      
      // Extract useful information from the route
      const legs = route.routes[0].legs;
      const totalDistance = legs.reduce((total, leg) => total + leg.distance.value, 0);
      const totalDuration = legs.reduce((total, leg) => total + leg.duration.value, 0);
      
      // Get optimized waypoint order
      const optimizedOrder = route.routes[0].waypoint_order || [];
      const optimizedWaypoints = optimizedOrder.map(index => waypoints[index]);

      return {
        route,
        totalDistance: Math.round(totalDistance / 1000), // Convert to km
        totalDuration: Math.round(totalDuration / 60), // Convert to minutes
        optimizedWaypoints,
        waypoint_order: optimizedOrder
      };
    } catch (error) {
      throw new Error(`Route calculation failed: ${error.message}`);
    }
  }
}

export default new GoogleMapsService();
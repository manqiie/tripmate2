// src/services/googleMaps.js - Secure version with proper route optimization
class GoogleMapsService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
    // Get API key from environment variable
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
  }

  // Load Google Maps API
  loadGoogleMaps() {
    if (this.isLoaded) {
      return Promise.resolve();
    }

    if (this.loadPromise) {
      return this.loadPromise;
    }

    if (!this.apiKey) {
      return Promise.reject(new Error('Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file'));
    }

    this.loadPromise = new Promise((resolve, reject) => {
      if (window.google && window.google.maps) {
        this.isLoaded = true;
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=places`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        this.isLoaded = true;
        resolve();
      };
      
      script.onerror = () => {
        reject(new Error('Failed to load Google Maps API. Check your API key and internet connection.'));
      };

      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Get optimized route between locations
  async getOptimizedRoute(startLocation, endLocation, waypoints = []) {
    await this.loadGoogleMaps();

    return new Promise((resolve, reject) => {
      const directionsService = new window.google.maps.DirectionsService();

      // Prepare waypoints for optimization
      const waypointObjects = waypoints
        .filter(waypoint => waypoint && waypoint.trim() !== '')
        .map(waypoint => ({
          location: waypoint.trim(),
          stopover: true
        }));

      console.log('Calculating route with:', {
        origin: startLocation,
        destination: endLocation,
        waypoints: waypointObjects,
        optimizeWaypoints: waypointObjects.length > 0
      });

      const request = {
        origin: startLocation,
        destination: endLocation,
        waypoints: waypointObjects,
        optimizeWaypoints: waypointObjects.length > 0, // Only optimize if there are waypoints
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          console.log('Route calculated successfully:', result);
          resolve(result);
        } else {
          console.error('Directions request failed:', status);
          let errorMessage = 'Failed to calculate route';
          
          switch (status) {
            case 'NOT_FOUND':
              errorMessage = 'One or more locations could not be found. Please check your addresses.';
              break;
            case 'ZERO_RESULTS':
              errorMessage = 'No route could be found between these locations.';
              break;
            case 'MAX_WAYPOINTS_EXCEEDED':
              errorMessage = 'Too many waypoints. Maximum 23 waypoints allowed.';
              break;
            case 'MAX_ROUTE_LENGTH_EXCEEDED':
              errorMessage = 'Route is too long and cannot be processed.';
              break;
            case 'INVALID_REQUEST':
              errorMessage = 'Invalid request. Please check your locations.';
              break;
            case 'OVER_QUERY_LIMIT':
              errorMessage = 'API quota exceeded. Please try again later.';
              break;
            case 'REQUEST_DENIED':
              errorMessage = 'Request denied. Please check your API key restrictions.';
              break;
            case 'UNKNOWN_ERROR':
              errorMessage = 'Unknown error occurred. Please try again.';
              break;
            default:
              errorMessage = `Directions request failed with status: ${status}`;
          }
          
          reject(new Error(errorMessage));
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

  // Calculate optimized route with detailed information
  async calculateOptimizedRoute(startLocation, endLocation, waypoints = []) {
    try {
      console.log('Starting route calculation...');
      
      if (!startLocation || !endLocation) {
        throw new Error('Start and end locations are required');
      }

      const route = await this.getOptimizedRoute(startLocation, endLocation, waypoints);
      
      if (!route || !route.routes || !route.routes[0]) {
        throw new Error('No route found');
      }

      const routeData = route.routes[0];
      const legs = routeData.legs;
      
      // Calculate totals
      const totalDistance = legs.reduce((total, leg) => total + leg.distance.value, 0);
      const totalDuration = legs.reduce((total, leg) => total + leg.duration.value, 0);
      
      // Get optimized waypoint order
      const optimizedOrder = routeData.waypoint_order || [];
      const optimizedWaypoints = optimizedOrder.map(index => waypoints[index]).filter(Boolean);

      // Extract route coordinates for display
      const coordinates = [];
      legs.forEach(leg => {
        leg.steps.forEach(step => {
          coordinates.push({
            lat: step.start_location.lat(),
            lng: step.start_location.lng()
          });
        });
      });
      
      // Add final coordinate
      if (legs.length > 0) {
        const lastLeg = legs[legs.length - 1];
        coordinates.push({
          lat: lastLeg.end_location.lat(),
          lng: lastLeg.end_location.lng()
        });
      }

      console.log('Route calculation completed:', {
        totalDistance: Math.round(totalDistance / 1000),
        totalDuration: Math.round(totalDuration / 60),
        optimizedWaypoints
      });

      return {
        route,
        totalDistance: Math.round(totalDistance / 1000), // Convert to km
        totalDuration: Math.round(totalDuration / 60), // Convert to minutes
        optimizedWaypoints,
        waypoint_order: optimizedOrder,
        coordinates,
        bounds: routeData.bounds,
        overview_path: routeData.overview_path
      };
    } catch (error) {
      console.error('Route calculation failed:', error);
      throw new Error(`Route calculation failed: ${error.message}`);
    }
  }

  // Validate API key and check restrictions
  async validateApiKey() {
    try {
      // Try to load a simple map to test the API key
      await this.loadGoogleMaps();
      
      // Create a test geocoder request
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode({ 
          address: 'Google, Mountain View, CA' 
        }, (results, status) => {
          if (status === 'OK') {
            resolve({ valid: true, message: 'API key is valid' });
          } else if (status === 'REQUEST_DENIED') {
            resolve({ 
              valid: false, 
              message: 'API key is invalid or has incorrect restrictions' 
            });
          } else {
            resolve({ 
              valid: false, 
              message: `API validation failed: ${status}` 
            });
          }
        });
      });
    } catch (error) {
      return { 
        valid: false, 
        message: `API key validation failed: ${error.message}` 
      };
    }
  }
}

export default new GoogleMapsService();
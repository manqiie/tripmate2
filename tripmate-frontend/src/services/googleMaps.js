// src/services/googleMaps.js - FIXED VERSION - Prevents multiple API loads
class GoogleMapsService {
  constructor() {
    this.isLoaded = false;
    this.loadPromise = null;
    this.apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    this.loadingStarted = false; // NEW: Track if loading has started
    
    console.log('Google Maps Service initialized');
    console.log('API Key present:', !!this.apiKey);
  }

  // Load Google Maps API - FIXED to prevent multiple loads
  loadGoogleMaps() {
    // If already loaded, return immediately
    if (this.isLoaded && window.google?.maps) {
      console.log('✅ Google Maps already loaded, returning existing instance');
      return Promise.resolve();
    }

    // If loading is in progress, return the existing promise
    if (this.loadPromise) {
      console.log('⏳ Google Maps loading in progress, waiting for existing promise');
      return this.loadPromise;
    }

    // If loading has started but promise is somehow lost, check if it's actually loaded
    if (this.loadingStarted && window.google?.maps) {
      console.log('✅ Google Maps was loaded externally, marking as ready');
      this.isLoaded = true;
      return Promise.resolve();
    }

    if (!this.apiKey) {
      const error = 'Google Maps API key not found. Please set VITE_GOOGLE_MAPS_API_KEY in your .env file';
      console.error(error);
      return Promise.reject(new Error(error));
    }

    console.log('🚀 Starting Google Maps API load...');
    this.loadingStarted = true;

    // Create and store the loading promise
    this.loadPromise = new Promise((resolve, reject) => {
      // Check if script already exists (prevents duplicate scripts)
      const existingScript = document.querySelector('script[src*="maps.googleapis.com"]');
      if (existingScript) {
        console.log('📋 Google Maps script already exists in DOM');
        
        // Wait for it to load if it hasn't yet
        if (window.google?.maps) {
          console.log('✅ Google Maps already available');
          this.isLoaded = true;
          resolve();
          return;
        } else {
          console.log('⏳ Waiting for existing script to load...');
          existingScript.onload = () => {
            if (window.google?.maps) {
              console.log('✅ Existing script loaded successfully');
              this.isLoaded = true;
              resolve();
            } else {
              reject(new Error('Google Maps script loaded but API not available'));
            }
          };
          existingScript.onerror = () => {
            reject(new Error('Existing Google Maps script failed to load'));
          };
          return;
        }
      }

      // Create new script
      const script = document.createElement('script');
      const libraries = ['places', 'geometry'].join(',');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${this.apiKey}&libraries=${libraries}&v=weekly`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        console.log('📜 Google Maps script loaded');
        if (window.google?.maps) {
          console.log('✅ Google Maps API available and ready');
          this.isLoaded = true;
          this.loadingStarted = false;
          resolve();
        } else {
          console.error('❌ Google Maps script loaded but API not accessible');
          this.loadingStarted = false;
          reject(new Error('Google Maps API loaded but not accessible'));
        }
      };
      
      script.onerror = (error) => {
        console.error('❌ Failed to load Google Maps script:', error);
        this.loadingStarted = false;
        this.loadPromise = null; // Reset so it can be retried
        reject(new Error('Failed to load Google Maps API. Check your API key and internet connection.'));
      };

      console.log('📜 Adding Google Maps script to DOM...');
      document.head.appendChild(script);
    });

    return this.loadPromise;
  }

  // Reset the service (useful for testing or error recovery)
  reset() {
    console.log('🔄 Resetting Google Maps Service');
    this.isLoaded = false;
    this.loadPromise = null;
    this.loadingStarted = false;
    
    // Remove existing scripts if needed
    const scripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
    scripts.forEach(script => {
      console.log('🗑️ Removing existing Google Maps script');
      script.remove();
    });
  }

  // Check current status
  getStatus() {
    return {
      isLoaded: this.isLoaded,
      hasPromise: !!this.loadPromise,
      loadingStarted: this.loadingStarted,
      windowGoogleExists: !!window.google,
      windowGoogleMapsExists: !!window.google?.maps,
      hasApiKey: !!this.apiKey
    };
  }

  // Rest of your methods remain the same...
  
  // Check if two locations are in different continents/countries that require flights
  async checkIfFlightRequired(startLocation, endLocation) {
    try {
      await this.loadGoogleMaps();
      
      const geocoder = new window.google.maps.Geocoder();
      
      const [startResult, endResult] = await Promise.all([
        this.geocodeAddress(startLocation),
        this.geocodeAddress(endLocation)
      ]);

      // Simple continent/country detection based on coordinates
      const startContinent = this.getContinent(startResult.lat, startResult.lng);
      const endContinent = this.getContinent(endResult.lat, endResult.lng);
      
      // Check if they're on different continents or very far apart
      const distance = this.calculateDistance(
        startResult.lat, startResult.lng,
        endResult.lat, endResult.lng
      );

      console.log('Distance check:', {
        start: startLocation,
        end: endLocation,
        startContinent,
        endContinent,
        distance: `${distance.toFixed(0)} km`,
        flightRequired: startContinent !== endContinent || distance > 3000
      });

      return {
        flightRequired: startContinent !== endContinent || distance > 3000,
        distance,
        startContinent,
        endContinent,
        startCoords: startResult,
        endCoords: endResult
      };
    } catch (error) {
      console.error('Error checking flight requirement:', error);
      return { flightRequired: false, error: error.message };
    }
  }

  // Simple continent detection based on coordinates
  getContinent(lat, lng) {
    if (lat >= -35 && lat <= 37 && lng >= -25 && lng <= 70) return 'Africa';
    if (lat >= 5 && lat <= 82 && lng >= -180 && lng <= -30) return 'North America';
    if (lat >= -60 && lat <= 15 && lng >= -90 && lng <= -30) return 'South America';
    if (lat >= -50 && lat <= 82 && lng >= -15 && lng <= 180) return 'Asia/Europe';
    if (lat >= -50 && lat <= -10 && lng >= 110 && lng <= 180) return 'Australia';
    return 'Unknown';
  }

  // Calculate distance between two points (Haversine formula)
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
              Math.sin(dLng/2) * Math.sin(dLng/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  }

  // Create a flight route (straight line) between distant locations
  async createFlightRoute(startLocation, endLocation, waypoints = []) {
    try {
      await this.loadGoogleMaps();

      // Geocode all locations
      const startCoords = await this.geocodeAddress(startLocation);
      const endCoords = await this.geocodeAddress(endLocation);
      
      // Geocode waypoints if any
      const waypointCoords = [];
      for (const waypoint of waypoints) {
        if (waypoint && waypoint.trim()) {
          try {
            const coords = await this.geocodeAddress(waypoint.trim());
            waypointCoords.push(coords);
          } catch (error) {
            console.warn(`Failed to geocode waypoint: ${waypoint}`, error);
          }
        }
      }

      // Calculate total distance and estimated flight time
      let totalDistance = 0;
      let currentPoint = startCoords;
      
      // Add waypoint distances
      for (const waypoint of waypointCoords) {
        totalDistance += this.calculateDistance(
          currentPoint.lat, currentPoint.lng,
          waypoint.lat, waypoint.lng
        );
        currentPoint = waypoint;
      }
      
      // Add final distance to destination
      totalDistance += this.calculateDistance(
        currentPoint.lat, currentPoint.lng,
        endCoords.lat, endCoords.lng
      );

      // Estimate flight time (average speed ~900 km/h for commercial flights)
      const totalDuration = Math.round((totalDistance / 900) * 60); // in minutes

      // Create a mock route structure similar to Google's DirectionsResult
      const mockRoute = {
        status: 'OK',
        routes: [{
          bounds: this.calculateBounds([startCoords, ...waypointCoords, endCoords]),
          legs: this.createFlightLegs(startCoords, waypointCoords, endCoords),
          overview_path: [startCoords, ...waypointCoords, endCoords],
          summary: 'Flight Route'
        }],
        geocoded_waypoints: [
          { geocoder_status: 'OK', place_id: 'flight_start' },
          ...waypointCoords.map(() => ({ geocoder_status: 'OK', place_id: 'flight_waypoint' })),
          { geocoder_status: 'OK', place_id: 'flight_end' }
        ]
      };

      return {
        route: mockRoute,
        totalDistance: Math.round(totalDistance),
        totalDuration,
        optimizedWaypoints: waypoints,
        waypoint_order: waypoints.map((_, index) => index),
        coordinates: [startCoords, ...waypointCoords, endCoords],
        isFlightRoute: true,
        routeType: 'flight'
      };

    } catch (error) {
      console.error('Failed to create flight route:', error);
      throw new Error(`Flight route creation failed: ${error.message}`);
    }
  }

  // Create flight legs for the mock route
  createFlightLegs(start, waypoints, end) {
    const legs = [];
    let currentPoint = start;
    const allPoints = [...waypoints, end];

    for (let i = 0; i < allPoints.length; i++) {
      const nextPoint = allPoints[i];
      const distance = this.calculateDistance(
        currentPoint.lat, currentPoint.lng,
        nextPoint.lat, nextPoint.lng
      );
      const duration = Math.round((distance / 900) * 60); // Flight time in minutes

      legs.push({
        distance: { text: `${Math.round(distance)} km`, value: distance * 1000 },
        duration: { text: `${Math.floor(duration / 60)}h ${duration % 60}m`, value: duration * 60 },
        start_address: currentPoint.formatted_address || 'Flight Origin',
        end_address: nextPoint.formatted_address || 'Flight Destination',
        start_location: { lat: () => currentPoint.lat, lng: () => currentPoint.lng },
        end_location: { lat: () => nextPoint.lat, lng: () => nextPoint.lng },
        steps: [{
          distance: { text: `${Math.round(distance)} km`, value: distance * 1000 },
          duration: { text: `${Math.floor(duration / 60)}h ${duration % 60}m`, value: duration * 60 },
          start_location: { lat: () => currentPoint.lat, lng: () => currentPoint.lng },
          end_location: { lat: () => nextPoint.lat, lng: () => nextPoint.lng },
          travel_mode: 'FLIGHT'
        }]
      });

      currentPoint = nextPoint;
    }

    return legs;
  }

  // Calculate bounds for all coordinates
  calculateBounds(coordinates) {
    let north = coordinates[0].lat;
    let south = coordinates[0].lat;
    let east = coordinates[0].lng;
    let west = coordinates[0].lng;

    coordinates.forEach(coord => {
      north = Math.max(north, coord.lat);
      south = Math.min(south, coord.lat);
      east = Math.max(east, coord.lng);
      west = Math.min(west, coord.lng);
    });

    return { north, south, east, west };
  }

  // Get optimized route (driving or flight)
  async getOptimizedRoute(startLocation, endLocation, waypoints = []) {
    await this.loadGoogleMaps();

    // First, check if flight is required
    const flightCheck = await this.checkIfFlightRequired(startLocation, endLocation);
    
    if (flightCheck.flightRequired) {
      console.log('🛫 Flight route required - creating flight path');
      return await this.createFlightRoute(startLocation, endLocation, waypoints);
    }

    // Try driving route first
    try {
      console.log('🚗 Attempting driving route');
      return await this.getDrivingRoute(startLocation, endLocation, waypoints);
    } catch (error) {
      console.log('🚗 Driving route failed, trying flight route');
      return await this.createFlightRoute(startLocation, endLocation, waypoints);
    }
  }

  // Original driving route method
  async getDrivingRoute(startLocation, endLocation, waypoints = []) {
    await this.loadGoogleMaps();

    return new Promise((resolve, reject) => {
      const directionsService = new window.google.maps.DirectionsService();

      const waypointObjects = waypoints
        .filter(waypoint => waypoint && waypoint.trim() !== '')
        .map(waypoint => ({
          location: waypoint.trim(),
          stopover: true
        }));

      const request = {
        origin: startLocation,
        destination: endLocation,
        waypoints: waypointObjects,
        optimizeWaypoints: waypointObjects.length > 0,
        travelMode: window.google.maps.TravelMode.DRIVING,
        unitSystem: window.google.maps.UnitSystem.METRIC,
        avoidHighways: false,
        avoidTolls: false
      };

      directionsService.route(request, (result, status) => {
        if (status === 'OK') {
          resolve({
            route: result,
            isFlightRoute: false,
            routeType: 'driving'
          });
        } else {
          let errorMessage = 'Failed to calculate driving route';
          
          switch (status) {
            case 'NOT_FOUND':
              errorMessage = 'One or more locations could not be found for driving route.';
              break;
            case 'ZERO_RESULTS':
              errorMessage = 'No driving route could be found between these locations.';
              break;
            default:
              errorMessage = `Driving route failed: ${status}`;
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

  // Calculate optimized route with enhanced logic
  async calculateOptimizedRoute(startLocation, endLocation, waypoints = []) {
    try {
      console.log('🎯 Starting enhanced route calculation...');
      
      if (!startLocation || !endLocation) {
        throw new Error('Start and end locations are required');
      }

      const result = await this.getOptimizedRoute(startLocation, endLocation, waypoints);
      
      if (!result || !result.route) {
        throw new Error('No route found');
      }

      // Extract route data based on type
      let totalDistance, totalDuration;
      
      if (result.isFlightRoute) {
        totalDistance = result.totalDistance;
        totalDuration = result.totalDuration;
      } else {
        const routeData = result.route.routes[0];
        const legs = routeData.legs;
        totalDistance = Math.round(legs.reduce((total, leg) => total + leg.distance.value, 0) / 1000);
        totalDuration = Math.round(legs.reduce((total, leg) => total + leg.duration.value, 0) / 60);
      }

      console.log(`✅ ${result.routeType} route calculated:`, {
        totalDistance: `${totalDistance} km`,
        totalDuration: `${Math.floor(totalDuration / 60)}h ${totalDuration % 60}m`,
        isFlightRoute: result.isFlightRoute
      });

      return {
        route: result.route,
        totalDistance,
        totalDuration,
        optimizedWaypoints: result.optimizedWaypoints || waypoints,
        waypoint_order: result.waypoint_order || [],
        coordinates: result.coordinates || [],
        bounds: result.route.routes[0].bounds,
        overview_path: result.route.routes[0].overview_path,
        isFlightRoute: result.isFlightRoute || false,
        routeType: result.routeType || 'driving'
      };
    } catch (error) {
      console.error('Route calculation failed:', error);
      throw new Error(`Route calculation failed: ${error.message}`);
    }
  }

  // Test API key validity
  async testApiKey() {
    try {
      await this.loadGoogleMaps();
      
      const geocoder = new window.google.maps.Geocoder();
      
      return new Promise((resolve) => {
        geocoder.geocode({ 
          address: 'Google, Mountain View, CA' 
        }, (results, status) => {
          if (status === 'OK') {
            resolve({ valid: true, message: 'API key is working correctly' });
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
// src/services/placesService.js - Google Places API integration
class PlacesService {
  constructor() {
    this.placesService = null;
    this.autocompleteService = null;
  }

  async initialize() {
    // Make sure Google Maps is loaded
    if (!window.google?.maps) {
      throw new Error('Google Maps not loaded');
    }

    // Initialize Places services
    this.placesService = new window.google.maps.places.PlacesService(
      document.createElement('div')
    );
    this.autocompleteService = new window.google.maps.places.AutocompleteService();
  }

  // Search for places near a location
  async searchPlacesNearby(location, query = '', radius = 5000) {
    if (!this.placesService) {
      await this.initialize();
    }

    const request = {
      location: new window.google.maps.LatLng(location.lat, location.lng),
      radius: radius,
      type: ['tourist_attraction', 'restaurant', 'lodging', 'shopping_mall'],
      keyword: query
    };

    return new Promise((resolve, reject) => {
      this.placesService.nearbySearch(request, (results, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(this.formatPlaces(results));
        } else {
          reject(new Error(`Places search failed: ${status}`));
        }
      });
    });
  }

  // Autocomplete place search
  async getPlacePredictions(input, location) {
    if (!this.autocompleteService) {
      await this.initialize();
    }

    const request = {
      input: input,
      location: location ? new window.google.maps.LatLng(location.lat, location.lng) : null,
      radius: location ? 10000 : null,
      types: ['establishment', 'geocode']
    };

    return new Promise((resolve, reject) => {
      this.autocompleteService.getPlacePredictions(request, (predictions, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(predictions || []);
        } else if (status === window.google.maps.places.PlacesServiceStatus.ZERO_RESULTS) {
          resolve([]);
        } else {
          reject(new Error(`Autocomplete failed: ${status}`));
        }
      });
    });
  }

  // Get detailed place information
  async getPlaceDetails(placeId) {
    if (!this.placesService) {
      await this.initialize();
    }

    const request = {
      placeId: placeId,
      fields: [
        'name', 'formatted_address', 'geometry', 'rating', 
        'user_ratings_total', 'photos', 'types', 'website',
        'formatted_phone_number', 'opening_hours'
      ]
    };

    return new Promise((resolve, reject) => {
      this.placesService.getDetails(request, (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK) {
          resolve(this.formatPlace(place));
        } else {
          reject(new Error(`Place details failed: ${status}`));
        }
      });
    });
  }

  // Format places data
  formatPlaces(places) {
    return places.map(place => this.formatPlace(place));
  }

  formatPlace(place) {
    return {
      id: place.place_id,
      name: place.name,
      address: place.vicinity || place.formatted_address,
      rating: place.rating || 0,
      userRatingsTotal: place.user_ratings_total || 0,
      types: place.types || [],
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      },
      photos: place.photos ? place.photos.slice(0, 3).map(photo => ({
        url: photo.getUrl({ maxWidth: 300, maxHeight: 200 })
      })) : [],
      website: place.website,
      phone: place.formatted_phone_number,
      openingHours: place.opening_hours?.weekday_text,
      priceLevel: place.price_level
    };
  }

  // Test if Places API is available
  async testPlacesAPI() {
    try {
      await this.initialize();
      // Try a simple search to test API key
      await this.searchPlacesNearby({ lat: 3.1390, lng: 101.6869 }, '', 1000);
      return { available: true, message: 'Places API is working' };
    } catch (error) {
      return { available: false, message: error.message };
    }
  }
}

export default new PlacesService();
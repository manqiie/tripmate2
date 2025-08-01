// src/components/maps/POIClickHandler.jsx - Dedicated POI click functionality
import { useEffect, useRef, useCallback } from 'react';

class POIClickHandler {
  constructor() {
    this.placesService = null;
    this.infoWindow = null;
    this.isEnabled = false;
    this.currentStopIndex = 0;
    this.tripId = null;
    this.onSavePlaceToTrip = null;
    this.mapInstance = null;
  }

  // Initialize the POI click handler
  initialize(map, options = {}) {
    console.log('🎯 Initializing POI Click Handler...');
    
    this.mapInstance = map;
    this.placesService = new window.google.maps.places.PlacesService(map);
    this.infoWindow = new window.google.maps.InfoWindow();
    
    // Set configuration
    this.configure(options);
    
    // Setup click listener
    this.setupClickListener();
    
    // Setup global functions
    this.setupGlobalFunctions();
    
    console.log('✅ POI Click Handler initialized');
  }

  // Configure handler options
  configure(options) {
    this.isEnabled = options.enabled || false;
    this.currentStopIndex = options.currentStopIndex || 0;
    this.tripId = options.tripId || null;
    this.onSavePlaceToTrip = options.onSavePlaceToTrip || null;
    
    // Update map clickable icons based on enabled state
    if (this.mapInstance) {
      this.mapInstance.setOptions({
        clickableIcons: this.isEnabled
      });
    }
  }

  // Setup the main click listener
  setupClickListener() {
    if (!this.mapInstance) return;

    this.mapInstance.addListener('click', (event) => {
      // Only handle if POI clicking is enabled and we have a place ID
      if (!this.isEnabled || !event.placeId) {
        return;
      }

      console.log('🏢 POI clicked! Place ID:', event.placeId);
      
      // Prevent default info window
      event.stop();
      
      // Handle the POI click
      this.handlePOIClick(event.placeId, event.latLng);
    });
  }

  // Handle POI click and get place details
  async handlePOIClick(placeId, latLng) {
    if (!this.placesService) {
      console.error('❌ Places service not initialized');
      return;
    }

    console.log('🔍 Getting place details for:', placeId);

    const request = {
      placeId: placeId,
      fields: [
        'name', 'formatted_address', 'geometry', 'place_id',
        'rating', 'user_ratings_total', 'types', 'website',
        'formatted_phone_number', 'photos', 'price_level',
        'opening_hours', 'vicinity'
      ]
    };

    this.placesService.getDetails(request, (place, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        console.log('✅ Place details received:', place);
        
        // Format place data
        const formattedPlace = this.formatPlaceData(place);
        
        // Show save dialog
        this.showSaveDialog(formattedPlace, latLng);
      } else {
        console.error('❌ Failed to get place details:', status);
        this.showErrorMessage('Unable to get details for this place. Please try again.');
      }
    });
  }

  // Format Google Places data for our system
  formatPlaceData(place) {
    return {
      id: place.place_id,
      place_id: place.place_id,
      name: place.name,
      address: place.formatted_address || place.vicinity || '',
      location: {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      },
      rating: place.rating || null,
      userRatingsTotal: place.user_ratings_total || null,
      types: place.types || [],
      phone: place.formatted_phone_number || '',
      website: place.website || '',
      photos: place.photos ? place.photos.slice(0, 3).map(photo => ({
        url: photo.getUrl({ maxWidth: 300, maxHeight: 200 })
      })) : [],
      priceLevel: place.price_level,
      openingHours: place.opening_hours?.weekday_text || []
    };
  }

  // Show the save dialog
  showSaveDialog(place, latLng) {
    console.log('💾 Showing save dialog for place:', place.name);
    
    // Store current place data for save function
    window.currentPOIToSave = {
      ...place,
      stopIndex: this.currentStopIndex,
      tripId: this.tripId
    };

    // Create info window content
    const content = this.createSaveDialogContent(place);
    
    // Close any existing info windows
    if (this.infoWindow) {
      this.infoWindow.close();
    }

    // Create new info window
    this.infoWindow = new window.google.maps.InfoWindow({
      content: content,
      position: latLng,
      maxWidth: 320
    });

    this.infoWindow.open(this.mapInstance);
    
    // Auto-close after 15 seconds
    setTimeout(() => {
      if (this.infoWindow) {
        this.infoWindow.close();
      }
      delete window.currentPOIToSave;
    }, 15000);
  }

  // Create save dialog content
  createSaveDialogContent(place) {
    const ratingStars = place.rating ? '⭐'.repeat(Math.floor(place.rating)) : '';
    const placeTypes = place.types ? place.types.slice(0, 2).map(type => 
      type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
    ).join(', ') : '';

    const googleMapsUrl = `https://www.google.com/maps/place/?q=place_id:${place.place_id}`;

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 300px; padding: 0;">
        <!-- Header -->
        <div style="background: linear-gradient(135deg, #3b82f6, #1d4ed8); color: white; padding: 12px 16px; margin: 0; border-radius: 8px 8px 0 0;">
          <div style="display: flex; align-items: center; gap: 8px; margin: 0;">
        
            <h3 style="margin: 0; font-size: 16px; font-weight: 600; line-height: 1.3;">
              ${place.name}
            </h3>
          </div>
        </div>
        
        <!-- Content -->
        <div style="padding: 12px 16px;">
          <p style="margin: 0 0 8px 0; font-size: 12px; color: #6b7280; line-height: 1.4;">
            📍 ${place.address}
          </p>
          
          ${place.rating ? `
            <div style="margin: 6px 0; font-size: 12px; color: #374151; display: flex; align-items: center; gap: 4px;">
              <span>${ratingStars}</span>
              <span style="font-weight: 500;">${place.rating.toFixed(1)}</span>
              ${place.userRatingsTotal ? `<span style="color: #9ca3af;">(${place.userRatingsTotal.toLocaleString()} reviews)</span>` : ''}
            </div>
          ` : ''}
          
          ${placeTypes ? `
            <div style="margin: 8px 0;">
              <span style="background: #e0f2fe; color: #0277bd; padding: 4px 8px; border-radius: 12px; font-size: 10px; font-weight: 500;">
                ${placeTypes}
              </span>
            </div>
          ` : ''}
          
          ${place.phone ? `
            <div style="margin: 6px 0; font-size: 11px; color: #6b7280;">
              📞 ${place.phone}
            </div>
          ` : ''}
        </div>
        
        <!-- Actions -->
        <div style="padding: 0 16px 16px 16px; border-top: 1px solid #f3f4f6; margin-top: 8px;">
          <div style="display: flex; gap: 8px; margin-top: 12px;">
            <button onclick="window.savePOIToTrip()" 
                    style="background: linear-gradient(135deg, #10b981, #059669); color: white; border: none; padding: 10px 16px; border-radius: 8px; font-size: 12px; cursor: pointer; font-weight: 600; flex: 1; transition: all 0.2s; box-shadow: 0 2px 4px rgba(16, 185, 129, 0.3);"
                    onmouseover="this.style.transform='translateY(-1px)'; this.style.boxShadow='0 4px 8px rgba(16, 185, 129, 0.4)';"
                    onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='0 2px 4px rgba(16, 185, 129, 0.3)';">
              Save to Trip
            </button>
            
            <a href="${googleMapsUrl}" target="_blank" 
               style="background: #6b7280; color: white; text-decoration: none; padding: 8px 12px; border-radius: 6px; font-size: 11px; display: flex; align-items: center; justify-content: center; min-width: 60px; transition: all 0.2s;"
               onmouseover="this.style.background='#4b5563';"
               onmouseout="this.style.background='#6b7280';">
              Details
            </a>
          </div>
          
        </div>
      </div>
    `;
  }

  // Setup global functions for info window buttons
  setupGlobalFunctions() {
    window.savePOIToTrip = async () => {
      const poiData = window.currentPOIToSave;
      if (!poiData || !this.onSavePlaceToTrip) {
        console.error('❌ No POI data to save or no save callback');
        this.showErrorMessage('Unable to save place. Please try again.');
        return;
      }

      try {
        console.log('💾 Saving POI to trip:', poiData.name);
        
        // Prepare data for trip places API
        const placeData = {
          place_id: poiData.place_id,
          name: poiData.name,
          address: poiData.address,
          rating: poiData.rating,
          user_ratings_total: poiData.userRatingsTotal,
          types: poiData.types,
          location: poiData.location,
          phone: poiData.phone,
          website: poiData.website,
          stop_index: poiData.stopIndex
        };

        // Call the save callback
        await this.onSavePlaceToTrip(placeData);
        
        // Show success message
        this.showSuccessMessage(poiData.name);
        
        // Close info window
        if (this.infoWindow) {
          this.infoWindow.close();
        }
        
      } catch (error) {
        console.error('❌ Failed to save POI to trip:', error);
        
        if (error.message.includes('already saved')) {
          this.showWarningMessage('This place is already saved to your trip!');
        } else {
          this.showErrorMessage('Failed to save place to trip. Please try again.');
        }
      } finally {
        delete window.currentPOIToSave;
      }
    };
  }

  // Show success notification
  showSuccessMessage(placeName) {
    this.showNotification(`Saved "${placeName}" to your trip!`, 'success');
  }

  // Show warning notification
  showWarningMessage(message) {
    this.showNotification(`⚠️ ${message}`, 'warning');
  }

  // Show error notification
  showErrorMessage(message) {
    this.showNotification(`❌ ${message}`, 'error');
  }

  // Generic notification system
  showNotification(message, type = 'success') {
    // Remove existing notifications
    const existing = document.querySelectorAll('.poi-notification');
    existing.forEach(el => el.remove());

    // Color schemes for different notification types
    const colors = {
      success: {
        bg: 'linear-gradient(135deg, #10b981, #059669)',
        border: '#10b981'
      },
      warning: {
        bg: 'linear-gradient(135deg, #f59e0b, #d97706)',
        border: '#f59e0b'
      },
      error: {
        bg: 'linear-gradient(135deg, #ef4444, #dc2626)',
        border: '#ef4444'
      }
    };

    const color = colors[type] || colors.success;

    // Create notification element
    const notification = document.createElement('div');
    notification.className = 'poi-notification';
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${color.bg};
      color: white;
      padding: 12px 20px;
      border-radius: 12px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.2);
      z-index: 10000;
      font-size: 14px;
      font-weight: 600;
      max-width: 350px;
      opacity: 0;
      transform: translateX(100%) scale(0.8);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      border: 2px solid ${color.border};
    `;
    
    notification.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 16px;">${type === 'success' ? '✅' : type === 'warning' ? '⚠️' : '❌'}</span>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.parentElement.remove()" 
                style="background: none; border: none; color: white; font-size: 18px; cursor: pointer; padding: 0; margin-left: 8px; opacity: 0.8; line-height: 1;"
                onmouseover="this.style.opacity='1'"
                onmouseout="this.style.opacity='0.8'">×</button>
      </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.opacity = '1';
      notification.style.transform = 'translateX(0) scale(1)';
    }, 100);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transform = 'translateX(100%) scale(0.8)';
      setTimeout(() => {
        if (notification.parentNode) {
          notification.remove();
        }
      }, 400);
    }, 4000);
  }

  // Enable POI clicking
  enable() {
    this.isEnabled = true;
    if (this.mapInstance) {
      this.mapInstance.setOptions({ clickableIcons: true });
    }
    console.log('✅ POI clicking enabled');
  }

  // Disable POI clicking
  disable() {
    this.isEnabled = false;
    if (this.mapInstance) {
      this.mapInstance.setOptions({ clickableIcons: false });
    }
    
    // Close any open info windows
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    
    console.log('❌ POI clicking disabled');
  }

  // Update configuration
  update(options) {
    this.configure(options);
    console.log('🔄 POI Click Handler updated');
  }

  // Cleanup
  destroy() {
    if (this.infoWindow) {
      this.infoWindow.close();
    }
    
    // Remove global functions
    delete window.savePOIToTrip;
    delete window.currentPOIToSave;
    
    // Remove notifications
    const notifications = document.querySelectorAll('.poi-notification');
    notifications.forEach(el => el.remove());
    
    console.log('🧹 POI Click Handler destroyed');
  }
}

// React Hook for POI Click Handler
export const usePOIClickHandler = () => {
  const handlerRef = useRef(null);

  // Initialize handler
  const initialize = useCallback((map, options = {}) => {
    if (!handlerRef.current) {
      handlerRef.current = new POIClickHandler();
    }
    handlerRef.current.initialize(map, options);
  }, []);

  // Update handler configuration
  const update = useCallback((options) => {
    if (handlerRef.current) {
      handlerRef.current.update(options);
    }
  }, []);

  // Enable POI clicking
  const enable = useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current.enable();
    }
  }, []);

  // Disable POI clicking
  const disable = useCallback(() => {
    if (handlerRef.current) {
      handlerRef.current.disable();
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (handlerRef.current) {
        handlerRef.current.destroy();
      }
    };
  }, []);

  return {
    initialize,
    update,
    enable,
    disable
  };
};

export default POIClickHandler;
// src/components/trip/TripTimeline.jsx - Fixed image display for slideshow
import React, { useState, useEffect, useRef } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Calendar, MapPin, 
  Volume2, VolumeX, Camera, Video, Mic, FileText, 
  Maximize, Minimize, RotateCcw, Download, Share2, ZoomIn, ZoomOut
} from 'lucide-react';
import GoogleMap from '../maps/GoogleMap';
import api from '../../services/api';

const TripTimeline = ({ tripId, onClose }) => {
  const [timelineData, setTimelineData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Slideshow state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentItemIndex, setCurrentItemIndex] = useState(0);
  const [currentDayIndex, setCurrentDayIndex] = useState(0);
  const [slideDuration, setSlideDuration] = useState(5000); // 5 seconds per slide
  const [volume, setVolume] = useState(0.5);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  
  // New image display states
  const [imageZoom, setImageZoom] = useState(1);
  const [imagePosition, setImagePosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Media refs
  const audioRef = useRef(null);
  const videoRef = useRef(null);
  const intervalRef = useRef(null);
  const containerRef = useRef(null);
  const imageRef = useRef(null);

  useEffect(() => {
    fetchTimelineData();
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [tripId]);

  // Auto-advance slideshow
  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        nextSlide();
      }, slideDuration);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPlaying, currentItemIndex, currentDayIndex, slideDuration]);

  // Reset image state when item changes
  useEffect(() => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  }, [currentItemIndex, currentDayIndex]);

  const fetchTimelineData = async () => {
    try {
      const response = await api.get(`/trips/${tripId}/timeline/`);
      setTimelineData(response.data);
      
      // Find first day with media
      const firstDayWithMedia = response.data.media_items?.findIndex(day => day.items.length > 0);
      if (firstDayWithMedia >= 0) {
        setCurrentDayIndex(firstDayWithMedia);
        setCurrentItemIndex(0);
      }
    } catch (err) {
      setError('Failed to load timeline data');
      console.error('Timeline fetch error:', err);
    } finally {
      setLoading(false);
    }
  };

  const getAllMediaItems = () => {
    if (!timelineData?.media_items) return [];
    return timelineData.media_items.flatMap(day => 
      day.items.map(item => ({ ...item, date: day.date }))
    );
  };

  const getCurrentItem = () => {
    const currentDay = timelineData?.media_items?.[currentDayIndex];
    return currentDay?.items?.[currentItemIndex] || null;
  };

  const nextSlide = () => {
    const currentDay = timelineData?.media_items?.[currentDayIndex];
    if (!currentDay) return;

    if (currentItemIndex < currentDay.items.length - 1) {
      setCurrentItemIndex(currentItemIndex + 1);
    } else {
      // Move to next day with media
      let nextDayIndex = currentDayIndex + 1;
      while (nextDayIndex < timelineData.media_items.length) {
        if (timelineData.media_items[nextDayIndex].items.length > 0) {
          setCurrentDayIndex(nextDayIndex);
          setCurrentItemIndex(0);
          return;
        }
        nextDayIndex++;
      }
      // If no more days, stop or loop back to beginning
      setIsPlaying(false);
    }
  };

  const prevSlide = () => {
    if (currentItemIndex > 0) {
      setCurrentItemIndex(currentItemIndex - 1);
    } else {
      // Move to previous day with media
      let prevDayIndex = currentDayIndex - 1;
      while (prevDayIndex >= 0) {
        if (timelineData.media_items[prevDayIndex].items.length > 0) {
          setCurrentDayIndex(prevDayIndex);
          setCurrentItemIndex(timelineData.media_items[prevDayIndex].items.length - 1);
          return;
        }
        prevDayIndex--;
      }
    }
  };

  const jumpToDay = (dayIndex) => {
    if (timelineData.media_items[dayIndex].items.length > 0) {
      setCurrentDayIndex(dayIndex);
      setCurrentItemIndex(0);
    }
  };

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Image manipulation functions
  const handleImageMouseDown = (e) => {
    if (imageZoom > 1) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - imagePosition.x,
        y: e.clientY - imagePosition.y
      });
    }
  };

  const handleImageMouseMove = (e) => {
    if (isDragging && imageZoom > 1) {
      setImagePosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y
      });
    }
  };

  const handleImageMouseUp = () => {
    setIsDragging(false);
  };

  const resetImageView = () => {
    setImageZoom(1);
    setImagePosition({ x: 0, y: 0 });
  };

  const zoomIn = () => {
    setImageZoom(prev => Math.min(prev + 0.5, 5));
  };

  const zoomOut = () => {
    setImageZoom(prev => {
      const newZoom = Math.max(prev - 0.5, 1);
      if (newZoom === 1) {
        setImagePosition({ x: 0, y: 0 });
      }
      return newZoom;
    });
  };

  const exportTimeline = () => {
    // Create a data export of the timeline
    const exportData = {
      trip: {
        title: timelineData.title,
        start_location: timelineData.start_location,
        end_location: timelineData.end_location,
        duration_days: timelineData.duration_days
      },
      timeline: timelineData.media_items.map(day => ({
        date: day.date,
        media_count: day.media_count,
        items: day.items.map(item => ({
          title: item.title,
          description: item.description,
          notes: item.notes,
          media_type: item.media_type,
          custom_date: item.custom_date,
          custom_time: item.custom_time
        }))
      }))
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${timelineData.title}_timeline.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getImageContainerStyle = () => {
    const baseStyle = {
      width: '100%',
      height: '100%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
      cursor: imageZoom > 1 ? (isDragging ? 'grabbing' : 'grab') : 'default',
      position: 'relative'
    };

    return baseStyle;
  };

  const getImageStyle = (item) => {
    const baseStyle = {
      transition: isDragging ? 'none' : 'all 0.3s ease',
      userSelect: 'none',
      pointerEvents: 'auto',
      display: 'block',
      maxWidth: '100%',
      maxHeight: '100%',
      width: 'auto',
      height: 'auto',
      objectFit: 'contain'
    };

    if (imageZoom > 1) {
      return {
        ...baseStyle,
        maxWidth: 'none',
        maxHeight: 'none',
        transform: `scale(${imageZoom}) translate(${imagePosition.x / imageZoom}px, ${imagePosition.y / imageZoom}px)`,
        transformOrigin: 'center center'
      };
    }

    return baseStyle;
  };

  const renderMediaContent = (item) => {
    if (!item) return null;

    switch (item.media_type) {
      case 'photo':
        return (
          <div 
            style={getImageContainerStyle()}
            onMouseDown={handleImageMouseDown}
            onMouseMove={handleImageMouseMove}
            onMouseUp={handleImageMouseUp}
            onMouseLeave={handleImageMouseUp}
          >
            <img
              ref={imageRef}
              src={item.file_url}
              alt={item.title}
              style={getImageStyle(item)}
              draggable={false}
              onLoad={() => {
                // Image loaded successfully
                console.log('Image loaded successfully');
              }}
            />
          </div>
        );
      
      case 'video':
        return (
          <div 
            style={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <video
              ref={videoRef}
              src={item.file_url}
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain'
              }}
              controls={!isPlaying}
              autoPlay={isPlaying}
              muted={isMuted}
              volume={volume}
            />
          </div>
        );
      
      case 'audio':
        return (
          <div className="w-full h-full bg-gradient-to-br from-purple-600 to-purple-800 flex flex-col items-center justify-center text-white">
            <div className="text-center mb-8">
              <Mic className="w-24 h-24 mx-auto mb-4 opacity-80" />
              <h3 className="text-2xl font-bold mb-2">{item.title}</h3>
              <p className="text-purple-200">{item.description}</p>
            </div>
            <audio
              ref={audioRef}
              src={item.file_url}
              controls
              autoPlay={isPlaying}
              volume={volume}
              muted={isMuted}
              className="w-80"
            />
          </div>
        );
      
      default:
        return (
          <div className="w-full h-full bg-gray-200 flex items-center justify-center">
            <p className="text-gray-500">Unsupported media type</p>
          </div>
        );
    }
  };

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p>Loading timeline...</p>
        </div>
      </div>
    );
  }

  if (error || !timelineData) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50">
        <div className="text-center text-white">
          <p className="text-red-400 mb-4">{error || 'No timeline data available'}</p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-white text-black rounded-lg"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const currentItem = getCurrentItem();
  const totalMediaItems = getAllMediaItems().length;
  const currentGlobalIndex = getAllMediaItems().findIndex(item => 
    item === currentItem
  );

  return (
    <div 
      ref={containerRef}
      className={`fixed inset-0 bg-black z-50 flex flex-col ${isFullscreen ? 'p-0' : ''}`}
    >
      {/* Header */}
      <div className="bg-black bg-opacity-70 text-white p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">{timelineData.title}</h1>
          <p className="text-gray-300">
            {timelineData.start_location} → {timelineData.end_location}
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          {/* Image Controls (only show for photos) */}
          {currentItem?.media_type === 'photo' && (
            <div className="flex items-center gap-2">
              <button
                onClick={zoomOut}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700"
                title="Zoom Out"
                disabled={imageZoom <= 1}
              >
                <ZoomOut className="w-4 h-4" />
              </button>
              
              <button
                onClick={zoomIn}
                className="p-2 bg-gray-800 rounded hover:bg-gray-700"
                title="Zoom In"
                disabled={imageZoom >= 5}
              >
                <ZoomIn className="w-4 h-4" />
              </button>
              
              {imageZoom > 1 && (
                <button
                  onClick={resetImageView}
                  className="p-2 bg-gray-800 rounded hover:bg-gray-700"
                  title="Reset View"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              )}
            </div>
          )}

          {/* Speed Control */}
          <select
            value={slideDuration}
            onChange={(e) => setSlideDuration(Number(e.target.value))}
            className="bg-gray-800 text-white rounded px-2 py-1 text-sm"
          >
            <option value={2000}>2s per slide</option>
            <option value={3000}>3s per slide</option>
            <option value={5000}>5s per slide</option>
            <option value={8000}>8s per slide</option>
            <option value={10000}>10s per slide</option>
          </select>

          {/* Export Button */}
          <button
            onClick={exportTimeline}
            className="p-2 bg-gray-800 rounded hover:bg-gray-700"
            title="Export Timeline"
          >
            <Download className="w-5 h-5" />
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 bg-gray-800 rounded hover:bg-gray-700"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Close Button */}
          <button
            onClick={onClose}
            className="p-2 bg-red-600 rounded hover:bg-red-700"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex">
        {/* Media Display */}
        <div className="flex-1 bg-black relative overflow-hidden">
          {/* Image Container with proper sizing */}
          <div className="absolute inset-0 flex items-center justify-center">
            {currentItem ? (
              <>
                {renderMediaContent(currentItem)}
                
                {/* Media Info Overlay */}
                <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/70 to-transparent text-white p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold mb-2">{currentItem.title}</h3>
                      <div className="flex items-center gap-4 text-sm text-gray-300 mb-2">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-4 h-4" />
                          {new Date(currentItem.custom_date || currentItem.taken_at).toLocaleDateString()}
                        </span>
                        {currentItem.custom_time && (
                          <span>{currentItem.custom_time}</span>
                        )}
                        <span className="flex items-center gap-1">
                          {currentItem.media_type === 'photo' && <Camera className="w-4 h-4" />}
                          {currentItem.media_type === 'video' && <Video className="w-4 h-4" />}
                          {currentItem.media_type === 'audio' && <Mic className="w-4 h-4" />}
                          {currentItem.media_type}
                        </span>
                        {/* Display zoom level for photos */}
                        {currentItem.media_type === 'photo' && imageZoom > 1 && (
                          <span className="text-blue-300">
                            Zoom: {imageZoom}x
                          </span>
                        )}
                      </div>
                      
                      {currentItem.description && (
                        <p className="text-gray-200 mb-2">{currentItem.description}</p>
                      )}
                      
                      {currentItem.notes && (
                        <div className="bg-black/50 rounded p-3 mt-2">
                          <div className="flex items-center gap-1 mb-1">
                            <FileText className="w-4 h-4" />
                            <span className="text-xs uppercase tracking-wide">Travel Notes</span>
                          </div>
                          <p className="text-sm text-gray-200">{currentItem.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Progress Indicator */}
                    <div className="text-right text-sm text-gray-400">
                      {currentGlobalIndex + 1} / {totalMediaItems}
                    </div>
                  </div>
                </div>

                {/* Image interaction hints */}
                {currentItem.media_type === 'photo' && imageZoom > 1 && (
                  <div className="absolute top-4 left-4 bg-black/70 text-white text-sm px-3 py-2 rounded">
                    💡 Click and drag to pan • Use zoom controls to adjust
                  </div>
                )}
              </>
            ) : (
              <div className="text-white text-center">
                <Camera className="w-24 h-24 mx-auto mb-4 opacity-50" />
                <p className="text-xl">No media available</p>
              </div>
            )}
          </div>
        </div>

        {/* Timeline Sidebar */}
        <div className="w-80 bg-gray-900 text-white overflow-y-auto">
          <div className="p-4">
            <h3 className="text-lg font-bold mb-4">Timeline</h3>
            
            {/* Timeline Days */}
            <div className="space-y-2">
              {timelineData.media_items.map((day, dayIndex) => (
                <div
                  key={day.date}
                  className={`p-3 rounded cursor-pointer transition-colors ${
                    dayIndex === currentDayIndex 
                      ? 'bg-blue-600' 
                      : day.items.length > 0 
                        ? 'bg-gray-800 hover:bg-gray-700' 
                        : 'bg-gray-800/50 opacity-50'
                  }`}
                  onClick={() => day.items.length > 0 && jumpToDay(dayIndex)}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">
                      {new Date(day.date).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric'
                      })}
                    </span>
                    <span className="text-xs bg-gray-700 px-2 py-1 rounded">
                      {day.media_count}
                    </span>
                  </div>
                  
                  {/* Day's Media Items */}
                  {day.items.length > 0 && (
                    <div className="mt-2 grid grid-cols-4 gap-1">
                      {day.items.slice(0, 8).map((item, itemIndex) => (
                        <div
                          key={item.id}
                          className={`aspect-square bg-gray-700 rounded overflow-hidden cursor-pointer ${
                            dayIndex === currentDayIndex && itemIndex === currentItemIndex
                              ? 'ring-2 ring-white'
                              : ''
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            setCurrentDayIndex(dayIndex);
                            setCurrentItemIndex(itemIndex);
                          }}
                        >
                          {item.media_type === 'photo' && item.file_url && (
                            <img
                              src={item.file_url}
                              alt={item.title}
                              className="w-full h-full object-cover"
                            />
                          )}
                          {item.media_type === 'video' && (
                            <div className="w-full h-full bg-gray-600 flex items-center justify-center">
                              <Video className="w-3 h-3" />
                            </div>
                          )}
                          {item.media_type === 'audio' && (
                            <div className="w-full h-full bg-purple-600 flex items-center justify-center">
                              <Mic className="w-3 h-3" />
                            </div>
                          )}
                        </div>
                      ))}
                      {day.items.length > 8 && (
                        <div className="aspect-square bg-gray-600 rounded flex items-center justify-center text-xs">
                          +{day.items.length - 8}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="bg-black bg-opacity-70 text-white p-4">
        <div className="flex items-center justify-center gap-4">
          {/* Previous */}
          <button
            onClick={prevSlide}
            className="p-3 bg-gray-800 rounded-full hover:bg-gray-700"
          >
            <SkipBack className="w-5 h-5" />
          </button>

          {/* Play/Pause */}
          <button
            onClick={() => setIsPlaying(!isPlaying)}
            className="p-4 bg-blue-600 rounded-full hover:bg-blue-700"
          >
            {isPlaying ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
          </button>

          {/* Next */}
          <button
            onClick={nextSlide}
            className="p-3 bg-gray-800 rounded-full hover:bg-gray-700"
          >
            <SkipForward className="w-5 h-5" />
          </button>

          {/* Volume Control */}
          <div className="flex items-center gap-2 ml-8">
            <button
              onClick={() => setIsMuted(!isMuted)}
              className="p-2"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))}
              className="w-20"
            />
          </div>

          {/* Restart */}
          <button
            onClick={() => {
              setCurrentDayIndex(0);
              setCurrentItemIndex(0);
              setIsPlaying(false);
            }}
            className="p-2 bg-gray-800 rounded hover:bg-gray-700 ml-8"
            title="Restart from beginning"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="mt-4">
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
              style={{
                width: `${totalMediaItems > 0 ? ((currentGlobalIndex + 1) / totalMediaItems) * 100 : 0}%`
              }}
            />
          </div>
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>Start</span>
            <span>{currentGlobalIndex + 1} of {totalMediaItems}</span>
            <span>End</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TripTimeline;
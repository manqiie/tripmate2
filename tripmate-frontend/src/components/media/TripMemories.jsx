// src/components/media/TripMemories.jsx - Just added timeline button, nothing else changed
import React, { useState, useEffect } from 'react';
import { Upload, X, MapPin, Calendar, Play, Mic, Camera, Video, Clock, FileText, Film } from 'lucide-react';
import TripTimeline from '../trip/TripTimeline';
import api from '../../services/api';

const TripMemories = ({ tripId, stops, stopCoordinates, selectedStop, onStopSelect }) => {
  const [mediaData, setMediaData] = useState([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showMediaModal, setShowMediaModal] = useState(false);
  const [showTimeline, setShowTimeline] = useState(false); // NEW: Timeline state
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadForm, setUploadForm] = useState({
    file: null,
    title: '',
    description: '',
    notes: '',
    media_type: 'photo',
    custom_date: '',
    custom_time: ''
  });

  useEffect(() => {
    if (selectedStop !== null) {
      fetchMediaForStop(selectedStop);
    }
  }, [selectedStop, tripId]);

  const fetchMediaForStop = async (stopIndex) => {
    try {
      const response = await api.get(`/trips/${tripId}/media/?stop_index=${stopIndex}`);
      setMediaData(response.data);
    } catch (error) {
      console.error('Failed to fetch media:', error);
      setMediaData([]);
    }
  };

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    let media_type = 'photo';
    if (file.type.startsWith('video/')) media_type = 'video';
    if (file.type.startsWith('audio/')) media_type = 'audio';

    // Get current date as default
    const now = new Date();
    const currentDate = now.toISOString().split('T')[0];
    const currentTime = now.toTimeString().split(' ')[0].slice(0, 5);

    setUploadForm({
      ...uploadForm,
      file,
      media_type,
      title: file.name.split('.')[0],
      custom_date: currentDate,
      custom_time: currentTime
    });
  };

  const handleUpload = async () => {
    if (!uploadForm.file || selectedStop === null) return;

    setUploading(true);
    const formData = new FormData();
    formData.append('file', uploadForm.file);
    formData.append('stop_index', selectedStop);
    formData.append('media_type', uploadForm.media_type);
    formData.append('title', uploadForm.title);
    formData.append('description', uploadForm.description);
    formData.append('notes', uploadForm.notes);
    
    // Add date/time if provided
    if (uploadForm.custom_date) {
      formData.append('custom_date', uploadForm.custom_date);
    }
    if (uploadForm.custom_time) {
      formData.append('custom_time', uploadForm.custom_time);
    }

    // Add geolocation if available
    if (stopCoordinates && stopCoordinates[selectedStop]) {
      formData.append('latitude', stopCoordinates[selectedStop].lat);
      formData.append('longitude', stopCoordinates[selectedStop].lng);
    }

    try {
      await api.post(`/trips/${tripId}/media/`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      // Reset form and refresh media
      setUploadForm({
        file: null,
        title: '',
        description: '',
        notes: '',
        media_type: 'photo',
        custom_date: '',
        custom_time: ''
      });
      setShowUploadModal(false);
      fetchMediaForStop(selectedStop);
    } catch (error) {
      console.error('Upload failed:', error);
      alert('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteMedia = async (mediaId) => {
    if (!confirm('Are you sure you want to delete this memory?')) return;

    try {
      await api.delete(`/trips/${tripId}/media/${mediaId}/`);
      fetchMediaForStop(selectedStop);
    } catch (error) {
      console.error('Delete failed:', error);
      alert('Delete failed. Please try again.');
    }
  };

  const getStopIcon = (stop, index) => {
    if (stop.type === 'start') return 'S';
    if (stop.type === 'end') return 'E';
    return index + 1;
  };

  const getStopColor = (stop, index) => {
    const isSelected = selectedStop === index;
    const baseColor = stop.type === 'start' ? 'green' : 
                     stop.type === 'end' ? 'red' : 'blue';
    
    return isSelected 
      ? `bg-${baseColor}-600 text-white ring-4 ring-${baseColor}-200` 
      : `bg-${baseColor}-500 text-white hover:bg-${baseColor}-600`;
  };

  const getMediaIcon = (type) => {
    switch (type) {
      case 'video': return <Video className="w-5 h-5" />;
      case 'audio': return <Mic className="w-5 h-5" />;
      default: return <Camera className="w-5 h-5" />;
    }
  };

  const formatDateTime = (media) => {
    if (media.custom_date) {
      const date = new Date(media.custom_date);
      let dateStr = date.toLocaleDateString();
      
      if (media.custom_time) {
        dateStr += ` at ${media.custom_time}`;
      }
      return dateStr;
    }
    return new Date(media.taken_at).toLocaleDateString();
  };

  const MediaThumbnail = ({ media }) => {
    if (media.media_type === 'photo') {
      return (
        <img 
          src={media.file_url} 
          alt={media.title}
          className="w-full h-full object-cover"
        />
      );
    }

    if (media.media_type === 'video') {
      return (
        <div className="relative w-full h-full bg-gray-900">
          <video 
            src={media.file_url}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
            <Play className="w-8 h-8 text-white" />
          </div>
        </div>
      );
    }

    if (media.media_type === 'audio') {
      return (
        <div className="w-full h-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
          <Mic className="w-8 h-8 text-white" />
        </div>
      );
    }
  };

  return (
    <>
      {/* Timeline Modal - NEW */}
      {showTimeline && (
        <TripTimeline
          tripId={tripId}
          onClose={() => setShowTimeline(false)}
        />
      )}

      <div className="bg-white rounded-xl shadow-lg p-6">
        {/* Header - MODIFIED: Added timeline button */}
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-gray-900">Trip Memories</h3>
          <div className="flex gap-3">
            {/* NEW: Timeline Button */}
            <button
              onClick={() => setShowTimeline(true)}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
            >
              <Film className="w-4 h-4" />
              View Timeline
            </button>
            
            <button
              onClick={() => setShowUploadModal(true)}
              disabled={selectedStop === null}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
            >
              <Upload className="w-4 h-4" />
              Upload Memory
            </button>
          </div>
        </div>

        {/* Stop Selection Circles - UNCHANGED */}
        <div className="flex items-center gap-4 mb-6">
          {stops.map((stop, index) => (
            <div key={stop.id} className="text-center">
              <button
                onClick={() => onStopSelect(index)}
                className={`w-12 h-12 rounded-full font-bold text-sm transition-all ${getStopColor(stop, index)}`}
                title={stop.name}
              >
                {getStopIcon(stop, index)}
              </button>
              <div className="text-xs mt-1 max-w-16 truncate text-gray-600">
                {stop.name.split(',')[0]}
              </div>
            </div>
          ))}
        </div>

        {/* Horizontal Line - UNCHANGED */}
        <div className="border-t border-gray-300 mb-6"></div>

        {/* Stop Name - UNCHANGED */}
        {selectedStop !== null && (
          <div className="mb-4">
            <h4 className="text-lg font-semibold text-gray-800">
              {stops[selectedStop]?.name}
            </h4>
          </div>
        )}

        {/* Media Grid - UNCHANGED */}
        <div className="grid grid-cols-3 gap-4">
          {mediaData.map((media) => (
            <div
              key={media.id}
              className="aspect-square bg-gray-200 rounded-lg overflow-hidden relative group"
            >
              {/* Media Thumbnail - Clickable */}
              <div
                onClick={() => {
                  setSelectedMedia(media);
                  setShowMediaModal(true);
                }}
                className="w-full h-full cursor-pointer hover:opacity-90 transition-opacity"
              >
                <MediaThumbnail media={media} />
              </div>
              
              {/* Media Type Icon */}
              <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white rounded-full p-1">
                {getMediaIcon(media.media_type)}
              </div>
              
              {/* Date/Time Badge */}
              <div className="absolute top-2 right-2 bg-blue-500 text-white rounded px-2 py-1 text-xs font-medium">
                {media.custom_date ? (
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {new Date(media.custom_date).toLocaleDateString()}
                  </div>
                ) : (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Now
                  </div>
                )}
              </div>

              {/* Delete Button - Shows on hover */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDeleteMedia(media.id);
                }}
                className="absolute bottom-2 right-2 bg-red-500 text-white rounded-full p-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                title="Delete this memory"
              >
                <X className="w-4 h-4" />
              </button>

              {/* Title Overlay */}
              {media.title && (
                <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-2">
                  {media.title}
                </div>
              )}
            </div>
          ))}

          {/* Empty State */}
          {selectedStop !== null && mediaData.length === 0 && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              <Camera className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>No memories yet for this stop</p>
              <p className="text-sm">Click "Upload Memory" to add photos, videos, or audio</p>
            </div>
          )}

          {/* No Stop Selected */}
          {selectedStop === null && (
            <div className="col-span-3 text-center py-8 text-gray-500">
              <MapPin className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p>Select a stop to view memories</p>
              <p className="text-sm">Click on any circle above to see photos and videos</p>
            </div>
          )}
        </div>

        {/* Upload Modal - UNCHANGED except for new form fields */}
        {showUploadModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold">
                  Add Memory to {stops[selectedStop]?.name}
                </h3>
                <button
                  onClick={() => setShowUploadModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="space-y-4">
                {/* File Upload */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Choose File
                  </label>
                  <input
                    type="file"
                    accept="image/*,video/*,audio/*"
                    onChange={handleFileSelect}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                  {uploadForm.file && (
                    <p className="text-sm text-gray-600 mt-1">
                      Selected: {uploadForm.file.name} ({uploadForm.media_type})
                    </p>
                  )}
                </div>

                {/* Title */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                  </label>
                  <input
                    type="text"
                    value={uploadForm.title}
                    onChange={(e) => setUploadForm({...uploadForm, title: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Give your memory a title..."
                  />
                </div>

                {/* Date and Time - NEW */}
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Calendar className="w-4 h-4 inline mr-1" />
                      Date
                    </label>
                    <input
                      type="date"
                      value={uploadForm.custom_date}
                      onChange={(e) => setUploadForm({...uploadForm, custom_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      <Clock className="w-4 h-4 inline mr-1" />
                      Time (optional)
                    </label>
                    <input
                      type="time"
                      value={uploadForm.custom_time}
                      onChange={(e) => setUploadForm({...uploadForm, custom_time: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Description */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    value={uploadForm.description}
                    onChange={(e) => setUploadForm({...uploadForm, description: e.target.value})}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe this memory..."
                  />
                </div>

                {/* Notes - NEW */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    <FileText className="w-4 h-4 inline mr-1" />
                    Travel Notes
                  </label>
                  <textarea
                    value={uploadForm.notes}
                    onChange={(e) => setUploadForm({...uploadForm, notes: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Add any travel notes, thoughts, or experiences..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowUploadModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpload}
                    disabled={!uploadForm.file || uploading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 flex items-center justify-center gap-2"
                  >
                    {uploading ? (
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    ) : (
                      <Upload className="w-4 h-4" />
                    )}
                    {uploading ? 'Uploading...' : 'Upload'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Media Detail Modal - UNCHANGED except for new fields display */}
        {showMediaModal && selectedMedia && (
          <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b">
                <h3 className="text-lg font-semibold">{selectedMedia.title || 'Untitled'}</h3>
                <button
                  onClick={() => setShowMediaModal(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Content */}
              <div className="p-4">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Media Display */}
                  <div className="aspect-square bg-black rounded-lg overflow-hidden flex items-center justify-center">
                    {selectedMedia.media_type === 'photo' && (
                      <img 
                        src={selectedMedia.file_url} 
                        alt={selectedMedia.title}
                        className="max-w-full max-h-full object-contain"
                      />
                    )}
                    {selectedMedia.media_type === 'video' && (
                      <video 
                        src={selectedMedia.file_url}
                        controls
                        className="max-w-full max-h-full"
                      />
                    )}
                    {selectedMedia.media_type === 'audio' && (
                      <div className="text-center text-white">
                        <Mic className="w-16 h-16 mx-auto mb-4" />
                        <audio src={selectedMedia.file_url} controls className="w-full" />
                      </div>
                    )}
                  </div>

                  {/* Media Info */}
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-2">Details</h4>
                      <div className="space-y-2 text-sm">
                        <p><span className="font-medium">Type:</span> {selectedMedia.media_type}</p>
                        <p><span className="font-medium">Stop:</span> {stops.find((_, idx) => idx === selectedMedia.stop_index)?.name || 'Unknown Stop'}</p>
                        <p><span className="font-medium">Date:</span> {formatDateTime(selectedMedia)}</p>
                        {selectedMedia.latitude && selectedMedia.longitude && (
                          <p className="flex items-center gap-1">
                            <MapPin className="w-4 h-4 text-green-500" />
                            <span className="font-medium">Location:</span> 
                            {selectedMedia.latitude.toFixed(4)}, {selectedMedia.longitude.toFixed(4)}
                          </p>
                        )}
                      </div>
                    </div>

                    {selectedMedia.description && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2">Description</h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap">
                          {selectedMedia.description}
                        </p>
                      </div>
                    )}

                    {selectedMedia.notes && (
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-2 flex items-center gap-1">
                          <FileText className="w-4 h-4" />
                          Travel Notes
                        </h4>
                        <p className="text-gray-700 text-sm whitespace-pre-wrap bg-gray-50 p-3 rounded-lg">
                          {selectedMedia.notes}
                        </p>
                      </div>
                    )}

                    <div className="pt-4 flex gap-3">
                      <a
                        href={selectedMedia.file_url}
                        download
                        className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                      >
                        <Upload className="w-4 h-4" />
                        Download
                      </a>
                      <button
                        onClick={() => {
                          setShowMediaModal(false);
                          handleDeleteMedia(selectedMedia.id);
                        }}
                        className="inline-flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                      >
                        <X className="w-4 h-4" />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
};

export default TripMemories;
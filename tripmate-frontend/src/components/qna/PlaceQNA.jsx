// src/components/qna/PlaceQNA.jsx
import React, { useState, useEffect, useRef } from 'react';
import { Search, MessageCircle, MapPin, Send, Loader, ExternalLink, BookOpen, User, Bot } from 'lucide-react';
import Button from '../common/Button';
import wikipediaService from '../../services/wikipediaService';

// Chat Message Component
const ChatMessage = ({ message, isUser }) => {
  return (
    <div className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      {!isUser && (
        <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
          <Bot className="w-4 h-4 text-white" />
        </div>
      )}
      
      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
        isUser 
          ? 'bg-blue-600 text-white' 
          : 'bg-gray-100 text-gray-900'
      }`}>
        <div className="text-sm">{message.text}</div>
        
        {message.answer && (
          <div className="mt-2">
            <div className="text-sm mb-2">{message.answer}</div>
            
            {message.thumbnail && (
              <img 
                src={message.thumbnail} 
                alt={message.title}
                className="w-full max-w-48 h-24 object-cover rounded mb-2"
              />
            )}
            
            {message.source && (
              <a
                href={message.source}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700"
              >
                <ExternalLink className="w-3 h-3" />
                Read more on Wikipedia
              </a>
            )}
          </div>
        )}
        
        <div className="text-xs opacity-70 mt-1">
          {new Date(message.timestamp).toLocaleTimeString()}
        </div>
      </div>
      
      {isUser && (
        <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0">
          <User className="w-4 h-4 text-white" />
        </div>
      )}
    </div>
  );
};

// Place Search Component
const PlaceSearchInput = ({ value, onChange, onSearch, loading }) => {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const commonPlaces = [
    'Paris', 'London', 'Tokyo', 'New York', 'Rome', 'Barcelona', 
    'Sydney', 'Dubai', 'Singapore', 'Bangkok', 'Istanbul', 'Amsterdam',
    'Kuala Lumpur', 'Seoul', 'Hong Kong', 'Berlin', 'Venice', 'Cairo'
  ];

  const handleInputChange = (e) => {
    const newValue = e.target.value;
    onChange(newValue);
    
    if (newValue.length > 0) {
      const filtered = commonPlaces.filter(place => 
        place.toLowerCase().includes(newValue.toLowerCase())
      );
      setSuggestions(filtered.slice(0, 5));
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (place) => {
    onChange(place);
    setShowSuggestions(false);
    onSearch(place);
  };

  return (
    <div className="relative">
      <div className="relative">
        <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
        <input
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyPress={(e) => e.key === 'Enter' && onSearch(value)}
          placeholder="Enter a place name (e.g., Paris, Tokyo, Singapore)"
          className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
            <Loader className="w-5 h-5 animate-spin text-blue-600" />
          </div>
        )}
      </div>
      
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-50">
          {suggestions.map((place, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(place)}
              className="w-full px-4 py-2 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
            >
              {place}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

// Main QNA Component
const PlaceQNA = () => {
  const [selectedPlace, setSelectedPlace] = useState('');
  const [question, setQuestion] = useState('');
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const [placeInfo, setPlaceInfo] = useState(null);
  const messagesEndRef = useRef(null);

  // Common questions
  const commonQuestions = [
    "What are the main attractions?",
    "What's the best time to visit?",
    "What is the weather like?",
    "What food is this place famous for?",
    "What is the history of this place?",
    "How do I get there?",
    "What language do they speak?",
    "What currency do they use?"
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(scrollToBottom, [messages]);

  const handlePlaceSearch = async (place) => {
    if (!place.trim()) return;
    
    setLoading(true);
    try {
      // Get general information about the place
      const info = await wikipediaService.answerQuestion(place, "overview information");
      setPlaceInfo(info);
      
      // Add welcome message
      const welcomeMessage = {
        id: Date.now(),
        text: `I found information about ${place}. What would you like to know?`,
        answer: info.answer,
        source: info.source,
        title: info.title,
        thumbnail: info.thumbnail,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
    } catch (error) {
      console.error('Error searching place:', error);
      const errorMessage = {
        id: Date.now(),
        text: "Sorry, I couldn't find information about that place. Please try a different search term.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages([errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleQuestionSubmit = async () => {
    if (!question.trim() || !selectedPlace.trim()) return;
    
    // Add user message
    const userMessage = {
      id: Date.now(),
      text: question,
      isUser: true,
      timestamp: new Date()
    };
    
    setMessages(prev => [...prev, userMessage]);
    setLoading(true);
    
    try {
      // Get answer from Wikipedia
      const response = await wikipediaService.answerQuestion(selectedPlace, question);
      
      // Add bot response
      const botMessage = {
        id: Date.now() + 1,
        text: `Here's what I found about "${question}" for ${selectedPlace}:`,
        answer: response.answer,
        source: response.source,
        title: response.title,
        thumbnail: response.thumbnail,
        isUser: false,
        timestamp: new Date()
      };
      
      setMessages(prev => [...prev, botMessage]);
    } catch (error) {
      const errorMessage = {
        id: Date.now() + 1,
        text: "Sorry, I couldn't find information about that. Please try rephrasing your question.",
        isUser: false,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setQuestion('');
    }
  };

  const handleQuestionClick = (q) => {
    setQuestion(q);
    setTimeout(() => handleQuestionSubmit(), 100);
  };

  const clearChat = () => {
    setMessages([]);
    setSelectedPlace('');
    setPlaceInfo(null);
    setQuestion('');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <MessageCircle className="w-8 h-8 text-blue-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Place Q&A Assistant</h1>
            <p className="text-gray-600">Ask anything about places you want to visit</p>
          </div>
        </div>
        {messages.length > 0 && (
          <Button variant="secondary" onClick={clearChat} className="w-auto">
            New Chat
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Chat Area */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-lg overflow-hidden">
            {/* Place Selection */}
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold mb-3">Select a Place</h3>
              <PlaceSearchInput
                value={selectedPlace}
                onChange={setSelectedPlace}
                onSearch={handlePlaceSearch}
                loading={loading && !selectedPlace}
              />
            </div>

            {/* Chat Messages */}
            <div className="h-96 overflow-y-auto p-6 bg-gray-50">
              {messages.length === 0 ? (
                <div className="text-center text-gray-500 mt-20">
                  <BookOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p>Search for a place above to start asking questions!</p>
                </div>
              ) : (
                <>
                  {messages.map((message) => (
                    <ChatMessage key={message.id} message={message} isUser={message.isUser} />
                  ))}
                  <div ref={messagesEndRef} />
                </>
              )}
            </div>

            {/* Question Input */}
            {selectedPlace && (
              <div className="p-6 border-t border-gray-200">
                <div className="flex gap-3">
                  <input
                    type="text"
                    value={question}
                    onChange={(e) => setQuestion(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleQuestionSubmit()}
                    placeholder={`Ask something about ${selectedPlace}...`}
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={loading}
                  />
                  <button
                    onClick={handleQuestionSubmit}
                    disabled={!question.trim() || loading}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {loading ? (
                      <Loader className="w-4 h-4 animate-spin" />
                    ) : (
                      <Send className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Common Questions */}
          {selectedPlace && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-4">Quick Questions</h3>
              <div className="space-y-2">
                {commonQuestions.map((q, index) => (
                  <button
                    key={index}
                    onClick={() => handleQuestionClick(q)}
                    className="w-full text-left px-3 py-2 text-sm bg-gray-50 hover:bg-blue-50 hover:text-blue-600 rounded-lg transition-colors"
                    disabled={loading}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tips */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Tips</h3>
            <div className="space-y-3 text-sm text-gray-600">
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">1</span>
                </div>
                <p>Start by entering a place name like "Paris" or "Tokyo"</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">2</span>
                </div>
                <p>Ask specific questions about attractions, food, weather, or history</p>
              </div>
              <div className="flex items-start gap-2">
                <div className="w-5 h-5 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-blue-600 text-xs font-bold">3</span>
                </div>
                <p>Use the quick questions for common travel information</p>
              </div>
            </div>
          </div>

          {/* Current Place Info */}
          {placeInfo && (
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h3 className="text-lg font-semibold mb-3">About {selectedPlace}</h3>
              {placeInfo.thumbnail && (
                <img 
                  src={placeInfo.thumbnail} 
                  alt={selectedPlace}
                  className="w-full h-32 object-cover rounded-lg mb-3"
                />
              )}
              <p className="text-sm text-gray-600 mb-3">
                {placeInfo.answer?.substring(0, 150)}...
              </p>
              {placeInfo.source && (
                <a
                  href={placeInfo.source}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-700"
                >
                  <ExternalLink className="w-3 h-3" />
                  View on Wikipedia
                </a>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PlaceQNA;
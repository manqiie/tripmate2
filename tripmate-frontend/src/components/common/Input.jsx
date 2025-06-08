// src/components/common/Input.jsx - Fixed icon and text alignment
import React from 'react';

const Input = ({ icon: Icon, error, className = '', ...props }) => {
  return (
    <div>
      <div className="relative">
        {Icon && (
          <Icon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 z-10" />
        )}
        <input
          className={`w-full px-4 py-3 ${Icon ? 'pl-12' : ''} bg-gray-50 border ${
            error ? 'border-red-300' : 'border-gray-200'
          } rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all disabled:bg-gray-100 disabled:cursor-not-allowed disabled:text-gray-600 ${className}`}
          {...props}
        />
      </div>
      {error && <p className="text-red-500 text-sm mt-1">{error}</p>}
    </div>
  );
};

export default Input;


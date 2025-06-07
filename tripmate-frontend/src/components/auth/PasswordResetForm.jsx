// src/components/auth/PasswordResetForm.jsx
import React, { useState } from 'react';
import { Mail, ArrowLeft } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import api from '../../services/api';

const PasswordResetForm = ({ onSwitchToLogin }) => {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/password-reset/', { email });
      setMessage(response.data.message);
    } catch (error) {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
        <p className="text-gray-600">Enter your email and we'll send you a reset link</p>
      </div>

      {message && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
          {message}
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Input
        icon={Mail}
        type="email"
        placeholder="Email address"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        required
      />

      <Button type="submit" disabled={loading}>
        {loading ? 'Sending...' : 'Send Reset Link'}
      </Button>

      <button
        type="button"
        onClick={onSwitchToLogin}
        className="w-full flex items-center justify-center gap-2 text-gray-600 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to login
      </button>
    </form>
  );
};

export default PasswordResetForm;

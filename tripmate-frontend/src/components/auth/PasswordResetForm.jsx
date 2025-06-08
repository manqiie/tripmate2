// src/components/auth/PasswordResetForm.jsx
import React, { useState } from 'react';
import { Mail, ArrowLeft, Shield } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import api from '../../services/api';

const PasswordResetForm = ({ onSwitchToLogin }) => {
  const [step, setStep] = useState('request'); // 'request' or 'confirm'
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleRequestReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/password-reset/', { email });
      setMessage(response.data.message);
      setStep('confirm');
    } catch (error) {
      setError(error.response?.data?.message || 'Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmReset = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');
    setLoading(true);

    try {
      const response = await api.post('/auth/password-reset-confirm/', {
        email,
        token,
        password,
        password2
      });
      setMessage(response.data.message);
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } catch (error) {
      setError(error.response?.data?.error || 'Invalid or expired code. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (step === 'request') {
    return (
      <form onSubmit={handleRequestReset} className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Reset Password</h2>
          <p className="text-gray-600">Enter your email and we'll send you a 6-digit reset code</p>
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
          {loading ? 'Sending...' : 'Send Reset Code'}
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
  }

  return (
    <form onSubmit={handleConfirmReset} className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Enter Reset Code</h2>
        <p className="text-gray-600">
          We've sent a 6-digit code to <strong>{email}</strong>
          <br />
          <span className="text-sm text-red-600">Code expires in 15 minutes</span>
        </p>
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

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            6-Digit Reset Code
          </label>
          <Input
            icon={Shield}
            type="text"
            placeholder="000000"
            value={token}
            onChange={(e) => setToken(e.target.value.replace(/\D/g, '').slice(0, 6))}
            maxLength={6}
            className="text-center text-2xl font-mono tracking-widest"
            required
          />
        </div>

        <Input
          type="password"
          placeholder="New password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />

        <Input
          type="password"
          placeholder="Confirm new password"
          value={password2}
          onChange={(e) => setPassword2(e.target.value)}
          required
        />
      </div>

      <Button type="submit" disabled={loading || token.length !== 6}>
        {loading ? 'Resetting...' : 'Reset Password'}
      </Button>

      <div className="flex justify-between items-center text-sm">
        <button
          type="button"
          onClick={() => setStep('request')}
          className="text-blue-600 hover:underline"
        >
          Didn't receive code?
        </button>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-gray-600 hover:text-gray-900"
        >
          Back to login
        </button>
      </div>
    </form>
  );
};

export default PasswordResetForm;
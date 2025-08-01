// src/components/auth/RegisterForm.jsx - Updated to redirect on success
import React, { useState } from 'react';
import { Eye, EyeOff, User, Mail, Lock } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';

const RegisterForm = ({ onSwitchToLogin }) => {
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    password2: '',
    first_name: '',
    last_name: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(''); // Add success state
  const { register } = useAuth();

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (errors[e.target.name]) {
      setErrors({ ...errors, [e.target.name]: '' });
    }
    // Clear success message when user starts typing again
    if (success) {
      setSuccess('');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrors({});
    setSuccess('');
    setLoading(true);
    
    const result = await register(formData);
    if (result.success) {
      setSuccess(result.message || 'Account created successfully!');
      // Clear form
      setFormData({
        username: '',
        email: '',
        password: '',
        password2: '',
        first_name: '',
        last_name: ''
      });
      // Redirect to login after 2 seconds
      setTimeout(() => {
        onSwitchToLogin();
      }, 2000);
    } else {
      setErrors(result.error);
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold text-gray-900 mb-2">Create Account</h2>
        <p className="text-gray-600">Join TripMate to start planning amazing trips</p>
      </div>

      {success && (
        <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
          {success}
          <br />
          <span className="text-xs">Redirecting to sign in...</span>
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <Input
          type="text"
          name="first_name"
          placeholder="First Name"
          value={formData.first_name}
          onChange={handleChange}
          error={errors.first_name?.[0] || errors.first_name}
          required
        />
        <Input
          type="text"
          name="last_name"
          placeholder="Last Name"
          value={formData.last_name}
          onChange={handleChange}
          error={errors.last_name?.[0] || errors.last_name}
          required
        />
      </div>

      <div className="space-y-4">
        <Input
          icon={User}
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          error={errors.username?.[0] || errors.username}
          required
        />

        <Input
          icon={Mail}
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
          error={errors.email?.[0] || errors.email}
          required
        />

        <div className="relative">
          <Input
            icon={Lock}
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            error={errors.password?.[0]}
            required
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600 z-10"
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>

        <Input
          icon={Lock}
          type={showPassword ? 'text' : 'password'}
          name="password2"
          placeholder="Confirm Password"
          value={formData.password2}
          onChange={handleChange}
          error={errors.password2?.[0] || errors.password2}
          required
        />
      </div>

      <Button type="submit" disabled={loading || success}>
        {loading ? 'Creating Account...' : success ? 'Account Created!' : 'Create Account'}
      </Button>

      <div className="text-center">
        <span className="text-gray-600">Already have an account? </span>
        <button
          type="button"
          onClick={onSwitchToLogin}
          className="text-blue-600 font-medium hover:underline"
          disabled={loading}
        >
          Sign in
        </button>
      </div>
    </form>
  );
};

export default RegisterForm;
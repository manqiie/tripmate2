// src/components/auth/ProfileForm.jsx - Updated with proper alignment and no note
import React, { useState, useEffect } from 'react';
import { User, Mail, Phone, Calendar } from 'lucide-react';
import Input from '../common/Input';
import Button from '../common/Button';
import { useAuth } from '../../contexts/AuthContext';

const ProfileForm = () => {
  const { user, updateProfile } = useAuth();
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    phone: '',
    date_of_birth: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      setFormData({
        username: user.username || '',
        email: user.email || '',
        first_name: user.first_name || '',
        last_name: user.last_name || '',
        phone: user.phone || '',
        date_of_birth: user.date_of_birth || ''
      });
    }
  }, [user]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setLoading(true);

    // Create update object with only non-empty fields
    const updateData = {};
    Object.keys(formData).forEach(key => {
      if (key !== 'username' && formData[key] !== '' && formData[key] !== null) {
        updateData[key] = formData[key];
      }
    });

    const result = await updateProfile(updateData);
    if (result.success) {
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } else {
      setError(result.error?.detail || 'Failed to update profile');
    }
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto bg-white rounded-xl shadow-lg p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">Profile Settings</h2>
          <p className="text-gray-600">Update your personal information</p>
        </div>

        {success && (
          <div className="bg-green-50 text-green-600 p-3 rounded-lg text-sm">
            Profile updated successfully!
          </div>
        )}

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          <Input
            type="text"
            name="first_name"
            placeholder="First Name"
            value={formData.first_name}
            onChange={handleChange}
          />
          <Input
            type="text"
            name="last_name"
            placeholder="Last Name"
            value={formData.last_name}
            onChange={handleChange}
          />
        </div>

        <Input
          icon={User}
          type="text"
          name="username"
          placeholder="Username"
          value={formData.username}
          onChange={handleChange}
          disabled
          className="bg-gray-100 cursor-not-allowed"
        />

        <Input
          icon={Mail}
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleChange}
        />

        <Input
          icon={Phone}
          type="tel"
          name="phone"
          placeholder="Phone Number (optional)"
          value={formData.phone}
          onChange={handleChange}
        />

        <Input
          icon={Calendar}
          type="date"
          name="date_of_birth"
          placeholder="Date of Birth (optional)"
          value={formData.date_of_birth}
          onChange={handleChange}
        />

        <Button type="submit" disabled={loading}>
          {loading ? 'Updating...' : 'Update Profile'}
        </Button>
      </form>
    </div>
  );
};

export default ProfileForm;
'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Mail, MapPin, Lock, ArrowLeft, Camera, Globe, Bell, Palette, FileText } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';

interface UserProfile {
  _id: string;
  userName: string;
  email: string;
  address?: string;
  bio?: string;
  avatar?: string;
  timezone?: string;
  theme?: 'light' | 'dark' | 'system';
  emailNotifications?: boolean;
  pushNotifications?: boolean;
}

export default function ProfilePage() {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  
  // Form states
  const [profileData, setProfileData] = useState({
    userName: '',
    email: '',
    address: '',
    bio: '',
    timezone: '',
    theme: 'system' as 'light' | 'dark' | 'system',
    emailNotifications: true,
    pushNotifications: true
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  
  const router = useRouter();
  const { theme, setTheme } = useTheme();

  // Timezone options (common ones)
  const timezones = [
    'America/New_York',
    'America/Chicago', 
    'America/Denver',
    'America/Los_Angeles',
    'Europe/London',
    'Europe/Paris',
    'Europe/Berlin',
    'Asia/Tokyo',
    'Asia/Shanghai',
    'Asia/Kolkata',
    'Australia/Sydney',
    'Pacific/Auckland'
  ];

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      const reader = new FileReader();
      reader.onload = (e) => {
        setAvatarPreview(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const fetchUserProfile = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
        setProfileData({
          userName: userData.userName || '',
          email: userData.email || '',
          address: userData.address || '',
          bio: userData.bio || '',
          timezone: userData.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
          theme: userData.theme || theme,
          emailNotifications: userData.emailNotifications !== undefined ? userData.emailNotifications : true,
          pushNotifications: userData.pushNotifications !== undefined ? userData.pushNotifications : true
        });
        
        // Sync theme with the theme provider
        if (userData.theme && userData.theme !== theme) {
          setTheme(userData.theme);
        }
      } else if (response.status === 401) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        router.push('/login');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile data');
    } finally {
      setLoading(false);
    }
  }, [router, theme, setTheme]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) {
      router.push('/login');
      return;
    }
    
    fetchUserProfile();
  }, [router, fetchUserProfile]);

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    try {
      const token = localStorage.getItem('token');
      
      // Check if we need to upload a file
      if (avatarFile) {
        // Use FormData for file upload
        const formData = new FormData();
        Object.entries(profileData).forEach(([key, value]) => {
          formData.append(key, value.toString());
        });
        formData.append('avatar', avatarFile);

        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`
            // Don't set Content-Type, let browser set it for FormData
          },
          body: formData
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setUser(updatedUser);
          setIsEditing(false);
          setAvatarFile(null);
          setAvatarPreview(null);
          setMessage('Profile updated successfully with new avatar!');
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to update profile');
        }
      } else {
        // Use JSON for regular updates (no file)
        const response = await fetch('/api/user/profile', {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify(profileData)
        });

        if (response.ok) {
          const updatedUser = await response.json();
          setUser(updatedUser);
          setIsEditing(false);
          setMessage('Profile updated successfully!');
        } else {
          const errorData = await response.json();
          setError(errorData.message || 'Failed to update profile');
        }
      }
      
      // Update localStorage user data for any successful update
      if (user) {
        localStorage.setItem('user', JSON.stringify({
          id: user._id,
          userName: user.userName
        }));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError('Failed to update profile');
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage('');
    setError('');

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('New password must be at least 6 characters long');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/user/change-password', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword
        })
      });

      if (response.ok) {
        setIsChangingPassword(false);
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setMessage('Password changed successfully!');
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError('Failed to change password');
    }
  };

  const handleGoBack = () => {
    router.push('/dashboard');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <button
            onClick={handleGoBack}
            className="inline-flex items-center text-blue-600 hover:text-blue-800 mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-foreground">User Profile</h1>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-4 p-4 bg-green-100 border border-green-400 text-green-700 rounded">
            {message}
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-card shadow rounded-lg p-6 mb-6 border border-theme">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-foreground">
            <User className="w-5 h-5 mr-2" />
            Profile Information
          </h2>
          
          {!isEditing ? (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-4">
                <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                  {user?.avatar ? (
                    <Image src={user.avatar} alt="Profile" width={80} height={80} className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-8 h-8 text-gray-400" />
                  )}
                </div>
                <div>
                  <p className="text-sm text-gray-600">Profile Picture</p>
                  <p className="font-medium">{user?.avatar ? 'Custom avatar' : 'Default avatar'}</p>
                </div>
              </div>

              {/* Basic Info */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <User className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Username</p>
                    <p className="font-medium">{user?.userName}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <Mail className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium">{user?.email}</p>
                  </div>
                </div>
                
                <div className="flex items-center">
                  <MapPin className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Address</p>
                    <p className="font-medium">{user?.address || 'Not specified'}</p>
                  </div>
                </div>

                <div className="flex items-center">
                  <Globe className="w-4 h-4 mr-3 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Timezone</p>
                    <p className="font-medium">{user?.timezone || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Bio */}
              <div className="flex items-start">
                <FileText className="w-4 h-4 mr-3 text-gray-400 mt-1" />
                <div className="flex-1">
                  <p className="text-sm text-gray-600">Bio</p>
                  <p className="font-medium">{user?.bio || 'No bio available'}</p>
                </div>
              </div>

              {/* Preferences */}
              <div className="border-t pt-4">
                <h3 className="text-lg font-medium mb-3 flex items-center">
                  <Palette className="w-4 h-4 mr-2" />
                  Preferences
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Theme</p>
                    <p className="font-medium capitalize">{user?.theme || 'System'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Notifications</p>
                    <div className="space-y-1">
                      <p className="text-sm">
                        Email: <span className="font-medium">{user?.emailNotifications ? 'Enabled' : 'Disabled'}</span>
                      </p>
                      <p className="text-sm">
                        Push: <span className="font-medium">{user?.pushNotifications ? 'Enabled' : 'Disabled'}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <button
                onClick={() => setIsEditing(true)}
                className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                Edit Profile
              </button>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-6">
              {/* Avatar Upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Profile Picture</label>
                <div className="flex items-center space-x-4">
                  <div className="w-20 h-20 bg-gray-200 rounded-full flex items-center justify-center overflow-hidden">
                    {avatarPreview || user?.avatar ? (
                      <Image 
                        src={avatarPreview || user?.avatar || ''} 
                        alt="Profile preview" 
                        width={80}
                        height={80}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                  <div>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleAvatarChange}
                      className="hidden"
                      id="avatar-upload"
                    />
                    <label
                      htmlFor="avatar-upload"
                      className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer"
                    >
                      <Camera className="w-4 h-4 mr-2" />
                      Choose Photo
                    </label>
                  </div>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Username</label>
                  <input
                    type="text"
                    value={profileData.userName}
                    onChange={(e) => setProfileData({ ...profileData, userName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Address</label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter your address"
                />
              </div>

              {/* Bio */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Bio</label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={3}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Tell us about yourself..."
                />
              </div>

              {/* Timezone */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Timezone</label>
                <select
                  value={profileData.timezone}
                  onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  {timezones.map((tz) => (
                    <option key={tz} value={tz}>{tz}</option>
                  ))}
                </select>
              </div>

              {/* Theme */}
              <div>
                <label className="block text-sm font-medium text-gray-700">Theme</label>
                <select
                  value={profileData.theme}
                  onChange={(e) => {
                    const newTheme = e.target.value as 'light' | 'dark' | 'system';
                    setProfileData({ ...profileData, theme: newTheme });
                    setTheme(newTheme); // Apply theme immediately
                  }}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="system">System</option>
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                </select>
              </div>

              {/* Notifications */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">Notifications</label>
                <div className="space-y-2">
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profileData.emailNotifications}
                      onChange={(e) => setProfileData({ ...profileData, emailNotifications: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Bell className="w-4 h-4 mr-2 text-gray-400" />
                    Email notifications
                  </label>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={profileData.pushNotifications}
                      onChange={(e) => setProfileData({ ...profileData, pushNotifications: e.target.checked })}
                      className="mr-2 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <Bell className="w-4 h-4 mr-2 text-gray-400" />
                    Push notifications
                  </label>
                </div>
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Save Changes
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsEditing(false);
                    setProfileData({
                      userName: user?.userName || '',
                      email: user?.email || '',
                      address: user?.address || '',
                      bio: user?.bio || '',
                      timezone: user?.timezone || Intl.DateTimeFormat().resolvedOptions().timeZone,
                      theme: user?.theme || 'system',
                      emailNotifications: user?.emailNotifications !== undefined ? user.emailNotifications : true,
                      pushNotifications: user?.pushNotifications !== undefined ? user.pushNotifications : true
                    });
                    setAvatarFile(null);
                    setAvatarPreview(null);
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Change Password */}
        <div className="bg-card shadow rounded-lg p-6 border border-theme">
          <h2 className="text-xl font-semibold mb-4 flex items-center text-foreground">
            <Lock className="w-5 h-5 mr-2" />
            Change Password
          </h2>
          
          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="w-full px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 focus:outline-none focus:ring-2 focus:ring-yellow-500"
            >
              Change Password
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Current Password</label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">New Password</label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700">Confirm New Password</label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="mt-1 block w-full px-3 py-2 bg-input text-foreground border border-theme rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                  required
                  minLength={6}
                />
              </div>
              
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500"
                >
                  Update Password
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
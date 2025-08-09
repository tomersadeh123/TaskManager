'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import { User, Mail, MapPin, Lock, ArrowLeft, Camera, Globe, Bell, Palette, FileText, Edit3 } from 'lucide-react';
import { useTheme } from '@/components/ThemeProvider';
import LinkedInConnection from '@/components/LinkedInConnection';

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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 dark:from-slate-900 dark:via-slate-800 dark:to-slate-900">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={handleGoBack}
            className="group inline-flex items-center text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 mb-6 transition-all duration-200"
          >
            <div className="p-2 rounded-xl bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm group-hover:bg-white dark:group-hover:bg-slate-700 transition-colors mr-3">
              <ArrowLeft className="w-4 h-4" />
            </div>
            <span className="font-medium">Back to Dashboard</span>
          </button>
          <div className="text-left">
            <h1 className="text-4xl font-bold bg-gradient-to-r from-slate-900 to-slate-600 dark:from-slate-100 dark:to-slate-300 bg-clip-text text-transparent mb-2">Profile Settings</h1>
            <p className="text-slate-600 dark:text-slate-400 text-lg">Manage your account settings and preferences</p>
          </div>
        </div>

        {/* Messages */}
        {message && (
          <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
              {message}
            </div>
          </div>
        )}
        
        {error && (
          <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl backdrop-blur-sm">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-red-500 rounded-full mr-3"></div>
              {error}
            </div>
          </div>
        )}

        {/* Profile Information */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-3xl p-8 mb-8 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center">
              <div className="p-3 bg-gradient-to-r from-blue-500 to-purple-600 rounded-2xl mr-4">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Profile Information</h2>
                <p className="text-slate-600 dark:text-slate-400">Update your personal details</p>
              </div>
            </div>
            {!isEditing && (
              <button
                onClick={() => setIsEditing(true)}
                className="group px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl"
              >
                <div className="flex items-center">
                  <Edit3 className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                  Edit Profile
                </div>
              </button>
            )}
          </div>
          
          {!isEditing ? (
            <div className="space-y-6">
              {/* Avatar Section */}
              <div className="flex items-center space-x-6 mb-8">
                <div className="relative">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl flex items-center justify-center overflow-hidden p-1">
                    <div className="w-full h-full bg-white dark:bg-slate-800 rounded-[20px] flex items-center justify-center overflow-hidden">
                      {user?.avatar ? (
                        <Image src={user.avatar} alt="Profile" width={88} height={88} className="w-full h-full object-cover" />
                      ) : (
                        <User className="w-10 h-10 text-slate-400" />
                      )}
                    </div>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-green-500 rounded-full border-4 border-white dark:border-slate-800 flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-1">{user?.userName}</h3>
                  <p className="text-slate-600 dark:text-slate-400 mb-1">{user?.email}</p>
                  <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400">
                    <div className="w-1.5 h-1.5 bg-green-500 rounded-full mr-2"></div>
                    Active
                  </span>
                </div>
              </div>

              {/* Basic Info Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                <div className="group p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                      <User className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Username</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.userName}</p>
                </div>
                
                <div className="group p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                      <Mail className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Email</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.email}</p>
                </div>
                
                <div className="group p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-purple-100 dark:bg-purple-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                      <MapPin className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Address</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.address || 'Not specified'}</p>
                </div>

                <div className="group p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-all duration-300">
                  <div className="flex items-center mb-3">
                    <div className="p-2 bg-orange-100 dark:bg-orange-900/30 rounded-xl mr-3 group-hover:scale-110 transition-transform">
                      <Globe className="w-4 h-4 text-orange-600 dark:text-orange-400" />
                    </div>
                    <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Timezone</span>
                  </div>
                  <p className="text-lg font-semibold text-slate-900 dark:text-slate-100">{user?.timezone || 'Not specified'}</p>
                </div>
              </div>

              {/* Bio */}
              <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl mb-8">
                <div className="flex items-center mb-4">
                  <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-xl mr-3">
                    <FileText className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Bio</span>
                </div>
                <p className="text-slate-900 dark:text-slate-100 leading-relaxed">{user?.bio || 'No bio available'}</p>
              </div>

              {/* Preferences */}
              <div className="space-y-6">
                <div className="flex items-center mb-6">
                  <div className="p-2 bg-pink-100 dark:bg-pink-900/30 rounded-xl mr-3">
                    <Palette className="w-5 h-5 text-pink-600 dark:text-pink-400" />
                  </div>
                  <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100">Preferences</h3>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Theme</span>
                    </div>
                    <p className="text-lg font-semibold text-slate-900 dark:text-slate-100 capitalize">{user?.theme || 'System'}</p>
                  </div>
                  
                  <div className="p-6 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                    <div className="flex items-center mb-3">
                      <div className="w-3 h-3 bg-gradient-to-r from-green-500 to-blue-500 rounded-full mr-3"></div>
                      <span className="text-sm font-medium text-slate-600 dark:text-slate-400">Notifications</span>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">Email</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user?.emailNotifications 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {user?.emailNotifications ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-slate-700 dark:text-slate-300">Push</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                          user?.pushNotifications 
                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400' 
                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-400'
                        }`}>
                          {user?.pushNotifications ? 'Enabled' : 'Disabled'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <form onSubmit={handleProfileUpdate} className="space-y-8">
              {/* Avatar Upload */}
              <div className="text-center">
                <label className="block text-lg font-semibold text-slate-900 dark:text-slate-100 mb-6">Profile Picture</label>
                <div className="flex flex-col items-center space-y-6">
                  <div className="relative group">
                    <div className="w-32 h-32 bg-gradient-to-r from-blue-400 to-purple-500 rounded-3xl flex items-center justify-center overflow-hidden p-1">
                      <div className="w-full h-full bg-white dark:bg-slate-800 rounded-[28px] flex items-center justify-center overflow-hidden">
                        {avatarPreview || user?.avatar ? (
                          <Image 
                            src={avatarPreview || user?.avatar || ''} 
                            alt="Profile preview" 
                            width={120}
                            height={120}
                            className="w-full h-full object-cover" 
                          />
                        ) : (
                          <User className="w-12 h-12 text-slate-400" />
                        )}
                      </div>
                    </div>
                    <div className="absolute inset-0 bg-black/40 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Camera className="w-8 h-8 text-white" />
                    </div>
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
                      className="group inline-flex items-center px-6 py-3 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl cursor-pointer transition-all duration-300 transform hover:scale-105"
                    >
                      <Camera className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                      <span className="font-medium">Choose Photo</span>
                    </label>
                  </div>
                </div>
              </div>

              {/* Basic Fields */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <User className="w-4 h-4 mr-2 text-blue-500" />
                    Username
                  </label>
                  <input
                    type="text"
                    value={profileData.userName}
                    onChange={(e) => setProfileData({ ...profileData, userName: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Mail className="w-4 h-4 mr-2 text-green-500" />
                    Email
                  </label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <MapPin className="w-4 h-4 mr-2 text-purple-500" />
                  Address
                </label>
                <input
                  type="text"
                  value={profileData.address}
                  onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all duration-300"
                  placeholder="Enter your address"
                />
              </div>

              {/* Bio */}
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <FileText className="w-4 h-4 mr-2 text-indigo-500" />
                  Bio
                </label>
                <textarea
                  value={profileData.bio}
                  onChange={(e) => setProfileData({ ...profileData, bio: e.target.value })}
                  rows={4}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all duration-300 resize-none"
                  placeholder="Tell us about yourself..."
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Timezone */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Globe className="w-4 h-4 mr-2 text-orange-500" />
                    Timezone
                  </label>
                  <select
                    value={profileData.timezone}
                    onChange={(e) => setProfileData({ ...profileData, timezone: e.target.value })}
                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-all duration-300"
                  >
                    {timezones.map((tz) => (
                      <option key={tz} value={tz}>{tz}</option>
                    ))}
                  </select>
                </div>

                {/* Theme */}
                <div className="space-y-2">
                  <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                    <Palette className="w-4 h-4 mr-2 text-pink-500" />
                    Theme
                  </label>
                  <select
                    value={profileData.theme}
                    onChange={(e) => {
                      const newTheme = e.target.value as 'light' | 'dark' | 'system';
                      setProfileData({ ...profileData, theme: newTheme });
                      setTheme(newTheme); // Apply theme immediately
                    }}
                    className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-pink-500 focus:border-transparent transition-all duration-300"
                  >
                    <option value="system">System</option>
                    <option value="light">Light</option>
                    <option value="dark">Dark</option>
                  </select>
                </div>
              </div>

              {/* Notifications */}
              <div className="space-y-4">
                <div className="flex items-center mb-4">
                  <Bell className="w-5 h-5 mr-3 text-blue-500" />
                  <label className="text-lg font-semibold text-slate-900 dark:text-slate-100">Notifications</label>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <label className="group flex items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-300">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={profileData.emailNotifications}
                        onChange={(e) => setProfileData({ ...profileData, emailNotifications: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                        profileData.emailNotifications ? 'bg-blue-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${
                          profileData.emailNotifications ? 'translate-x-6' : 'translate-x-0.5'
                        } mt-0.5`}></div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <Mail className="w-4 h-4 mr-2 text-blue-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">Email notifications</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Receive updates via email</p>
                    </div>
                  </label>
                  
                  <label className="group flex items-center p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-700 cursor-pointer transition-all duration-300">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={profileData.pushNotifications}
                        onChange={(e) => setProfileData({ ...profileData, pushNotifications: e.target.checked })}
                        className="sr-only"
                      />
                      <div className={`w-12 h-6 rounded-full transition-all duration-300 ${
                        profileData.pushNotifications ? 'bg-green-500' : 'bg-slate-300 dark:bg-slate-600'
                      }`}>
                        <div className={`w-5 h-5 bg-white rounded-full shadow-lg transition-all duration-300 transform ${
                          profileData.pushNotifications ? 'translate-x-6' : 'translate-x-0.5'
                        } mt-0.5`}></div>
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="flex items-center">
                        <Bell className="w-4 h-4 mr-2 text-green-500" />
                        <span className="font-medium text-slate-900 dark:text-slate-100">Push notifications</span>
                      </div>
                      <p className="text-sm text-slate-600 dark:text-slate-400">Receive push notifications</p>
                    </div>
                  </label>
                </div>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="submit"
                  className="group flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 bg-white/20 rounded-full mr-3 flex items-center justify-center">
                      <div className="w-2 h-2 bg-white rounded-full"></div>
                    </div>
                    Save Changes
                  </div>
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
                  className="group flex-1 px-8 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 bg-slate-400/20 rounded-full mr-3 flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                    </div>
                    Cancel
                  </div>
                </button>
              </div>
            </form>
          )}
        </div>

        {/* LinkedIn Integration */}
        <LinkedInConnection onConnectionChange={(connected) => {
          if (connected) {
            setMessage('LinkedIn account connected successfully! You can now get personalized job recommendations.');
          }
        }} />

        {/* Change Password */}
        <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-3xl p-8 mb-8 border border-white/20 dark:border-slate-700/30">
          <div className="flex items-center mb-8">
            <div className="p-3 bg-gradient-to-r from-red-500 to-pink-600 rounded-2xl mr-4">
              <Lock className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">Security Settings</h2>
              <p className="text-slate-600 dark:text-slate-400">Update your password to keep your account secure</p>
            </div>
          </div>
          
          {!isChangingPassword ? (
            <button
              onClick={() => setIsChangingPassword(true)}
              className="group w-full px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
            >
              <div className="flex items-center justify-center">
                <Lock className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                Change Password
              </div>
            </button>
          ) : (
            <form onSubmit={handlePasswordChange} className="space-y-6">
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Lock className="w-4 h-4 mr-2 text-slate-500" />
                  Current Password
                </label>
                <input
                  type="password"
                  value={passwordData.currentPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-300"
                  required
                  placeholder="Enter your current password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Lock className="w-4 h-4 mr-2 text-green-500" />
                  New Password
                </label>
                <input
                  type="password"
                  value={passwordData.newPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent transition-all duration-300"
                  required
                  minLength={6}
                  placeholder="Enter your new password"
                />
              </div>
              
              <div className="space-y-2">
                <label className="flex items-center text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <Lock className="w-4 h-4 mr-2 text-blue-500" />
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwordData.confirmPassword}
                  onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                  className="block w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                  required
                  minLength={6}
                  placeholder="Confirm your new password"
                />
              </div>
              
              <div className="flex flex-col sm:flex-row gap-4 pt-6">
                <button
                  type="submit"
                  className="group flex-1 px-8 py-4 bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
                >
                  <div className="flex items-center justify-center">
                    <Lock className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                    Update Password
                  </div>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setIsChangingPassword(false);
                    setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  }}
                  className="group flex-1 px-8 py-4 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl transition-all duration-300 transform hover:scale-105 font-semibold"
                >
                  <div className="flex items-center justify-center">
                    <div className="w-5 h-5 bg-slate-400/20 rounded-full mr-3 flex items-center justify-center">
                      <div className="w-2 h-2 bg-slate-500 rounded-full"></div>
                    </div>
                    Cancel
                  </div>
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
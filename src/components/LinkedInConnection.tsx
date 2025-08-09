'use client';

import { useState, useEffect, useCallback } from 'react';
import Image from 'next/image';
import { Linkedin, ExternalLink, Unlink, User, CheckCircle, AlertCircle } from 'lucide-react';

interface LinkedInProfile {
  firstName: string;
  lastName: string;
  headline: string;
  profilePicture: string;
  location: string;
  industry: string;
  connectedAt?: Date;
  loginStatus: string;
}

interface LinkedInConnectionProps {
  onConnectionChange?: (isConnected: boolean) => void;
}

export default function LinkedInConnection({ onConnectionChange }: LinkedInConnectionProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [profile, setProfile] = useState<LinkedInProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [showCredentialForm, setShowCredentialForm] = useState(false);
  const [credentials, setCredentials] = useState({ email: '', password: '' });
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const checkLinkedInStatus = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/linkedin/status', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(data.result.isConnected);
        setProfile(data.result.profile);
        
        // Check if credentials need updating
        if (data.result.needsUpdate) {
          setError(`⚠️ ${data.result.updateReason || 'Please re-enter your LinkedIn credentials'}`);
          setIsConnected(false);
        }
        
        if (onConnectionChange) {
          onConnectionChange(data.result.isConnected);
        }
      }
    } catch (error) {
      console.error('Error checking LinkedIn status:', error);
    } finally {
      setLoading(false);
    }
  }, [onConnectionChange]);

  // Check LinkedIn connection status on component mount
  useEffect(() => {
    checkLinkedInStatus();
  }, [checkLinkedInStatus]);

  const handleConnect = () => {
    setShowCredentialForm(true);
    setError('');
    setMessage('');
  };

  const handleCredentialSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setConnecting(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/linkedin/credentials', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials)
      });

      if (response.ok) {
        const data = await response.json();
        setIsConnected(true);
        setProfile(data.result.profile);
        setShowCredentialForm(false);
        setCredentials({ email: '', password: '' });
        setMessage('LinkedIn credentials saved successfully!');
        
        if (onConnectionChange) {
          onConnectionChange(true);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to save LinkedIn credentials');
      }
    } catch (error) {
      console.error('Error saving LinkedIn credentials:', error);
      setError('Failed to save LinkedIn credentials');
    } finally {
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    if (!confirm('Are you sure you want to remove your LinkedIn credentials? This will remove access to personalized job recommendations.')) {
      return;
    }

    setDisconnecting(true);
    setError('');
    setMessage('');

    try {
      const token = localStorage.getItem('token');
      const response = await fetch('/api/auth/linkedin/credentials', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        setIsConnected(false);
        setProfile(null);
        setMessage('LinkedIn credentials removed successfully');
        
        if (onConnectionChange) {
          onConnectionChange(false);
        }
      } else {
        const errorData = await response.json();
        setError(errorData.message || 'Failed to remove LinkedIn credentials');
      }
    } catch (error) {
      console.error('Error removing LinkedIn credentials:', error);
      setError('Failed to remove LinkedIn credentials');
    } finally {
      setDisconnecting(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
        <div className="flex items-center justify-center py-8">
          <div className="animate-pulse flex items-center">
            <div className="w-8 h-8 bg-blue-500 rounded-full mr-3"></div>
            <div className="text-slate-600 dark:text-slate-400">Checking LinkedIn status...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl shadow-2xl shadow-slate-200/50 dark:shadow-slate-900/50 rounded-3xl p-8 border border-white/20 dark:border-slate-700/30">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center">
          <div className="p-3 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl mr-4">
            <Linkedin className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-slate-900 dark:text-slate-100">LinkedIn Integration</h2>
            <p className="text-slate-600 dark:text-slate-400">Connect your LinkedIn for personalized job recommendations</p>
          </div>
        </div>
        <div className="flex items-center">
          {isConnected ? (
            <div className="flex items-center px-4 py-2 bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-400 rounded-full">
              <CheckCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Connected</span>
            </div>
          ) : (
            <div className="flex items-center px-4 py-2 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 rounded-full">
              <AlertCircle className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">Not Connected</span>
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      {message && (
        <div className="mb-6 p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 text-green-700 dark:text-green-400 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center">
            <CheckCircle className="w-5 h-5 mr-3" />
            {message}
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 rounded-2xl backdrop-blur-sm">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 mr-3" />
            {error}
          </div>
        </div>
      )}

      {isConnected && profile ? (
        <div className="space-y-6">
          {/* Connected Profile */}
          <div className="p-6 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-2xl border border-blue-200 dark:border-blue-800">
            <div className="flex items-center space-x-4">
              <div className="relative">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-400 to-blue-500 rounded-2xl flex items-center justify-center overflow-hidden p-0.5">
                  <div className="w-full h-full bg-white dark:bg-slate-800 rounded-[14px] flex items-center justify-center overflow-hidden">
                    {profile.profilePicture ? (
                      <Image 
                        src={profile.profilePicture} 
                        alt="LinkedIn Profile" 
                        width={60}
                        height={60}
                        className="w-full h-full object-cover" 
                      />
                    ) : (
                      <User className="w-8 h-8 text-slate-400" />
                    )}
                  </div>
                </div>
                <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-blue-600 rounded-full border-2 border-white dark:border-slate-800 flex items-center justify-center">
                  <Linkedin className="w-3 h-3 text-white" />
                </div>
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">
                  {profile.firstName} {profile.lastName}
                </h3>
                {profile.headline && (
                  <p className="text-sm text-slate-600 dark:text-slate-400 mb-1">{profile.headline}</p>
                )}
                {profile.location && (
                  <p className="text-sm text-slate-500 dark:text-slate-500">{profile.location}</p>
                )}
                {profile.connectedAt && (
                  <p className="text-xs text-blue-600 dark:text-blue-400 mt-2">
                    Connected {new Date(profile.connectedAt).toLocaleDateString()}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Personalized Jobs</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">Job recommendations based on your LinkedIn profile and network</p>
            </div>
            <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
              <div className="flex items-center mb-2">
                <div className="w-2 h-2 bg-blue-500 rounded-full mr-3"></div>
                <span className="text-sm font-medium text-slate-900 dark:text-slate-100">Network Insights</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-400">See jobs where you have connections at companies</p>
            </div>
          </div>

          {/* Disconnect Button */}
          <div className="pt-4">
            <button
              onClick={handleDisconnect}
              disabled={disconnecting}
              className="group w-full px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-red-100 dark:hover:bg-red-900/30 text-slate-700 dark:text-slate-300 hover:text-red-700 dark:hover:text-red-400 rounded-2xl transition-all duration-300 transform hover:scale-105 font-medium border border-slate-300 dark:border-slate-600 hover:border-red-300 dark:hover:border-red-700"
            >
              <div className="flex items-center justify-center">
                <Unlink className={`w-4 h-4 mr-3 ${disconnecting ? 'animate-spin' : 'group-hover:rotate-12'} transition-transform`} />
                {disconnecting ? 'Disconnecting...' : 'Disconnect LinkedIn'}
              </div>
            </button>
          </div>
        </div>
      ) : (
        <div className="py-8">
          {!showCredentialForm ? (
            <div className="text-center">
              {/* Connect to LinkedIn */}
              <div className="mb-6">
                <div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-blue-700 rounded-3xl mx-auto mb-4 flex items-center justify-center">
                  <Linkedin className="w-10 h-10 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Add Your LinkedIn Credentials</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-md mx-auto">
                  Enter your LinkedIn login details to enable personalized job scraping from your account. 
                  Your credentials are encrypted and stored securely.
                </p>
              </div>

              {/* Benefits */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/30 rounded-xl mx-auto mb-3 flex items-center justify-center">
                    <ExternalLink className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Your Network</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Access jobs from your personal LinkedIn feed</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="w-8 h-8 bg-green-100 dark:bg-green-900/30 rounded-xl mx-auto mb-3 flex items-center justify-center">
                    <User className="w-4 h-4 text-green-600 dark:text-green-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Personalized</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Jobs matched to your profile and preferences</p>
                </div>
                <div className="p-4 bg-slate-50 dark:bg-slate-700/50 rounded-2xl">
                  <div className="w-8 h-8 bg-purple-100 dark:bg-purple-900/30 rounded-xl mx-auto mb-3 flex items-center justify-center">
                    <CheckCircle className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                  </div>
                  <h4 className="font-semibold text-slate-900 dark:text-slate-100 mb-1">Secure</h4>
                  <p className="text-xs text-slate-600 dark:text-slate-400">Credentials are encrypted and never shared</p>
                </div>
              </div>

              {/* Add Credentials Button */}
              <button
                onClick={handleConnect}
                className="group px-8 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold"
              >
                <div className="flex items-center justify-center">
                  <Linkedin className="w-5 h-5 mr-3 group-hover:rotate-12 transition-transform" />
                  Add LinkedIn Credentials
                </div>
              </button>

              <p className="text-xs text-slate-500 dark:text-slate-500 mt-4">
                We only use your credentials for job scraping. Never for posting or messaging.
              </p>
            </div>
          ) : (
            <div className="max-w-md mx-auto">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-blue-700 rounded-2xl mx-auto mb-4 flex items-center justify-center">
                  <Linkedin className="w-8 h-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-slate-100 mb-2">Enter LinkedIn Credentials</h3>
                <p className="text-slate-600 dark:text-slate-400 text-sm">
                  Your login details will be encrypted and used only for job scraping
                </p>
              </div>

              <form onSubmit={handleCredentialSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    LinkedIn Email
                  </label>
                  <input
                    type="email"
                    value={credentials.email}
                    onChange={(e) => setCredentials({ ...credentials, email: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="your.email@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-2">
                    LinkedIn Password
                  </label>
                  <input
                    type="password"
                    value={credentials.password}
                    onChange={(e) => setCredentials({ ...credentials, password: e.target.value })}
                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-2xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300"
                    placeholder="Your LinkedIn password"
                    required
                  />
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-2xl p-4 mb-4">
                  <div className="flex items-start">
                    <Linkedin className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-blue-800 dark:text-blue-200">
                      <p className="font-medium mb-2">⚠️ Important: Login Required</p>
                      <p className="mb-2">
                        <strong>Before saving your credentials</strong>, you must be logged into LinkedIn in this browser. 
                      </p>
                      <p className="mb-2">📱 <strong>Mobile users:</strong> This works on mobile browsers too!</p>
                      <div className="mt-3 p-3 bg-blue-100 dark:bg-blue-800/30 rounded-xl">
                        <p className="font-medium text-xs">Steps to follow:</p>
                        <ol className="list-decimal ml-4 mt-1 text-xs space-y-1">
                          <li>Open LinkedIn.com in this browser/tab</li>
                          <li>Log in to your LinkedIn account</li>
                          <li>Come back to this page</li>
                          <li>Enter your credentials below</li>
                        </ol>
                        <button
                          type="button"
                          onClick={() => window.open('https://www.linkedin.com/login', '_blank')}
                          className="mt-3 w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium rounded-lg transition-colors flex items-center justify-center"
                        >
                          <ExternalLink className="w-3 h-3 mr-2" />
                          Open LinkedIn Login
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-2xl p-4">
                  <div className="flex items-start">
                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 mt-0.5 mr-3 flex-shrink-0" />
                    <div className="text-sm text-amber-800 dark:text-amber-200">
                      <p className="font-medium mb-1">Security Notice</p>
                      <p>Your credentials are encrypted with AES-256 encryption and stored securely. We recommend using a dedicated LinkedIn account for job scraping.</p>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="submit"
                    disabled={connecting}
                    className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 disabled:from-blue-400 disabled:to-blue-500 text-white rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl font-semibold disabled:transform-none"
                  >
                    <div className="flex items-center justify-center">
                      <Linkedin className={`w-4 h-4 mr-2 ${connecting ? 'animate-pulse' : ''}`} />
                      {connecting ? 'Saving...' : 'Save Credentials'}
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowCredentialForm(false);
                      setCredentials({ email: '', password: '' });
                      setError('');
                    }}
                    className="px-6 py-3 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-300 rounded-2xl transition-all duration-300 font-medium"
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
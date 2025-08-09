'use client';

import { useState, useEffect } from 'react';
import { useNotifications } from '@/hooks/useNotifications';

export default function TestNotifications() {
  const [userId, setUserId] = useState<string>('');
  const [token, setToken] = useState<string>('');
  
  const { notifications, unreadCount, socket } = useNotifications(userId, token);

  useEffect(() => {
    // Get user data from localStorage
    const storedToken = localStorage.getItem('token');
    const storedUser = localStorage.getItem('user');
    
    if (storedToken) {
      setToken(storedToken);
    }
    
    if (storedUser) {
      try {
        const user = JSON.parse(storedUser);
        setUserId(user.id || user._id);
      } catch (error) {
        console.error('Error parsing user data:', error);
      }
    }
  }, []);

  const testNotification = async () => {
    try {
      const response = await fetch('/api/notifications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          userId,
          title: 'Test Notification',
          message: 'This is a test notification to check if the system works!',
          type: 'system',
          data: { test: true }
        })
      });

      const result = await response.json();
      console.log('Test notification result:', result);
    } catch (error) {
      console.error('Error creating test notification:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">Notification System Test</h1>
        
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Debug Info</h2>
          <div className="space-y-2 text-sm">
            <p><strong>User ID:</strong> {userId || 'Not set'}</p>
            <p><strong>Token:</strong> {token ? 'Set' : 'Not set'}</p>
            <p><strong>Socket Connected:</strong> {socket?.connected ? '✅ Yes' : '❌ No'}</p>
            <p><strong>Socket ID:</strong> {socket?.id || 'N/A'}</p>
            <p><strong>Unread Count:</strong> {unreadCount}</p>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-semibold mb-4">Actions</h2>
          <button
            onClick={testNotification}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            disabled={!userId || !token}
          >
            Send Test Notification
          </button>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4">Recent Notifications ({notifications.length})</h2>
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications yet...</p>
          ) : (
            <div className="space-y-3">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification._id} className="border-l-4 border-blue-500 pl-4 py-2">
                  <h3 className="font-medium">{notification.title}</h3>
                  <p className="text-gray-600">{notification.message}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(notification.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
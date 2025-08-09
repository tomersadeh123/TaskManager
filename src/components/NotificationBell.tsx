'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { Bell, X } from 'lucide-react';
import toast from 'react-hot-toast';

interface Notification {
  _id: string;
  title: string;
  message: string;
  type: 'bill' | 'task' | 'system' | 'reminder';
  read: boolean;
  createdAt: string;
}

export default function NotificationBell() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [lastFetched, setLastFetched] = useState<string>('');
  const [isFirstLoad, setIsFirstLoad] = useState(true);
  const [buttonPosition, setButtonPosition] = useState({ top: 0, right: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await fetch('/api/notifications?limit=10', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();

        // Only show toasts for truly new notifications (not on first load)
        if (!isFirstLoad && !showDropdown && lastFetched) {
          const newNotifications = data.notifications.filter((n: Notification) => {
            const notificationTime = new Date(n.createdAt).getTime();
            const lastFetchedTime = new Date(lastFetched).getTime();

            // Only show toast if:
            // 1. Notification is newer than last fetch
            // 2. We haven't seen this notification before
            return notificationTime > lastFetchedTime &&
                   !notifications.some(existing => existing._id === n._id);
          });

          newNotifications.forEach((notification: Notification) => {
            toast.success(notification.message, {
              duration: 4000,
              position: 'top-right',
            });
          });
        }

        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
        setLastFetched(new Date().toISOString());
        
        if (isFirstLoad) {
          setIsFirstLoad(false);
        }
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  }, [isFirstLoad, lastFetched, notifications, showDropdown]);

  const markAsRead = async (notificationId: string) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds: [notificationId] }),
      });

      // Update local state
      setNotifications(prev => 
        prev.map(n => n._id === notificationId ? { ...n, read: true } : n)
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  // Poll for notifications every 30 seconds (less aggressive)
  useEffect(() => {
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  // Update button position when dropdown opens
  useEffect(() => {
    if (showDropdown && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setButtonPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right + window.scrollX,
      });
    }
  }, [showDropdown]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element;
      if (showDropdown && !target.closest('.notification-dropdown') && !target.closest('.notification-button')) {
        setShowDropdown(false);
      }
    };

    if (showDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [showDropdown]);

  const dropdownContent = showDropdown && (
    <div 
      className="fixed w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-black/20 border border-slate-200 dark:border-slate-700 z-[99999] notification-dropdown"
      style={{
        top: `${buttonPosition.top}px`,
        right: `${buttonPosition.right}px`,
      }}
    >
          <div className="p-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-slate-900 dark:text-slate-100">
                Notifications {unreadCount > 0 && `(${unreadCount})`}
              </h3>
              <div className="flex items-center space-x-2">
                {unreadCount > 0 && (
                  <button
                    onClick={async () => {
                      try {
                        const token = localStorage.getItem('token');
                        if (!token) return;

                        await fetch('/api/notifications', {
                          method: 'PATCH',
                          headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                          },
                          body: JSON.stringify({ markAllAsRead: true }),
                        });

                        setNotifications(prev => prev.map(n => ({ ...n, read: true })));
                        setUnreadCount(0);
                      } catch (error) {
                        console.error('Error marking all as read:', error);
                      }
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 font-medium"
                  >
                    Mark all read
                  </button>
                )}
                <button
                  onClick={() => setShowDropdown(false)}
                  className="p-1 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-colors"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="p-4 text-center text-slate-500 dark:text-slate-400">
                No notifications yet
              </div>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification._id}
                  className={`p-4 border-b border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                    !notification.read ? 'bg-blue-50 dark:bg-blue-900/20' : ''
                  }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-medium text-slate-900 dark:text-slate-100 text-sm">
                        {notification.title}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-slate-400 dark:text-slate-500 mt-2">
                        {new Date(notification.createdAt).toLocaleString()}
                      </p>
                    </div>
                    {!notification.read && (
                      <button
                        onClick={() => markAsRead(notification._id)}
                        className="ml-2 w-2 h-2 bg-blue-500 rounded-full"
                        title="Mark as read"
                      />
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
    </div>
  );

  return (
    <>
      <button
        ref={buttonRef}
        onClick={() => setShowDropdown(!showDropdown)}
        className="relative p-2 text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 rounded-xl hover:bg-white/50 dark:hover:bg-slate-800/50 transition-colors notification-button"
        title="Notifications"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {typeof window !== 'undefined' && dropdownContent && createPortal(dropdownContent, document.body)}
    </>
  );
}
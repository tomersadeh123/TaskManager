import { useEffect, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import toast from 'react-hot-toast';
import { INotification } from '@/models/Notification';

interface NotificationHookState {
  notifications: INotification[];
  unreadCount: number;
  loading: boolean;
  error: string | null;
}

interface UseNotificationsReturn extends NotificationHookState {
  socket: Socket | null;
  markAsRead: (notificationIds: string[]) => Promise<void>;
  markAllAsRead: () => Promise<void>;
  refetchNotifications: () => Promise<void>;
}

export function useNotifications(userId?: string, token?: string): UseNotificationsReturn {
  const [state, setState] = useState<NotificationHookState>({
    notifications: [],
    unreadCount: 0,
    loading: true,
    error: null,
  });
  
  const [socket, setSocket] = useState<Socket | null>(null);

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!token) {
      setState(prev => ({ ...prev, loading: false, error: 'No token provided' }));
      return;
    }

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));

      const response = await fetch('/api/notifications', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch notifications: ${response.statusText}`);
      }

      const data = await response.json();
      
      setState(prev => ({
        ...prev,
        notifications: data.notifications || [],
        unreadCount: data.unreadCount || 0,
        loading: false,
        error: null,
      }));

    } catch (error) {
      console.error('Error fetching notifications:', error);
      setState(prev => ({
        ...prev,
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch notifications',
      }));
    }
  }, [token]);

  // Mark notifications as read
  const markAsRead = useCallback(async (notificationIds: string[]) => {
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ notificationIds }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark notifications as read');
      }

      const data = await response.json();
      
      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification => {
          if (notificationIds.includes(notification._id.toString())) {
            notification.read = true;
            return notification;
          }
          return notification;
        }),
        unreadCount: data.unreadCount || 0,
      }));

    } catch (error) {
      console.error('Error marking notifications as read:', error);
      toast.error('Failed to mark notifications as read');
    }
  }, [token]);

  // Mark all notifications as read
  const markAllAsRead = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch('/api/notifications', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ markAllAsRead: true }),
      });

      if (!response.ok) {
        throw new Error('Failed to mark all notifications as read');
      }

      //const data = await response.json();
      
      // Update local state
      setState(prev => ({
        ...prev,
        notifications: prev.notifications.map(notification => {
          notification.read = true;
          return notification;
        }),
        unreadCount: 0,
      }));

      toast.success('All notifications marked as read');

    } catch (error) {
      console.error('Error marking all notifications as read:', error);
      toast.error('Failed to mark all notifications as read');
    }
  }, [token]);

  // Initialize Socket.IO connection
  useEffect(() => {
    if (!userId) return;

    console.log('🔌 Initializing Socket.IO connection for user:', userId);
    
    // First initialize the socket server
    fetch('/api/socket').then(() => {
      const newSocket = io({
        path: '/api/socket',
      });

    newSocket.on('connect', () => {
      console.log('✅ Socket.IO connected:', newSocket.id);
      // Join user-specific room for notifications
      newSocket.emit('join-user-room', userId);
    });

    newSocket.on('joined-room', (roomName: string) => {
      console.log('✅ Joined notification room:', roomName);
    });

    newSocket.on('disconnect', (reason) => {
      console.log('❌ Socket.IO disconnected:', reason);
    });

    newSocket.on('connect_error', (error) => {
      console.error('🚨 Socket.IO connection error:', error);
      setState(prev => ({ ...prev, error: 'Real-time connection failed' }));
    });

    // Listen for real-time notifications
    newSocket.on('notification', (notification: INotification) => {
      console.log('📥 Received real-time notification:', notification);
      
      // Add to notifications list
      setState(prev => ({
        ...prev,
        notifications: [notification, ...prev.notifications],
        unreadCount: prev.unreadCount + 1,
      }));

      // Show toast notification for real-time notifications
      toast.success(notification.message, {
        duration: 4000,
        position: 'top-right',
        icon: '🔔',
      });
    });

    setSocket(newSocket);

    // Cleanup on unmount
    return () => {
      console.log('🧹 Cleaning up Socket.IO connection');
      newSocket.emit('leave-user-room', userId);
      newSocket.disconnect();
    };
    
    }).catch(err => {
      console.error('Failed to initialize socket:', err);
    });
  }, [userId]);

  // Fetch initial notifications
  useEffect(() => {
    if (token) {
      fetchNotifications();
    }
  }, [fetchNotifications, token]);

  return {
    ...state,
    socket,
    markAsRead,
    markAllAsRead,
    refetchNotifications: fetchNotifications,
  };
}
import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import io from 'socket.io-client';
import { useAuth } from '../features/auth/context/AuthContext';
const SocketContext = createContext();

export const useSocket = () => useContext(SocketContext);

export const SocketProvider = ({ children }) => {
  const [isConnected, setIsConnected] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);  
  const { user, isAuthenticated, loading } = useAuth();

  useEffect(() => {
    const userId = user?.id;
    console.log('Initializing Socket.IO for user:', userId);
    console.log('Is authenticated:', isAuthenticated);
    if (!userId || !isAuthenticated) {
      console.log('Waiting for authentication...');
      return;
    }
       socketRef.current = io('https://socialwebsite.duckdns.org/api', {
      withCredentials: true,
      transports: ['websocket', 'polling']
    });
   

    socketRef.current.on('connect', () => {
      console.log('Socket connected');
      setIsConnected(true);
      console.log('Socket ID:', socketRef.current.id);
    if (userId) {
        socketRef.current.emit('join_room', { userId: parseInt(userId) });
        console.log(`Joined room for user: ${userId}`);
      }
    });

    socketRef.current.on('disconnect', () => {
      console.log('Socket disconnected');
      setIsConnected(false);
    });
    socketRef.current.on('new_notification', (notification) => {
      console.log('FRONTEND RECEIVED NEW NOTIFICATION:', notification);
      setUnreadCount(prev => prev + 1);
    });
    socketRef.current.on('unread_count_update', ({ count }) => {
      console.log('Unread count updated:', count);
      setUnreadCount(count);
    });
    socketRef.current.onAny((event, ...args) => {
      console.log(`Socket event: ${event}`, args);
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user, isAuthenticated]); 

  const markAsRead = (notificationId) => {
    if (socketRef.current) {
      socketRef.current.emit('mark_notification_read', notificationId);
    }
  };

  const markAllAsRead = () => {
    if (socketRef.current) {
      socketRef.current.emit('mark_all_notifications_read');
    }
  };

  return (
    <SocketContext.Provider value={{ 
      socket: socketRef.current, 
      isConnected, 
      unreadCount,
      setUnreadCount,
      markAsRead,
      markAllAsRead
    }}>
      {children}
    </SocketContext.Provider>
  );
};
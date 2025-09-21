import React, { createContext, useContext, useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuth } from './AuthContext';
import toast from 'react-hot-toast';

const SocketContext = createContext();

export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [connected, setConnected] = useState(false);
  const [realTimeData, setRealTimeData] = useState({
    newMessages: [],
    flaggedMessages: [],
    activeUsers: 0,
    onlineUsers: [],
    typingUsers: [],
  });
  const { user } = useAuth();

  useEffect(() => {
    if (user) {
      initializeSocket();
    }

    return () => {
      if (socket) {
        socket.disconnect();
      }
    };
  }, [user]);

  const initializeSocket = () => {
    const newSocket = io(process.env.REACT_APP_SOCKET_URL || 'http://localhost:5000', {
      auth: {
        token: localStorage.getItem('authToken'),
      },
      transports: ['websocket', 'polling'],
    });

    newSocket.on('connect', () => {
      console.log('Connected to server');
      setConnected(true);
      
      // Authenticate user
      newSocket.emit('authenticate', user.id);
      
      // Join moderator room if user is moderator/admin
      if (user.role === 'moderator' || user.role === 'admin') {
        newSocket.emit('join-moderator', user.id);
        toast.success('Connected to live monitoring');
      } else {
        toast.success('Connected to chat');
      }
    });

    newSocket.on('disconnect', () => {
      console.log('Disconnected from server');
      setConnected(false);
      toast.error('Disconnected from live monitoring');
    });

    newSocket.on('connect_error', (error) => {
      console.error('Connection error:', error);
      setConnected(false);
      toast.error('Failed to connect to live monitoring');
    });

    // Message events
    newSocket.on('new-message', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        newMessages: [data, ...prev.newMessages.slice(0, 49)] // Keep last 50
      }));

      // Show notification for flagged messages
      if (data.message.analysis?.abuse_detected) {
        toast.error(`Flagged message from ${data.user.username}`, {
          duration: 6000,
          icon: '🚨',
        });
      }
    });

    newSocket.on('message-flagged', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        flaggedMessages: [data, ...prev.flaggedMessages.slice(0, 29)] // Keep last 30
      }));

      toast.error(`Message flagged: ${data.flag.reason}`, {
        duration: 5000,
        icon: '⚠️',
      });
    });

    newSocket.on('message-analyzing', (data) => {
      toast.loading(`Analyzing message from ${data.userId}...`, {
        duration: 2000,
        icon: '🔍',
      });
    });

    newSocket.on('flag-created', (data) => {
      toast.warning(`New flag created by ${data.flaggedBy}`, {
        duration: 4000,
        icon: '🏁',
      });
    });

    newSocket.on('flag-reviewed', (data) => {
      toast.success(`Flag reviewed by ${data.reviewedBy}`, {
        duration: 3000,
        icon: '✅',
      });
    });

    newSocket.on('user-status-updated', (data) => {
      const action = data.isActive ? 'activated' : 'deactivated';
      toast.info(`User ${data.username} ${action} by ${data.updatedBy}`, {
        duration: 4000,
        icon: data.isActive ? '✅' : '❌',
      });
    });

    newSocket.on('message-status-updated', (data) => {
      toast.info(`Message status updated to ${data.status} by ${data.updatedBy}`, {
        duration: 3000,
        icon: '📝',
      });
    });

    // Error events
    newSocket.on('analysis-error', (data) => {
      toast.error(`Analysis failed: ${data.error}`, {
        duration: 5000,
        icon: '❌',
      });
    });

    // Online users events
    newSocket.on('users-online', (users) => {
      setRealTimeData(prev => ({
        ...prev,
        onlineUsers: users,
        activeUsers: users.length
      }));
    });

    newSocket.on('user-joined', (user) => {
      setRealTimeData(prev => ({
        ...prev,
        onlineUsers: [...prev.onlineUsers.filter(u => u.id !== user.id), user]
      }));
    });

    newSocket.on('user-left', (userId) => {
      setRealTimeData(prev => ({
        ...prev,
        onlineUsers: prev.onlineUsers.filter(u => u.id !== userId)
      }));
    });

    // Typing indicators
    newSocket.on('user-typing', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        typingUsers: [...prev.typingUsers.filter(u => u.username !== data.username), data]
      }));
    });

    newSocket.on('user-stopped-typing', (data) => {
      setRealTimeData(prev => ({
        ...prev,
        typingUsers: prev.typingUsers.filter(u => u.username !== data.username)
      }));
    });

    setSocket(newSocket);
  };

  const emitEvent = (event, data) => {
    if (socket && connected) {
      socket.emit(event, data);
    }
  };

  const analyzeMessage = (messageData) => {
    emitEvent('analyze-message', messageData);
  };

  const value = {
    socket,
    connected,
    realTimeData,
    emitEvent,
    analyzeMessage,
  };

  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};
import React, { useState, useEffect, useRef } from 'react';
import { messagesAPI, usersAPI } from '../services/api';
import { useSocket } from '../services/SocketContext';
import { useAuth } from '../services/AuthContext';
import {
  ChatBubbleLeftRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  ExclamationTriangleIcon,
  EyeSlashIcon,
  TrashIcon,
  ArrowPathIcon,
  PaperAirplaneIcon,
  FaceSmileIcon,
  ShieldExclamationIcon,
  UserGroupIcon,
  UserIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Messages = () => {
  const { user } = useAuth();
  const { socket, connected, realTimeData } = useSocket();
  const [messages, setMessages] = useState([]);
  const [users, setUsers] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [newMessage, setNewMessage] = useState('');
  const [selectedChatroom, setSelectedChatroom] = useState('general');
  const [selectedUser, setSelectedUser] = useState(null);
  const [chatType, setChatType] = useState('public'); // 'public' or 'private'
  const [showUserList, setShowUserList] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    emotion: '',
    flagged: '',
    abuse_type: '',
    userId: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 50,
    total: 0,
    pages: 1
  });
  const [showFilters, setShowFilters] = useState(false);
  const messagesEndRef = useRef(null);
  const chatContainerRef = useRef(null);

  const chatrooms = [
    { id: 'general', name: 'General', color: 'bg-blue-100 text-blue-800' },
    { id: 'support', name: 'Support', color: 'bg-green-100 text-green-800' },
    { id: 'feedback', name: 'Feedback', color: 'bg-purple-100 text-purple-800' },
    { id: 'announcements', name: 'Announcements', color: 'bg-yellow-100 text-yellow-800' }
  ];

  const emotions = [
    { value: '', label: 'All Emotions' },
    { value: 'neutral', label: 'Neutral', color: 'text-gray-600' },
    { value: 'joy', label: 'Joy', color: 'text-yellow-600' },
    { value: 'anger', label: 'Anger', color: 'text-red-600' },
    { value: 'sadness', label: 'Sadness', color: 'text-blue-600' },
    { value: 'fear', label: 'Fear', color: 'text-purple-600' },
    { value: 'disgust', label: 'Disgust', color: 'text-green-600' },
    { value: 'surprise', label: 'Surprise', color: 'text-orange-600' }
  ];

  const abuseTypes = [
    { value: '', label: 'All Types' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'bullying', label: 'Bullying' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'threats', label: 'Threats' },
    { value: 'spam', label: 'Spam' },
    { value: 'sexual_content', label: 'Sexual Content' }
  ];

  useEffect(() => {
    fetchMessages();
    fetchUsers();
  }, [selectedChatroom, filters, pagination.page]);

  useEffect(() => {
    // Listen for real-time messages
    if (realTimeData.newMessages.length > 0) {
      const latestMessage = realTimeData.newMessages[0];
      const currentRoom = chatType === 'private' ? `dm_${getDirectMessageRoomId(selectedUser?._id)}` : selectedChatroom;
      
      if (latestMessage.message.chatroom === currentRoom) {
        setMessages(prev => {
          const exists = prev.find(msg => msg._id === latestMessage.message._id);
          if (!exists) {
            return [latestMessage.message, ...prev];
          }
          return prev;
        });
        scrollToBottom();
      }
    }
  }, [realTimeData.newMessages, selectedChatroom, selectedUser, chatType]);

  useEffect(() => {
    // Listen for online users
    if (socket && connected) {
      socket.on('users-online', (users) => {
        setOnlineUsers(users);
      });

      socket.on('user-joined', (user) => {
        setOnlineUsers(prev => [...prev.filter(u => u.id !== user.id), user]);
      });

      socket.on('user-left', (userId) => {
        setOnlineUsers(prev => prev.filter(u => u.id !== userId));
      });

      return () => {
        socket.off('users-online');
        socket.off('user-joined');
        socket.off('user-left');
      };
    }
  }, [socket, connected]);

  const fetchUsers = async () => {
    try {
      setUsersLoading(true);
      const response = await usersAPI.getChatUsers({ limit: 100 });
      setUsers(response.data.data.users);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const getDirectMessageRoomId = (otherUserId) => {
    const userIds = [user.id, otherUserId].sort();
    return userIds.join('_');
  };

  const fetchMessages = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        chatroom: chatType === 'private' ? `dm_${getDirectMessageRoomId(selectedUser?._id)}` : selectedChatroom,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      const response = await messagesAPI.getMessages(params);
      setMessages(response.data.data.messages);
      setPagination(prev => ({
        ...prev,
        ...response.data.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching messages:', error);
      toast.error('Failed to fetch messages');
    } finally {
      setLoading(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    if (chatType === 'private' && !selectedUser) {
      toast.error('Please select a user to send a private message');
      return;
    }

    try {
      setSending(true);
      const messageData = {
        text: newMessage.trim(),
        chatroom: chatType === 'private' ? `dm_${getDirectMessageRoomId(selectedUser._id)}` : selectedChatroom
      };

      if (chatType === 'private') {
        messageData.recipientId = selectedUser._id;
        messageData.messageType = 'private';
      }

      await messagesAPI.createMessage(messageData);
      
      setNewMessage('');
      toast.success('Message sent!');
      
      // Refresh messages after a short delay to see the analyzed message
      setTimeout(() => {
        fetchMessages();
      }, 1000);
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  const handleUserSelect = (selectedUser) => {
    setSelectedUser(selectedUser);
    setChatType('private');
    setSelectedChatroom('');
    setShowUserList(false);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchMessages();
  };

  const handleChatroomSelect = (chatroom) => {
    setSelectedChatroom(chatroom);
    setChatType('public');
    setSelectedUser(null);
    setPagination(prev => ({ ...prev, page: 1 }));
    fetchMessages();
  };

  const isUserOnline = (userId) => {
    return onlineUsers.some(u => u.id === userId);
  };

  const getCurrentChatTitle = () => {
    if (chatType === 'private' && selectedUser) {
      return `${selectedUser.username} ${isUserOnline(selectedUser._id) ? '🟢' : '⚫'}`;
    }
    return chatrooms.find(room => room.id === selectedChatroom)?.name || 'Select a chatroom';
  };

  const updateMessageStatus = async (messageId, status) => {
    try {
      await messagesAPI.updateMessageStatus(messageId, status);
      toast.success(`Message ${status} successfully`);
      fetchMessages();
    } catch (error) {
      console.error('Error updating message status:', error);
      toast.error('Failed to update message status');
    }
  };

  const reanalyzeMessage = async (messageId) => {
    try {
      await messagesAPI.reanalyzeMessage(messageId);
      toast.success('Message re-analyzed successfully');
      fetchMessages();
    } catch (error) {
      console.error('Error re-analyzing message:', error);
      toast.error('Failed to re-analyze message');
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const getEmotionColor = (emotion) => {
    const emotionObj = emotions.find(e => e.value === emotion);
    return emotionObj?.color || 'text-gray-600';
  };

  const getEmotionIcon = (emotion) => {
    switch (emotion) {
      case 'joy': return '😊';
      case 'anger': return '😠';
      case 'sadness': return '😢';
      case 'fear': return '😨';
      case 'disgust': return '🤢';
      case 'surprise': return '😲';
      default: return '😐';
    }
  };

  const getAbuseTypeColor = (type) => {
    switch (type) {
      case 'harassment': return 'bg-red-100 text-red-800';
      case 'bullying': return 'bg-orange-100 text-orange-800';
      case 'hate_speech': return 'bg-red-200 text-red-900';
      case 'threats': return 'bg-red-300 text-red-900';
      case 'spam': return 'bg-gray-100 text-gray-800';
      case 'sexual_content': return 'bg-pink-100 text-pink-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <ChatBubbleLeftRightIcon className="h-8 w-8 mr-3 text-primary-600" />
            Messages
          </h1>
          <p className="text-gray-600">Real-time chat monitoring and analysis</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className={`flex items-center px-3 py-1 rounded-full text-sm ${
            connected ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            <div className={`w-2 h-2 rounded-full mr-2 ${
              connected ? 'bg-green-500' : 'bg-red-500'
            }`}></div>
            {connected ? 'Live' : 'Disconnected'}
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Messages
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search messages..."
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Emotion
              </label>
              <select
                value={filters.emotion}
                onChange={(e) => setFilters(prev => ({ ...prev, emotion: e.target.value }))}
                className="input"
              >
                {emotions.map(emotion => (
                  <option key={emotion.value} value={emotion.value}>
                    {emotion.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Flagged Status
              </label>
              <select
                value={filters.flagged}
                onChange={(e) => setFilters(prev => ({ ...prev, flagged: e.target.value }))}
                className="input"
              >
                <option value="">All Messages</option>
                <option value="true">Flagged Only</option>
                <option value="false">Not Flagged</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Abuse Type
              </label>
              <select
                value={filters.abuse_type}
                onChange={(e) => setFilters(prev => ({ ...prev, abuse_type: e.target.value }))}
                className="input"
              >
                {abuseTypes.map(type => (
                  <option key={type.value} value={type.value}>
                    {type.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    emotion: '',
                    flagged: '',
                    abuse_type: '',
                    userId: ''
                  });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="btn-secondary w-full"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chatrooms and Users Sidebar */}
        <div className="lg:col-span-1">
          <div className="card p-4">
            {/* Chat Type Tabs */}
            <div className="flex space-x-1 mb-4 bg-gray-100 p-1 rounded-lg">
              <button
                onClick={() => {
                  setChatType('public');
                  setSelectedUser(null);
                  if (!selectedChatroom) setSelectedChatroom('general');
                }}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  chatType === 'public'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserGroupIcon className="h-4 w-4 inline mr-1" />
                Public
              </button>
              <button
                onClick={() => {
                  setChatType('private');
                  setSelectedChatroom('');
                  setShowUserList(true);
                }}
                className={`flex-1 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  chatType === 'private'
                    ? 'bg-white text-primary-700 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <UserIcon className="h-4 w-4 inline mr-1" />
                Private
              </button>
            </div>

            {/* Public Chatrooms */}
            {chatType === 'public' && (
              <>
                <h3 className="font-semibold text-gray-900 mb-4">Public Chatrooms</h3>
                <div className="space-y-2">
                  {chatrooms.map(room => (
                    <button
                      key={room.id}
                      onClick={() => handleChatroomSelect(room.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                        selectedChatroom === room.id && chatType === 'public'
                          ? 'bg-primary-100 text-primary-700 border border-primary-200'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{room.name}</span>
                        <span className={`px-2 py-1 rounded-full text-xs ${room.color}`}>
                          {room.id}
                        </span>
                      </div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* Users List for Private Chat */}
            {chatType === 'private' && (
              <>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-gray-900">Users</h3>
                  <span className="text-sm text-gray-500">
                    {onlineUsers.length} online
                  </span>
                </div>
                
                {usersLoading ? (
                  <div className="flex justify-center py-4">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {users.map(user => (
                      <button
                        key={user._id}
                        onClick={() => handleUserSelect(user)}
                        className={`w-full text-left px-3 py-2 rounded-lg transition-colors ${
                          selectedUser?._id === user._id
                            ? 'bg-primary-100 text-primary-700 border border-primary-200'
                            : 'hover:bg-gray-100'
                        }`}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="relative">
                            <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                              <span className="text-sm font-medium text-primary-700">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full border-2 border-white ${
                              isUserOnline(user._id) ? 'bg-green-500' : 'bg-gray-400'
                            }`}></div>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {user.username}
                            </p>
                            <p className="text-xs text-gray-500">
                              {isUserOnline(user._id) ? 'Online' : 'Offline'}
                            </p>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Chat Area */}
        <div className="lg:col-span-3">
          <div className="card p-0 h-[600px] flex flex-col">
            {/* Chat Header */}
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 rounded-t-lg">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900">
                    {getCurrentChatTitle()}
                  </h3>
                  <p className="text-sm text-gray-600">
                    {messages.length} messages • {connected ? 'Live monitoring' : 'Offline'}
                  </p>
                </div>
                <button
                  onClick={fetchMessages}
                  disabled={loading}
                  className="btn-secondary"
                >
                  <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* Messages List */}
            <div
              ref={chatContainerRef}
              className="flex-1 overflow-y-auto p-4 space-y-4"
            >
              {loading ? (
                <div className="flex justify-center items-center h-full">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                </div>
              ) : messages.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-gray-500">
                  <ChatBubbleLeftRightIcon className="h-12 w-12 mb-4" />
                  <p>No messages found</p>
                  <p className="text-sm">Try adjusting your filters or send a message to get started</p>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message._id}
                    className={`flex flex-col space-y-2 p-4 rounded-lg border ${
                      message.analysis?.abuse_detected
                        ? 'bg-red-50 border-red-200'
                        : message.status === 'flagged'
                        ? 'bg-yellow-50 border-yellow-200'
                        : 'bg-white border-gray-200'
                    }`}
                  >
                    {/* Message Header */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <span className="font-semibold text-gray-900">
                          {message.username}
                        </span>
                        <span className="text-sm text-gray-500">
                          {new Date(message.createdAt).toLocaleString()}
                        </span>
                        {message.analysis?.abuse_detected && (
                          <ExclamationTriangleIcon className="h-4 w-4 text-red-500" />
                        )}
                      </div>
                      
                      {(user.role === 'moderator' || user.role === 'admin') && (
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => updateMessageStatus(message._id, 'hidden')}
                            className="text-gray-400 hover:text-gray-600"
                            title="Hide message"
                          >
                            <EyeSlashIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => updateMessageStatus(message._id, 'deleted')}
                            className="text-gray-400 hover:text-red-600"
                            title="Delete message"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => reanalyzeMessage(message._id)}
                            className="text-gray-400 hover:text-blue-600"
                            title="Re-analyze message"
                          >
                            <ArrowPathIcon className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Message Content */}
                    <div className="text-gray-900">
                      {message.text}
                    </div>

                    {/* Analysis Tags */}
                    {message.analysis && (
                      <div className="flex flex-wrap gap-2">
                        {message.analysis.emotion && (
                          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full bg-gray-100 ${getEmotionColor(message.analysis.emotion)}`}>
                            <FaceSmileIcon className="h-3 w-3 mr-1" />
                            {getEmotionIcon(message.analysis.emotion)} {message.analysis.emotion}
                            {message.analysis.emotion_intensity > 0 && (
                              <span className="ml-1">({message.analysis.emotion_intensity}%)</span>
                            )}
                          </span>
                        )}
                        
                        {message.analysis.abuse_detected && (
                          <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getAbuseTypeColor(message.analysis.abuse_type)}`}>
                            <ShieldExclamationIcon className="h-3 w-3 mr-1" />
                            {message.analysis.abuse_type} ({message.analysis.confidence_score}%)
                          </span>
                        )}
                        
                        <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                          message.status === 'active' ? 'bg-green-100 text-green-800' :
                          message.status === 'flagged' ? 'bg-yellow-100 text-yellow-800' :
                          message.status === 'hidden' ? 'bg-gray-100 text-gray-800' :
                          'bg-red-100 text-red-800'
                        }`}>
                          {message.status}
                        </span>
                      </div>
                    )}
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Message Input */}
            <div className="px-4 py-4 border-t border-gray-200 bg-gray-50 rounded-b-lg">
              {/* Recipient Info for Private Chat */}
              {chatType === 'private' && selectedUser && (
                <div className="mb-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="flex items-center space-x-2">
                    <UserIcon className="h-4 w-4 text-blue-600" />
                    <span className="text-sm text-blue-800">
                      Sending private message to <strong>{selectedUser.username}</strong>
                      {isUserOnline(selectedUser._id) && (
                        <span className="ml-2 text-green-600">• Online</span>
                      )}
                    </span>
                  </div>
                </div>
              )}
              
              <div className="flex space-x-3">
                <div className="flex-1">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                    placeholder={
                      chatType === 'private' && selectedUser
                        ? `Send a private message to ${selectedUser.username}...`
                        : chatType === 'private'
                        ? 'Select a user to send a private message...'
                        : `Send a message to #${selectedChatroom}...`
                    }
                    className="input"
                    disabled={sending || (chatType === 'private' && !selectedUser)}
                  />
                </div>
                <button
                  onClick={sendMessage}
                  disabled={!newMessage.trim() || sending}
                  className="btn-primary"
                >
                  {sending ? (
                    <ArrowPathIcon className="h-5 w-5 animate-spin" />
                  ) : (
                    <PaperAirplaneIcon className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {Math.min(pagination.limit, pagination.total)} of {pagination.total} messages
          </div>
          <div className="flex space-x-2">
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page - 1 }))}
              disabled={pagination.page === 1}
              className="btn-secondary disabled:opacity-50"
            >
              Previous
            </button>
            <span className="px-3 py-1 text-sm text-gray-700">
              Page {pagination.page} of {pagination.pages}
            </span>
            <button
              onClick={() => setPagination(prev => ({ ...prev, page: prev.page + 1 }))}
              disabled={pagination.page === pagination.pages}
              className="btn-secondary disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Messages;
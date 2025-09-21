import React, { useState, useEffect } from 'react';
import { usersAPI } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useSocket } from '../services/SocketContext';
import {
  UsersIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  EyeIcon,
  PencilIcon,
  ShieldCheckIcon,
  ShieldExclamationIcon,
  CheckCircleIcon,
  XCircleIcon,
  ChartBarIcon,
  CalendarIcon,
  ExclamationTriangleIcon,
  UserCircleIcon,
  EnvelopeIcon,
  ClockIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Users = () => {
  const { user: currentUser } = useAuth();
  const { realTimeData } = useSocket();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [userAnalytics, setUserAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [filters, setFilters] = useState({
    search: '',
    role: '',
    isActive: '',
    sort: 'createdAt',
    order: 'desc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [showFilters, setShowFilters] = useState(false);

  const roles = [
    { value: '', label: 'All Roles', color: 'text-gray-600' },
    { value: 'user', label: 'User', color: 'text-blue-600' },
    { value: 'moderator', label: 'Moderator', color: 'text-green-600' },
    { value: 'admin', label: 'Admin', color: 'text-purple-600' }
  ];

  const sortOptions = [
    { value: 'createdAt', label: 'Join Date' },
    { value: 'lastLogin', label: 'Last Login' },
    { value: 'username', label: 'Username' },
    { value: 'stats.totalMessages', label: 'Message Count' },
    { value: 'stats.flaggedMessages', label: 'Flagged Messages' }
  ];

  useEffect(() => {
    fetchUsers();
  }, [filters, pagination.page]);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      const response = await usersAPI.getUsers(params);
      setUsers(response.data.data.users);
      setPagination(prev => ({
        ...prev,
        ...response.data.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching users:', error);
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetails = async (userId) => {
    try {
      setLoadingAnalytics(true);
      const [userResponse, analyticsResponse] = await Promise.all([
        usersAPI.getUser(userId),
        usersAPI.getUserAnalytics(userId)
      ]);
      
      setSelectedUser(userResponse.data.data);
      setUserAnalytics(analyticsResponse.data.data);
      setShowUserModal(true);
    } catch (error) {
      console.error('Error fetching user details:', error);
      toast.error('Failed to fetch user details');
    } finally {
      setLoadingAnalytics(false);
    }
  };

  const updateUserStatus = async (userId, isActive) => {
    try {
      await usersAPI.updateUserStatus(userId, isActive);
      toast.success(`User ${isActive ? 'activated' : 'deactivated'} successfully`);
      fetchUsers();
      if (selectedUser && selectedUser.user._id === userId) {
        setSelectedUser(prev => ({
          ...prev,
          user: { ...prev.user, isActive }
        }));
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error('Failed to update user status');
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      await usersAPI.updateUserRole(userId, role);
      toast.success('User role updated successfully');
      fetchUsers();
      if (selectedUser && selectedUser.user._id === userId) {
        setSelectedUser(prev => ({
          ...prev,
          user: { ...prev.user, role }
        }));
      }
    } catch (error) {
      console.error('Error updating user role:', error);
      toast.error('Failed to update user role');
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-purple-100 text-purple-800';
      case 'moderator': return 'bg-green-100 text-green-800';
      case 'user': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return <ShieldCheckIcon className="h-4 w-4" />;
      case 'moderator': return <ShieldExclamationIcon className="h-4 w-4" />;
      default: return <UserCircleIcon className="h-4 w-4" />;
    }
  };

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getActivityStatus = (lastLogin) => {
    if (!lastLogin) return { status: 'Never', color: 'text-gray-500' };
    
    const daysSince = Math.floor((new Date() - new Date(lastLogin)) / (1000 * 60 * 60 * 24));
    
    if (daysSince === 0) return { status: 'Today', color: 'text-green-600' };
    if (daysSince === 1) return { status: 'Yesterday', color: 'text-yellow-600' };
    if (daysSince <= 7) return { status: `${daysSince} days ago`, color: 'text-orange-600' };
    if (daysSince <= 30) return { status: `${daysSince} days ago`, color: 'text-red-600' };
    return { status: 'Inactive', color: 'text-gray-500' };
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <UsersIcon className="h-8 w-8 mr-3 text-primary-600" />
            Users
          </h1>
          <p className="text-gray-600">Manage users and monitor their activity</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <div className="text-sm text-gray-600">
            Total: {pagination.total} users
          </div>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={fetchUsers}
            disabled={loading}
            className="btn-secondary"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Search Users
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="h-5 w-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  placeholder="Search by name, email, username..."
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Role
              </label>
              <select
                value={filters.role}
                onChange={(e) => setFilters(prev => ({ ...prev, role: e.target.value }))}
                className="input"
              >
                {roles.map(role => (
                  <option key={role.value} value={role.value}>
                    {role.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={filters.isActive}
                onChange={(e) => setFilters(prev => ({ ...prev, isActive: e.target.value }))}
                className="input"
              >
                <option value="">All Users</option>
                <option value="true">Active</option>
                <option value="false">Inactive</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sort By
              </label>
              <select
                value={filters.sort}
                onChange={(e) => setFilters(prev => ({ ...prev, sort: e.target.value }))}
                className="input"
              >
                {sortOptions.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-end space-x-2">
              <button
                onClick={() => setFilters(prev => ({ 
                  ...prev, 
                  order: prev.order === 'asc' ? 'desc' : 'asc' 
                }))}
                className="btn-secondary flex-1"
              >
                {filters.order === 'asc' ? '↑' : '↓'} Order
              </button>
              <button
                onClick={() => {
                  setFilters({
                    search: '',
                    role: '',
                    isActive: '',
                    sort: 'createdAt',
                    order: 'desc'
                  });
                  setPagination(prev => ({ ...prev, page: 1 }));
                }}
                className="btn-secondary flex-1"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Activity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Messages
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Joined
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-gray-500">Loading users...</span>
                    </div>
                  </td>
                </tr>
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                    <UsersIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No users found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                users.map((user) => {
                  const activity = getActivityStatus(user.lastLogin);
                  return (
                    <tr key={user._id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                              <span className="text-primary-600 font-medium">
                                {user.username.charAt(0).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.profile?.firstName && user.profile?.lastName 
                                ? `${user.profile.firstName} ${user.profile.lastName}`
                                : user.username
                              }
                            </div>
                            <div className="text-sm text-gray-500">
                              {user.username !== (user.profile?.firstName && user.profile?.lastName 
                                ? `${user.profile.firstName} ${user.profile.lastName}`
                                : user.username) && `@${user.username}`}
                            </div>
                            <div className="text-sm text-gray-500 flex items-center">
                              <EnvelopeIcon className="h-3 w-3 mr-1" />
                              {user.email}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                          {getRoleIcon(user.role)}
                          <span className="ml-1">{user.role}</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.isActive ? (
                            <CheckCircleIcon className="h-3 w-3 mr-1" />
                          ) : (
                            <XCircleIcon className="h-3 w-3 mr-1" />
                          )}
                          {user.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-1 text-gray-400" />
                          <span className={`text-sm ${activity.color}`}>
                            {activity.status}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900">
                          {user.stats.totalMessages || 0}
                          {user.stats.flaggedMessages > 0 && (
                            <div className="flex items-center text-red-600 text-xs">
                              <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                              {user.stats.flaggedMessages} flagged
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center">
                          <CalendarIcon className="h-4 w-4 mr-1" />
                          {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                        <button
                          onClick={() => fetchUserDetails(user._id)}
                          className="text-primary-600 hover:text-primary-900"
                          title="View details"
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                        
                        {currentUser.role === 'admin' && (
                          <>
                            <button
                              onClick={() => updateUserStatus(user._id, !user.isActive)}
                              className={`${user.isActive ? 'text-red-600 hover:text-red-900' : 'text-green-600 hover:text-green-900'}`}
                              title={user.isActive ? 'Deactivate user' : 'Activate user'}
                            >
                              {user.isActive ? <XCircleIcon className="h-4 w-4" /> : <CheckCircleIcon className="h-4 w-4" />}
                            </button>
                            
                            <button
                              onClick={() => {
                                const newRole = user.role === 'user' ? 'moderator' : 
                                             user.role === 'moderator' ? 'admin' : 'user';
                                updateUserRole(user._id, newRole);
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Change role"
                            >
                              <PencilIcon className="h-4 w-4" />
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
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

      {/* User Details Modal */}
      {showUserModal && selectedUser && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-4xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                User Details: {selectedUser.user.username}
              </h3>
              <button
                onClick={() => setShowUserModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* User Info */}
              <div className="lg:col-span-1">
                <div className="card p-4 space-y-4">
                  <div className="text-center">
                    <div className="h-20 w-20 rounded-full bg-primary-100 flex items-center justify-center mx-auto mb-4">
                      <span className="text-primary-600 font-bold text-2xl">
                        {selectedUser.user.username.charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900">
                      {selectedUser.user.profile?.firstName && selectedUser.user.profile?.lastName
                        ? `${selectedUser.user.profile.firstName} ${selectedUser.user.profile.lastName}`
                        : selectedUser.user.username
                      }
                    </h4>
                    <p className="text-gray-600">@{selectedUser.user.username}</p>
                    <p className="text-sm text-gray-500">{selectedUser.user.email}</p>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Role:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(selectedUser.user.role)}`}>
                        {selectedUser.user.role}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Status:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        selectedUser.user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}>
                        {selectedUser.user.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Joined:</span>
                      <span className="text-sm">{formatDate(selectedUser.user.createdAt)}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Last Login:</span>
                      <span className="text-sm">
                        {selectedUser.user.lastLogin 
                          ? formatDate(selectedUser.user.lastLogin)
                          : 'Never'
                        }
                      </span>
                    </div>
                  </div>

                  {/* Admin Controls */}
                  {currentUser.role === 'admin' && (
                    <div className="pt-4 border-t border-gray-200 space-y-2">
                      <button
                        onClick={() => updateUserStatus(selectedUser.user._id, !selectedUser.user.isActive)}
                        className={`w-full px-3 py-2 rounded-md text-sm font-medium ${
                          selectedUser.user.isActive
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        }`}
                      >
                        {selectedUser.user.isActive ? 'Deactivate User' : 'Activate User'}
                      </button>
                      
                      <select
                        value={selectedUser.user.role}
                        onChange={(e) => updateUserRole(selectedUser.user._id, e.target.value)}
                        className="w-full input text-sm"
                      >
                        <option value="user">User</option>
                        <option value="moderator">Moderator</option>
                        <option value="admin">Admin</option>
                      </select>
                    </div>
                  )}
                </div>
              </div>

              {/* Analytics and Activity */}
              <div className="lg:col-span-2">
                {loadingAnalytics ? (
                  <div className="flex justify-center items-center h-64">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                  </div>
                ) : userAnalytics ? (
                  <div className="space-y-6">
                    {/* Stats Overview */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="card p-4 text-center">
                        <ChartBarIcon className="h-8 w-8 text-blue-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                          {userAnalytics.overview.total_messages || 0}
                        </div>
                        <div className="text-sm text-gray-600">Total Messages</div>
                      </div>
                      
                      <div className="card p-4 text-center">
                        <ExclamationTriangleIcon className="h-8 w-8 text-red-500 mx-auto mb-2" />
                        <div className="text-2xl font-bold text-gray-900">
                          {userAnalytics.overview.flagged_messages || 0}
                        </div>
                        <div className="text-sm text-gray-600">Flagged Messages</div>
                      </div>
                      
                      <div className="card p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {Math.round(userAnalytics.overview.avg_emotion_intensity || 0)}%
                        </div>
                        <div className="text-sm text-gray-600">Avg Emotion Intensity</div>
                      </div>
                      
                      <div className="card p-4 text-center">
                        <div className="text-2xl font-bold text-gray-900">
                          {selectedUser.user.stats.warningsReceived || 0}
                        </div>
                        <div className="text-sm text-gray-600">Warnings</div>
                      </div>
                    </div>

                    {/* Recent Messages */}
                    <div className="card p-4">
                      <h5 className="font-semibold text-gray-900 mb-3">Recent Messages</h5>
                      <div className="space-y-3 max-h-48 overflow-y-auto">
                        {selectedUser.recentMessages && selectedUser.recentMessages.length > 0 ? (
                          selectedUser.recentMessages.map((message) => (
                            <div key={message._id} className="p-3 bg-gray-50 rounded-lg">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs text-gray-500">#{message.chatroom}</span>
                                <span className="text-xs text-gray-500">{formatDate(message.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-900">{message.text}</p>
                              {message.analysis?.abuse_detected && (
                                <div className="mt-1">
                                  <span className="inline-flex items-center px-2 py-1 text-xs rounded-full bg-red-100 text-red-800">
                                    <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                    {message.analysis.abuse_type}
                                  </span>
                                </div>
                              )}
                            </div>
                          ))
                        ) : (
                          <p className="text-gray-500 text-center py-4">No recent messages</p>
                        )}
                      </div>
                    </div>

                    {/* Recent Flags */}
                    {selectedUser.flags && selectedUser.flags.length > 0 && (
                      <div className="card p-4">
                        <h5 className="font-semibold text-gray-900 mb-3">Recent Flags</h5>
                        <div className="space-y-3 max-h-48 overflow-y-auto">
                          {selectedUser.flags.map((flag) => (
                            <div key={flag._id} className="p-3 bg-red-50 rounded-lg border border-red-200">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-sm font-medium text-red-800">{flag.reason}</span>
                                <span className="text-xs text-gray-500">{formatDate(flag.createdAt)}</span>
                              </div>
                              <p className="text-sm text-gray-700">
                                {flag.messageId?.text || 'Message not available'}
                              </p>
                              <div className="mt-1">
                                <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${
                                  flag.severity === 'high' ? 'bg-red-100 text-red-800' :
                                  flag.severity === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {flag.severity} severity
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-8">
                    <ChartBarIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No analytics data available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Users;
import React, { useState, useEffect } from 'react';
import { flagsAPI, messagesAPI } from '../services/api';
import { useAuth } from '../services/AuthContext';
import { useSocket } from '../services/SocketContext';
import {
  FlagIcon,
  ExclamationTriangleIcon,
  ShieldExclamationIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  ClockIcon,
  ArrowUpIcon,
  ArrowPathIcon,
  ChatBubbleLeftRightIcon,
  UserIcon,
  CalendarIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
  DocumentTextIcon,
  ExclamationCircleIcon,
  InformationCircleIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Flags = () => {
  const { user } = useAuth();
  const { realTimeData } = useSocket();
  const [flags, setFlags] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [showFlagModal, setShowFlagModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [flagStats, setFlagStats] = useState(null);
  const [filters, setFilters] = useState({
    status: '',
    severity: '',
    flagType: '',
    reason: '',
    start_date: '',
    end_date: ''
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 1
  });
  const [showFilters, setShowFilters] = useState(false);
  const [reviewForm, setReviewForm] = useState({
    status: '',
    action_taken: '',
    reviewer_notes: ''
  });
  const [createForm, setCreateForm] = useState({
    messageId: '',
    reason: '',
    description: '',
    severity: 'medium'
  });

  const flagStatuses = [
    { value: '', label: 'All Statuses', color: 'text-gray-600' },
    { value: 'pending', label: 'Pending', color: 'text-yellow-600' },
    { value: 'reviewed', label: 'Reviewed', color: 'text-green-600' },
    { value: 'dismissed', label: 'Dismissed', color: 'text-gray-600' },
    { value: 'escalated', label: 'Escalated', color: 'text-red-600' }
  ];

  const severityLevels = [
    { value: '', label: 'All Severities' },
    { value: 'low', label: 'Low', color: 'bg-green-100 text-green-800' },
    { value: 'medium', label: 'Medium', color: 'bg-yellow-100 text-yellow-800' },
    { value: 'high', label: 'High', color: 'bg-orange-100 text-orange-800' },
    { value: 'critical', label: 'Critical', color: 'bg-red-100 text-red-800' }
  ];

  const flagTypes = [
    { value: '', label: 'All Types' },
    { value: 'auto', label: 'Auto-Flagged' },
    { value: 'manual', label: 'Manual' },
    { value: 'user_report', label: 'User Report' }
  ];

  const flagReasons = [
    { value: '', label: 'All Reasons' },
    { value: 'harassment', label: 'Harassment' },
    { value: 'bullying', label: 'Bullying' },
    { value: 'hate_speech', label: 'Hate Speech' },
    { value: 'threats', label: 'Threats' },
    { value: 'spam', label: 'Spam' },
    { value: 'sexual_content', label: 'Sexual Content' },
    { value: 'inappropriate_emotion', label: 'Inappropriate Emotion' },
    { value: 'other', label: 'Other' }
  ];

  const moderatorActions = [
    { value: 'none', label: 'No Action' },
    { value: 'warning', label: 'Warning' },
    { value: 'message_removal', label: 'Remove Message' },
    { value: 'timeout', label: 'Timeout User' },
    { value: 'account_suspension', label: 'Suspend Account' },
    { value: 'ban', label: 'Ban User' }
  ];

  useEffect(() => {
    fetchFlags();
    fetchFlagStats();
  }, [filters, pagination.page]);

  useEffect(() => {
    // Listen for real-time flag updates
    if (realTimeData.flaggedMessages.length > 0) {
      // Refresh flags when new ones come in
      fetchFlags();
    }
  }, [realTimeData.flaggedMessages]);

  const fetchFlags = async () => {
    try {
      setLoading(true);
      const params = {
        page: pagination.page,
        limit: pagination.limit,
        ...Object.fromEntries(
          Object.entries(filters).filter(([key, value]) => value !== '')
        )
      };

      const response = await flagsAPI.getFlags(params);
      setFlags(response.data.data.flags);
      setPagination(prev => ({
        ...prev,
        ...response.data.data.pagination
      }));
    } catch (error) {
      console.error('Error fetching flags:', error);
      toast.error('Failed to fetch flags');
    } finally {
      setLoading(false);
    }
  };

  const fetchFlagStats = async () => {
    try {
      const response = await flagsAPI.getFlagStats();
      setFlagStats(response.data.data);
    } catch (error) {
      console.error('Error fetching flag stats:', error);
    }
  };

  const reviewFlag = async (flagId) => {
    try {
      await flagsAPI.reviewFlag(flagId, reviewForm);
      toast.success('Flag reviewed successfully');
      setShowFlagModal(false);
      setReviewForm({ status: '', action_taken: '', reviewer_notes: '' });
      fetchFlags();
      fetchFlagStats();
    } catch (error) {
      console.error('Error reviewing flag:', error);
      toast.error('Failed to review flag');
    }
  };

  const createManualFlag = async () => {
    try {
      await flagsAPI.createFlag(createForm);
      toast.success('Flag created successfully');
      setShowCreateModal(false);
      setCreateForm({ messageId: '', reason: '', description: '', severity: 'medium' });
      fetchFlags();
      fetchFlagStats();
    } catch (error) {
      console.error('Error creating flag:', error);
      toast.error('Failed to create flag');
    }
  };

  const getSeverityColor = (severity) => {
    const severityObj = severityLevels.find(s => s.value === severity);
    return severityObj?.color || 'bg-gray-100 text-gray-800';
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'reviewed': return 'bg-green-100 text-green-800';
      case 'dismissed': return 'bg-gray-100 text-gray-800';
      case 'escalated': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getTypeIcon = (type) => {
    switch (type) {
      case 'auto': return <ShieldExclamationIcon className="h-4 w-4" />;
      case 'manual': return <UserIcon className="h-4 w-4" />;
      case 'user_report': return <ExclamationCircleIcon className="h-4 w-4" />;
      default: return <FlagIcon className="h-4 w-4" />;
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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <FlagIcon className="h-8 w-8 mr-3 text-primary-600" />
            Flags
          </h1>
          <p className="text-gray-600">Review and manage flagged content</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setShowCreateModal(true)}
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4 mr-2" />
            Create Flag
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary ${showFilters ? 'bg-primary-100 text-primary-700' : ''}`}
          >
            <FunnelIcon className="h-4 w-4 mr-2" />
            Filters
          </button>
          
          <button
            onClick={fetchFlags}
            disabled={loading}
            className="btn-secondary"
          >
            <ArrowPathIcon className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {flagStats && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-900">{flagStats.overview.total_flags}</div>
            <div className="text-sm text-gray-600">Total Flags</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-yellow-600">{flagStats.overview.pending_flags}</div>
            <div className="text-sm text-gray-600">Pending</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{flagStats.overview.reviewed_flags}</div>
            <div className="text-sm text-gray-600">Reviewed</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-gray-600">{flagStats.overview.dismissed_flags}</div>
            <div className="text-sm text-gray-600">Dismissed</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-blue-600">{flagStats.overview.auto_flags}</div>
            <div className="text-sm text-gray-600">Auto-Flagged</div>
          </div>
          <div className="card p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">{flagStats.overview.manual_flags}</div>
            <div className="text-sm text-gray-600">Manual</div>
          </div>
        </div>
      )}

      {/* Filters */}
      {showFilters && (
        <div className="card p-4 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={(e) => setFilters(prev => ({ ...prev, status: e.target.value }))}
                className="input"
              >
                {flagStatuses.map(status => (
                  <option key={status.value} value={status.value}>{status.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select
                value={filters.severity}
                onChange={(e) => setFilters(prev => ({ ...prev, severity: e.target.value }))}
                className="input"
              >
                {severityLevels.map(severity => (
                  <option key={severity.value} value={severity.value}>{severity.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filters.flagType}
                onChange={(e) => setFilters(prev => ({ ...prev, flagType: e.target.value }))}
                className="input"
              >
                {flagTypes.map(type => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
              <select
                value={filters.reason}
                onChange={(e) => setFilters(prev => ({ ...prev, reason: e.target.value }))}
                className="input"
              >
                {flagReasons.map(reason => (
                  <option key={reason.value} value={reason.value}>{reason.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filters.start_date}
                onChange={(e) => setFilters(prev => ({ ...prev, start_date: e.target.value }))}
                className="input"
              />
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setFilters({
                    status: '',
                    severity: '',
                    flagType: '',
                    reason: '',
                    start_date: '',
                    end_date: ''
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

      {/* Flags Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Flag Details
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Message
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 text-center">
                    <div className="flex justify-center items-center">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
                      <span className="ml-2 text-gray-500">Loading flags...</span>
                    </div>
                  </td>
                </tr>
              ) : flags.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                    <FlagIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                    <p>No flags found</p>
                    <p className="text-sm">Try adjusting your filters</p>
                  </td>
                </tr>
              ) : (
                flags.map((flag) => (
                  <tr key={flag._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="flex-shrink-0">
                          {getTypeIcon(flag.flagType)}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {flag.reason.replace('_', ' ')}
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className={`inline-flex items-center px-2 py-1 text-xs rounded-full ${getSeverityColor(flag.severity)}`}>
                              {flag.severity}
                            </span>
                            {flag.ai_confidence > 0 && (
                              <span className="text-xs text-gray-500">
                                AI: {flag.ai_confidence}%
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {flag.messageId?.text || 'Message deleted'}
                      </div>
                      <div className="text-xs text-gray-500">
                        #{flag.metadata?.chatroom || 'unknown'}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {flag.userId?.username || 'Unknown user'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {flag.userId?.email || ''}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(flag.status)}`}>
                        {flag.status}
                      </span>
                      {flag.reviewed_by && (
                        <div className="text-xs text-gray-500 mt-1">
                          by {flag.reviewed_by.username}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center">
                        <CalendarIcon className="h-4 w-4 mr-1" />
                        {formatDate(flag.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => {
                          setSelectedFlag(flag);
                          setShowFlagModal(true);
                        }}
                        className="text-primary-600 hover:text-primary-900"
                        title="Review flag"
                      >
                        <EyeIcon className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} flags
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

      {/* Flag Review Modal */}
      {showFlagModal && selectedFlag && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-3xl shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">
                Review Flag: {selectedFlag.reason.replace('_', ' ')}
              </h3>
              <button
                onClick={() => setShowFlagModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Flag Details */}
              <div className="space-y-4">
                <div className="card p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Flag Information</h4>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Type:</span>
                      <span className="flex items-center">
                        {getTypeIcon(selectedFlag.flagType)}
                        <span className="ml-1">{selectedFlag.flagType}</span>
                      </span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Reason:</span>
                      <span>{selectedFlag.reason.replace('_', ' ')}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Severity:</span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getSeverityColor(selectedFlag.severity)}`}>
                        {selectedFlag.severity}
                      </span>
                    </div>
                    
                    {selectedFlag.ai_confidence > 0 && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">AI Confidence:</span>
                        <span>{selectedFlag.ai_confidence}%</span>
                      </div>
                    )}
                    
                    <div className="flex justify-between">
                      <span className="text-gray-600">Created:</span>
                      <span className="text-sm">{formatDate(selectedFlag.createdAt)}</span>
                    </div>
                    
                    {selectedFlag.description && (
                      <div>
                        <span className="text-gray-600 block mb-1">Description:</span>
                        <p className="text-sm bg-gray-50 p-2 rounded">{selectedFlag.description}</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Message Content */}
                <div className="card p-4">
                  <h4 className="font-semibold text-gray-900 mb-3">Flagged Message</h4>
                  <div className="bg-gray-50 p-3 rounded">
                    <p className="text-sm text-gray-900 mb-2">
                      {selectedFlag.messageId?.text || 'Message content not available'}
                    </p>
                    <div className="text-xs text-gray-500">
                      Chatroom: #{selectedFlag.metadata?.chatroom || 'unknown'} • 
                      User: {selectedFlag.userId?.username || 'Unknown'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Review Form */}
              <div className="space-y-4">
                {selectedFlag.status === 'pending' ? (
                  <div className="card p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Review Flag</h4>
                    
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Decision
                        </label>
                        <select
                          value={reviewForm.status}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, status: e.target.value }))}
                          className="input"
                          required
                        >
                          <option value="">Select decision...</option>
                          <option value="reviewed">Approve (Take Action)</option>
                          <option value="dismissed">Dismiss (No Action)</option>
                          <option value="escalated">Escalate</option>
                        </select>
                      </div>

                      {reviewForm.status === 'reviewed' && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Action to Take
                          </label>
                          <select
                            value={reviewForm.action_taken}
                            onChange={(e) => setReviewForm(prev => ({ ...prev, action_taken: e.target.value }))}
                            className="input"
                          >
                            {moderatorActions.map(action => (
                              <option key={action.value} value={action.value}>
                                {action.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Reviewer Notes
                        </label>
                        <textarea
                          value={reviewForm.reviewer_notes}
                          onChange={(e) => setReviewForm(prev => ({ ...prev, reviewer_notes: e.target.value }))}
                          className="input"
                          rows="3"
                          placeholder="Add your review notes..."
                        />
                      </div>

                      <button
                        onClick={() => reviewFlag(selectedFlag._id)}
                        disabled={!reviewForm.status}
                        className="btn-primary w-full disabled:opacity-50"
                      >
                        Submit Review
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="card p-4">
                    <h4 className="font-semibold text-gray-900 mb-3">Review History</h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedFlag.status)}`}>
                          {selectedFlag.status}
                        </span>
                      </div>
                      
                      {selectedFlag.action_taken && selectedFlag.action_taken !== 'none' && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Action Taken:</span>
                          <span>{selectedFlag.action_taken.replace('_', ' ')}</span>
                        </div>
                      )}
                      
                      {selectedFlag.reviewed_by && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reviewed By:</span>
                          <span>{selectedFlag.reviewed_by.username}</span>
                        </div>
                      )}
                      
                      {selectedFlag.reviewed_at && (
                        <div className="flex justify-between">
                          <span className="text-gray-600">Reviewed At:</span>
                          <span className="text-sm">{formatDate(selectedFlag.reviewed_at)}</span>
                        </div>
                      )}
                      
                      {selectedFlag.reviewer_notes && (
                        <div>
                          <span className="text-gray-600 block mb-1">Reviewer Notes:</span>
                          <p className="text-sm bg-gray-50 p-2 rounded">{selectedFlag.reviewer_notes}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Flag Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
          <div className="relative top-20 mx-auto p-5 border w-11/12 max-w-md shadow-lg rounded-md bg-white">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-gray-900">Create Manual Flag</h3>
              <button
                onClick={() => setShowCreateModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircleIcon className="h-6 w-6" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Message ID
                </label>
                <input
                  type="text"
                  value={createForm.messageId}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, messageId: e.target.value }))}
                  className="input"
                  placeholder="Enter message ID..."
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reason
                </label>
                <select
                  value={createForm.reason}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, reason: e.target.value }))}
                  className="input"
                  required
                >
                  <option value="">Select reason...</option>
                  {flagReasons.slice(1).map(reason => (
                    <option key={reason.value} value={reason.value}>
                      {reason.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Severity
                </label>
                <select
                  value={createForm.severity}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, severity: e.target.value }))}
                  className="input"
                >
                  {severityLevels.slice(1).map(severity => (
                    <option key={severity.value} value={severity.value}>
                      {severity.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input"
                  rows="3"
                  placeholder="Describe the issue..."
                />
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary flex-1"
                >
                  Cancel
                </button>
                <button
                  onClick={createManualFlag}
                  disabled={!createForm.messageId || !createForm.reason}
                  className="btn-primary flex-1 disabled:opacity-50"
                >
                  Create Flag
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Flags;
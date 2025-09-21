import React, { useState, useEffect } from 'react';
import { dashboardAPI, flagsAPI, messagesAPI, usersAPI } from '../services/api';
import { useAuth } from '../services/AuthContext';
import {
  DocumentChartBarIcon,
  CalendarIcon,
  ArrowDownTrayIcon,
  ChartBarIcon,
  ExclamationTriangleIcon,
  FaceSmileIcon,
  UsersIcon,
  ChatBubbleLeftRightIcon,
  ClockIcon,
  ShieldExclamationIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline';
import toast from 'react-hot-toast';

const Reports = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeframe, setTimeframe] = useState('24h');
  const [dateRange, setDateRange] = useState({
    start_date: '',
    end_date: ''
  });
  
  // Data states
  const [overviewData, setOverviewData] = useState(null);
  const [emotionData, setEmotionData] = useState(null);
  const [abuseTrendsData, setAbuseTrendsData] = useState(null);
  const [flagStats, setFlagStats] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);

  const timeframes = [
    { value: '1h', label: 'Last Hour' },
    { value: '24h', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' }
  ];

  const tabs = [
    { id: 'overview', label: 'Overview', icon: ChartBarIcon },
    { id: 'emotions', label: 'Emotion Analysis', icon: FaceSmileIcon },
    { id: 'abuse', label: 'Abuse Trends', icon: ExclamationTriangleIcon },
    { id: 'flags', label: 'Flag Analytics', icon: ShieldExclamationIcon },
    { id: 'realtime', label: 'Real-time Data', icon: ClockIcon }
  ];

  useEffect(() => {
    fetchReportData();
  }, [timeframe, activeTab]);

  const fetchReportData = async () => {
    try {
      setLoading(true);
      
      switch (activeTab) {
        case 'overview':
          await fetchOverviewData();
          break;
        case 'emotions':
          await fetchEmotionData();
          break;
        case 'abuse':
          await fetchAbuseTrends();
          break;
        case 'flags':
          await fetchFlagStats();
          break;
        case 'realtime':
          await fetchRealTimeData();
          break;
      }
    } catch (error) {
      console.error('Error fetching report data:', error);
      toast.error('Failed to fetch report data');
    } finally {
      setLoading(false);
    }
  };

  const fetchOverviewData = async () => {
    const response = await dashboardAPI.getOverview({ timeframe });
    setOverviewData(response.data.data);
  };

  const fetchEmotionData = async () => {
    const response = await dashboardAPI.getEmotions({ timeframe });
    setEmotionData(response.data.data);
  };

  const fetchAbuseTrends = async () => {
    const response = await dashboardAPI.getAbuseTrends({ timeframe });
    setAbuseTrendsData(response.data.data);
  };

  const fetchFlagStats = async () => {
    const params = dateRange.start_date ? dateRange : {};
    const response = await flagsAPI.getFlagStats(params);
    setFlagStats(response.data.data);
  };

  const fetchRealTimeData = async () => {
    const response = await dashboardAPI.getRealTimeData();
    setRealTimeData(response.data.data);
  };

  const refreshData = async () => {
    setRefreshing(true);
    await fetchReportData();
    setRefreshing(false);
    toast.success('Data refreshed');
  };

  const exportReport = async (format = 'csv') => {
    try {
      // This would implement actual export functionality
      toast.success(`Exporting ${activeTab} report as ${format.toUpperCase()}...`);
      
      // Simulated export - in real implementation, you'd call an export API
      const data = getCurrentTabData();
      if (data) {
        const filename = `safechat-${activeTab}-report-${new Date().toISOString().split('T')[0]}.${format}`;
        
        if (format === 'json') {
          const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = filename;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (error) {
      console.error('Export error:', error);
      toast.error('Failed to export report');
    }
  };

  const getCurrentTabData = () => {
    switch (activeTab) {
      case 'overview': return overviewData;
      case 'emotions': return emotionData;
      case 'abuse': return abuseTrendsData;
      case 'flags': return flagStats;
      case 'realtime': return realTimeData;
      default: return null;
    }
  };

  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num?.toString() || '0';
  };

  const formatPercentage = (value, total) => {
    if (!total || total === 0) return '0%';
    return ((value / total) * 100).toFixed(1) + '%';
  };

  const getEmotionColor = (emotion) => {
    switch (emotion) {
      case 'joy': return 'text-yellow-600 bg-yellow-100';
      case 'anger': return 'text-red-600 bg-red-100';
      case 'sadness': return 'text-blue-600 bg-blue-100';
      case 'fear': return 'text-purple-600 bg-purple-100';
      case 'disgust': return 'text-green-600 bg-green-100';
      case 'surprise': return 'text-orange-600 bg-orange-100';
      default: return 'text-gray-600 bg-gray-100';
    }
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

  const getTrendIcon = (current, previous) => {
    if (current > previous) return <ArrowTrendingUpIcon className="h-4 w-4 text-green-600" />;
    if (current < previous) return <ArrowTrendingDownIcon className="h-4 w-4 text-red-600" />;
    return <div className="h-4 w-4 bg-gray-300 rounded-full"></div>;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <DocumentChartBarIcon className="h-8 w-8 mr-3 text-primary-600" />
            Reports & Analytics
          </h1>
          <p className="text-gray-600">Comprehensive reporting and data analysis</p>
        </div>
        
        <div className="flex items-center space-x-3">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="input"
          >
            {timeframes.map(tf => (
              <option key={tf.value} value={tf.value}>{tf.label}</option>
            ))}
          </select>
          
          <button
            onClick={refreshData}
            disabled={refreshing}
            className="btn-secondary"
          >
            <ArrowPathIcon className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
          
          <button
            onClick={() => exportReport('json')}
            className="btn-primary"
          >
            <ArrowDownTrayIcon className="h-4 w-4 mr-2" />
            Export
          </button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="card p-0">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`${
                    activeTab === tab.id
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  } whitespace-nowrap py-4 px-6 border-b-2 font-medium text-sm flex items-center`}
                >
                  <Icon className="h-5 w-5 mr-2" />
                  {tab.label}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {loading ? (
            <div className="flex justify-center items-center h-64">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              <span className="ml-3 text-gray-600">Loading report data...</span>
            </div>
          ) : (
            <>
              {/* Overview Tab */}
              {activeTab === 'overview' && overviewData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="card p-6 text-center">
                      <ChatBubbleLeftRightIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {formatNumber(overviewData.messages.total_messages)}
                      </div>
                      <div className="text-sm text-gray-600">Total Messages</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {formatPercentage(overviewData.messages.flagged_messages, overviewData.messages.total_messages)} flagged
                      </div>
                    </div>

                    <div className="card p-6 text-center">
                      <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {formatNumber(overviewData.flags.total_flags)}
                      </div>
                      <div className="text-sm text-gray-600">Total Flags</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {overviewData.flags.pending_flags} pending
                      </div>
                    </div>

                    <div className="card p-6 text-center">
                      <UsersIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {formatNumber(overviewData.users.active_users)}
                      </div>
                      <div className="text-sm text-gray-600">Active Users</div>
                      <div className="text-xs text-gray-500 mt-1">
                        {overviewData.users.total_users} total
                      </div>
                    </div>

                    <div className="card p-6 text-center">
                      <FaceSmileIcon className="h-12 w-12 text-purple-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {Math.round(overviewData.messages.avg_emotion_intensity || 0)}%
                      </div>
                      <div className="text-sm text-gray-600">Avg Emotion Intensity</div>
                      <div className={`text-xs mt-1 px-2 py-1 rounded-full inline-block ${
                        overviewData.ml_service.status === 'online' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        ML {overviewData.ml_service.status}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Message Analysis</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Total Messages</span>
                          <span className="font-semibold">{overviewData.messages.total_messages}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Flagged Messages</span>
                          <span className="font-semibold text-red-600">{overviewData.messages.flagged_messages}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Auto-Flagged</span>
                          <span className="font-semibold">{overviewData.flags.auto_flags}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-red-600 h-2 rounded-full" 
                            style={{
                              width: `${(overviewData.messages.flagged_messages / overviewData.messages.total_messages * 100) || 0}%`
                            }}
                          ></div>
                        </div>
                        <div className="text-sm text-gray-500">
                          {formatPercentage(overviewData.messages.flagged_messages, overviewData.messages.total_messages)} of messages flagged
                        </div>
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health</h3>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">ML Service Status</span>
                          <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                            overviewData.ml_service.status === 'online' 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {overviewData.ml_service.status}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Active Moderators</span>
                          <span className="font-semibold">{overviewData.users.moderators}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Pending Reviews</span>
                          <span className="font-semibold text-yellow-600">{overviewData.flags.pending_flags}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-gray-600">Report Period</span>
                          <span className="font-semibold">{timeframes.find(t => t.value === timeframe)?.label}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Emotion Analysis Tab */}
              {activeTab === 'emotions' && emotionData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Emotion Distribution</h3>
                      <div className="space-y-3">
                        {emotionData.distribution.map((emotion) => (
                          <div key={emotion._id} className="flex items-center justify-between">
                            <div className="flex items-center">
                              <span className="text-lg mr-2">{getEmotionIcon(emotion._id)}</span>
                              <span className="text-sm font-medium capitalize">
                                {emotion._id || 'neutral'}
                              </span>
                            </div>
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${getEmotionColor(emotion._id).split(' ')[1]}`}
                                  style={{
                                    width: `${(emotion.count / emotionData.distribution[0]?.count * 100) || 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold min-w-[3rem]">
                                {emotion.count}
                              </span>
                              <span className="text-xs text-gray-500 min-w-[3rem]">
                                {Math.round(emotion.avg_intensity || 0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">High Intensity Alerts</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {emotionData.high_intensity_alerts && emotionData.high_intensity_alerts.length > 0 ? (
                          emotionData.high_intensity_alerts.map((alert, index) => (
                            <div key={index} className="p-3 bg-red-50 border border-red-200 rounded-lg">
                              <div className="flex justify-between items-start mb-2">
                                <span className="text-sm font-medium text-red-800">
                                  {getEmotionIcon(alert.analysis.emotion)} {alert.analysis.emotion}
                                </span>
                                <span className="text-xs text-gray-500">
                                  #{alert.chatroom}
                                </span>
                              </div>
                              <p className="text-sm text-gray-700 mb-2">
                                {alert.text.length > 100 ? alert.text.substring(0, 100) + '...' : alert.text}
                              </p>
                              <div className="flex justify-between items-center text-xs text-gray-500">
                                <span>@{alert.userId?.username}</span>
                                <span>{alert.analysis.emotion_intensity}% intensity</span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div className="text-center text-gray-500 py-8">
                            <FaceSmileIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                            <p>No high intensity emotions detected</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Abuse Trends Tab */}
              {activeTab === 'abuse' && abuseTrendsData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Abuse Categories</h3>
                      <div className="space-y-3">
                        {abuseTrendsData.categories.map((category) => (
                          <div key={category._id} className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">
                              {category._id.replace('_', ' ')}
                            </span>
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-red-600 h-2 rounded-full"
                                  style={{
                                    width: `${(category.count / abuseTrendsData.categories[0]?.count * 100) || 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold min-w-[3rem]">
                                {category.count}
                              </span>
                              <span className="text-xs text-gray-500 min-w-[3rem]">
                                {Math.round(category.avg_confidence || 0)}%
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Detection Summary</h3>
                      <div className="space-y-4">
                        <div className="text-center">
                          <div className="text-4xl font-bold text-red-600 mb-2">
                            {abuseTrendsData.categories.reduce((total, cat) => total + cat.count, 0)}
                          </div>
                          <div className="text-sm text-gray-600">Total Abuse Detected</div>
                        </div>
                        
                        <div className="border-t pt-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <div className="text-xl font-semibold text-gray-900">
                                {Math.round(abuseTrendsData.categories.reduce((sum, cat) => sum + cat.avg_confidence, 0) / abuseTrendsData.categories.length) || 0}%
                              </div>
                              <div className="text-xs text-gray-600">Avg Confidence</div>
                            </div>
                            <div>
                              <div className="text-xl font-semibold text-gray-900">
                                {abuseTrendsData.categories.length}
                              </div>
                              <div className="text-xs text-gray-600">Categories</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Flag Analytics Tab */}
              {activeTab === 'flags' && flagStats && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
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
                      <div className="text-2xl font-bold text-blue-600">{flagStats.overview.auto_flags}</div>
                      <div className="text-sm text-gray-600">Auto-Flagged</div>
                    </div>
                    <div className="card p-4 text-center">
                      <div className="text-2xl font-bold text-purple-600">{flagStats.overview.manual_flags}</div>
                      <div className="text-sm text-gray-600">Manual</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Flags by Severity</h3>
                      <div className="space-y-3">
                        {flagStats.by_severity.map((severity) => (
                          <div key={severity._id} className="flex items-center justify-between">
                            <span className="text-sm font-medium capitalize">{severity._id}</span>
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className={`h-2 rounded-full ${
                                    severity._id === 'critical' ? 'bg-red-600' :
                                    severity._id === 'high' ? 'bg-orange-500' :
                                    severity._id === 'medium' ? 'bg-yellow-500' :
                                    'bg-green-500'
                                  }`}
                                  style={{
                                    width: `${(severity.count / flagStats.by_severity[0]?.count * 100) || 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold">{severity.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Flags by Reason</h3>
                      <div className="space-y-3">
                        {flagStats.by_reason.map((reason) => (
                          <div key={reason._id} className="flex items-center justify-between">
                            <span className="text-sm font-medium">
                              {reason._id.replace('_', ' ')}
                            </span>
                            <div className="flex items-center space-x-3">
                              <div className="w-24 bg-gray-200 rounded-full h-2">
                                <div 
                                  className="bg-primary-600 h-2 rounded-full"
                                  style={{
                                    width: `${(reason.count / flagStats.by_reason[0]?.count * 100) || 0}%`
                                  }}
                                ></div>
                              </div>
                              <span className="text-sm font-semibold">{reason.count}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Real-time Data Tab */}
              {activeTab === 'realtime' && realTimeData && (
                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="card p-6 text-center">
                      <UsersIcon className="h-12 w-12 text-green-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {realTimeData.active_users_count}
                      </div>
                      <div className="text-sm text-gray-600">Active Users</div>
                      <div className="text-xs text-gray-500 mt-1">Last hour</div>
                    </div>

                    <div className="card p-6 text-center">
                      <ChatBubbleLeftRightIcon className="h-12 w-12 text-blue-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {realTimeData.recent_messages.length}
                      </div>
                      <div className="text-sm text-gray-600">Recent Messages</div>
                      <div className="text-xs text-gray-500 mt-1">Last 10 minutes</div>
                    </div>

                    <div className="card p-6 text-center">
                      <ExclamationTriangleIcon className="h-12 w-12 text-red-500 mx-auto mb-4" />
                      <div className="text-3xl font-bold text-gray-900">
                        {realTimeData.pending_flags.length}
                      </div>
                      <div className="text-sm text-gray-600">Pending Flags</div>
                      <div className="text-xs text-gray-500 mt-1">Requires review</div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Chatroom Activity</h3>
                      <div className="space-y-3">
                        {realTimeData.chatroom_activity.map((room) => (
                          <div key={room._id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                            <div>
                              <div className="font-medium">#{room.chatroom}</div>
                              <div className="text-sm text-gray-600">
                                {room.unique_users} users • {room.message_count} messages
                              </div>
                            </div>
                            {room.flagged_messages > 0 && (
                              <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full">
                                {room.flagged_messages} flagged
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="card p-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Messages</h3>
                      <div className="space-y-3 max-h-64 overflow-y-auto">
                        {realTimeData.recent_messages.map((message) => (
                          <div key={message._id} className="p-3 bg-gray-50 rounded-lg">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-sm font-medium">@{message.userId?.username}</span>
                              <span className="text-xs text-gray-500">#{message.chatroom}</span>
                            </div>
                            <p className="text-sm text-gray-700">
                              {message.text.length > 80 ? message.text.substring(0, 80) + '...' : message.text}
                            </p>
                            {message.analysis?.abuse_detected && (
                              <span className="inline-flex items-center px-2 py-1 mt-2 text-xs rounded-full bg-red-100 text-red-800">
                                <ExclamationTriangleIcon className="h-3 w-3 mr-1" />
                                Abuse detected
                              </span>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Reports;
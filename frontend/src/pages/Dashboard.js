import React, { useState, useEffect } from 'react';
import { dashboardAPI } from '../services/api';
import { useSocket } from '../services/SocketContext';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ChatBubbleLeftRightIcon,
  FlagIcon,
  UsersIcon,
  ExclamationTriangleIcon,
  ClockIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
} from 'recharts';

const Dashboard = () => {
  const [overviewData, setOverviewData] = useState(null);
  const [emotionData, setEmotionData] = useState(null);
  const [abuseTrends, setAbuseTrends] = useState(null);
  const [realTimeData, setRealTimeData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('24h');
  const { connected } = useSocket();

  useEffect(() => {
    fetchDashboardData();
    const interval = setInterval(fetchRealTimeData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, [timeframe]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const [overview, emotions, abuse, realTime] = await Promise.all([
        dashboardAPI.getOverview({ timeframe }),
        dashboardAPI.getEmotions({ timeframe }),
        dashboardAPI.getAbuseTrends({ timeframe }),
        dashboardAPI.getRealTimeData(),
      ]);

      setOverviewData(overview.data.data);
      setEmotionData(emotions.data.data);
      setAbuseTrends(abuse.data.data);
      setRealTimeData(realTime.data.data);
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRealTimeData = async () => {
    try {
      const response = await dashboardAPI.getRealTimeData();
      setRealTimeData(response.data.data);
    } catch (error) {
      console.error('Error fetching real-time data:', error);
    }
  };

  if (loading) {
    return <LoadingSpinner text="Loading dashboard..." />;
  }

  const emotionColors = {
    anger: '#EF4444',
    joy: '#F59E0B',
    sadness: '#3B82F6',
    fear: '#8B5CF6',
    disgust: '#10B981',
    surprise: '#EC4899',
    neutral: '#6B7280',
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600">Real-time monitoring and analytics</p>
        </div>
        <div className="flex items-center space-x-4">
          <select
            value={timeframe}
            onChange={(e) => setTimeframe(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
          </select>
          <div className={`flex items-center space-x-2 ${connected ? 'text-green-600' : 'text-red-600'}`}>
            <div className={`h-3 w-3 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`}></div>
            <span className="text-sm font-medium">{connected ? 'Live' : 'Offline'}</span>
          </div>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Total Messages"
          value={overviewData?.messages?.total_messages || 0}
          icon={ChatBubbleLeftRightIcon}
          color="blue"
        />
        <StatCard
          title="Flagged Messages"
          value={overviewData?.messages?.flagged_messages || 0}
          icon={FlagIcon}
          color="red"
          percentage={overviewData?.messages?.total_messages > 0 
            ? ((overviewData?.messages?.flagged_messages / overviewData?.messages?.total_messages) * 100).toFixed(1)
            : 0}
        />
        <StatCard
          title="Active Users"
          value={realTimeData?.active_users_count || 0}
          icon={UsersIcon}
          color="green"
        />
        <StatCard
          title="Pending Flags"
          value={overviewData?.flags?.pending_flags || 0}
          icon={ExclamationTriangleIcon}
          color="yellow"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Emotion Distribution */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Emotion Distribution</h3>
          {emotionData?.distribution?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={emotionData.distribution}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={120}
                  paddingAngle={5}
                  dataKey="count"
                  nameKey="_id"
                >
                  {emotionData.distribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={emotionColors[entry._id] || '#6B7280'} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value, name) => [value, name]}
                  labelFormatter={(label) => `Emotion: ${label}`}
                />
              </PieChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No emotion data available
            </div>
          )}
        </div>

        {/* Abuse Trends */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Abuse Detection Trends</h3>
          {abuseTrends?.categories?.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={abuseTrends.categories}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="_id" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#EF4444" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-64 text-gray-500">
              No abuse trend data available
            </div>
          )}
        </div>
      </div>

      {/* Real-time Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Messages */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Recent Messages</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {realTimeData?.recent_messages?.length > 0 ? (
              realTimeData.recent_messages.map((message) => (
                <div key={message._id} className="border-l-4 border-gray-200 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">
                      {message.userId?.username || 'Unknown User'}
                    </span>
                    <span className="text-xs text-gray-500">
                      {new Date(message.createdAt).toLocaleTimeString()}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1 truncate">{message.text}</p>
                  <div className="flex items-center space-x-2 mt-2">
                    <span className={`emotion-badge emotion-${message.analysis?.emotion || 'neutral'}`}>
                      {message.analysis?.emotion || 'neutral'}
                    </span>
                    {message.analysis?.abuse_detected && (
                      <span className="severity-badge severity-high">Flagged</span>
                    )}
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No recent messages</p>
            )}
          </div>
        </div>

        {/* Pending Flags */}
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Pending Flags</h3>
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {realTimeData?.pending_flags?.length > 0 ? (
              realTimeData.pending_flags.map((flag) => (
                <div key={flag._id} className="border-l-4 border-red-400 pl-4 py-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-sm text-gray-900">
                      {flag.userId?.username || 'Unknown User'}
                    </span>
                    <span className={`severity-badge severity-${flag.severity}`}>
                      {flag.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">{flag.reason}</p>
                  <p className="text-xs text-gray-500 mt-1 truncate">
                    {flag.messageId?.text || 'Message not available'}
                  </p>
                  <span className="text-xs text-gray-400">
                    {new Date(flag.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))
            ) : (
              <p className="text-gray-500 text-center py-8">No pending flags</p>
            )}
          </div>
        </div>
      </div>

      {/* Chatroom Activity */}
      {realTimeData?.chatroom_activity?.length > 0 && (
        <div className="card p-6">
          <h3 className="text-lg font-semibold mb-4">Chatroom Activity</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {realTimeData.chatroom_activity.map((room) => (
              <div key={room._id} className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900">{room._id}</h4>
                <div className="mt-2 space-y-1 text-sm text-gray-600">
                  <div className="flex justify-between">
                    <span>Messages:</span>
                    <span>{room.message_count}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Users:</span>
                    <span>{room.unique_users}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Flagged:</span>
                    <span className={room.flagged_messages > 0 ? 'text-red-600' : 'text-green-600'}>
                      {room.flagged_messages}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ title, value, icon: Icon, color, percentage }) => {
  const colorClasses = {
    blue: 'bg-blue-500',
    red: 'bg-red-500',
    green: 'bg-green-500',
    yellow: 'bg-yellow-500',
  };

  return (
    <div className="stat-card">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
        <div className="ml-4 flex-1">
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <div className="flex items-baseline">
            <p className="text-2xl font-semibold text-gray-900">{value.toLocaleString()}</p>
            {percentage && (
              <span className="ml-2 text-sm text-gray-500">({percentage}%)</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
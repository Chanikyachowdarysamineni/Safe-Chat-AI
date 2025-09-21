import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  getMe: () => api.get('/auth/me'),
};

// Messages API
export const messagesAPI = {
  getMessages: (params) => api.get('/messages', { params }),
  getMessage: (id) => api.get(`/messages/${id}`),
  createMessage: (messageData) => api.post('/messages', messageData),
  updateMessageStatus: (id, status) => api.put(`/messages/${id}/status`, { status }),
  reanalyzeMessage: (id) => api.post(`/messages/${id}/reanalyze`),
};

// Flags API
export const flagsAPI = {
  getFlags: (params) => api.get('/flags', { params }),
  createFlag: (flagData) => api.post('/flags', flagData),
  reviewFlag: (id, reviewData) => api.put(`/flags/${id}/review`, reviewData),
  getFlagStats: (params) => api.get('/flags/stats', { params }),
};

// Users API
export const usersAPI = {
  getUsers: (params) => api.get('/users', { params }),
  getChatUsers: (params) => api.get('/users/chat', { params }),
  getUser: (id) => api.get(`/users/${id}`),
  updateUserStatus: (id, isActive) => api.put(`/users/${id}/status`, { isActive }),
  updateUserRole: (id, role) => api.put(`/users/${id}/role`, { role }),
  getUserAnalytics: (id, params) => api.get(`/users/${id}/analytics`, { params }),
};

// Dashboard API
export const dashboardAPI = {
  getOverview: (params) => api.get('/dashboard/overview', { params }),
  getEmotions: (params) => api.get('/dashboard/emotions', { params }),
  getAbuseTrends: (params) => api.get('/dashboard/abuse-trends', { params }),
  getRealTimeData: () => api.get('/dashboard/real-time'),
};

export default api;
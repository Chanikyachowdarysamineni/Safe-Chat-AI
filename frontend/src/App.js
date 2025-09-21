import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './services/AuthContext';
import { SocketProvider } from './services/SocketContext';
import LoginPage from './pages/LoginPage';
import SignupPage from './pages/SignupPage';
import Dashboard from './pages/Dashboard';
import Messages from './pages/Messages';
import Flags from './pages/Flags';
import Users from './pages/Users';
import Reports from './pages/Reports';
import Layout from './components/Layout';
import LoadingSpinner from './components/LoadingSpinner';

// Protected Route Component
const ProtectedRoute = ({ children }) => {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <LoadingSpinner />;
  }
  
  if (!user) {
    return <Navigate to="/login" replace />;
  }
  
  // Check if user has moderator or admin role
  if (user.role !== 'moderator' && user.role !== 'admin') {
    return <Navigate to="/login" replace />;
  }
  
  return children;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                theme: {
                  primary: '#10B981',
                  secondary: '#000',
                },
              },
              error: {
                duration: 5000,
                theme: {
                  primary: '#EF4444',
                  secondary: '#000',
                },
              },
            }}
          />
          
          <Routes>
            <Route path="/login" element={<LoginPage />} />
            <Route path="/signup" element={<SignupPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <SocketProvider>
                    <Layout>
                      <Routes>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/messages" element={<Messages />} />
                        <Route path="/flags" element={<Flags />} />
                        <Route path="/users" element={<Users />} />
                        <Route path="/reports" element={<Reports />} />
                      </Routes>
                    </Layout>
                  </SocketProvider>
                </ProtectedRoute>
              }
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;
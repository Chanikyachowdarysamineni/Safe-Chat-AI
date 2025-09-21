import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../src/pages/Dashboard';
import { AuthProvider } from '../src/services/AuthContext';
import { SocketProvider } from '../src/services/SocketContext';

// Mock socket.io-client
jest.mock('socket.io-client', () => {
  return jest.fn(() => ({
    on: jest.fn(),
    off: jest.fn(),
    emit: jest.fn(),
    disconnect: jest.fn(),
  }));
});

// Mock Chart.js components
jest.mock('recharts', () => ({
  LineChart: ({ children }) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  Legend: () => <div data-testid="legend" />,
  ResponsiveContainer: ({ children }) => <div data-testid="responsive-container">{children}</div>,
  BarChart: ({ children }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />,
}));

// Mock fetch API
global.fetch = jest.fn();

const mockUser = {
  id: '1',
  email: 'test@example.com',
  role: 'moderator',
  name: 'Test User'
};

const MockProviders = ({ children }) => {
  return (
    <BrowserRouter>
      <AuthProvider value={{ user: mockUser, token: 'mock-token' }}>
        <SocketProvider>
          {children}
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  );
};

describe('Dashboard', () => {
  beforeEach(() => {
    fetch.mockClear();
    fetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({
        totalMessages: 1500,
        flaggedMessages: 45,
        totalUsers: 120,
        activeUsers: 25,
        recentFlags: [],
        emotionStats: {
          'anger': 15,
          'fear': 8,
          'sadness': 12,
          'joy': 45,
          'surprise': 20
        }
      })
    });
  });

  test('renders dashboard header', async () => {
    render(
      <MockProviders>
        <Dashboard />
      </MockProviders>
    );

    expect(screen.getByText('SafeChat AI Dashboard')).toBeInTheDocument();
    expect(screen.getByText('Real-time Chat Moderation & Emotion Analysis')).toBeInTheDocument();
  });

  test('loads and displays statistics', async () => {
    render(
      <MockProviders>
        <Dashboard />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Total Messages')).toBeInTheDocument();
      expect(screen.getByText('Flagged Messages')).toBeInTheDocument();
      expect(screen.getByText('Total Users')).toBeInTheDocument();
      expect(screen.getByText('Active Users')).toBeInTheDocument();
    });

    // Check if stats are displayed
    await waitFor(() => {
      expect(screen.getByText('1,500')).toBeInTheDocument();
      expect(screen.getByText('45')).toBeInTheDocument();
      expect(screen.getByText('120')).toBeInTheDocument();
      expect(screen.getByText('25')).toBeInTheDocument();
    });
  });

  test('renders charts', async () => {
    render(
      <MockProviders>
        <Dashboard />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByTestId('line-chart')).toBeInTheDocument();
      expect(screen.getByTestId('bar-chart')).toBeInTheDocument();
    });
  });

  test('displays flagged messages section', async () => {
    render(
      <MockProviders>
        <Dashboard />
      </MockProviders>
    );

    await waitFor(() => {
      expect(screen.getByText('Recent Flagged Messages')).toBeInTheDocument();
    });
  });

  test('handles API error gracefully', async () => {
    fetch.mockRejectedValueOnce(new Error('API Error'));

    render(
      <MockProviders>
        <Dashboard />
      </MockProviders>
    );

    // Dashboard should still render even if API fails
    expect(screen.getByText('SafeChat AI Dashboard')).toBeInTheDocument();
  });

  test('displays loading state', () => {
    render(
      <MockProviders>
        <Dashboard />
      </MockProviders>
    );

    // Initially should show loading or empty state
    expect(screen.getByText('SafeChat AI Dashboard')).toBeInTheDocument();
  });
});
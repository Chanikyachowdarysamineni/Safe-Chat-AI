import { renderHook, act } from '@testing-library/react';
import { AuthProvider, useAuth } from '../src/services/AuthContext';

// Mock fetch API
global.fetch = jest.fn();

// Mock localStorage
const mockLocalStorage = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = mockLocalStorage;

describe('AuthContext', () => {
  beforeEach(() => {
    fetch.mockClear();
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    mockLocalStorage.removeItem.mockClear();
  });

  test('provides initial state', () => {
    mockLocalStorage.getItem.mockReturnValue(null);
    
    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(result.current.loading).toBe(false);
  });

  test('loads user from localStorage on mount', () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'moderator' };
    const mockToken = 'mock-jwt-token';
    
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'user') return JSON.stringify(mockUser);
      if (key === 'token') return mockToken;
      return null;
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
  });

  test('handles successful login', async () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'moderator' };
    const mockToken = 'new-jwt-token';
    
    fetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({
        success: true,
        user: mockUser,
        token: mockToken
      })
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.login('test@example.com', 'password');
      expect(response.success).toBe(true);
    });

    expect(result.current.user).toEqual(mockUser);
    expect(result.current.token).toBe(mockToken);
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('user', JSON.stringify(mockUser));
    expect(mockLocalStorage.setItem).toHaveBeenCalledWith('token', mockToken);
  });

  test('handles login failure', async () => {
    fetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({
        success: false,
        message: 'Invalid credentials'
      })
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.login('test@example.com', 'wrongpassword');
      expect(response.success).toBe(false);
      expect(response.message).toBe('Invalid credentials');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });

  test('handles logout', () => {
    const mockUser = { id: '1', email: 'test@example.com', role: 'moderator' };
    const mockToken = 'mock-jwt-token';
    
    mockLocalStorage.getItem.mockImplementation((key) => {
      if (key === 'user') return JSON.stringify(mockUser);
      if (key === 'token') return mockToken;
      return null;
    });

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    act(() => {
      result.current.logout();
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('user');
    expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('token');
  });

  test('handles network errors during login', async () => {
    fetch.mockRejectedValueOnce(new Error('Network error'));

    const wrapper = ({ children }) => <AuthProvider>{children}</AuthProvider>;
    const { result } = renderHook(() => useAuth(), { wrapper });

    await act(async () => {
      const response = await result.current.login('test@example.com', 'password');
      expect(response.success).toBe(false);
      expect(response.message).toBe('Network error occurred');
    });

    expect(result.current.user).toBeNull();
    expect(result.current.token).toBeNull();
  });
});
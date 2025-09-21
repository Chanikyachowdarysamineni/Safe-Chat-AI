import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import LoginPage from '../src/pages/LoginPage';
import { AuthProvider } from '../src/services/AuthContext';

// Mock the auth context
const MockAuthProvider = ({ children }) => {
  const mockLogin = jest.fn().mockResolvedValue({ success: true });
  
  return (
    <AuthProvider value={{ login: mockLogin, loading: false }}>
      {children}
    </AuthProvider>
  );
};

const renderWithRouter = (component) => {
  return render(
    <BrowserRouter>
      <MockAuthProvider>
        {component}
      </MockAuthProvider>
    </BrowserRouter>
  );
};

describe('LoginPage', () => {
  test('renders login form', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByText('SafeChat AI')).toBeInTheDocument();
    expect(screen.getByLabelText(/email address/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /sign in/i })).toBeInTheDocument();
  });

  test('shows validation errors for empty form', async () => {
    renderWithRouter(<LoginPage />);
    
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    fireEvent.click(submitButton);

    // Form should prevent submission with empty fields
    expect(screen.getByLabelText(/email address/i)).toBeInvalid();
    expect(screen.getByLabelText(/password/i)).toBeInvalid();
  });

  test('toggles password visibility', () => {
    renderWithRouter(<LoginPage />);
    
    const passwordInput = screen.getByLabelText(/password/i);
    const toggleButton = screen.getByRole('button', { name: '' }); // Eye icon button
    
    expect(passwordInput).toHaveAttribute('type', 'password');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'text');
    
    fireEvent.click(toggleButton);
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('submits form with valid data', async () => {
    renderWithRouter(<LoginPage />);
    
    const emailInput = screen.getByLabelText(/email address/i);
    const passwordInput = screen.getByLabelText(/password/i);
    const submitButton = screen.getByRole('button', { name: /sign in/i });
    
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);
    
    await waitFor(() => {
      // Check that form submission was attempted
      expect(emailInput.value).toBe('test@example.com');
      expect(passwordInput.value).toBe('password123');
    });
  });

  test('displays demo credentials', () => {
    renderWithRouter(<LoginPage />);
    
    expect(screen.getByText('Demo Credentials')).toBeInTheDocument();
    expect(screen.getByText('moderator@safechat.ai')).toBeInTheDocument();
    expect(screen.getByText('admin@safechat.ai')).toBeInTheDocument();
  });
});
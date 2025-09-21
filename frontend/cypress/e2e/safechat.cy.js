describe('SafeChat AI E2E Tests', () => {
  beforeEach(() => {
    cy.visit('/');
  });

  describe('Authentication Flow', () => {
    it('should display login page', () => {
      cy.contains('SafeChat AI').should('be.visible');
      cy.contains('Real-time Chat Moderation').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('contain', 'Sign In');
    });

    it('should show validation errors for invalid login', () => {
      cy.get('button[type="submit"]').click();
      
      // Check for HTML5 validation
      cy.get('input[type="email"]').should('have.attr', 'required');
      cy.get('input[type="password"]').should('have.attr', 'required');
    });

    it('should login with valid credentials', () => {
      // Intercept the login API call
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          user: {
            id: '1',
            email: 'moderator@safechat.ai',
            role: 'moderator',
            name: 'Test Moderator'
          },
          token: 'mock-jwt-token'
        }
      }).as('loginRequest');

      // Intercept dashboard data API calls
      cy.intercept('GET', '/api/dashboard/stats', {
        statusCode: 200,
        body: {
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
        }
      }).as('dashboardStats');

      cy.get('input[type="email"]').type('moderator@safechat.ai');
      cy.get('input[type="password"]').type('moderator123');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginRequest');
      cy.wait('@dashboardStats');

      // Should redirect to dashboard
      cy.url().should('include', '/dashboard');
      cy.contains('SafeChat AI Dashboard').should('be.visible');
    });

    it('should show error for invalid credentials', () => {
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 401,
        body: {
          success: false,
          message: 'Invalid credentials'
        }
      }).as('loginFailure');

      cy.get('input[type="email"]').type('invalid@email.com');
      cy.get('input[type="password"]').type('wrongpassword');
      cy.get('button[type="submit"]').click();

      cy.wait('@loginFailure');
      
      // Should stay on login page and show error
      cy.url().should('not.include', '/dashboard');
      cy.contains('Invalid credentials').should('be.visible');
    });
  });

  describe('Dashboard Functionality', () => {
    beforeEach(() => {
      // Login before each dashboard test
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 200,
        body: {
          success: true,
          user: {
            id: '1',
            email: 'moderator@safechat.ai',
            role: 'moderator',
            name: 'Test Moderator'
          },
          token: 'mock-jwt-token'
        }
      });

      cy.intercept('GET', '/api/dashboard/stats', {
        statusCode: 200,
        body: {
          totalMessages: 1500,
          flaggedMessages: 45,
          totalUsers: 120,
          activeUsers: 25,
          recentFlags: [
            {
              id: '1',
              messageId: 'msg1',
              content: 'Test flagged message',
              type: 'harassment',
              confidence: 0.95,
              emotionType: 'anger',
              emotionIntensity: 0.8,
              timestamp: new Date().toISOString(),
              status: 'pending'
            }
          ],
          emotionStats: {
            'anger': 15,
            'fear': 8,
            'sadness': 12,
            'joy': 45,
            'surprise': 20
          }
        }
      });

      cy.get('input[type="email"]').type('moderator@safechat.ai');
      cy.get('input[type="password"]').type('moderator123');
      cy.get('button[type="submit"]').click();
    });

    it('should display dashboard statistics', () => {
      cy.contains('Total Messages').should('be.visible');
      cy.contains('1,500').should('be.visible');
      cy.contains('Flagged Messages').should('be.visible');
      cy.contains('45').should('be.visible');
      cy.contains('Total Users').should('be.visible');
      cy.contains('120').should('be.visible');
      cy.contains('Active Users').should('be.visible');
      cy.contains('25').should('be.visible');
    });

    it('should display recent flagged messages', () => {
      cy.contains('Recent Flagged Messages').should('be.visible');
      cy.contains('Test flagged message').should('be.visible');
      cy.contains('harassment').should('be.visible');
      cy.contains('anger').should('be.visible');
    });

    it('should display emotion analysis chart', () => {
      cy.contains('Emotion Analysis').should('be.visible');
      // Check for chart elements (recharts components)
      cy.get('[data-testid="responsive-container"]').should('exist');
    });

    it('should handle real-time updates', () => {
      // Mock socket connection
      cy.window().its('socket').should('exist');
      
      // Simulate real-time message flag
      cy.window().then((win) => {
        win.socket.emit('message_flagged', {
          id: '2',
          messageId: 'msg2',
          content: 'Another flagged message',
          type: 'spam',
          confidence: 0.85,
          emotionType: 'neutral',
          emotionIntensity: 0.3,
          timestamp: new Date().toISOString(),
          status: 'pending'
        });
      });

      // Should update the flagged messages count
      cy.contains('46').should('be.visible');
    });

    it('should logout successfully', () => {
      cy.contains('Logout').click();
      
      // Should redirect to login page
      cy.url().should('not.include', '/dashboard');
      cy.contains('SafeChat AI').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    it('should work on mobile devices', () => {
      cy.viewport('iphone-x');
      
      cy.contains('SafeChat AI').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });

    it('should work on tablet devices', () => {
      cy.viewport('ipad-2');
      
      cy.contains('SafeChat AI').should('be.visible');
      cy.get('input[type="email"]').should('be.visible');
      cy.get('input[type="password"]').should('be.visible');
      cy.get('button[type="submit"]').should('be.visible');
    });
  });

  describe('Error Handling', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '/api/auth/login', {
        forceNetworkError: true
      }).as('networkError');

      cy.get('input[type="email"]').type('moderator@safechat.ai');
      cy.get('input[type="password"]').type('moderator123');
      cy.get('button[type="submit"]').click();

      cy.wait('@networkError');
      
      // Should show network error message
      cy.contains('Network error').should('be.visible');
    });

    it('should handle API errors gracefully', () => {
      cy.intercept('POST', '/api/auth/login', {
        statusCode: 500,
        body: {
          success: false,
          message: 'Internal server error'
        }
      }).as('serverError');

      cy.get('input[type="email"]').type('moderator@safechat.ai');
      cy.get('input[type="password"]').type('moderator123');
      cy.get('button[type="submit"]').click();

      cy.wait('@serverError');
      
      // Should show server error message
      cy.contains('Internal server error').should('be.visible');
    });
  });
});
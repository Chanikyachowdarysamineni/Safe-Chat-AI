// Import commands.js using ES2015 syntax:
import './commands'

// Alternatively you can use CommonJS syntax:
// require('./commands')

// Add custom commands
Cypress.Commands.add('login', (email = 'moderator@safechat.ai', password = 'moderator123') => {
  cy.intercept('POST', '/api/auth/login', {
    statusCode: 200,
    body: {
      success: true,
      user: {
        id: '1',
        email: email,
        role: 'moderator',
        name: 'Test Moderator'
      },
      token: 'mock-jwt-token'
    }
  }).as('loginRequest');

  cy.visit('/');
  cy.get('input[type="email"]').type(email);
  cy.get('input[type="password"]').type(password);
  cy.get('button[type="submit"]').click();
  cy.wait('@loginRequest');
});

Cypress.Commands.add('mockDashboardData', () => {
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
  }).as('dashboardStats');
});

// Handle uncaught exceptions
Cypress.on('uncaught:exception', (err, runnable) => {
  // Returning false here prevents Cypress from failing the test
  // for certain expected errors
  if (err.message.includes('ResizeObserver loop limit exceeded')) {
    return false;
  }
  if (err.message.includes('Socket connection failed')) {
    return false;
  }
  return true;
});
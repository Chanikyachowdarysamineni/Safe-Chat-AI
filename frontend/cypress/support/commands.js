// Custom commands for Cypress testing

Cypress.Commands.add('getByTestId', (testId) => {
  return cy.get(`[data-testid="${testId}"]`);
});

Cypress.Commands.add('getByAriaLabel', (label) => {
  return cy.get(`[aria-label="${label}"]`);
});

Cypress.Commands.add('waitForElement', (selector, timeout = 10000) => {
  return cy.get(selector, { timeout });
});

Cypress.Commands.add('typeAndBlur', (selector, text) => {
  return cy.get(selector).type(text).blur();
});

Cypress.Commands.add('clickAndWait', (selector, waitFor = 1000) => {
  return cy.get(selector).click().wait(waitFor);
});

// Add support for custom assertions
Cypress.Commands.add('shouldBeVisible', { prevSubject: true }, (subject) => {
  return cy.wrap(subject).should('be.visible');
});

Cypress.Commands.add('shouldContainText', { prevSubject: true }, (subject, text) => {
  return cy.wrap(subject).should('contain.text', text);
});

Cypress.Commands.add('shouldHaveClass', { prevSubject: true }, (subject, className) => {
  return cy.wrap(subject).should('have.class', className);
});

// Mock API responses
Cypress.Commands.add('mockApiError', (method, url, statusCode = 500, message = 'Internal Server Error') => {
  return cy.intercept(method, url, {
    statusCode,
    body: {
      success: false,
      message
    }
  });
});

Cypress.Commands.add('mockNetworkError', (method, url) => {
  return cy.intercept(method, url, {
    forceNetworkError: true
  });
});
/**
 * Payment Flow Scenario
 *
 * Tests complete payment workflow including Stripe integration
 *
 * Flow:
 * 1. Register/Login user
 * 2. Create payment intent
 * 3. Confirm payment
 * 4. Check payment status
 * 5. Get payment history
 *
 * This scenario validates:
 * - Payment intent creation
 * - Stripe API integration performance
 * - Payment confirmation flow
 * - Payment status tracking
 * - Transaction history retrieval
 *
 * Use Case:
 * - Moderate user count (20-50 virtual users)
 * - Longer duration (5-10 minutes)
 * - Focus on payment system reliability
 * - Test Stripe API rate limits
 */

module.exports = {
  name: 'Payment Flow',
  description: 'Complete payment workflow (register → create payment → confirm → verify)',

  steps: [
    // Step 1: Register
    {
      name: 'Register user',
      method: 'POST',
      endpoint: '/api/v1/auth/register',
      body: (context) => ({
        email: `payment${context.userId}_${context.timestamp}@example.com`,
        password: 'SecurePass123!',
        name: `Payment Test User ${context.userId}`
      }),
      extract: {
        userId: 'data.user._id',
        accessToken: 'data.accessToken',
        email: 'data.user.email'
      },
      expect: {
        statusCode: 201
      },
      critical: true
    },

    // Step 2: Login
    {
      name: 'Login',
      method: 'POST',
      endpoint: '/api/v1/auth/login',
      body: (context) => ({
        email: context.email,
        password: 'SecurePass123!'
      }),
      extract: {
        accessToken: 'data.accessToken'
      },
      expect: {
        statusCode: 200
      },
      critical: true
    },

    // Step 3: Create Payment Intent
    {
      name: 'Create payment intent',
      method: 'POST',
      endpoint: '/api/v1/payments/create-intent',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      body: (context) => ({
        amount: Math.floor(Math.random() * 50000) + 10000, // Random amount between $100-$500
        currency: 'usd',
        description: `Load test payment by user ${context.userId}`,
        metadata: {
          userId: context.userId,
          testRun: context.timestamp
        }
      }),
      extract: {
        paymentIntentId: 'data.paymentIntent.id',
        clientSecret: 'data.clientSecret',
        amount: 'data.paymentIntent.amount'
      },
      expect: {
        statusCode: 201
      },
      critical: true // Payment intent creation must succeed
    },

    // Step 4: Confirm Payment (Simulated)
    {
      name: 'Confirm payment',
      method: 'POST',
      endpoint: '/api/v1/payments/confirm',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      body: (context) => ({
        paymentIntentId: context.paymentIntentId,
        paymentMethodId: 'pm_card_visa' // Test payment method
      }),
      extract: {
        paymentId: 'data.payment._id',
        status: 'data.payment.status'
      },
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 5: Get Payment Status
    {
      name: 'Check payment status',
      method: 'GET',
      endpoint: (context) => `/api/v1/payments/${context.paymentId}`,
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 6: Get Payment History
    {
      name: 'Get payment history',
      method: 'GET',
      endpoint: '/api/v1/payments/history?page=1&limit=10',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 7: Get Payment Statistics
    {
      name: 'Get payment statistics',
      method: 'GET',
      endpoint: '/api/v1/payments/statistics',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      expect: {
        statusCode: 200
      },
      critical: false
    }
  ]
};

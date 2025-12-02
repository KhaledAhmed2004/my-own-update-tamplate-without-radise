/**
 * Authentication Only Scenario
 *
 * Quick authentication load test focusing on login/register performance
 *
 * Flow:
 * 1. Register new user
 * 2. Login immediately
 * 3. Refresh token
 * 4. Verify token is valid (get profile)
 *
 * This scenario is ideal for:
 * - Testing authentication system capacity
 * - Measuring JWT generation performance
 * - Validating bcrypt performance under load
 * - Quick smoke tests
 *
 * Use Case:
 * - High user count (100-500 virtual users)
 * - Short duration (1-2 minutes)
 * - Focus on auth bottlenecks
 */

module.exports = {
  name: 'Authentication Only',
  description: 'Quick auth system load test (register → login → refresh → verify)',

  steps: [
    // Step 1: Register
    {
      name: 'Register user',
      method: 'POST',
      endpoint: '/api/v1/auth/register',
      body: (context) => ({
        email: `auth${context.userId}_${context.timestamp}@example.com`,
        password: 'TestPass123!',
        name: `Auth Test ${context.userId}`
      }),
      extract: {
        userId: 'data.user._id',
        accessToken: 'data.accessToken',
        refreshToken: 'data.refreshToken',
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
        password: 'TestPass123!'
      }),
      extract: {
        accessToken: 'data.accessToken',
        refreshToken: 'data.refreshToken'
      },
      expect: {
        statusCode: 200
      },
      critical: true
    },

    // Step 3: Refresh Token
    {
      name: 'Refresh access token',
      method: 'POST',
      endpoint: '/api/v1/auth/refresh-token',
      body: (context) => ({
        refreshToken: context.refreshToken
      }),
      extract: {
        accessToken: 'data.accessToken'
      },
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 4: Verify Token (Get Profile)
    {
      name: 'Verify token validity',
      method: 'GET',
      endpoint: '/api/v1/user/profile',
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

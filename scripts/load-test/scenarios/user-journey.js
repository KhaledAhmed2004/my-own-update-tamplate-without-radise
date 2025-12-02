/**
 * Complete User Journey Scenario
 *
 * Tests the full user workflow from registration to task management
 *
 * Flow:
 * 1. Register new user
 * 2. Login with credentials
 * 3. Get user profile
 * 4. Create a new task
 * 5. Browse all tasks
 * 6. Get specific task details
 *
 * This scenario validates:
 * - User authentication flow
 * - Profile access after login
 * - Task creation capability
 * - Task listing and filtering
 * - Individual task retrieval
 */

module.exports = {
  name: 'Complete User Journey',
  description: 'Full user workflow from registration to task management',

  steps: [
    // Step 1: Register
    {
      name: 'Register user',
      method: 'POST',
      endpoint: '/api/v1/auth/register',
      body: (context) => ({
        email: `loadtest${context.userId}@example.com`,
        password: 'SecurePass123!',
        name: `Load Test User ${context.userId}`
      }),
      extract: {
        userId: 'data.user._id',
        accessToken: 'data.accessToken',
        email: 'data.user.email',
        name: 'data.user.name'
      },
      expect: {
        statusCode: 201
      },
      critical: true // If registration fails, stop journey
    },

    // Step 2: Login
    {
      name: 'Login with credentials',
      method: 'POST',
      endpoint: '/api/v1/auth/login',
      body: (context) => ({
        email: context.email,
        password: 'SecurePass123!'
      }),
      extract: {
        accessToken: 'data.accessToken',
        refreshToken: 'data.refreshToken'
      },
      expect: {
        statusCode: 200
      },
      critical: true // If login fails, stop journey
    },

    // Step 3: Get Profile
    {
      name: 'Get user profile',
      method: 'GET',
      endpoint: '/api/v1/user/profile',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      expect: {
        statusCode: 200
      },
      critical: true
    },

    // Step 4: Create Task
    {
      name: 'Create new task',
      method: 'POST',
      endpoint: '/api/v1/tasks',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      body: (context) => ({
        title: `Task created by ${context.name}`,
        description: `This is a load test task created at ${new Date().toISOString()}`,
        status: 'pending',
        priority: 'medium',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString() // 7 days from now
      }),
      extract: {
        taskId: 'data._id',
        taskTitle: 'data.title'
      },
      expect: {
        statusCode: 201
      },
      critical: false // Task creation failure is not critical
    },

    // Step 5: Browse Tasks
    {
      name: 'Browse all tasks',
      method: 'GET',
      endpoint: '/api/v1/tasks?page=1&limit=20&sort=-createdAt',
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 6: Get Specific Task
    {
      name: 'Get task details',
      method: 'GET',
      endpoint: (context) => `/api/v1/tasks/${context.taskId}`,
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 7: Update Task Status
    {
      name: 'Update task status',
      method: 'PATCH',
      endpoint: (context) => `/api/v1/tasks/${context.taskId}`,
      headers: (context) => ({
        Authorization: `Bearer ${context.accessToken}`
      }),
      body: {
        status: 'in-progress'
      },
      expect: {
        statusCode: 200
      },
      critical: false
    },

    // Step 8: Search Tasks
    {
      name: 'Search tasks',
      method: 'GET',
      endpoint: (context) => `/api/v1/tasks?search=${encodeURIComponent(context.name)}&limit=10`,
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

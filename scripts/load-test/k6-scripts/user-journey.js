import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Load Test: Complete User Journey
 *
 * Generated from scenario: user-journey
 * Description: Full user workflow from registration to task management
 */

// Custom metrics
const errorRate = new Rate('errors');
const requestDuration = new Trend('request_duration');
const successfulRequests = new Counter('successful_requests');
const failedRequests = new Counter('failed_requests');

// Configuration
export const options = {
  stages: [
    {
        "duration": "1m",
        "target": 5
    },
    {
        "duration": "2m",
        "target": 20
    },
    {
        "duration": "5m",
        "target": 30
    },
    {
        "duration": "1m",
        "target": 50
    },
    {
        "duration": "1m",
        "target": 0
    }
],

  thresholds: {
    "http_req_duration": [
        "p(95)<500",
        "p(99)<1000"
    ],
    "http_req_failed": [
        "rate<0.05"
    ],
    "errors": [
        "rate<0.05"
    ],
    "checks": [
        "rate>0.95"
    ]
},

  // Additional options
  noConnectionReuse: false,
  userAgent: 'k6-load-test/user-journey',

  // Tags for all requests
  tags: {
    testType: 'load-test',
    scenario: 'user-journey'
  }
};

// Base URL
const BASE_URL = __ENV.BASE_URL || 'http://localhost:5000';

/**
 * Setup function (runs once)
 */
export function setup() {
  console.log('Starting k6 load test...');
  console.log('Base URL:', BASE_URL);

  return {
    timestamp: Date.now()
  };
}

/**
 * Teardown function (runs once after test)
 */
export function teardown(data) {
  console.log('Load test completed');
  console.log('Duration:', (Date.now() - data.timestamp) / 1000, 'seconds');
}

/**
 * Main test function (runs for each VU)
 */
export default function(data) {
  // Context for this virtual user
  const context = {
    userId: __VU, // Virtual User ID
    iteration: __ITER, // Iteration number
    timestamp: Date.now()
  };

  // Step 1: Register user
  const response0 = makeRequest(
    'POST',
    '/api/v1/auth/register',
    {
        email: `loadtest${${context.userId}},
    {},
    201
  );
  
  // Extract data for next steps
  if (response0 && response0.body) {
    try {
      const data = JSON.parse(response0.body);
      context.userId = extractValue(data, 'data.user._id');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response0 && response0.body) {
    try {
      const data = JSON.parse(response0.body);
      context.accessToken = extractValue(data, 'data.accessToken');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response0 && response0.body) {
    try {
      const data = JSON.parse(response0.body);
      context.email = extractValue(data, 'data.user.email');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response0 && response0.body) {
    try {
      const data = JSON.parse(response0.body);
      context.name = extractValue(data, 'data.user.name');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  
  thinkTime(1, 3);

  
  // Step 2: Login with credentials
  const response1 = makeRequest(
    'POST',
    '/api/v1/auth/login',
    {
        email: ${context.email},
        password: 'SecurePass123!'
      },
    {},
    200
  );
  
  // Extract data for next steps
  if (response1 && response1.body) {
    try {
      const data = JSON.parse(response1.body);
      context.accessToken = extractValue(data, 'data.accessToken');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response1 && response1.body) {
    try {
      const data = JSON.parse(response1.body);
      context.refreshToken = extractValue(data, 'data.refreshToken');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  
  thinkTime(1, 3);

  
  // Step 3: Get user profile
  const response2 = makeRequest(
    'GET',
    '/api/v1/user/profile',
    null,
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

  
  // Step 4: Create new task
  const response3 = makeRequest(
    'POST',
    '/api/v1/tasks',
    {
        title: `Task created by ${${context.name}},
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    201
  );
  
  // Extract data for next steps
  if (response3 && response3.body) {
    try {
      const data = JSON.parse(response3.body);
      context.taskId = extractValue(data, 'data._id');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response3 && response3.body) {
    try {
      const data = JSON.parse(response3.body);
      context.taskTitle = extractValue(data, 'data.title');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  
  thinkTime(1, 3);

  
  // Step 5: Browse all tasks
  const response4 = makeRequest(
    'GET',
    '/api/v1/tasks?page=1&limit=20&sort=-createdAt',
    null,
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

  
  // Step 6: Get task details
  const response5 = makeRequest(
    'GET',
    `/api/v1/tasks/${context.taskId}`,
    null,
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

  
  // Step 7: Update task status
  const response6 = makeRequest(
    'PATCH',
    `/api/v1/tasks/${context.taskId}`,
    {"status":"in-progress"},
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

  
  // Step 8: Search tasks
  const response7 = makeRequest(
    'GET',
    `/api/v1/tasks?search=${encodeURIComponent(context.name)}&limit=10`,
    null,
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

}

/**
 * Helper: Make HTTP request with checks
 */
function makeRequest(method, endpoint, payload = null, headers = {}, expectedStatus = 200) {
  const url = BASE_URL + endpoint;

  const params = {
    headers: {
      'Content-Type': 'application/json',
      ...headers
    },
    tags: { name: endpoint }
  };

  let response;
  const startTime = Date.now();

  try {
    if (method === 'GET') {
      response = http.get(url, params);
    } else if (method === 'POST') {
      response = http.post(url, JSON.stringify(payload), params);
    } else if (method === 'PUT') {
      response = http.put(url, JSON.stringify(payload), params);
    } else if (method === 'PATCH') {
      response = http.patch(url, JSON.stringify(payload), params);
    } else if (method === 'DELETE') {
      response = http.del(url, null, params);
    }

    const duration = Date.now() - startTime;
    requestDuration.add(duration);

    // Checks
    const success = check(response, {
      [`status is ${expectedStatus}`]: (r) => r.status === expectedStatus,
      'response has body': (r) => r.body && r.body.length > 0
    });

    if (success) {
      successfulRequests.add(1);
    } else {
      failedRequests.add(1);
      errorRate.add(1);
    }

    return response;

  } catch (error) {
    console.error(`Request failed: ${error}`);
    failedRequests.add(1);
    errorRate.add(1);
    return null;
  }
}

/**
 * Helper: Extract JSON path
 */
function extractValue(obj, path) {
  return path.split('.').reduce((current, key) => current?.[key], obj);
}

/**
 * Helper: Random think time
 */
function thinkTime(min = 1, max = 3) {
  sleep(Math.random() * (max - min) + min);
}

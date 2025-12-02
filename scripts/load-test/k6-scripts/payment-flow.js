import http from 'k6/http';
import { check, sleep } from 'k6';
import { Rate, Trend, Counter } from 'k6/metrics';

/**
 * k6 Load Test: Payment Flow
 *
 * Generated from scenario: payment-flow
 * Description: Complete payment workflow (register → create payment → confirm → verify)
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
        "target": 3
    },
    {
        "duration": "2m",
        "target": 10
    },
    {
        "duration": "5m",
        "target": 15
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
  userAgent: 'k6-load-test/payment-flow',

  // Tags for all requests
  tags: {
    testType: 'load-test',
    scenario: 'payment-flow'
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
        email: `payment${${context.userId}},
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
  
  thinkTime(1, 3);

  
  // Step 2: Login
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
  
  thinkTime(1, 3);

  
  // Step 3: Create payment intent
  const response2 = makeRequest(
    'POST',
    '/api/v1/payments/create-intent',
    {
        amount: Math.floor(Math.random() * 50000) + 10000, // Random amount between $100-$500
        currency: 'usd',
        description: `Load test payment by user ${${context.userId}},
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    201
  );
  
  // Extract data for next steps
  if (response2 && response2.body) {
    try {
      const data = JSON.parse(response2.body);
      context.paymentIntentId = extractValue(data, 'data.paymentIntent.id');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response2 && response2.body) {
    try {
      const data = JSON.parse(response2.body);
      context.clientSecret = extractValue(data, 'data.clientSecret');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response2 && response2.body) {
    try {
      const data = JSON.parse(response2.body);
      context.amount = extractValue(data, 'data.paymentIntent.amount');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  
  thinkTime(1, 3);

  
  // Step 4: Confirm payment
  const response3 = makeRequest(
    'POST',
    '/api/v1/payments/confirm',
    {
        paymentIntentId: ${context.paymentIntentId},
        paymentMethodId: 'pm_card_visa' // Test payment method
      },
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  // Extract data for next steps
  if (response3 && response3.body) {
    try {
      const data = JSON.parse(response3.body);
      context.paymentId = extractValue(data, 'data.payment._id');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  if (response3 && response3.body) {
    try {
      const data = JSON.parse(response3.body);
      context.status = extractValue(data, 'data.payment.status');
    } catch (e) {
      console.error('Failed to parse response:', e);
    }
  }
  
  thinkTime(1, 3);

  
  // Step 5: Check payment status
  const response4 = makeRequest(
    'GET',
    `/api/v1/payments/${context.paymentId}`,
    null,
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

  
  // Step 6: Get payment history
  const response5 = makeRequest(
    'GET',
    '/api/v1/payments/history?page=1&limit=10',
    null,
    {
      Authorization: `Bearer ${context.accessToken}`
    },
    200
  );
  
  thinkTime(1, 3);

  
  // Step 7: Get payment statistics
  const response6 = makeRequest(
    'GET',
    '/api/v1/payments/statistics',
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

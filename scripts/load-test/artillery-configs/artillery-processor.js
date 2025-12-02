/**
 * Artillery Processor
 *
 * Custom functions for Artillery load tests
 */

module.exports = {
  /**
   * Set dynamic variables before request
   */
  setDynamicVars: function(requestParams, context, ee, next) {
    // Generate unique email
    context.vars.uniqueEmail = `loadtest${Date.now()}_${Math.random().toString(36).substr(2, 9)}@example.com`;

    // Generate timestamp
    context.vars.timestamp = Date.now();

    // Generate random user data
    context.vars.randomName = `User ${Math.floor(Math.random() * 10000)}`;

    return next();
  },

  /**
   * Log response data
   */
  logResponse: function(requestParams, response, context, ee, next) {
    if (response.statusCode >= 400) {
      console.log('Error response:', {
        status: response.statusCode,
        body: response.body
      });
    }
    return next();
  },

  /**
   * Custom authentication
   */
  authenticate: function(requestParams, context, ee, next) {
    if (context.vars.accessToken) {
      requestParams.headers = requestParams.headers || {};
      requestParams.headers.Authorization = `Bearer ${context.vars.accessToken}`;
    }
    return next();
  }
};

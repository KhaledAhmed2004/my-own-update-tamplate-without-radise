/**
 * Mermaid Sequence Diagram Generator - Configuration
 *
 * এই file-এ সমস্ত configuration options রয়েছে যা diagram generation customize করার জন্য ব্যবহার করা হয়
 */

module.exports = {
  // Styling Options
  styling: {
    theme: 'default', // Options: 'default', 'dark', 'forest', 'neutral'
    fontSize: 14,
    noteBackground: '#fff3cd',
    errorColor: '#dc3545',
    successColor: '#28a745',
    warningColor: '#ffc107',
    infoColor: '#17a2b8',
  },

  // Detail Level Settings
  detail: {
    showPayload: true, // Request/response data দেখাবে
    showValidation: true, // Validation rules দেখাবে
    showQueries: true, // Database queries দেখাবে
    showTiming: true, // Performance timing দেখাবে
    showErrors: true, // Error scenarios দেখাবে
    banglaComments: true, // Bangla explanations যোগ করবে
    showHelpers: true, // Helper function calls দেখাবে
    showMiddleware: true, // Middleware chain দেখাবে
    showModels: true, // Model operations দেখাবে
  },

  // Output Configuration
  output: {
    formats: ['mmd', 'html'], // Options: 'mmd', 'html', 'png'
    directory: 'scripts/diagram-generator/output',
    diagramsDir: 'scripts/diagram-generator/output/diagrams',
    htmlDir: 'scripts/diagram-generator/output/html',
    imagesDir: 'scripts/diagram-generator/output/images',
    naming: '{module}-{endpoint}-{level}', // Template: {module}-{endpoint}-{level}.mmd
  },

  // Analysis Configuration
  analysis: {
    maxDepth: 5, // Service call depth limit
    includeHelpers: true, // Helper function calls include করবে
    includeMiddleware: true, // Middleware chain include করবে
    includeSocketIO: true, // Socket.IO events include করবে
    includeExternalAPIs: true, // Stripe/Firebase/S3 calls include করবে
    includeQueryBuilders: true, // QueryBuilder/AggregationBuilder include করবে
    followImports: true, // Import statements follow করবে
  },

  // Detail Levels
  levels: {
    overview: {
      name: 'High-Level Overview',
      description: 'Quick overview without details',
      maxSteps: 10,
      showPayload: false,
      showTiming: false,
      showErrors: false,
    },
    standard: {
      name: 'Standard Detail',
      description: 'Recommended level with balanced detail',
      maxSteps: 30,
      showPayload: true,
      showTiming: true,
      showErrors: true,
    },
    detailed: {
      name: 'Ultra-Detailed',
      description: 'Maximum detail with all information',
      maxSteps: 100,
      showPayload: true,
      showTiming: true,
      showErrors: true,
      showInternalCalls: true,
    },
  },

  // Participant Aliases (Readable names)
  participantAliases: {
    Client: 'Client',
    Route: 'Express Route',
    Middleware: 'Middleware',
    Controller: 'Controller',
    Service: 'Service',
    Model: 'Mongoose Model',
    Database: 'MongoDB',
    Helper: 'Helper Function',
    SocketIO: 'Socket.IO Server',
    Stripe: 'Stripe API',
    Firebase: 'Firebase Cloud Messaging',
    S3: 'AWS S3',
    Cloudinary: 'Cloudinary',
  },

  // Bangla Comments Template
  banglaComments: {
    validation: '✓ Validation: সমস্ত data সঠিক কিনা যাচাই করা হচ্ছে',
    authentication: '🔐 Authentication: JWT token verify করা হচ্ছে',
    authorization: '🛡️ Authorization: User-এর permission check করা হচ্ছে',
    databaseQuery: '💾 Database Query: MongoDB থেকে data fetch করা হচ্ছে',
    databaseUpdate: '💾 Database Update: MongoDB-তে data save করা হচ্ছে',
    passwordHash: '🔒 Password Hashing: bcrypt দিয়ে password hash করা হচ্ছে',
    tokenGeneration: '🎫 Token Generation: JWT token তৈরি করা হচ্ছে',
    emailSend: '📧 Email: User-কে email পাঠানো হচ্ছে',
    socketEmit: '📡 Real-time Event: Socket.IO দিয়ে event emit করা হচ্ছে',
    externalAPI: '🌐 External API Call: Third-party service call করা হচ্ছে',
    fileUpload: '📁 File Upload: File upload/storage করা হচ্ছে',
  },

  // Module Specific Settings
  moduleSettings: {
    auth: {
      highlightSecurity: true,
      showTokenFlow: true,
    },
    payment: {
      highlightMoney: true,
      showStripeFlow: true,
      showWebhooks: true,
    },
    message: {
      highlightRealtime: true,
      showSocketIO: true,
      showPresence: true,
    },
  },

  // Paths Configuration
  paths: {
    srcRoot: 'src',
    modulesDir: 'src/app/modules',
    middlewaresDir: 'src/app/middlewares',
    helpersDir: 'src/helpers',
    sharedDir: 'src/shared',
    buildersDir: 'src/app/builder',
  },

  // Color Schemes for Different Flow Types
  colorSchemes: {
    authentication: {
      primary: '#007bff',
      secondary: '#6c757d',
      success: '#28a745',
      danger: '#dc3545',
    },
    payment: {
      primary: '#6772e5', // Stripe color
      secondary: '#ffc107',
      success: '#28a745',
      danger: '#dc3545',
    },
    messaging: {
      primary: '#6610f2',
      secondary: '#17a2b8',
      success: '#28a745',
      danger: '#dc3545',
    },
  },

  // Mermaid Diagram Options
  mermaid: {
    theme: 'default',
    themeVariables: {
      fontSize: '16px',
      fontFamily: 'arial',
      primaryColor: '#fff',
      primaryTextColor: '#000',
      primaryBorderColor: '#000',
      lineColor: '#333',
      secondaryColor: '#f4f4f4',
      tertiaryColor: '#fff',
    },
    sequence: {
      diagramMarginX: 50,
      diagramMarginY: 10,
      actorMargin: 50,
      width: 150,
      height: 65,
      boxMargin: 10,
      boxTextMargin: 5,
      noteMargin: 10,
      messageMargin: 35,
      mirrorActors: true,
      bottomMarginAdj: 1,
      useMaxWidth: true,
      rightAngles: false,
      showSequenceNumbers: true,
    },
  },

  // Template Settings
  templates: {
    useTemplates: true,
    templatesDir: 'scripts/diagram-generator/templates',
    defaultTemplate: 'standard-flow',
  },

  // Performance Thresholds (for timing annotations)
  performanceThresholds: {
    fast: 50, // ms
    moderate: 200, // ms
    slow: 500, // ms
    verySlow: 1000, // ms
  },

  // Error Handling
  errorHandling: {
    showCommonErrors: true,
    errors: {
      validation: '400 Bad Request - Validation Failed',
      authentication: '401 Unauthorized - Invalid Token',
      authorization: '403 Forbidden - Insufficient Permissions',
      notFound: '404 Not Found - Resource Not Found',
      server: '500 Internal Server Error',
    },
  },

  // CLI Settings
  cli: {
    interactive: true,
    verbose: false,
    showProgress: true,
    colors: true,
  },
};

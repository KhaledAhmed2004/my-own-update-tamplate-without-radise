/**
 * MongoDB Schema Diagram Generator Configuration
 *
 * এই file-এ সব configuration options আছে diagram generation এর জন্য
 */

const path = require('path');

module.exports = {
  // ==========================================
  // Path Configuration
  // ==========================================
  paths: {
    // Source directory for model files
    modulesDir: path.resolve(__dirname, '../../src/app/modules'),

    // Output directories
    outputDir: path.resolve(__dirname, 'output'),
    diagramsDir: path.resolve(__dirname, 'output/diagrams'),
    htmlDir: path.resolve(__dirname, 'output/html'),
  },

  // ==========================================
  // Display Options
  // ==========================================
  display: {
    // Show embedded/nested documents
    showEmbedded: true,

    // Show index indicators (PK, FK, UK, IDX)
    showIndexes: true,

    // Show enum values in comments
    showEnums: true,

    // Show constraints (required, unique, default)
    showConstraints: true,

    // Show field comments/descriptions
    showComments: true,

    // Detail level: 'overview', 'standard', 'detailed'
    detailLevel: 'standard',

    // NEW: Show polymorphic references with dotted lines
    showPolymorphic: true,

    // NEW: Show cardinality labels (1:1, N:1, M:N) on relationships
    showCardinality: true,
  },

  // ==========================================
  // Detail Levels
  // ==========================================
  detailLevels: {
    overview: {
      name: 'Overview',
      description: 'শুধু collection names এবং relationships',
      showFields: false,
      showEmbedded: false,
      showIndexes: false,
      showConstraints: false,
      maxFieldsPerEntity: 0,
    },
    standard: {
      name: 'Standard',
      description: 'Fields, types, এবং relationships (Recommended)',
      showFields: true,
      showEmbedded: true,
      showIndexes: true,
      showConstraints: true,
      maxFieldsPerEntity: 20,
    },
    detailed: {
      name: 'Detailed',
      description: 'সব কিছু সহ - enums, defaults, validations',
      showFields: true,
      showEmbedded: true,
      showIndexes: true,
      showConstraints: true,
      maxFieldsPerEntity: 100,
    },
  },

  // ==========================================
  // Styling Configuration
  // ==========================================
  styling: {
    // Mermaid theme
    theme: 'default',

    // Color scheme for different element types
    colors: {
      pk: '#FFD700', // Primary key (gold)
      fk: '#87CEEB', // Foreign key (sky blue)
      uk: '#90EE90', // Unique key (light green)
      index: '#DDA0DD', // Indexed field (plum)
      embedded: '#FFA07A', // Embedded document (light salmon)
      enum: '#E6E6FA', // Enum field (lavender)
      required: '#FFB6C1', // Required field (light pink)
      array: '#B0E0E6', // Array field (powder blue)
    },

    // Entity/Collection styling
    entity: {
      borderRadius: '8px',
      headerBackground: '#2C3E50',
      headerColor: '#ECF0F1',
    },

    // Relationship line styles
    relationships: {
      oneToOne: '||--||',
      oneToMany: '||--o{',
      manyToOne: '}o--||',
      manyToMany: '}o--o{',
    },

    // NEW: Polymorphic relationship styles (dotted lines)
    polymorphicRelationships: {
      oneToOne: '||..||',
      oneToMany: '||..o{',
      manyToOne: '}o..||',
      manyToMany: '}o..o{',
    },

    // NEW: Cardinality colors
    cardinality: {
      '1:1': '#27ae60', // Green for one-to-one
      'N:1': '#3498db', // Blue for many-to-one
      'M:N': '#9b59b6', // Purple for many-to-many
    },
  },

  // ==========================================
  // Bangla Labels & Comments
  // ==========================================
  banglaLabels: {
    // Field type labels
    types: {
      embedded: 'নেস্টেড ডকুমেন্ট',
      reference: 'রেফারেন্স',
      array: 'অ্যারে',
      embeddedArray: 'নেস্টেড অ্যারে',
    },

    // Constraint labels
    constraints: {
      required: 'আবশ্যক',
      unique: 'ইউনিক',
      indexed: 'ইনডেক্সড',
      default: 'ডিফল্ট',
      polymorphic: 'পলিমরফিক',
    },

    // Relationship labels
    relationships: {
      hasMany: 'অনেকগুলো আছে',
      belongsTo: 'এর অন্তর্গত',
      hasOne: 'একটি আছে',
    },

    // NEW: Cardinality labels
    cardinality: {
      '1:1': 'একের সাথে একটি',
      'N:1': 'অনেকের সাথে একটি',
      'M:N': 'অনেকের সাথে অনেক',
    },

    // UI labels
    ui: {
      collections: 'কালেকশনস',
      fullDiagram: 'সম্পূর্ণ ডায়াগ্রাম',
      singleModel: 'একক মডেল',
      allModels: 'সব মডেল',
      generateDiagram: 'ডায়াগ্রাম তৈরি করুন',
    },
  },

  // ==========================================
  // Schema Analysis Settings
  // ==========================================
  analysis: {
    // File patterns to search for models
    modelFilePattern: '*.model.ts',

    // Regex patterns for schema detection
    patterns: {
      // Match: new Schema({...}) or new mongoose.Schema({...})
      schemaDefinition: /new\s+(?:mongoose\.)?Schema\s*\(\s*\{/,

      // Match: model('ModelName', schema) or mongoose.model(...)
      modelExport: /(?:mongoose\.)?model\s*[<(]\s*['"](\w+)['"]/,

      // Match: ref: 'ModelName'
      reference: /ref\s*:\s*['"](\w+)['"]/,

      // NEW: Match: refPath: 'fieldName' (polymorphic reference)
      refPath: /refPath\s*:\s*['"](\w+)['"]/,

      // Match: type: Schema.Types.ObjectId or Types.ObjectId
      objectId: /type\s*:\s*(?:Schema\.Types\.ObjectId|Types\.ObjectId|mongoose\.Schema\.Types\.ObjectId)/,

      // Match: enum: ['value1', 'value2']
      enumValues: /enum\s*:\s*\[([^\]]+)\]/,

      // Match: required: true
      required: /required\s*:\s*true/,

      // Match: unique: true
      unique: /unique\s*:\s*true/,

      // Match: index: true
      indexed: /index\s*:\s*true/,

      // Match: default: value
      defaultValue: /default\s*:\s*([^,}\n]+)/,
    },

    // Known Mongoose types
    mongooseTypes: [
      'String',
      'Number',
      'Boolean',
      'Date',
      'Buffer',
      'ObjectId',
      'Mixed',
      'Array',
      'Decimal128',
      'Map',
    ],
  },

  // ==========================================
  // Output Configuration
  // ==========================================
  output: {
    // File formats to generate
    formats: ['mmd', 'html'],

    // File naming pattern
    // Available placeholders: {model}, {timestamp}, {level}
    fileNaming: {
      single: '{model}-schema',
      full: 'full-erd',
    },

    // HTML template settings
    html: {
      title: 'MongoDB Schema Diagram',
      includeNavigation: true,
      includeMermaidLive: true,
      includeCopyButton: true,
      includeCodeToggle: true,
    },
  },

  // ==========================================
  // CLI Configuration
  // ==========================================
  cli: {
    // Default to interactive mode
    interactive: true,

    // Show verbose output
    verbose: true,

    // Show progress indicators
    showProgress: true,

    // Use colors in output
    colors: true,

    // Auto-open browser after generation
    autoOpen: false,
  },

  // ==========================================
  // Known Models & Relationships
  // ==========================================
  // Pre-defined relationships for better accuracy
  knownRelationships: {
    User: {
      hasMany: ['Message', 'Notification', 'Bookmark', 'Payment'],
      hasOne: ['ResetToken', 'StripeAccount'],
    },
    Chat: {
      hasMany: ['Message'],
      belongsToMany: ['User'], // participants
    },
    Message: {
      belongsTo: ['Chat', 'User'],
    },
    Payment: {
      belongsTo: ['User'], // poster and freelancer
    },
    Notification: {
      belongsTo: ['User'],
    },
    Bookmark: {
      belongsTo: ['User'],
    },
    ResetToken: {
      belongsTo: ['User'],
    },
    StripeAccount: {
      belongsTo: ['User'],
    },
  },
};

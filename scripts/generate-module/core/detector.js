/**
 * Smart feature detection from parsed interface data
 */

const { pascalCase, camelCase } = require('../utils/string-helpers');

/**
 * Detect features and enhance field configurations
 * @param {Object} parsedData - Parsed interface data
 * @returns {Object} Enhanced configuration with detected features
 */
function detectFeatures(parsedData) {
  const config = {
    ...parsedData,
    features: {
      timestamps: parsedData.hasTimestamps,
      fileUpload: false,
      search: false,
      validation: true,
      authentication: true,
      pagination: true,
    },
    fileUploadFields: [],
    searchableFields: [],
    referenceFields: [],
    indexFields: [],
    roles: {
      create: ['POSTER', 'TASKER'],
      read: ['GUEST'],
      update: ['POSTER', 'TASKER'],
      delete: ['SUPER_ADMIN'],
    },
  };

  // Process each field to detect features
  config.fields = config.fields.map((field) => {
    const enhanced = { ...field };

    // Skip timestamp fields
    if (field.name === 'createdAt' || field.name === 'updatedAt' || field.name === '_id') {
      return enhanced;
    }

    // Detect file upload fields
    if (isFileUploadField(field)) {
      config.features.fileUpload = true;
      enhanced.fileUpload = true;
      enhanced.index = false;

      config.fileUploadFields.push({
        name: field.name,
        isArray: field.type === 'array',
        folder: `uploads/${parsedData.moduleName}`,
        allowedTypes: detectFileType(field.name),
        maxCount: field.type === 'array' ? 10 : 1,
      });
    }

    // Detect searchable fields
    else if (isSearchableField(field)) {
      config.features.search = true;
      enhanced.searchable = true;
      enhanced.index = true;
      config.searchableFields.push(field.name);
      config.indexFields.push(field.name);
    }

    // Detect reference fields
    if (field.type === 'reference') {
      const refModel = guessRefModel(field.name);
      enhanced.ref = refModel;
      enhanced.populate = true;
      enhanced.populateFields = refModel === 'User' ? 'name email profilePicture' : 'name';
      enhanced.index = true;

      config.referenceFields.push({
        name: field.name,
        ref: refModel,
        populate: true,
        populateFields: enhanced.populateFields,
      });

      config.indexFields.push(field.name);
    }

    // Add index for unique fields
    if (enhanced.unique) {
      enhanced.index = true;
      if (!config.indexFields.includes(field.name)) {
        config.indexFields.push(field.name);
      }
    }

    return enhanced;
  });

  return config;
}

/**
 * Check if a field is a file upload field
 * @param {Object} field - Field configuration
 * @returns {boolean} True if file upload field
 */
function isFileUploadField(field) {
  const fileFieldPatterns = [
    'image',
    'images',
    'avatar',
    'thumbnail',
    'photo',
    'photos',
    'picture',
    'pictures',
    'file',
    'files',
    'document',
    'documents',
    'attachment',
    'attachments',
  ];

  const fieldNameLower = field.name.toLowerCase();

  return (
    (field.type === 'string' || (field.type === 'array' && field.subtype === 'string')) &&
    fileFieldPatterns.some((pattern) => fieldNameLower.includes(pattern))
  );
}

/**
 * Check if a field should be searchable
 * @param {Object} field - Field configuration
 * @returns {boolean} True if searchable
 */
function isSearchableField(field) {
  // Must be string type
  if (field.type !== 'string') return false;

  // Exclude file upload fields
  if (isFileUploadField(field)) return false;

  // Exclude ID fields
  if (field.name.toLowerCase().includes('id')) return false;

  // Exclude short field names (probably codes/slugs)
  if (field.name.length <= 2) return false;

  // Common searchable field names
  const searchablePatterns = [
    'title',
    'name',
    'description',
    'content',
    'text',
    'bio',
    'summary',
    'note',
    'comment',
    'message',
    'caption',
  ];

  const fieldNameLower = field.name.toLowerCase();
  return searchablePatterns.some((pattern) => fieldNameLower.includes(pattern));
}

/**
 * Detect file type from field name
 * @param {string} fieldName - Field name
 * @returns {string[]} Allowed file types
 */
function detectFileType(fieldName) {
  const fieldNameLower = fieldName.toLowerCase();

  if (
    fieldNameLower.includes('image') ||
    fieldNameLower.includes('photo') ||
    fieldNameLower.includes('picture') ||
    fieldNameLower.includes('avatar') ||
    fieldNameLower.includes('thumbnail')
  ) {
    return ['image'];
  }

  if (fieldNameLower.includes('video')) {
    return ['video'];
  }

  if (fieldNameLower.includes('document') || fieldNameLower.includes('file')) {
    return ['document'];
  }

  // Default to image
  return ['image'];
}

/**
 * Guess reference model from field name
 * @param {string} fieldName - Field name
 * @returns {string} Model name
 */
function guessRefModel(fieldName) {
  const fieldNameLower = fieldName.toLowerCase();

  // Common user references
  if (
    fieldNameLower === 'user' ||
    fieldNameLower === 'seller' ||
    fieldNameLower === 'owner' ||
    fieldNameLower === 'author' ||
    fieldNameLower === 'creator' ||
    fieldNameLower === 'buyer'
  ) {
    return 'User';
  }

  // Field ends with 'Id' or 'ID'
  if (fieldName.endsWith('Id')) {
    const modelName = fieldName.slice(0, -2);
    return pascalCase(modelName);
  }

  if (fieldName.endsWith('ID')) {
    const modelName = fieldName.slice(0, -2);
    return pascalCase(modelName);
  }

  // Default: use field name as model name
  return pascalCase(fieldName);
}

/**
 * Enhance config with user preferences (if any)
 * @param {Object} config - Detected configuration
 * @param {Object} userPrefs - User preferences from CLI or config file
 * @returns {Object} Enhanced configuration
 */
function enhanceWithUserPreferences(config, userPrefs = {}) {
  if (userPrefs.roles) {
    config.roles = { ...config.roles, ...userPrefs.roles };
  }

  if (userPrefs.features) {
    config.features = { ...config.features, ...userPrefs.features };
  }

  return config;
}

module.exports = {
  detectFeatures,
  enhanceWithUserPreferences,
  isFileUploadField,
  isSearchableField,
  guessRefModel,
};

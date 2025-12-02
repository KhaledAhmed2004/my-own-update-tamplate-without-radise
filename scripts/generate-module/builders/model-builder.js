/**
 * Model file builder
 */

const fs = require('fs').promises;
const path = require('path');
const { compileTemplate } = require('./base-builder');
const { getMongooseOptions } = require('../utils/type-mapper');
const { pascalCase, camelCase } = require('../utils/string-helpers');

/**
 * Build model file content
 * @param {Object} config - Module configuration
 * @returns {Promise<string>} Model file content
 */
async function buildModel(config) {
  const templatePath = path.join(__dirname, '../templates/model.hbs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Prepare fields with Mongoose options
  const fields = config.fields.map((field) => {
    const options = getMongooseOptions(field);
    // Format options as string for template
    const optionsStr = JSON.stringify(options, null, 6)
      .replace(/"([^"]+)":/g, '$1:') // Remove quotes from keys
      .replace(/: "Object\.values\(([^)]+)\)"/g, ': Object.values($1)') // Handle enum values
      .replace(/: "([A-Z_]+)\.([A-Z_]+)"/g, ': $1.$2') // Handle enum defaults
      .split('\n')
      .map((line, idx) => (idx === 0 ? line : '      ' + line))
      .join('\n');

    return {
      ...field,
      mongooseOptions: optionsStr,
    };
  });

  // Build indexes
  const indexes = [];

  // Text search index if searchable fields exist
  if (config.searchableFields && config.searchableFields.length > 0) {
    const textIndex = {};
    config.searchableFields.forEach((field) => {
      textIndex[field] = 'text';
    });
    indexes.push(JSON.stringify(textIndex));
  }

  // Individual indexes for reference fields
  if (config.referenceFields && config.referenceFields.length > 0) {
    config.referenceFields.forEach((ref) => {
      indexes.push(`{ ${ref.name}: 1 }`);
    });
  }

  const data = {
    moduleName: config.moduleName,
    pascalCase: config.pascalCase,
    camelCase: camelCase(config.moduleName),
    displayName: config.pascalCase,
    hasEnums: config.enums && config.enums.length > 0,
    enums: config.enums || [],
    fields,
    timestamps: config.features.timestamps,
    hasIndexes: indexes.length > 0,
    indexes,
  };

  return compileTemplate(templateContent, data);
}

module.exports = {
  buildModel,
};

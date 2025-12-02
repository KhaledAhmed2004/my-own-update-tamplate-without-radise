/**
 * Service file builder
 */

const fs = require('fs').promises;
const path = require('path');
const { compileTemplate } = require('./base-builder');
const { pascalCase, camelCase } = require('../utils/string-helpers');

/**
 * Build service file content
 * @param {Object} config - Module configuration
 * @returns {Promise<string>} Service file content
 */
async function buildService(config) {
  const templatePath = path.join(__dirname, '../templates/service.hbs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const data = {
    moduleName: config.moduleName,
    pascalCase: config.pascalCase,
    camelCase: camelCase(config.moduleName),
    displayName: config.pascalCase,
    hasSearch: config.features.search && config.searchableFields.length > 0,
    searchableFields: config.searchableFields || [],
    hasPopulate: config.referenceFields && config.referenceFields.length > 0,
    populateFields:
      config.referenceFields?.map((ref) => ({
        name: ref.name,
        fields: ref.populateFields || 'name',
      })) || [],
  };

  return compileTemplate(templateContent, data);
}

module.exports = {
  buildService,
};

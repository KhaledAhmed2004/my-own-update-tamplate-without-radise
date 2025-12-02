/**
 * Route file builder
 */

const fs = require('fs').promises;
const path = require('path');
const { compileTemplate } = require('./base-builder');
const { pascalCase, camelCase } = require('../utils/string-helpers');

/**
 * Build route file content
 * @param {Object} config - Module configuration
 * @returns {Promise<string>} Route file content
 */
async function buildRoute(config) {
  const templatePath = path.join(__dirname, '../templates/route.hbs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const data = {
    moduleName: config.moduleName,
    pascalCase: config.pascalCase,
    camelCase: camelCase(config.moduleName),
    displayName: config.pascalCase,
    hasFileUpload: config.features.fileUpload,
    fileUploadFields: config.fileUploadFields?.map((f) => ({ name: f.name })) || [],
    roles: config.roles,
  };

  return compileTemplate(templateContent, data);
}

module.exports = {
  buildRoute,
};

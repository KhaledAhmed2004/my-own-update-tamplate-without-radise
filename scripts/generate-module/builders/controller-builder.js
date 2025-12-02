/**
 * Controller file builder
 */

const fs = require('fs').promises;
const path = require('path');
const { compileTemplate } = require('./base-builder');
const { pascalCase, camelCase } = require('../utils/string-helpers');

/**
 * Build controller file content
 * @param {Object} config - Module configuration
 * @returns {Promise<string>} Controller file content
 */
async function buildController(config) {
  const templatePath = path.join(__dirname, '../templates/controller.hbs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  const data = {
    moduleName: config.moduleName,
    pascalCase: config.pascalCase,
    camelCase: camelCase(config.moduleName),
    displayName: config.pascalCase,
    hasPagination: config.features.search,
  };

  return compileTemplate(templateContent, data);
}

module.exports = {
  buildController,
};

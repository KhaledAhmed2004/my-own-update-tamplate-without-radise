/**
 * Validation file builder
 */

const fs = require('fs').promises;
const path = require('path');
const { compileTemplate } = require('./base-builder');
const { pascalCase, camelCase } = require('../utils/string-helpers');
const { getZodValidation } = require('../utils/type-mapper');

/**
 * Build validation file content
 * @param {Object} config - Module configuration
 * @returns {Promise<string>} Validation file content
 */
async function buildValidation(config) {
  const templatePath = path.join(__dirname, '../templates/validation.hbs');
  const templateContent = await fs.readFile(templatePath, 'utf-8');

  // Prepare validation fields (exclude timestamps and _id)
  const validationFields = config.fields
    .filter((f) => f.name !== 'createdAt' && f.name !== 'updatedAt' && f.name !== '_id')
    .map((field) => {
      const zodValidation = getZodValidation(field);
      // For update schema, make all fields optional
      const zodValidationOptional = zodValidation.includes('.optional()')
        ? zodValidation
        : zodValidation.replace(/z\.(string|number|boolean)\(\{[^}]+\}\)/, 'z.$1()') + '.optional()';

      return {
        ...field,
        zodValidation,
        zodValidationOptional,
      };
    });

  const data = {
    moduleName: config.moduleName,
    pascalCase: config.pascalCase,
    camelCase: camelCase(config.moduleName),
    displayName: config.pascalCase,
    hasEnums: config.enums && config.enums.length > 0,
    enums: config.enums || [],
    validationFields,
  };

  return compileTemplate(templateContent, data);
}

module.exports = {
  buildValidation,
};

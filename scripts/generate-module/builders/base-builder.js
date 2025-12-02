/**
 * Base builder with common Handlebars helpers
 */

const Handlebars = require('handlebars');
const { pascalCase, camelCase, pluralize } = require('../utils/string-helpers');
const { getMongooseOptions, getZodValidation } = require('../utils/type-mapper');

/**
 * Register Handlebars helpers
 */
function registerHelpers() {
  // String transformation helpers
  Handlebars.registerHelper('pascalCase', (str) => pascalCase(str));
  Handlebars.registerHelper('camelCase', (str) => camelCase(str));
  Handlebars.registerHelper('pluralize', (str) => pluralize(str));

  // Conditional helpers
  Handlebars.registerHelper('isTimestampField', (fieldName) => {
    return fieldName === 'createdAt' || fieldName === 'updatedAt' || fieldName === '_id';
  });

  // JSON stringify helper
  Handlebars.registerHelper('json', (context) => {
    return JSON.stringify(context, null, 2);
  });

  // Mongoose options helper
  Handlebars.registerHelper('mongooseOpt', (field) => {
    const options = getMongooseOptions(field);
    return JSON.stringify(options, null, 6).replace(/"/g, '').replace(/\n/g, '\n    ');
  });
}

/**
 * Compile template with data
 * @param {string} templateContent - Handlebars template
 * @param {Object} data - Template data
 * @returns {string} Compiled content
 */
function compileTemplate(templateContent, data) {
  const template = Handlebars.compile(templateContent);
  return template(data);
}

module.exports = {
  registerHelpers,
  compileTemplate,
};

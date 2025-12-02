/**
 * String helper utilities for code generation
 */

/**
 * Convert string to PascalCase
 * @param {string} str - Input string
 * @returns {string} PascalCase string
 */
function pascalCase(str) {
  return str
    .replace(/[-_](\w)/g, (_, c) => c.toUpperCase())
    .replace(/^(\w)/, (_, c) => c.toUpperCase());
}

/**
 * Convert string to camelCase
 * @param {string} str - Input string
 * @returns {string} camelCase string
 */
function camelCase(str) {
  const pascal = pascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Convert string to kebab-case
 * @param {string} str - Input string
 * @returns {string} kebab-case string
 */
function kebabCase(str) {
  return str
    .replace(/([a-z])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

/**
 * Pluralize a word (simple English pluralization)
 * @param {string} word - Singular word
 * @returns {string} Plural word
 */
function pluralize(word) {
  if (word.endsWith('y')) {
    return word.slice(0, -1) + 'ies';
  }
  if (word.endsWith('s') || word.endsWith('x') || word.endsWith('ch') || word.endsWith('sh')) {
    return word + 'es';
  }
  return word + 's';
}

/**
 * Get field description for display
 * @param {Object} field - Field configuration
 * @returns {string} Formatted description
 */
function formatFieldType(field) {
  let type = field.type;

  if (field.type === 'enum') {
    type = `enum: ${field.enumType}`;
  } else if (field.type === 'reference') {
    type = `reference: ${field.ref || 'Unknown'}`;
  } else if (field.type === 'array') {
    type = `array<${field.subtype}>`;
  }

  const badges = [];
  if (field.required) badges.push('required');
  if (field.searchable) badges.push('searchable');
  if (field.fileUpload) badges.push('file upload');
  if (field.unique) badges.push('unique');
  if (!field.required) badges.push('optional');

  return `${type}${badges.length > 0 ? ', ' + badges.join(', ') : ''}`;
}

module.exports = {
  pascalCase,
  camelCase,
  kebabCase,
  pluralize,
  formatFieldType,
};

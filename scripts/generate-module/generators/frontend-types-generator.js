#!/usr/bin/env node

/**
 * Frontend TypeScript Types Exporter
 * Converts backend interface to frontend-compatible types
 */

const fs = require('fs').promises;
const path = require('path');
const { parseInterface } = require('../core/parser');
const { detectFeatures } = require('../core/detector');
const { pascalCase, camelCase } = require('../utils/string-helpers');

/**
 * Generate frontend types for a module
 * @param {string} moduleName - Module name
 * @returns {Promise<string>} TypeScript types content
 */
async function generateFrontendTypes(moduleName) {
  // Read and parse interface
  const interfacePath = path.join(
    process.cwd(),
    'src/app/modules',
    moduleName,
    `${moduleName}.interface.ts`
  );

  const interfaceContent = await fs.readFile(interfacePath, 'utf-8');
  const parsedData = parseInterface(interfaceContent, moduleName);
  const config = detectFeatures(parsedData);

  let output = '';

  // File header
  output += `/**
 * Frontend Types for ${config.pascalCase}
 * Auto-generated from backend interface
 * DO NOT EDIT MANUALLY
 */

`;

  // Export enums
  if (config.enums && config.enums.length > 0) {
    config.enums.forEach((enumDef) => {
      output += `export enum ${enumDef.name} {\n`;
      enumDef.values.forEach((value) => {
        output += `  ${value} = '${value}',\n`;
      });
      output += `}\n\n`;
    });
  }

  // Main entity interface
  output += generateEntityInterface(config);

  // API payload types
  output += generatePayloadTypes(config);

  // API response types
  output += generateResponseTypes(config);

  // API client interface
  output += generateAPIClientInterface(config);

  return output;
}

/**
 * Generate main entity interface
 * @param {Object} config - Module configuration
 * @returns {string} Entity interface
 */
function generateEntityInterface(config) {
  let output = `/**
 * ${config.pascalCase} entity type
 */
export interface ${config.pascalCase} {\n`;

  config.fields.forEach((field) => {
    const frontendType = convertToFrontendType(field);
    const optional = !field.required ? '?' : '';

    // Add JSDoc comment
    if (field.type === 'reference') {
      output += `  /** Reference to ${field.ref} */\n`;
    }

    // Convert _id to id
    const fieldName = field.name === '_id' ? 'id' : field.name;

    output += `  ${fieldName}${optional}: ${frontendType};\n`;
  });

  output += `}\n\n`;
  return output;
}

/**
 * Generate API payload types
 * @param {Object} config - Module configuration
 * @returns {string} Payload types
 */
function generatePayloadTypes(config) {
  let output = '';

  // Create payload
  output += `/**
 * Payload for creating ${config.pascalCase}
 */
export interface Create${config.pascalCase}Payload {\n`;

  config.fields.forEach((field) => {
    // Skip auto-generated fields
    if (
      field.name === '_id' ||
      field.name === 'createdAt' ||
      field.name === 'updatedAt'
    ) {
      return;
    }

    const frontendType = convertToFrontendType(field);
    const optional = !field.required ? '?' : '';

    output += `  ${field.name}${optional}: ${frontendType};\n`;
  });

  output += `}\n\n`;

  // Update payload
  output += `/**
 * Payload for updating ${config.pascalCase}
 */
export interface Update${config.pascalCase}Payload {\n`;

  config.fields.forEach((field) => {
    // Skip auto-generated and immutable fields
    if (
      field.name === '_id' ||
      field.name === 'createdAt' ||
      field.name === 'updatedAt'
    ) {
      return;
    }

    const frontendType = convertToFrontendType(field);

    // All fields optional in update
    output += `  ${field.name}?: ${frontendType};\n`;
  });

  output += `}\n\n`;

  // Query params
  output += `/**
 * Query parameters for ${config.pascalCase} list
 */
export interface ${config.pascalCase}QueryParams {\n`;
  output += `  page?: number;\n`;
  output += `  limit?: number;\n`;
  output += `  sortBy?: string;\n`;
  output += `  sortOrder?: 'asc' | 'desc';\n`;

  if (config.searchableFields && config.searchableFields.length > 0) {
    output += `  searchTerm?: string;\n`;
  }

  output += `  [key: string]: any;\n`;
  output += `}\n\n`;

  return output;
}

/**
 * Generate API response types
 * @param {Object} config - Module configuration
 * @returns {string} Response types
 */
function generateResponseTypes(config) {
  let output = '';

  // Pagination type
  output += `/**
 * Pagination metadata
 */
export interface Pagination {\n`;
  output += `  page: number;\n`;
  output += `  limit: number;\n`;
  output += `  total: number;\n`;
  output += `  totalPage: number;\n`;
  output += `}\n\n`;

  // Base response
  output += `/**
 * Base API response
 */
export interface BaseResponse {\n`;
  output += `  success: boolean;\n`;
  output += `  message: string;\n`;
  output += `}\n\n`;

  // Single item response
  output += `/**
 * Single ${config.pascalCase} response
 */
export interface ${config.pascalCase}Response extends BaseResponse {\n`;
  output += `  data: ${config.pascalCase};\n`;
  output += `}\n\n`;

  // List response
  output += `/**
 * ${config.pascalCase} list response
 */
export interface ${config.pascalCase}ListResponse extends BaseResponse {\n`;
  output += `  data: ${config.pascalCase}[];\n`;
  output += `  pagination?: Pagination;\n`;
  output += `}\n\n`;

  return output;
}

/**
 * Generate API client interface
 * @param {Object} config - Module configuration
 * @returns {string} API client interface
 */
function generateAPIClientInterface(config) {
  let output = `/**
 * API client interface for ${config.pascalCase}
 */
export interface ${config.pascalCase}API {\n`;

  output += `  /**
   * Create new ${config.pascalCase}
   */
  create(payload: Create${config.pascalCase}Payload): Promise<${config.pascalCase}Response>;\n\n`;

  output += `  /**
   * Get all ${config.pascalCase}s with optional filters
   */
  getAll(params?: ${config.pascalCase}QueryParams): Promise<${config.pascalCase}ListResponse>;\n\n`;

  output += `  /**
   * Get ${config.pascalCase} by ID
   */
  getById(id: string): Promise<${config.pascalCase}Response>;\n\n`;

  output += `  /**
   * Update ${config.pascalCase}
   */
  update(id: string, payload: Update${config.pascalCase}Payload): Promise<${config.pascalCase}Response>;\n\n`;

  output += `  /**
   * Delete ${config.pascalCase}
   */
  delete(id: string): Promise<${config.pascalCase}Response>;\n`;

  output += `}\n`;

  return output;
}

/**
 * Convert backend type to frontend type
 * @param {Object} field - Field configuration
 * @returns {string} Frontend type
 */
function convertToFrontendType(field) {
  switch (field.type) {
    case 'string':
      return 'string';

    case 'number':
      return 'number';

    case 'boolean':
      return 'boolean';

    case 'date':
      return 'string'; // ISO 8601 string

    case 'reference':
      return 'string'; // ObjectId as string

    case 'enum':
      return field.enumType || 'string';

    case 'array':
      const itemType = field.subtype === 'reference' ? 'string' : field.subtype || 'any';
      return `${itemType}[]`;

    case 'object':
      return 'Record<string, any>';

    default:
      return 'any';
  }
}

/**
 * Generate index file for all types
 * @param {string[]} moduleNames - List of module names
 * @returns {string} Index file content
 */
function generateIndexFile(moduleNames) {
  let output = `/**
 * Frontend Types - Barrel Export
 * Auto-generated
 */

`;

  moduleNames.forEach((moduleName) => {
    output += `export * from './${moduleName}.types';\n`;
  });

  return output;
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);
  const moduleName = args[0];

  if (!moduleName) {
    console.error('Usage: node frontend-types-generator.js <module-name>');
    console.error('       node frontend-types-generator.js --all');
    process.exit(1);
  }

  try {
    if (moduleName === '--all') {
      // Generate for all modules
      const modulesPath = path.join(process.cwd(), 'src/app/modules');
      const modules = await fs.readdir(modulesPath);

      const generatedModules = [];

      for (const mod of modules) {
        const interfacePath = path.join(modulesPath, mod, `${mod}.interface.ts`);

        try {
          await fs.access(interfacePath);

          console.log(`\n🔧 Generating types for: ${mod}`);
          const types = await generateFrontendTypes(mod);

          const outputPath = path.join(process.cwd(), 'types/api', `${mod}.types.ts`);
          await fs.writeFile(outputPath, types, 'utf-8');

          console.log(`✅ Generated: ${outputPath}`);
          generatedModules.push(mod);
        } catch (err) {
          // Skip modules without interface
          continue;
        }
      }

      // Generate index file
      const indexContent = generateIndexFile(generatedModules);
      const indexPath = path.join(process.cwd(), 'types/api/index.ts');
      await fs.writeFile(indexPath, indexContent, 'utf-8');

      console.log(`\n✅ Generated index file: ${indexPath}`);
      console.log(`\n🎉 Generated types for ${generatedModules.length} modules!\n`);
    } else {
      // Generate for single module
      console.log(`\n🔧 Generating frontend types for: ${moduleName}\n`);

      const types = await generateFrontendTypes(moduleName);
      const outputPath = path.join(process.cwd(), 'types/api', `${moduleName}.types.ts`);

      await fs.writeFile(outputPath, types, 'utf-8');

      console.log(`✅ Types generated: ${outputPath}\n`);
      console.log(`💡 Import in frontend:\n`);
      console.log(`   import { ${pascalCase(moduleName)}, ${pascalCase(moduleName)}API } from '@/types/api/${moduleName}.types';\n`);
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateFrontendTypes,
  generateIndexFile,
};

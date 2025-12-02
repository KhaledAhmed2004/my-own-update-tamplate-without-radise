#!/usr/bin/env node

/**
 * OpenAPI/Swagger Spec Generator
 * Generates OpenAPI 3.0 specification from TypeScript interface
 */

const fs = require('fs').promises;
const path = require('path');
const yaml = require('js-yaml');
const { parseInterface } = require('../core/parser');
const { detectFeatures } = require('../core/detector');
const { pascalCase, pluralize } = require('../utils/string-helpers');
const { getTypeScriptType } = require('../utils/type-mapper');

/**
 * Generate OpenAPI spec for a module
 * @param {string} moduleName - Module name
 * @param {Object} options - Generation options
 * @returns {Promise<Object>} OpenAPI specification
 */
async function generateOpenAPISpec(moduleName, options = {}) {
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

  // Build OpenAPI spec
  const spec = {
    openapi: '3.0.0',
    info: {
      title: `${config.pascalCase} API`,
      version: '1.0.0',
      description: `API endpoints for ${config.pascalCase} module`,
    },
    servers: [
      {
        url: options.serverUrl || 'http://localhost:5000',
        description: 'Development server',
      },
    ],
    tags: [
      {
        name: config.pascalCase,
        description: `${config.pascalCase} operations`,
      },
    ],
    paths: generatePaths(config),
    components: {
      schemas: generateSchemas(config),
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
  };

  return spec;
}

/**
 * Generate API paths/endpoints
 * @param {Object} config - Module configuration
 * @returns {Object} OpenAPI paths
 */
function generatePaths(config) {
  const basePath = `/api/v1/${pluralize(config.moduleName)}`;
  const paths = {};

  // POST - Create
  paths[basePath] = {
    post: {
      tags: [config.pascalCase],
      summary: `Create ${config.pascalCase}`,
      security: [{ bearerAuth: [] }],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/Create${config.pascalCase}`,
            },
          },
        },
      },
      responses: {
        201: {
          description: `${config.pascalCase} created successfully`,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string', example: `${config.pascalCase} created successfully` },
                  data: {
                    $ref: `#/components/schemas/${config.pascalCase}`,
                  },
                },
              },
            },
          },
        },
        400: {
          description: 'Bad Request',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
        401: {
          description: 'Unauthorized',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    get: {
      tags: [config.pascalCase],
      summary: `Get all ${config.pascalCase}s`,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', default: 1 },
          description: 'Page number',
        },
        {
          name: 'limit',
          in: 'query',
          schema: { type: 'integer', default: 20 },
          description: 'Items per page',
        },
        {
          name: 'sortBy',
          in: 'query',
          schema: { type: 'string' },
          description: 'Sort by field',
        },
        {
          name: 'sortOrder',
          in: 'query',
          schema: { type: 'string', enum: ['asc', 'desc'] },
          description: 'Sort order',
        },
      ],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string' },
                  pagination: {
                    $ref: '#/components/schemas/Pagination',
                  },
                  data: {
                    type: 'array',
                    items: {
                      $ref: `#/components/schemas/${config.pascalCase}`,
                    },
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  // GET/:id - Get by ID
  paths[`${basePath}/{id}`] = {
    get: {
      tags: [config.pascalCase],
      summary: `Get ${config.pascalCase} by ID`,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
          description: `${config.pascalCase} ID`,
        },
      ],
      responses: {
        200: {
          description: 'Success',
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean', example: true },
                  message: { type: 'string' },
                  data: {
                    $ref: `#/components/schemas/${config.pascalCase}`,
                  },
                },
              },
            },
          },
        },
        404: {
          description: 'Not Found',
          content: {
            'application/json': {
              schema: { $ref: '#/components/schemas/Error' },
            },
          },
        },
      },
    },
    patch: {
      tags: [config.pascalCase],
      summary: `Update ${config.pascalCase}`,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      requestBody: {
        required: true,
        content: {
          'application/json': {
            schema: {
              $ref: `#/components/schemas/Update${config.pascalCase}`,
            },
          },
        },
      },
      responses: {
        200: {
          description: `${config.pascalCase} updated successfully`,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {
                    $ref: `#/components/schemas/${config.pascalCase}`,
                  },
                },
              },
            },
          },
        },
      },
    },
    delete: {
      tags: [config.pascalCase],
      summary: `Delete ${config.pascalCase}`,
      security: [{ bearerAuth: [] }],
      parameters: [
        {
          name: 'id',
          in: 'path',
          required: true,
          schema: { type: 'string' },
        },
      ],
      responses: {
        200: {
          description: `${config.pascalCase} deleted successfully`,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  success: { type: 'boolean' },
                  message: { type: 'string' },
                  data: {
                    $ref: `#/components/schemas/${config.pascalCase}`,
                  },
                },
              },
            },
          },
        },
      },
    },
  };

  return paths;
}

/**
 * Generate component schemas
 * @param {Object} config - Module configuration
 * @returns {Object} OpenAPI schemas
 */
function generateSchemas(config) {
  const schemas = {};

  // Main entity schema
  const entitySchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  config.fields.forEach((field) => {
    if (field.name === '_id') {
      entitySchema.properties.id = { type: 'string', example: '507f1f77bcf86cd799439011' };
      return;
    }

    if (field.name === 'createdAt' || field.name === 'updatedAt') {
      entitySchema.properties[field.name] = {
        type: 'string',
        format: 'date-time',
        example: '2024-01-01T00:00:00.000Z',
      };
      return;
    }

    const fieldSchema = getOpenAPIFieldType(field);
    entitySchema.properties[field.name] = fieldSchema;

    if (field.required) {
      entitySchema.required.push(field.name);
    }
  });

  schemas[config.pascalCase] = entitySchema;

  // Create schema (without timestamps and _id)
  const createSchema = {
    type: 'object',
    properties: {},
    required: [],
  };

  config.fields.forEach((field) => {
    if (
      field.name === '_id' ||
      field.name === 'createdAt' ||
      field.name === 'updatedAt'
    ) {
      return;
    }

    const fieldSchema = getOpenAPIFieldType(field);
    createSchema.properties[field.name] = fieldSchema;

    if (field.required) {
      createSchema.required.push(field.name);
    }
  });

  schemas[`Create${config.pascalCase}`] = createSchema;

  // Update schema (all fields optional)
  const updateSchema = {
    type: 'object',
    properties: { ...createSchema.properties },
  };

  schemas[`Update${config.pascalCase}`] = updateSchema;

  // Common schemas
  schemas.Pagination = {
    type: 'object',
    properties: {
      page: { type: 'integer', example: 1 },
      limit: { type: 'integer', example: 20 },
      total: { type: 'integer', example: 100 },
      totalPage: { type: 'integer', example: 5 },
    },
  };

  schemas.Error = {
    type: 'object',
    properties: {
      success: { type: 'boolean', example: false },
      message: { type: 'string', example: 'Error message' },
      errorMessages: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            path: { type: 'string' },
            message: { type: 'string' },
          },
        },
      },
    },
  };

  return schemas;
}

/**
 * Get OpenAPI type for a field
 * @param {Object} field - Field configuration
 * @returns {Object} OpenAPI field schema
 */
function getOpenAPIFieldType(field) {
  const schema = {};

  switch (field.type) {
    case 'string':
      schema.type = 'string';
      schema.example = field.name === 'email' ? 'user@example.com' : 'Sample text';
      break;

    case 'number':
      schema.type = 'number';
      schema.example = field.name === 'price' ? 99.99 : 10;
      break;

    case 'boolean':
      schema.type = 'boolean';
      schema.example = true;
      break;

    case 'date':
      schema.type = 'string';
      schema.format = 'date-time';
      schema.example = '2024-01-01T00:00:00.000Z';
      break;

    case 'reference':
      schema.type = 'string';
      schema.example = '507f1f77bcf86cd799439011';
      schema.description = `Reference to ${field.ref || 'another entity'}`;
      break;

    case 'enum':
      if (field.enumValues) {
        schema.type = 'string';
        schema.enum = field.enumValues;
        schema.example = field.enumValues[0];
      } else {
        schema.type = 'string';
        schema.description = `Enum: ${field.enumType}`;
      }
      break;

    case 'array':
      schema.type = 'array';
      schema.items = field.subtype === 'string' ? { type: 'string' } : { type: 'object' };
      schema.example = field.subtype === 'string' ? ['item1', 'item2'] : [];
      break;

    default:
      schema.type = 'object';
  }

  return schema;
}

/**
 * CLI Entry Point
 */
async function main() {
  const args = process.argv.slice(2);
  const moduleName = args[0];

  if (!moduleName) {
    console.error('Usage: node openapi-generator.js <module-name>');
    process.exit(1);
  }

  try {
    console.log(`\n🔧 Generating OpenAPI spec for: ${moduleName}\n`);

    const spec = await generateOpenAPISpec(moduleName);

    // Save as YAML
    const yamlContent = yaml.dump(spec, { indent: 2, lineWidth: -1 });
    const outputPath = path.join(process.cwd(), 'docs/openapi', `${moduleName}.openapi.yaml`);
    await fs.writeFile(outputPath, yamlContent, 'utf-8');

    console.log(`✅ OpenAPI spec generated: ${outputPath}\n`);

    // Also save as JSON
    const jsonPath = path.join(process.cwd(), 'docs/openapi', `${moduleName}.openapi.json`);
    await fs.writeFile(jsonPath, JSON.stringify(spec, null, 2), 'utf-8');

    console.log(`✅ JSON spec generated: ${jsonPath}\n`);
    console.log(`💡 Import in Swagger UI: https://editor.swagger.io/\n`);
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = {
  generateOpenAPISpec,
};

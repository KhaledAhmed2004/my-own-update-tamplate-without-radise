/**
 * TypeScript interface parser using TypeScript Compiler API
 */

const ts = require('typescript');
const { pascalCase } = require('../utils/string-helpers');

/**
 * Parse TypeScript interface file and extract field definitions
 * @param {string} fileContent - TypeScript file content
 * @param {string} moduleName - Module name
 * @returns {Object} Parsed data with fields, enums, imports
 */
function parseInterface(fileContent, moduleName) {
  const sourceFile = ts.createSourceFile(
    'temp.ts',
    fileContent,
    ts.ScriptTarget.Latest,
    true
  );

  const result = {
    moduleName,
    pascal

Case: pascalCase(moduleName),
    enums: [],
    fields: [],
    imports: [],
    hasTimestamps: false,
  };

  // Walk through AST
  function visit(node) {
    // Extract imports
    if (ts.isImportDeclaration(node)) {
      const importPath = node.moduleSpecifier.text;
      result.imports.push(importPath);
    }

    // Extract enum declarations
    if (ts.isEnumDeclaration(node)) {
      const enumName = node.name.text;
      const values = node.members.map((m) => m.name.text);

      result.enums.push({
        name: enumName,
        values: values,
      });
    }

    // Extract type alias (main interface)
    if (ts.isTypeAliasDeclaration(node)) {
      const typeName = node.name.text;
      const expectedName = `I${result.pascalCase}`;

      // Check if it's the main interface
      if (typeName === expectedName) {
        if (ts.isTypeLiteralNode(node.type)) {
          node.type.members.forEach((member) => {
            if (ts.isPropertySignature(member)) {
              const field = parseField(member);
              if (field) {
                result.fields.push(field);

                // Check for timestamps
                if (field.name === 'createdAt' || field.name === 'updatedAt') {
                  result.hasTimestamps = true;
                }
              }
            }
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  return result;
}

/**
 * Parse a single field from property signature
 * @param {Object} propertyNode - TypeScript property signature node
 * @returns {Object} Field configuration
 */
function parseField(propertyNode) {
  const fieldName = propertyNode.name.text;
  const isOptional = !!propertyNode.questionToken;
  const typeNode = propertyNode.type;

  if (!typeNode) return null;

  const fieldType = detectFieldType(typeNode);

  return {
    name: fieldName,
    type: fieldType.base,
    subtype: fieldType.subtype,
    required: !isOptional,
    ref: fieldType.ref,
    enumType: fieldType.enumType,
    isArray: fieldType.isArray,
  };
}

/**
 * Detect field type from TypeScript type node
 * @param {Object} typeNode - TypeScript type node
 * @returns {Object} Type information
 */
function detectFieldType(typeNode) {
  // String type
  if (typeNode.kind === ts.SyntaxKind.StringKeyword) {
    return { base: 'string' };
  }

  // Number type
  if (typeNode.kind === ts.SyntaxKind.NumberKeyword) {
    return { base: 'number' };
  }

  // Boolean type
  if (typeNode.kind === ts.SyntaxKind.BooleanKeyword) {
    return { base: 'boolean' };
  }

  // Array type (string[], number[], etc.)
  if (ts.isArrayTypeNode(typeNode)) {
    const elementType = detectFieldType(typeNode.elementType);
    return {
      base: 'array',
      subtype: elementType.base,
      isArray: true,
    };
  }

  // Type reference (Date, Types.ObjectId, Enum, etc.)
  if (ts.isTypeReferenceNode(typeNode)) {
    const typeName = typeNode.typeName.getText();

    // Check for Types.ObjectId or ObjectId (reference field)
    if (typeName === 'Types.ObjectId' || typeName === 'ObjectId') {
      return { base: 'reference' };
    }

    // Check for Date
    if (typeName === 'Date') {
      return { base: 'date' };
    }

    // Check for enum (uppercase type names)
    if (typeName === typeName.toUpperCase() || typeName.includes('_')) {
      return { base: 'enum', enumType: typeName };
    }

    // Default to object/mixed
    return { base: 'object' };
  }

  // Union type (for inline enums: 'ACTIVE' | 'INACTIVE')
  if (ts.isUnionTypeNode(typeNode)) {
    const literals = typeNode.types
      .filter((t) => ts.isLiteralTypeNode(t))
      .map((t) => t.literal.text);

    if (literals.length > 0) {
      // Inline enum detected
      return {
        base: 'enum',
        enumType: null, // Will be generated
        enumValues: literals,
      };
    }
  }

  // Fallback
  return { base: 'string' };
}

/**
 * Validate parsed interface data
 * @param {Object} parsedData - Parsed interface data
 * @throws {Error} If validation fails
 */
function validateParsedData(parsedData) {
  if (!parsedData.fields || parsedData.fields.length === 0) {
    throw new Error('No fields found in interface. Please define at least one field.');
  }

  // Check for duplicate field names
  const fieldNames = parsedData.fields.map((f) => f.name);
  const duplicates = fieldNames.filter((name, index) => fieldNames.indexOf(name) !== index);

  if (duplicates.length > 0) {
    throw new Error(`Duplicate field names found: ${duplicates.join(', ')}`);
  }

  // Validate enum references
  parsedData.fields.forEach((field) => {
    if (field.type === 'enum' && field.enumType) {
      const enumExists = parsedData.enums.some((e) => e.name === field.enumType);
      if (!enumExists) {
        throw new Error(
          `Enum '${field.enumType}' referenced in field '${field.name}' but not defined`
        );
      }
    }
  });
}

module.exports = {
  parseInterface,
  validateParsedData,
};

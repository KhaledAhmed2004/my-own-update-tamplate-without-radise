/**
 * Schema Parser
 *
 * Mongoose schema definitions parse করে এবং structured data বের করে
 * Supports: fields, types, nested documents, references, indexes, enums
 */

const fs = require('fs');
const config = require('../config');

class SchemaParser {
  constructor() {
    this.patterns = config.analysis.patterns;
  }

  /**
   * Model file parse করে schema data extract করে
   * @param {string} filePath - Path to model file
   * @param {string} modelName - Name of the model to extract
   * @returns {Object} Parsed schema data
   */
  parseModelFile(filePath, modelName) {
    const content = fs.readFileSync(filePath, 'utf-8');

    // Extract fields first
    const fields = this.extractFields(content, modelName);

    // For polymorphic fields, extract their targets
    for (const field of fields) {
      if (field.isPolymorphic && field.refPathField) {
        field.polymorphicTargets = this.extractPolymorphicTargets(
          content,
          field.refPathField
        );
      }
    }

    return {
      modelName,
      filePath,
      fields,
      indexes: this.extractIndexes(content, modelName),
      references: this.extractReferences(content),
      embeddedDocs: this.extractEmbeddedDocs(content),
      options: this.extractSchemaOptions(content),
    };
  }

  /**
   * Schema থেকে fields extract করে
   * @param {string} content - File content
   * @param {string} modelName - Model name
   * @returns {Object[]} Array of field objects
   */
  extractFields(content, modelName) {
    const fields = [];

    // Find the schema definition block
    const schemaMatch = this.findSchemaBlock(content, modelName);
    if (!schemaMatch) {
      return fields;
    }

    const schemaBlock = schemaMatch.block;

    // Better parsing: track brace depth properly
    let depth = 0;
    let currentField = null;
    let fieldBuffer = '';
    let inField = false;

    // Remove outer braces and split by character
    const inner = schemaBlock.slice(1, -1);

    for (let i = 0; i < inner.length; i++) {
      const char = inner[i];

      if (char === '{' || char === '[') {
        depth++;
        if (inField) fieldBuffer += char;
      } else if (char === '}' || char === ']') {
        depth--;
        if (inField) fieldBuffer += char;
      } else if (char === ':' && depth === 0 && !inField) {
        // Found field name - look back to find it
        let nameEnd = i - 1;
        while (nameEnd >= 0 && /\s/.test(inner[nameEnd])) nameEnd--;

        let nameStart = nameEnd;
        while (nameStart >= 0 && /\w/.test(inner[nameStart])) nameStart--;
        nameStart++;

        if (nameStart <= nameEnd) {
          // Save previous field
          if (currentField && fieldBuffer.trim()) {
            const parsedField = this.parseFieldDefinition(currentField, fieldBuffer.trim());
            if (parsedField) {
              fields.push(parsedField);
            }
          }

          currentField = inner.slice(nameStart, nameEnd + 1).trim();
          fieldBuffer = '';
          inField = true;
        }
      } else if (char === ',' && depth === 0 && inField) {
        // End of field
        if (currentField && fieldBuffer.trim()) {
          const parsedField = this.parseFieldDefinition(currentField, fieldBuffer.trim());
          if (parsedField) {
            fields.push(parsedField);
          }
        }
        currentField = null;
        fieldBuffer = '';
        inField = false;
      } else if (inField) {
        fieldBuffer += char;
      }
    }

    // Process last field
    if (currentField && fieldBuffer.trim()) {
      const parsedField = this.parseFieldDefinition(currentField, fieldBuffer.trim());
      if (parsedField) {
        fields.push(parsedField);
      }
    }

    // Always add _id field at the beginning
    if (!fields.find(f => f.name === '_id')) {
      fields.unshift({
        name: '_id',
        type: 'ObjectId',
        isPrimaryKey: true,
        isRequired: true,
        constraints: ['PK'],
      });
    }

    return fields;
  }

  /**
   * Find schema block for a specific model
   * @param {string} content - File content
   * @param {string} modelName - Model name to find
   * @returns {Object|null} {block, startIndex, endIndex}
   */
  findSchemaBlock(content, modelName) {
    // Pattern: const ModelSchema = new Schema({ ... })
    // or: const modelSchema = new Schema<IModel>({ ... })
    const schemaVarName = modelName.toLowerCase() + 'schema';

    // Try different patterns - including generic types like Schema<IUser>
    const patterns = [
      // const userSchema = new Schema<IUser>({
      new RegExp(`const\\s+${schemaVarName}\\s*=\\s*new\\s+(?:mongoose\\.)?Schema\\s*<[^>]+>\\s*\\(\\s*{`, 'i'),
      // const UserSchema = new Schema<IUser>({
      new RegExp(`const\\s+${modelName}Schema\\s*=\\s*new\\s+(?:mongoose\\.)?Schema\\s*<[^>]+>\\s*\\(\\s*{`, 'i'),
      // const userSchema = new Schema({
      new RegExp(`const\\s+${schemaVarName}\\s*=\\s*new\\s+(?:mongoose\\.)?Schema\\s*\\(\\s*{`, 'i'),
      // const UserSchema = new Schema({
      new RegExp(`const\\s+${modelName}Schema\\s*=\\s*new\\s+(?:mongoose\\.)?Schema\\s*\\(\\s*{`, 'i'),
      // Generic: new Schema<...>({ or new Schema({
      /new\s+(?:mongoose\.)?Schema\s*(?:<[^>]+>)?\s*\(\s*{/,
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) {
        const startIndex = match.index + match[0].length - 1;
        const block = this.extractBalancedBraces(content, startIndex);
        if (block) {
          return { block, startIndex };
        }
      }
    }

    return null;
  }

  /**
   * Extract content within balanced braces
   * @param {string} content - Content string
   * @param {number} startIndex - Starting index at opening brace
   * @returns {string|null} Content within braces
   */
  extractBalancedBraces(content, startIndex) {
    let braceCount = 0;
    let started = false;
    let result = '';

    for (let i = startIndex; i < content.length; i++) {
      const char = content[i];

      if (char === '{') {
        braceCount++;
        started = true;
      } else if (char === '}') {
        braceCount--;
      }

      if (started) {
        result += char;
      }

      if (started && braceCount === 0) {
        return result;
      }
    }

    return null;
  }

  /**
   * Parse a single field definition
   * @param {string} fieldName - Field name
   * @param {string} definition - Field definition string
   * @returns {Object|null} Parsed field object
   */
  parseFieldDefinition(fieldName, definition) {
    const field = {
      name: fieldName,
      type: 'Mixed',
      isRequired: false,
      isUnique: false,
      isIndexed: false,
      isArray: false,
      isEmbedded: false,
      isPrimaryKey: fieldName === '_id',
      reference: null,
      enumValues: null,
      defaultValue: null,
      constraints: [],
      embeddedFields: null,
      // New: Polymorphic reference support
      isPolymorphic: false,
      refPathField: null,
      polymorphicTargets: null,
      // New: Cardinality support
      cardinality: null,
    };

    const cleanDef = definition.trim().replace(/,$/, '');

    // Check if it's an array type
    if (cleanDef.startsWith('[')) {
      field.isArray = true;

      // Check if array of embedded objects
      if (cleanDef.match(/^\[\s*{/)) {
        field.isEmbedded = true;
        field.type = 'EmbeddedArray';
        field.embeddedFields = this.parseEmbeddedObject(cleanDef);
      } else {
        // Array of simple type or references
        const innerType = this.extractArrayType(cleanDef);
        field.type = innerType + '[]';

        // Check for ref in array
        const refMatch = cleanDef.match(/ref\s*:\s*['"](\w+)['"]/);
        if (refMatch) {
          field.reference = refMatch[1];
          field.constraints.push('FK');
          // Array of references = Many-to-Many
          field.cardinality = 'M:N';
        }
      }
    }
    // Check if it's a nested object (embedded document)
    else if (cleanDef.startsWith('{') && !cleanDef.match(/^{\s*type\s*:/)) {
      field.isEmbedded = true;
      field.type = 'Embedded';
      field.embeddedFields = this.parseEmbeddedObject(cleanDef);
    }
    // Check if it's a type definition object
    else if (cleanDef.startsWith('{')) {
      field.type = this.extractType(cleanDef);

      // Check for reference
      const refMatch = cleanDef.match(/ref\s*:\s*['"](\w+)['"]/);
      if (refMatch) {
        field.reference = refMatch[1];
        field.type = 'ObjectId';
        field.constraints.push('FK');
        // Default cardinality for single ref is N:1 (Many-to-One)
        field.cardinality = 'N:1';
      }

      // Check for polymorphic reference (refPath)
      const refPathMatch = cleanDef.match(/refPath\s*:\s*['"](\w+)['"]/);
      if (refPathMatch) {
        field.isPolymorphic = true;
        field.refPathField = refPathMatch[1];
        field.type = 'ObjectId';
        field.constraints.push('FK');
        field.constraints.push('polymorphic');
        // Default cardinality for polymorphic ref
        field.cardinality = 'N:1';
      }

      // Check for required
      if (cleanDef.match(/required\s*:\s*true/i)) {
        field.isRequired = true;
        field.constraints.push('required');
      }

      // Check for unique
      if (cleanDef.match(/unique\s*:\s*true/i)) {
        field.isUnique = true;
        field.constraints.push('UK');
        // Unique reference = One-to-One
        if (field.reference) {
          field.cardinality = '1:1';
        }
      }

      // Check for index
      if (cleanDef.match(/index\s*:\s*true/i)) {
        field.isIndexed = true;
        field.constraints.push('IDX');
      }

      // Check for enum
      const enumMatch = cleanDef.match(/enum\s*:\s*\[([^\]]+)\]/);
      if (enumMatch) {
        field.enumValues = this.parseEnumValues(enumMatch[1]);
        field.constraints.push('enum');
      }

      // Check for default value
      const defaultMatch = cleanDef.match(/default\s*:\s*([^,}\n]+)/);
      if (defaultMatch) {
        field.defaultValue = defaultMatch[1].trim();
      }

      // Check for select: false
      if (cleanDef.match(/select\s*:\s*false/i)) {
        field.constraints.push('hidden');
      }
    }
    // Simple type definition (e.g., name: String)
    else {
      field.type = this.normalizeType(cleanDef);
    }

    return field;
  }

  /**
   * Extract type from type definition object
   * @param {string} definition - Type definition string
   * @returns {string} Type name
   */
  extractType(definition) {
    // Check for Schema.Types.ObjectId or Types.ObjectId
    if (definition.match(/Schema\.Types\.ObjectId|Types\.ObjectId|mongoose\.Schema\.Types\.ObjectId/)) {
      return 'ObjectId';
    }

    // Check for type: TypeName
    const typeMatch = definition.match(/type\s*:\s*(\w+)/);
    if (typeMatch) {
      return this.normalizeType(typeMatch[1]);
    }

    return 'Mixed';
  }

  /**
   * Extract type from array definition
   * @param {string} definition - Array definition string
   * @returns {string} Inner type
   */
  extractArrayType(definition) {
    // [{ type: String }] or [String]
    const typeMatch = definition.match(/type\s*:\s*(\w+)/);
    if (typeMatch) {
      return this.normalizeType(typeMatch[1]);
    }

    // [String] or [Number]
    const simpleMatch = definition.match(/\[\s*(\w+)\s*\]/);
    if (simpleMatch) {
      return this.normalizeType(simpleMatch[1]);
    }

    return 'Mixed';
  }

  /**
   * Parse embedded object fields
   * @param {string} definition - Object definition string
   * @returns {Object[]} Array of embedded fields
   */
  parseEmbeddedObject(definition) {
    const fields = [];

    // Remove outer brackets/braces
    let inner = definition.trim();
    if (inner.startsWith('[')) {
      inner = inner.slice(1, -1).trim();
    }
    if (inner.startsWith('{')) {
      inner = inner.slice(1, -1).trim();
    }

    // Simple line-by-line parsing for embedded fields
    const lines = inner.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      const fieldMatch = trimmed.match(/^(\w+)\s*:\s*(.*)/);

      if (fieldMatch) {
        const fieldName = fieldMatch[1];
        const fieldDef = fieldMatch[2].replace(/,$/, '').trim();

        let type = 'Mixed';
        const constraints = [];

        // Simple type
        if (fieldDef.match(/^(String|Number|Boolean|Date|Buffer)/)) {
          type = fieldDef.split(/[,\s]/)[0];
        }
        // Object with type
        else if (fieldDef.startsWith('{')) {
          const typeMatch = fieldDef.match(/type\s*:\s*['"]?(\w+)['"]?/);
          if (typeMatch) {
            type = typeMatch[1];
          }

          if (fieldDef.match(/required\s*:\s*true/i)) {
            constraints.push('required');
          }
          if (fieldDef.match(/enum\s*:/i)) {
            constraints.push('enum');
          }
        }

        fields.push({
          name: fieldName,
          type: this.normalizeType(type),
          constraints,
        });
      }
    }

    return fields;
  }

  /**
   * Parse enum values string
   * @param {string} enumString - Enum values string
   * @returns {string[]} Array of enum values
   */
  parseEnumValues(enumString) {
    const values = [];
    const matches = enumString.match(/['"]([^'"]+)['"]/g);

    if (matches) {
      for (const match of matches) {
        values.push(match.replace(/['"]/g, ''));
      }
    }

    return values;
  }

  /**
   * Normalize type name
   * @param {string} type - Type string
   * @returns {string} Normalized type
   */
  normalizeType(type) {
    const typeMap = {
      string: 'String',
      number: 'Number',
      boolean: 'Boolean',
      date: 'Date',
      buffer: 'Buffer',
      objectid: 'ObjectId',
      mixed: 'Mixed',
      array: 'Array',
      'schema.types.objectid': 'ObjectId',
      'types.objectid': 'ObjectId',
    };

    const normalized = type.toLowerCase().trim();
    return typeMap[normalized] || type;
  }

  /**
   * Extract polymorphic targets from content
   * Finds enum values from the refPath field
   * @param {string} content - File content
   * @param {string} refPathField - Name of the field containing model name
   * @returns {string[]} Array of target model names
   */
  extractPolymorphicTargets(content, refPathField) {
    // Pattern: targetModel: { type: String, enum: ['User', 'Task', 'Service'] }
    const enumPattern = new RegExp(
      `${refPathField}\\s*:\\s*{[^}]*enum\\s*:\\s*\\[([^\\]]+)\\]`,
      'i'
    );
    const match = content.match(enumPattern);

    if (match) {
      return this.parseEnumValues(match[1]);
    }

    // Also check for Object.values pattern: enum: Object.values(ENUM_NAME)
    const objectValuesPattern = new RegExp(
      `${refPathField}\\s*:\\s*{[^}]*enum\\s*:\\s*Object\\.values\\(([^)]+)\\)`,
      'i'
    );
    const objectValuesMatch = content.match(objectValuesPattern);

    if (objectValuesMatch) {
      // Try to find the enum definition
      const enumName = objectValuesMatch[1].trim();
      const enumDefPattern = new RegExp(
        `(?:const|enum)\\s+${enumName}\\s*=\\s*{([^}]+)}`,
        'i'
      );
      const enumDefMatch = content.match(enumDefPattern);
      if (enumDefMatch) {
        // Extract values from enum definition
        const values = [];
        const valuePattern = /['"](\w+)['"]/g;
        let valueMatch;
        while ((valueMatch = valuePattern.exec(enumDefMatch[1])) !== null) {
          values.push(valueMatch[1]);
        }
        return values;
      }
    }

    return [];
  }

  /**
   * Extract references from content
   * @param {string} content - File content
   * @returns {Object[]} Array of references
   */
  extractReferences(content) {
    const references = [];
    const refPattern = /(\w+)\s*:.*?ref\s*:\s*['"](\w+)['"]/g;
    let match;

    while ((match = refPattern.exec(content)) !== null) {
      references.push({
        field: match[1],
        model: match[2],
        isArray: content.slice(Math.max(0, match.index - 20), match.index).includes('['),
      });
    }

    return references;
  }

  /**
   * Extract indexes from content
   * @param {string} content - File content
   * @param {string} modelName - Model name
   * @returns {Object[]} Array of indexes
   */
  extractIndexes(content, modelName) {
    const indexes = [];

    // Find schema.index() calls
    const indexPattern = /schema\.index\s*\(\s*{([^}]+)}/g;
    let match;

    while ((match = indexPattern.exec(content)) !== null) {
      const indexDef = match[1];
      const fields = [];

      const fieldPattern = /(\w+)\s*:\s*(-?\d)/g;
      let fieldMatch;

      while ((fieldMatch = fieldPattern.exec(indexDef)) !== null) {
        fields.push({
          field: fieldMatch[1],
          direction: parseInt(fieldMatch[2]),
        });
      }

      if (fields.length > 0) {
        indexes.push({
          type: fields.length > 1 ? 'compound' : 'single',
          fields,
        });
      }
    }

    return indexes;
  }

  /**
   * Extract embedded documents (sub-schemas)
   * @param {string} content - File content
   * @returns {Object[]} Array of embedded doc definitions
   */
  extractEmbeddedDocs(content) {
    const embeddedDocs = [];

    // Find sub-schema definitions like: const AddressSchema = new Schema({...})
    const subSchemaPattern = /const\s+(\w+Schema)\s*=\s*new\s+(?:mongoose\.)?Schema\s*\(\s*{/gi;
    let match;

    while ((match = subSchemaPattern.exec(content)) !== null) {
      const schemaName = match[1];

      // Skip main schema
      if (schemaName.toLowerCase().includes('main')) {
        continue;
      }

      const block = this.extractBalancedBraces(content, match.index + match[0].length - 1);
      if (block) {
        embeddedDocs.push({
          name: schemaName.replace(/Schema$/i, ''),
          schemaName,
          definition: block,
        });
      }
    }

    return embeddedDocs;
  }

  /**
   * Extract schema options
   * @param {string} content - File content
   * @returns {Object} Schema options
   */
  extractSchemaOptions(content) {
    const options = {
      timestamps: false,
      versionKey: true,
      collection: null,
    };

    // Check for timestamps
    if (content.match(/timestamps\s*:\s*true/i)) {
      options.timestamps = true;
    }

    // Check for versionKey
    if (content.match(/versionKey\s*:\s*false/i)) {
      options.versionKey = false;
    }

    // Check for collection name
    const collectionMatch = content.match(/collection\s*:\s*['"](\w+)['"]/);
    if (collectionMatch) {
      options.collection = collectionMatch[1];
    }

    return options;
  }
}

module.exports = SchemaParser;

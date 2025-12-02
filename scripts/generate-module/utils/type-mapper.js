/**
 * Type mapping system: TypeScript → Mongoose → Zod
 */

const typeMapping = {
  string: {
    typescript: 'string',
    mongoose: {
      type: 'String',
      getOptions: (field) => {
        const opts = {
          type: 'String',
        };
        if (field.required) opts.required = true;
        if (field.unique) opts.unique = true;
        if (field.trim !== false) opts.trim = true;
        if (field.lowercase) opts.lowercase = true;
        if (field.maxLength) opts.maxlength = field.maxLength;
        if (field.minLength) opts.minlength = field.minLength;
        if (field.default !== undefined) opts.default = field.default;
        return opts;
      },
    },
    zod: (field) => {
      let zodStr = 'z.string()';

      if (field.required) {
        zodStr = `z.string({ required_error: '${field.name} is required' })`;
        zodStr += `.min(1, '${field.name} cannot be empty')`;
      } else {
        zodStr += '.optional()';
      }

      if (field.minLength) {
        zodStr += `.min(${field.minLength})`;
      }
      if (field.maxLength) {
        zodStr += `.max(${field.maxLength})`;
      }
      if (field.lowercase) {
        zodStr += '.toLowerCase()';
      }

      return zodStr;
    },
  },

  number: {
    typescript: 'number',
    mongoose: {
      type: 'Number',
      getOptions: (field) => {
        const opts = {
          type: 'Number',
        };
        if (field.required) opts.required = true;
        if (field.min !== undefined) opts.min = field.min;
        if (field.max !== undefined) opts.max = field.max;
        if (field.default !== undefined) opts.default = field.default;
        return opts;
      },
    },
    zod: (field) => {
      let zodStr = field.required
        ? `z.number({ required_error: '${field.name} is required' })`
        : 'z.number().optional()';

      if (field.min !== undefined) {
        zodStr += `.min(${field.min})`;
      }
      if (field.max !== undefined) {
        zodStr += `.max(${field.max})`;
      }

      return zodStr;
    },
  },

  boolean: {
    typescript: 'boolean',
    mongoose: {
      type: 'Boolean',
      getOptions: (field) => {
        const opts = {
          type: 'Boolean',
        };
        if (field.default !== undefined) opts.default = field.default;
        return opts;
      },
    },
    zod: (field) => {
      return field.required ? 'z.boolean()' : 'z.boolean().optional()';
    },
  },

  date: {
    typescript: 'Date',
    mongoose: {
      type: 'Date',
      getOptions: (field) => {
        const opts = {
          type: 'Date',
        };
        if (field.required) opts.required = true;
        if (field.default !== undefined) opts.default = field.default;
        return opts;
      },
    },
    zod: (field) => {
      return field.required
        ? 'z.string().datetime()'
        : 'z.string().datetime().optional()';
    },
  },

  reference: {
    typescript: 'Types.ObjectId',
    mongoose: {
      type: 'Schema.Types.ObjectId',
      getOptions: (field) => {
        const opts = {
          type: 'Schema.Types.ObjectId',
          ref: field.ref || 'User',
        };
        if (field.required) opts.required = true;
        if (field.index) opts.index = true;
        return opts;
      },
    },
    zod: (field) => {
      const zodStr = field.required
        ? `z.string({ required_error: '${field.name} is required' })`
        : 'z.string().optional()';
      return zodStr + `.regex(/^[0-9a-fA-F]{24}$/, 'Invalid ${field.name} format')`;
    },
  },

  enum: {
    typescript: (field) => field.enumType,
    mongoose: {
      type: 'String',
      getOptions: (field) => {
        const opts = {
          type: 'String',
          enum: `Object.values(${field.enumType})`,
        };
        if (field.required) opts.required = true;
        if (field.default) opts.default = `${field.enumType}.${field.default}`;
        return opts;
      },
    },
    zod: (field) => {
      const zodStr = `z.enum(Object.values(${field.enumType}) as [string, ...string[]])`;
      return field.required ? zodStr : zodStr + '.optional()';
    },
  },

  array: {
    typescript: (field) => `${field.subtype || 'any'}[]`,
    mongoose: {
      type: (field) => {
        const subtypeMapping = typeMapping[field.subtype] || typeMapping.string;
        return `[${subtypeMapping.mongoose.type}]`;
      },
      getOptions: (field) => {
        const subtypeMapping = typeMapping[field.subtype] || typeMapping.string;
        const itemType = typeof subtypeMapping.mongoose.type === 'function'
          ? subtypeMapping.mongoose.type(field)
          : subtypeMapping.mongoose.type;

        return {
          type: itemType,
          default: field.default || [],
        };
      },
    },
    zod: (field) => {
      const subtypeMapping = typeMapping[field.subtype] || typeMapping.string;
      const itemZod = typeof subtypeMapping.zod === 'function'
        ? subtypeMapping.zod({ ...field, required: true })
        : 'z.string()';

      return `z.array(${itemZod}).optional()`;
    },
  },

  object: {
    typescript: 'Record<string, any>',
    mongoose: {
      type: 'Schema.Types.Mixed',
      getOptions: (field) => {
        return {
          type: 'Schema.Types.Mixed',
          default: field.default || {},
        };
      },
    },
    zod: () => 'z.record(z.any()).optional()',
  },
};

/**
 * Get TypeScript type for a field
 * @param {Object} field - Field configuration
 * @returns {string} TypeScript type
 */
function getTypeScriptType(field) {
  const mapping = typeMapping[field.type];
  if (!mapping) return 'any';

  if (typeof mapping.typescript === 'function') {
    return mapping.typescript(field);
  }
  return mapping.typescript;
}

/**
 * Get Mongoose schema options for a field
 * @param {Object} field - Field configuration
 * @returns {Object} Mongoose schema options
 */
function getMongooseOptions(field) {
  const mapping = typeMapping[field.type];
  if (!mapping) return { type: 'String' };

  if (typeof mapping.mongoose.getOptions === 'function') {
    return mapping.mongoose.getOptions(field);
  }
  return { type: mapping.mongoose.type };
}

/**
 * Get Zod validation for a field
 * @param {Object} field - Field configuration
 * @returns {string} Zod validation string
 */
function getZodValidation(field) {
  const mapping = typeMapping[field.type];
  if (!mapping) return 'z.any()';

  if (typeof mapping.zod === 'function') {
    return mapping.zod(field);
  }
  return mapping.zod;
}

module.exports = {
  typeMapping,
  getTypeScriptType,
  getMongooseOptions,
  getZodValidation,
};

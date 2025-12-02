/**
 * Schema Analyzer
 *
 * Mongoose model files খুঁজে বের করে এবং analyze করে
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

class SchemaAnalyzer {
  constructor() {
    this.modulesDir = config.paths.modulesDir;
    this.modelCache = new Map();
  }

  /**
   * সব module directories খুঁজে বের করে
   * @returns {string[]} Module names
   */
  getAllModules() {
    try {
      const entries = fs.readdirSync(this.modulesDir, { withFileTypes: true });
      return entries
        .filter(entry => entry.isDirectory())
        .map(entry => entry.name)
        .filter(name => !name.startsWith('.'));
    } catch (error) {
      console.error(`Error reading modules directory: ${error.message}`);
      return [];
    }
  }

  /**
   * একটি module-এ model file খুঁজে বের করে
   * @param {string} moduleName - Module name
   * @returns {string|null} Model file path or null
   */
  findModelFile(moduleName) {
    const moduleDir = path.join(this.modulesDir, moduleName);

    // Common naming patterns for model files
    const patterns = [
      `${moduleName}.model.ts`,
      `${moduleName}.models.ts`,
      'model.ts',
      'models.ts',
    ];

    for (const pattern of patterns) {
      const filePath = path.join(moduleDir, pattern);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * সব model files খুঁজে বের করে
   * @returns {Object[]} Array of {moduleName, filePath, models}
   */
  findAllModelFiles() {
    const modules = this.getAllModules();
    const modelFiles = [];

    for (const moduleName of modules) {
      const filePath = this.findModelFile(moduleName);

      if (filePath) {
        const models = this.extractModelNames(filePath);
        modelFiles.push({
          moduleName,
          filePath,
          models,
        });
      }
    }

    return modelFiles;
  }

  /**
   * File থেকে model names extract করে
   * @param {string} filePath - Path to model file
   * @returns {string[]} Array of model names
   */
  extractModelNames(filePath) {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');
      const models = [];

      // Pattern 1: model<IModel>('ModelName', schema)
      const pattern1 = /model\s*<[^>]+>\s*\(\s*['"](\w+)['"]/g;
      let match;

      while ((match = pattern1.exec(content)) !== null) {
        models.push(match[1]);
      }

      // Pattern 2: model('ModelName', schema) without generics
      const pattern2 = /model\s*\(\s*['"](\w+)['"]/g;

      while ((match = pattern2.exec(content)) !== null) {
        if (!models.includes(match[1])) {
          models.push(match[1]);
        }
      }

      // Pattern 3: mongoose.model('ModelName', ...)
      const pattern3 = /mongoose\.model\s*[<(]\s*['"](\w+)['"]/g;

      while ((match = pattern3.exec(content)) !== null) {
        if (!models.includes(match[1])) {
          models.push(match[1]);
        }
      }

      return models;
    } catch (error) {
      console.error(`Error reading model file ${filePath}: ${error.message}`);
      return [];
    }
  }

  /**
   * Model file এর content পড়ে
   * @param {string} filePath - Path to model file
   * @returns {string} File content
   */
  readModelFile(filePath) {
    try {
      return fs.readFileSync(filePath, 'utf-8');
    } catch (error) {
      console.error(`Error reading file ${filePath}: ${error.message}`);
      return '';
    }
  }

  /**
   * সব models এর summary তৈরি করে
   * @returns {Object} Summary object
   */
  getModelsSummary() {
    const modelFiles = this.findAllModelFiles();

    const summary = {
      totalModules: modelFiles.length,
      totalModels: 0,
      models: [],
    };

    for (const file of modelFiles) {
      summary.totalModels += file.models.length;

      for (const modelName of file.models) {
        summary.models.push({
          name: modelName,
          module: file.moduleName,
          filePath: file.filePath,
        });
      }
    }

    return summary;
  }

  /**
   * Specific model এর file path খুঁজে বের করে
   * @param {string} modelName - Name of the model
   * @returns {Object|null} {filePath, moduleName} or null
   */
  findModelByName(modelName) {
    const modelFiles = this.findAllModelFiles();

    for (const file of modelFiles) {
      if (file.models.includes(modelName)) {
        return {
          filePath: file.filePath,
          moduleName: file.moduleName,
        };
      }
    }

    return null;
  }

  /**
   * Check if a model exists
   * @param {string} modelName - Name of the model
   * @returns {boolean}
   */
  modelExists(modelName) {
    return this.findModelByName(modelName) !== null;
  }

  /**
   * Get interface file for a module
   * @param {string} moduleName - Module name
   * @returns {string|null} Interface file path or null
   */
  findInterfaceFile(moduleName) {
    const moduleDir = path.join(this.modulesDir, moduleName);

    const patterns = [
      `${moduleName}.interface.ts`,
      `${moduleName}.interfaces.ts`,
      'interface.ts',
      'interfaces.ts',
      'types.ts',
    ];

    for (const pattern of patterns) {
      const filePath = path.join(moduleDir, pattern);
      if (fs.existsSync(filePath)) {
        return filePath;
      }
    }

    return null;
  }

  /**
   * Get complete module structure
   * @param {string} moduleName - Module name
   * @returns {Object} Module structure
   */
  getModuleStructure(moduleName) {
    const moduleDir = path.join(this.modulesDir, moduleName);

    return {
      moduleName,
      moduleDir,
      modelFile: this.findModelFile(moduleName),
      interfaceFile: this.findInterfaceFile(moduleName),
      exists: fs.existsSync(moduleDir),
    };
  }
}

module.exports = SchemaAnalyzer;

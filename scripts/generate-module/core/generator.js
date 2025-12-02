/**
 * Main file generator
 */

const fs = require('fs').promises;
const path = require('path');
const { registerHelpers } = require('../builders/base-builder');
const { buildModel } = require('../builders/model-builder');
const { buildService } = require('../builders/service-builder');
const { buildController } = require('../builders/controller-builder');
const { buildValidation } = require('../builders/validation-builder');
const { buildRoute } = require('../builders/route-builder');

// Register Handlebars helpers once
registerHelpers();

/**
 * Generate all module files
 * @param {Object} config - Module configuration
 * @returns {Promise<Array>} Generated files info
 */
async function generateFiles(config) {
  const modulePath = path.join(
    process.cwd(),
    'src/app/modules',
    config.moduleName
  );

  // Ensure directory exists
  await fs.mkdir(modulePath, { recursive: true });

  const files = [];

  // Generate model file
  const modelContent = await buildModel(config);
  const modelPath = path.join(modulePath, `${config.moduleName}.model.ts`);
  await fs.writeFile(modelPath, modelContent, 'utf-8');
  files.push({
    path: modelPath,
    type: 'model',
    lines: modelContent.split('\n').length,
  });

  // Generate service file
  const serviceContent = await buildService(config);
  const servicePath = path.join(modulePath, `${config.moduleName}.service.ts`);
  await fs.writeFile(servicePath, serviceContent, 'utf-8');
  files.push({
    path: servicePath,
    type: 'service',
    lines: serviceContent.split('\n').length,
  });

  // Generate controller file
  const controllerContent = await buildController(config);
  const controllerPath = path.join(modulePath, `${config.moduleName}.controller.ts`);
  await fs.writeFile(controllerPath, controllerContent, 'utf-8');
  files.push({
    path: controllerPath,
    type: 'controller',
    lines: controllerContent.split('\n').length,
  });

  // Generate validation file
  const validationContent = await buildValidation(config);
  const validationPath = path.join(modulePath, `${config.moduleName}.validation.ts`);
  await fs.writeFile(validationPath, validationContent, 'utf-8');
  files.push({
    path: validationPath,
    type: 'validation',
    lines: validationContent.split('\n').length,
  });

  // Generate route file
  const routeContent = await buildRoute(config);
  const routePath = path.join(modulePath, `${config.moduleName}.route.ts`);
  await fs.writeFile(routePath, routeContent, 'utf-8');
  files.push({
    path: routePath,
    type: 'route',
    lines: routeContent.split('\n').length,
  });

  return files;
}

module.exports = {
  generateFiles,
};

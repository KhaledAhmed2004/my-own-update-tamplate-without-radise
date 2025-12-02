/**
 * Auto-register routes in central routes file
 */

const fs = require('fs').promises;
const path = require('path');
const { pascalCase, pluralize } = require('../utils/string-helpers');

/**
 * Register module routes in src/routes/index.ts
 * @param {Object} config - Module configuration
 * @returns {Promise<void>}
 */
async function registerRoutes(config) {
  const routesFilePath = path.join(process.cwd(), 'src/routes/index.ts');

  let content = await fs.readFile(routesFilePath, 'utf-8');

  const modulePascal = config.pascalCase;
  const routeName = `${modulePascal}Routes`;
  const importStatement = `import { ${routeName} } from '../app/modules/${config.moduleName}/${config.moduleName}.route';`;
  const routePath = pluralize(config.moduleName);

  // Check if already registered
  if (content.includes(routeName)) {
    console.log(`  ℹ Route already registered: ${routeName}`);
    return;
  }

  // Add import statement after last import
  const lastImportIndex = content.lastIndexOf('import ');
  const endOfLastImport = content.indexOf('\n', lastImportIndex);
  content =
    content.slice(0, endOfLastImport + 1) +
    importStatement +
    '\n' +
    content.slice(endOfLastImport + 1);

  // Add route to apiRoutes array
  const apiRoutesMatch = content.match(/const apiRoutes = \[([\s\S]*?)\];/);
  if (apiRoutesMatch) {
    const routeEntry = `\n  {\n    path: '/${routePath}',\n    route: ${routeName},\n  },`;
    const currentRoutes = apiRoutesMatch[1];
    const newRoutes = currentRoutes.trimEnd() + routeEntry + '\n';
    content = content.replace(
      /const apiRoutes = \[[\s\S]*?\];/,
      `const apiRoutes = [${newRoutes}];`
    );
  }

  await fs.writeFile(routesFilePath, content, 'utf-8');
}

module.exports = {
  registerRoutes,
};

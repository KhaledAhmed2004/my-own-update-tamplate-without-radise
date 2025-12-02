/**
 * Post-processing: Format and validate generated files
 */

const { exec } = require('child_process');
const { promisify } = require('util');

const execAsync = promisify(exec);

/**
 * Format files with Prettier
 * @param {Array} files - Generated files info
 * @returns {Promise<void>}
 */
async function formatFiles(files) {
  try {
    const filePaths = files.map((f) => f.path).join(' ');
    await execAsync(`npx prettier --write ${filePaths}`);
  } catch (error) {
    console.warn('  ⚠ Prettier formatting failed:', error.message);
  }
}

/**
 * Validate TypeScript compilation
 * @returns {Promise<boolean>} True if valid
 */
async function validateTypeScript() {
  try {
    await execAsync('npx tsc --noEmit');
    return true;
  } catch (error) {
    console.warn('  ⚠ TypeScript validation found errors');
    return false;
  }
}

module.exports = {
  formatFiles,
  validateTypeScript,
};

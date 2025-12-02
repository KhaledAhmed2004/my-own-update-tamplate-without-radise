const fs = require('fs');
const path = require('path');

/**
 * File Scanner Utility
 *
 * Recursively scans directories and finds TypeScript/JavaScript files
 * Zero external dependencies - uses only Node.js built-ins
 */

class FileScanner {
  constructor(options = {}) {
    this.options = {
      rootDir: options.rootDir || process.cwd(),
      extensions: options.extensions || ['.ts', '.js'],
      exclude: options.exclude || [
        'node_modules',
        'dist',
        'build',
        '.git',
        'coverage',
        'test-reports',
        'public',
        'uploads'
      ],
      includeHidden: options.includeHidden || false,
      ...options
    };
  }

  /**
   * Scan directory recursively
   */
  scan(dir = this.options.rootDir) {
    const files = [];

    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip hidden files/folders unless explicitly included
        if (!this.options.includeHidden && entry.name.startsWith('.')) {
          continue;
        }

        // Skip excluded directories
        if (entry.isDirectory() && this.shouldExclude(entry.name)) {
          continue;
        }

        if (entry.isDirectory()) {
          // Recursively scan subdirectories
          files.push(...this.scan(fullPath));
        } else if (entry.isFile()) {
          // Check if file has valid extension
          const ext = path.extname(entry.name);
          if (this.options.extensions.includes(ext)) {
            files.push({
              path: fullPath,
              relativePath: path.relative(this.options.rootDir, fullPath),
              name: entry.name,
              ext: ext,
              dir: dir,
              relativeDir: path.relative(this.options.rootDir, dir)
            });
          }
        }
      }
    } catch (error) {
      console.error(`Error scanning directory ${dir}:`, error.message);
    }

    return files;
  }

  /**
   * Check if directory should be excluded
   */
  shouldExclude(dirName) {
    return this.options.exclude.some(excluded =>
      dirName === excluded || dirName.includes(excluded)
    );
  }

  /**
   * Scan specific directory
   */
  scanDirectory(dirPath) {
    const fullPath = path.isAbsolute(dirPath)
      ? dirPath
      : path.join(this.options.rootDir, dirPath);

    return this.scan(fullPath);
  }

  /**
   * Get all files grouped by module
   */
  scanByModule(modulesDir = 'src/app/modules') {
    const fullPath = path.join(this.options.rootDir, modulesDir);

    if (!fs.existsSync(fullPath)) {
      return {};
    }

    const modules = {};
    const entries = fs.readdirSync(fullPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const modulePath = path.join(fullPath, entry.name);
        modules[entry.name] = this.scan(modulePath);
      }
    }

    return modules;
  }

  /**
   * Get file stats
   */
  getStats(files = null) {
    const filesToAnalyze = files || this.scan();

    const stats = {
      total: filesToAnalyze.length,
      byExtension: {},
      byDirectory: {},
      totalLines: 0
    };

    for (const file of filesToAnalyze) {
      // Count by extension
      stats.byExtension[file.ext] = (stats.byExtension[file.ext] || 0) + 1;

      // Count by directory
      const dirKey = file.relativeDir || 'root';
      stats.byDirectory[dirKey] = (stats.byDirectory[dirKey] || 0) + 1;

      // Count lines
      try {
        const content = fs.readFileSync(file.path, 'utf8');
        const lines = content.split('\n').length;
        stats.totalLines += lines;
      } catch (error) {
        // Skip if can't read file
      }
    }

    return stats;
  }

  /**
   * Find files by pattern
   */
  findByPattern(pattern) {
    const files = this.scan();
    const regex = new RegExp(pattern, 'i');

    return files.filter(file =>
      regex.test(file.name) || regex.test(file.relativePath)
    );
  }

  /**
   * Find files in specific module
   */
  findInModule(moduleName) {
    const modulePath = path.join(this.options.rootDir, 'src', 'app', 'modules', moduleName);

    if (!fs.existsSync(modulePath)) {
      return [];
    }

    return this.scan(modulePath);
  }
}

module.exports = FileScanner;

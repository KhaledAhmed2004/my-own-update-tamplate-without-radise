/**
 * JSON Reporter
 *
 * Generates JSON output for CI/CD integration
 */

class JSONReporter {
  constructor(options = {}) {
    this.options = options;
  }

  /**
   * Generate JSON report
   */
  report(results) {
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalFiles: results.stats.total,
        totalIssues: this.getTotalIssues(results),
        critical: results.critical?.length || 0,
        architecture: results.architecture?.length || 0,
        overEngineering: results.overEngineering?.length || 0,
        quality: results.quality?.length || 0,
        goodPatterns: results.goodPatterns?.length || 0
      },
      issues: {
        critical: results.critical || [],
        architecture: results.architecture || [],
        overEngineering: results.overEngineering || [],
        quality: results.quality || []
      },
      goodPatterns: results.goodPatterns || [],
      stats: results.stats
    };

    return JSON.stringify(report, null, 2);
  }

  getTotalIssues(results) {
    return (results.critical?.length || 0) +
           (results.architecture?.length || 0) +
           (results.overEngineering?.length || 0) +
           (results.quality?.length || 0);
  }
}

module.exports = JSONReporter;

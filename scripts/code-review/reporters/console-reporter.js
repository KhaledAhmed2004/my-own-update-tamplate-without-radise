/**
 * Console Reporter
 *
 * Beautiful terminal output with Bangla support
 * Zero external dependencies - uses only ANSI escape codes
 */

class ConsoleReporter {
  constructor(options = {}) {
    this.options = {
      colorize: options.colorize !== false,
      verbose: options.verbose || false,
      ...options
    };

    // ANSI colors
    this.colors = {
      reset: '\x1b[0m',
      bright: '\x1b[1m',
      dim: '\x1b[2m',
      red: '\x1b[31m',
      green: '\x1b[32m',
      yellow: '\x1b[33m',
      blue: '\x1b[34m',
      magenta: '\x1b[35m',
      cyan: '\x1b[36m',
      white: '\x1b[37m',
      bgRed: '\x1b[41m',
      bgGreen: '\x1b[42m',
      bgYellow: '\x1b[43m'
    };
  }

  /**
   * Main report generation
   */
  report(results) {
    this.printHeader(results);
    this.printCriticalIssues(results.critical);
    this.printArchitectureIssues(results.architecture);
    this.printOverEngineeringIssues(results.overEngineering);
    this.printQualityIssues(results.quality);
    this.printGoodPatterns(results.goodPatterns);
    this.printSummary(results);
  }

  /**
   * Print header
   */
  printHeader(results) {
    const totalIssues = this.getTotalIssues(results);

    console.log('');
    console.log(this.colorize('═'.repeat(70), 'cyan'));
    console.log(this.colorize(this.center('🎯 Senior Engineer Code Review Report'), 'bright'));
    console.log(this.center(`Total Files: ${results.stats.total} | Issues Found: ${totalIssues}`));
    console.log(this.colorize('═'.repeat(70), 'cyan'));
    console.log('');
  }

  /**
   * Print critical issues
   */
  printCriticalIssues(issues) {
    if (!issues || issues.length === 0) return;

    console.log(this.colorize(`🔴 CRITICAL ISSUES (Fix Immediately)`, 'red', 'bright') + this.colorize(` ─────────────── ${issues.length}`, 'red'));
    console.log('');

    for (const issue of issues) {
      this.printIssue(issue, 'critical');
    }
  }

  /**
   * Print architecture issues
   */
  printArchitectureIssues(issues) {
    if (!issues || issues.length === 0) return;

    console.log(this.colorize(`⚠️  ARCHITECTURE ISSUES (Fix Soon)`, 'yellow', 'bright') + this.colorize(` ───────────── ${issues.length}`, 'yellow'));
    console.log('');

    for (const issue of issues) {
      this.printIssue(issue, 'architecture');
    }
  }

  /**
   * Print over-engineering issues
   */
  printOverEngineeringIssues(issues) {
    if (!issues || issues.length === 0) return;

    console.log(this.colorize(`💡 OVER-ENGINEERING DETECTED`, 'magenta', 'bright') + this.colorize(` ────────────── ${issues.length}`, 'magenta'));
    console.log('');

    for (const issue of issues) {
      this.printIssue(issue, 'over-engineering');
    }
  }

  /**
   * Print quality issues
   */
  printQualityIssues(issues) {
    if (!issues || issues.length === 0) return;

    console.log(this.colorize(`🟡 QUALITY ISSUES (Improve Code Quality)`, 'yellow') + this.colorize(` ───────── ${issues.length}`, 'yellow'));
    console.log('');

    for (const issue of issues) {
      this.printIssue(issue, 'quality');
    }
  }

  /**
   * Print good patterns
   */
  printGoodPatterns(patterns) {
    if (!patterns || patterns.length === 0) return;

    console.log(this.colorize(`✅ GOOD PATTERNS FOUND`, 'green', 'bright') + this.colorize(` ──────────────── ${patterns.length}`, 'green'));
    console.log('');

    for (const pattern of patterns.slice(0, 5)) {  // Show top 5
      console.log(this.colorize(`  ✅ ${pattern.title}`, 'green'));
      console.log(this.colorize(`  📁 ${pattern.file}`, 'dim'));
      console.log('');
      console.log(this.colorize(`  💬 Senior Engineer Says:`, 'cyan', 'bright'));
      console.log(`  "${pattern.seniorSays}"`);
      console.log('');
      console.log(this.colorize('─'.repeat(70), 'dim'));
      console.log('');
    }
  }

  /**
   * Print single issue
   */
  printIssue(issue, severity) {
    const icon = this.getSeverityIcon(severity);
    const color = this.getSeverityColor(severity);

    console.log(this.colorize(`  ${icon} ${issue.message}`, color, 'bright'));
    console.log(this.colorize(`  📁 ${issue.file}${issue.line ? ':' + issue.line : ''}`, 'dim'));
    console.log('');

    // Senior says
    if (issue.seniorSays) {
      console.log(this.colorize(`  💬 Senior Engineer Says:`, 'cyan', 'bright'));
      console.log(`  "${issue.seniorSays}"`);
      console.log('');
    }

    // Impact
    if (issue.impact) {
      console.log(this.colorize(`  💥 Impact:`, 'yellow'));
      console.log(`  ${issue.impact}`);
      console.log('');
    }

    // Fix
    if (issue.fix) {
      console.log(this.colorize(`  🔧 Fix:`, 'green'));
      console.log(`  ${issue.fix}`);
      console.log('');
    }

    // Before/After
    if (issue.before && issue.after) {
      console.log(this.colorize(`  📝 Before (WRONG):`, 'red'));
      this.printCodeBlock(issue.before, 'red');
      console.log('');

      console.log(this.colorize(`  📝 After (CORRECT):`, 'green'));
      this.printCodeBlock(issue.after, 'green');
      console.log('');
    }

    // Teaching moment
    if (issue.teaching) {
      console.log(this.colorize(`  🎓 Teaching Moment:`, 'blue'));
      if (issue.teaching.why) {
        console.log(`  Why? ${issue.teaching.why}`);
      }
      if (issue.teaching.benefits) {
        console.log(`  Benefits:`);
        issue.teaching.benefits.forEach(b => console.log(`    - ${b}`));
      }
      console.log('');
    }

    console.log(this.colorize('─'.repeat(70), 'dim'));
    console.log('');
  }

  /**
   * Print code block
   */
  printCodeBlock(code, color = 'white') {
    const lines = code.split('\n');
    lines.forEach(line => {
      console.log(this.colorize(`  ${line}`, color));
    });
  }

  /**
   * Print summary
   */
  printSummary(results) {
    console.log(this.colorize('═'.repeat(70), 'cyan'));
    console.log(this.colorize(this.center('📊 SUMMARY'), 'bright'));
    console.log(this.colorize('═'.repeat(70), 'cyan'));
    console.log('');

    const counts = {
      critical: results.critical?.length || 0,
      architecture: results.architecture?.length || 0,
      overEngineering: results.overEngineering?.length || 0,
      quality: results.quality?.length || 0,
      good: results.goodPatterns?.length || 0
    };

    console.log(`  ${this.colorize('🔴 Critical:', 'red', 'bright')}      ${counts.critical}  (Fix immediately before deploy)`);
    console.log(`  ${this.colorize('⚠️  Architecture:', 'yellow', 'bright')}  ${counts.architecture}  (Fix in current sprint)`);
    console.log(`  ${this.colorize('💡 Over-eng:', 'magenta', 'bright')}      ${counts.overEngineering}  (Simplify when you refactor)`);
    console.log(`  ${this.colorize('🟡 Quality:', 'yellow')}       ${counts.quality}  (Improve in next sprint)`);
    console.log(`  ${this.colorize('✅ Good patterns:', 'green', 'bright')} ${counts.good}  (Keep doing this!)`);
    console.log('');

    // Overall assessment
    console.log(this.colorize('💬 Overall Assessment:', 'cyan', 'bright'));
    console.log('');
    console.log(this.getOverallAssessment(counts));
    console.log('');

    console.log(this.colorize('═'.repeat(70), 'cyan'));
    console.log('');
  }

  /**
   * Get overall assessment
   */
  getOverallAssessment(counts) {
    if (counts.critical > 5) {
      return `"You have ${counts.critical} critical issues. Focus on fixing those first.\n They will break production. Everything else can wait."`;
    } else if (counts.critical > 0) {
      return `"Fix the ${counts.critical} critical issues, then you're good to deploy.\n The other issues can be addressed incrementally."`;
    } else if (counts.architecture > 10) {
      return `"No critical issues! Good. Now address the ${counts.architecture} architecture issues\n to improve maintainability."`;
    } else {
      return `"Your codebase is solid! Keep following the patterns you've established.\n Focus on ${counts.quality > 0 ? 'quality improvements' : 'shipping features'}."`;
    }
  }

  /**
   * Helper: Get severity icon
   */
  getSeverityIcon(severity) {
    const icons = {
      critical: '❌',
      architecture: '⚠️',
      'over-engineering': '💡',
      quality: '🟡',
      security: '🔒',
      scalability: '📈'
    };
    return icons[severity] || '•';
  }

  /**
   * Helper: Get severity color
   */
  getSeverityColor(severity) {
    const colors = {
      critical: 'red',
      architecture: 'yellow',
      'over-engineering': 'magenta',
      quality: 'yellow',
      security: 'red',
      scalability: 'cyan'
    };
    return colors[severity] || 'white';
  }

  /**
   * Helper: Colorize text
   */
  colorize(text, color, style) {
    if (!this.options.colorize) return text;

    let code = this.colors[color] || '';
    if (style === 'bright') code = this.colors.bright + code;
    if (style === 'dim') code = this.colors.dim + code;

    return code + text + this.colors.reset;
  }

  /**
   * Helper: Center text
   */
  center(text, width = 70) {
    const padding = Math.max(0, Math.floor((width - text.length) / 2));
    return ' '.repeat(padding) + text;
  }

  /**
   * Helper: Get total issues
   */
  getTotalIssues(results) {
    return (results.critical?.length || 0) +
           (results.architecture?.length || 0) +
           (results.overEngineering?.length || 0) +
           (results.quality?.length || 0);
  }
}

module.exports = ConsoleReporter;

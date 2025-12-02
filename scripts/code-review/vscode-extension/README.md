# Senior Code Reviewer - VS Code Extension

Code review like a top 1% senior engineer. Get pragmatic, production-focused feedback right in your editor.

## Features

### 🔍 Real-time Code Analysis
- Automatically analyzes TypeScript and JavaScript files on save
- Shows issues inline with red squiggly lines for critical problems
- Integrates with VS Code Problems panel
- Status bar shows issue counts at a glance

### 🎯 Smart Detection
- **Critical Issues**: Import order violations, missing error handling, async/await issues
- **Architecture**: Service layer violations, middleware order, separation of concerns
- **Over-engineering**: YAGNI violations, premature abstraction
- **Security**: Missing validation, hardcoded secrets
- **Performance**: N+1 queries, missing indexes
- **Maintainability**: DRY violations, console.logs
- **Readability**: Magic numbers, complex functions

### ⚡ Quick Fixes (Coming Soon)
- One-click fixes for common issues
- Auto-fix import order
- Add missing catchAsync wrappers
- Wrap operations with transactions

### 📊 Comprehensive Feedback
- Hover tooltips with detailed explanations
- "Senior Engineer Says" insights
- Impact analysis for each issue
- Fix suggestions with examples
- Links to documentation

## Installation

### From VSIX File

1. Download the `.vsix` file
2. Open VS Code
3. Press `Ctrl+Shift+P` (Windows/Linux) or `Cmd+Shift+P` (Mac)
4. Type "Install from VSIX"
5. Select the downloaded file
6. Reload VS Code

### Build from Source

```bash
cd scripts/code-review/vscode-extension
npm install
npm run compile
```

Then press `F5` in VS Code to open Extension Development Host.

## Usage

### Automatic Analysis

The extension automatically activates when you open TypeScript or JavaScript files. Just save your file (`Ctrl+S`) and issues will appear instantly!

### Commands

Access via Command Palette (`Ctrl+Shift+P`):

- **Senior Code Reviewer: Review Current File** - Analyze the active file
- **Senior Code Reviewer: Review Entire Workspace** - Analyze all TypeScript/JavaScript files
- **Senior Code Reviewer: Clear Cache** - Clear analysis cache

### Status Bar

The status bar (bottom right) shows:
- 🎯 Icon indicating extension is active
- Issue counts by severity (🔴 critical, ⚠️ warnings, 💡 suggestions)
- Click to open Problems panel

## Configuration

Open VS Code Settings (`Ctrl+,`) and search for "Senior Code Reviewer":

| Setting | Default | Description |
|---------|---------|-------------|
| `enabled` | `true` | Enable/disable the extension |
| `validateOnSave` | `true` | Run analysis on file save |
| `validateOnType` | `false` | Run analysis while typing (may impact performance) |
| `severity` | All levels | Which severity levels to show |
| `excludePatterns` | `["**/*.test.ts", "**/*.spec.ts"]` | File patterns to exclude |
| `maxComplexity` | `10` | Maximum allowed cyclomatic complexity |
| `maxFunctionLines` | `50` | Maximum lines per function |
| `showGoodPatterns` | `true` | Show good pattern detections |
| `debugMode` | `false` | Enable debug logging |

### Example Configuration

```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.validateOnType": false,
  "seniorCodeReviewer.severity": ["critical", "architecture", "security"],
  "seniorCodeReviewer.excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/old-code/**"
  ]
}
```

## Requirements

- VS Code 1.85.0 or higher
- Node.js installed (for running the analyzer)
- TypeScript or JavaScript project

## Known Issues

- Large files (>1MB) may take longer to analyze
- On-type validation can impact performance (disabled by default)
- Quick fixes not yet implemented (coming soon)

## Troubleshooting

### Extension not working?

1. Check if extension is enabled: Settings → `seniorCodeReviewer.enabled`
2. Check Output panel: View → Output → Select "Senior Code Reviewer"
3. Try reloading VS Code: `Ctrl+Shift+P` → "Reload Window"
4. Check file type: Only works with TypeScript/JavaScript files

### No issues showing?

1. Save the file (`Ctrl+S`) to trigger analysis
2. Check if file is excluded by patterns
3. Run command manually: `Ctrl+Shift+P` → "Senior Code Reviewer: Review Current File"
4. Check severity settings - you may have filtered out all issue types

### Performance issues?

1. Disable `validateOnType` (it's off by default)
2. Add large files to `excludePatterns`
3. Reduce enabled `severity` levels

## Release Notes

### 0.1.0 (Initial Release)

- ✅ Real-time diagnostics on file save
- ✅ Problems panel integration
- ✅ Status bar with issue counts
- ✅ Comprehensive configuration options
- ✅ Review current file command
- ✅ Review workspace command
- ✅ Hover tooltips with details
- ✅ Support for all analyzer rules

## Contributing

This extension wraps the existing JavaScript code reviewer CLI. The analyzer logic is in:
```
scripts/code-review/
├── reviewer.js
├── analyzers/
└── reporters/
```

To add new rules or improve existing ones, modify the analyzer files.

## License

[Your License]

## Author

[Your Name]

---

**Enjoy pragmatic code reviews!** 🚀

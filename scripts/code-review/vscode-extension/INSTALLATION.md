# Installation & Setup Guide

Complete guide to installing and using the Senior Code Reviewer VS Code Extension.

## Prerequisites

Before installing the extension, ensure you have:

1. **VS Code** version 1.85.0 or higher
2. **Node.js** installed (for running the analyzer)
3. **TypeScript or JavaScript project**

## Installation Methods

### Method 1: Development Mode (For Testing)

Perfect for development and testing the extension:

1. **Navigate to extension directory:**
   ```bash
   cd scripts/code-review/vscode-extension
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Compile TypeScript:**
   ```bash
   npm run compile
   ```

4. **Open in VS Code:**
   ```bash
   code .
   ```

5. **Press F5** to launch Extension Development Host
   - A new VS Code window will open
   - The extension will be automatically activated
   - Open any TypeScript/JavaScript file to test

### Method 2: Install from VSIX (Local Installation)

For permanent installation on your machine:

1. **Package the extension:**
   ```bash
   cd scripts/code-review/vscode-extension
   npm install -g @vscode/vsce
   vsce package
   ```

   This creates `senior-code-reviewer-0.1.0.vsix`

2. **Install via command line:**
   ```bash
   code --install-extension senior-code-reviewer-0.1.0.vsix
   ```

   **OR** via VS Code UI:
   - Open VS Code
   - Press `Ctrl+Shift+X` (Extensions)
   - Click `...` (three dots) → "Install from VSIX..."
   - Select the `.vsix` file

3. **Reload VS Code:**
   - Press `Ctrl+Shift+P`
   - Type "Reload Window"
   - Press Enter

### Method 3: VS Code Marketplace (Future)

Once published to the marketplace:

1. Open VS Code
2. Go to Extensions (`Ctrl+Shift+X`)
3. Search for "Senior Code Reviewer"
4. Click Install

## Verification

After installation, verify the extension is working:

1. **Open a TypeScript/JavaScript file**

2. **Check status bar:**
   - Look for 🎯 icon in bottom-right corner
   - Should show "Code Review: ✓ No issues" (if file is clean)

3. **Check Output channel:**
   - View → Output
   - Select "Senior Code Reviewer" from dropdown
   - Should see activation messages

4. **Test analysis:**
   - Save any TypeScript file (`Ctrl+S`)
   - Check Problems panel (`Ctrl+Shift+M`)
   - Should see issues if any exist

## Configuration

### Basic Setup

Open Settings (`Ctrl+,`) and search for "Senior Code Reviewer":

```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.validateOnType": false
}
```

### Project-Specific Configuration

Create `.vscode/settings.json` in your project root:

```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts",
    "**/legacy/**",
    "**/dist/**"
  ],
  "seniorCodeReviewer.severity": [
    "critical",
    "architecture",
    "security"
  ],
  "seniorCodeReviewer.maxComplexity": 15,
  "seniorCodeReviewer.debugMode": false
}
```

### Recommended Settings

For **daily development:**
```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.validateOnType": false,
  "seniorCodeReviewer.showGoodPatterns": true
}
```

For **strict code review:**
```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.severity": ["critical", "architecture", "security"],
  "seniorCodeReviewer.maxComplexity": 8,
  "seniorCodeReviewer.maxFunctionLines": 30
}
```

For **performance-sensitive projects:**
```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.validateOnType": false,
  "seniorCodeReviewer.excludePatterns": [
    "**/*.test.ts",
    "**/large-generated-files/**"
  ]
}
```

## Usage

### Automatic Analysis

The extension automatically analyzes files when you save them. Just:

1. Edit any TypeScript/JavaScript file
2. Save (`Ctrl+S`)
3. See issues appear instantly!

### Manual Commands

Access via Command Palette (`Ctrl+Shift+P`):

- **Review Current File** - Analyze the active file
- **Review Entire Workspace** - Analyze all TS/JS files
- **Clear Cache** - Clear analysis cache
- **Fix All Issues** - (Coming soon) Auto-fix all fixable issues

### Viewing Issues

**Problems Panel (`Ctrl+Shift+M`):**
- See all issues organized by file
- Filter by severity or keyword
- Click to navigate to issue

**Inline (in editor):**
- Red squiggly lines for critical issues
- Yellow squiggly lines for warnings
- Hover to see detailed information

**Status Bar:**
- Shows total issue count by severity
- Click to open Problems panel

### Quick Fixes

1. **Navigate to issue** (red/yellow squiggly line)
2. **Press `Ctrl+.`** (or click light bulb 💡)
3. **Select fix** from menu
4. **Press Enter** to apply

Available quick fixes:
- Fix import order (help message)
- Wrap with catchAsync (help message)
- Wrap with withTransaction (help message)
- Remove console.log
- Extract to constant (help message)
- Learn more about issue

### Hover Information

Hover over any issue to see:
- Severity level and icon
- Category and message
- "Senior Engineer Says" teaching moment
- Impact analysis
- Fix suggestion
- Code example
- Documentation link

## Troubleshooting

### Extension not activating?

**Check:**
1. VS Code version is 1.85.0+
2. File type is TypeScript/JavaScript
3. Extension is enabled in settings
4. Reload VS Code window

**View logs:**
- View → Output → "Senior Code Reviewer"
- Enable debug mode in settings

### No issues showing?

**Possible reasons:**
1. File is excluded by pattern
2. Severity level filtered out in settings
3. File has no issues (good!)
4. Analyzer script not found

**Try:**
- Run "Review Current File" command manually
- Check excludePatterns setting
- Check severity setting
- Verify reviewer.js script exists

### Performance issues?

**Solutions:**
1. Disable `validateOnType` (should be off by default)
2. Exclude large files via `excludePatterns`
3. Reduce enabled `severity` levels
4. Close unnecessary files

### Issues with analyzer?

**Check:**
1. Node.js is installed and in PATH
2. reviewer.js script exists at `../reviewer.js`
3. Analyzer dependencies installed
4. No syntax errors in analyzer script

**Debug:**
- Enable `debugMode` in settings
- Check Output channel for errors
- Test CLI manually: `node scripts/code-review/reviewer.js --file <path>`

## Uninstallation

### Remove extension:

**Via command line:**
```bash
code --uninstall-extension senior-code-reviewer
```

**Via VS Code UI:**
1. Go to Extensions (`Ctrl+Shift+X`)
2. Find "Senior Code Reviewer"
3. Click "Uninstall"

### Clean up (optional):

Remove extension directory:
```bash
rm -rf scripts/code-review/vscode-extension/out
rm -rf scripts/code-review/vscode-extension/node_modules
```

## Updating

### Update installed extension:

If you installed from VSIX:

1. Build new VSIX:
   ```bash
   cd scripts/code-review/vscode-extension
   npm run compile
   vsce package
   ```

2. Uninstall old version
3. Install new VSIX

### Update in development mode:

1. Pull latest changes
2. `npm install` (if dependencies changed)
3. `npm run compile`
4. Reload Extension Development Host (`Ctrl+R` in extension host window)

## Getting Help

### Resources:
- **README.md** - Feature overview
- **CHANGELOG.md** - Version history
- **CLAUDE.md** (project root) - Analyzer documentation

### Issues:
- Check Output channel for errors
- Enable debug mode for verbose logging
- Test CLI analyzer independently
- Check VS Code Developer Tools (Help → Toggle Developer Tools)

### Support:
- GitHub Issues: [your-repo-url]
- Documentation: [docs-url]
- Email: [your-email]

## Next Steps

After installation:

1. ✅ Configure settings for your workflow
2. ✅ Test on a few files
3. ✅ Review Problems panel
4. ✅ Try hover and quick fixes
5. ✅ Adjust excludePatterns if needed
6. ✅ Share with team members!

Happy coding! 🚀

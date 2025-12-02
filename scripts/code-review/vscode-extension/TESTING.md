# Testing & Packaging Guide

Complete guide for testing and packaging the Senior Code Reviewer VS Code Extension.

## Testing the Extension

### Method 1: Extension Development Host (F5)

**Best for:** Active development and debugging

1. **Open extension folder in VS Code:**
   ```bash
   cd scripts/code-review/vscode-extension
   code .
   ```

2. **Press F5** (or Run → Start Debugging)
   - Extension compiles automatically
   - New VS Code window opens ("Extension Development Host")
   - Extension is activated in the new window

3. **Test in Extension Development Host:**
   - Open a TypeScript/JavaScript project
   - Make changes to trigger analysis
   - Check Problems panel, status bar, hover, quick fixes

4. **View Extension Logs:**
   - In Extension Development Host: View → Output → "Senior Code Reviewer"
   - In main VS Code: Debug Console shows extension messages

5. **Make Changes:**
   - Edit extension code in main window
   - Press `Ctrl+R` in Extension Development Host to reload
   - Or restart debugging (Shift+F5, then F5)

### Method 2: Install VSIX Locally

**Best for:** Testing like end-users

1. **Package extension:**
   ```bash
   npm run compile
   vsce package
   ```

2. **Install:**
   ```bash
   code --install-extension senior-code-reviewer-0.1.0.vsix
   ```

3. **Test:**
   - Open any project
   - Test all features
   - Check for conflicts with other extensions

4. **Uninstall:**
   ```bash
   code --uninstall-extension senior-code-reviewer
   ```

## Manual Testing Checklist

### ✅ Basic Functionality

**Extension Activation:**
- [ ] Extension loads on VS Code startup
- [ ] Status bar icon appears
- [ ] No errors in Output channel
- [ ] Extension activates on TS/JS file open

**Diagnostics:**
- [ ] Issues appear on file save
- [ ] Red squiggly lines for critical issues
- [ ] Yellow squiggly lines for warnings
- [ ] Blue lines for suggestions
- [ ] Problems panel populated correctly
- [ ] Issue counts accurate

**Status Bar:**
- [ ] Shows correct icon (🎯)
- [ ] Displays accurate counts
- [ ] Updates on file changes
- [ ] Click opens Problems panel
- [ ] Tooltip shows details
- [ ] Background color changes with severity

### ✅ Interactive Features

**Hover:**
- [ ] Hover shows detailed information
- [ ] Displays severity icon
- [ ] Shows "Senior Engineer Says"
- [ ] Includes impact and fix
- [ ] Code examples render correctly
- [ ] Markdown formatting works

**Quick Fixes:**
- [ ] Light bulb appears on issues
- [ ] `Ctrl+.` opens quick fix menu
- [ ] Options display correctly
- [ ] "Learn more" option works
- [ ] Help commands show info
- [ ] (Future) Auto-fixes apply correctly

**Commands:**
- [ ] "Review Current File" works
- [ ] "Review Workspace" works
- [ ] "Clear Cache" works
- [ ] "Fix All Issues" shows message
- [ ] Progress indicators appear
- [ ] Completion notifications shown

### ✅ Configuration

**Settings:**
- [ ] `enabled` toggle works
- [ ] `validateOnSave` works
- [ ] `validateOnType` works (if enabled)
- [ ] `severity` filter works
- [ ] `excludePatterns` works
- [ ] `maxComplexity` affects analysis
- [ ] `debugMode` enables verbose logging

**Configuration Changes:**
- [ ] Settings reload without restart
- [ ] Re-analysis triggered on config change
- [ ] Project-specific settings work
- [ ] Workspace vs user settings priority correct

### ✅ Performance

**Response Time:**
- [ ] Small files (<100 lines): <500ms
- [ ] Medium files (100-500 lines): <2s
- [ ] Large files (500-1000 lines): <5s
- [ ] Very large files (>1000 lines): Shows warning or handles gracefully

**Resource Usage:**
- [ ] No memory leaks (check Task Manager)
- [ ] CPU usage reasonable (<10% idle)
- [ ] Extension doesn't block UI
- [ ] Multiple files don't cause freeze

**Caching:**
- [ ] Same file analyzed faster second time
- [ ] Cache clears on command
- [ ] Cache invalidates on file changes

### ✅ Edge Cases

**File Types:**
- [ ] TypeScript files work
- [ ] JavaScript files work
- [ ] Ignores non-TS/JS files
- [ ] Handles .tsx, .jsx correctly

**Special Files:**
- [ ] Test files excluded by default
- [ ] Dist folder excluded
- [ ] Node_modules excluded
- [ ] Custom patterns work

**Error Handling:**
- [ ] Missing reviewer.js handled gracefully
- [ ] Invalid JSON output handled
- [ ] File not found handled
- [ ] Timeout handled (very large files)
- [ ] User sees friendly error message

**Multi-workspace:**
- [ ] Works with multiple folders open
- [ ] Settings per workspace work
- [ ] No cross-workspace pollution

### ✅ VS Code Integration

**UI Elements:**
- [ ] No layout conflicts
- [ ] Icons render correctly
- [ ] Colors match theme
- [ ] Markdown renders in hover
- [ ] Output channel appears correctly

**Compatibility:**
- [ ] Works with ESLint extension
- [ ] Works with Prettier extension
- [ ] Works with GitLens
- [ ] No conflicting keybindings

## Automated Testing (Future)

### Unit Tests

Create `src/test/` directory:

```typescript
// analyzer-runner.test.ts
import { AnalyzerRunner } from '../analyzer-runner';

suite('AnalyzerRunner', () => {
  test('should analyze file', async () => {
    const runner = new AnalyzerRunner();
    const issues = await runner.analyzeFile('test.ts');
    assert.ok(Array.isArray(issues));
  });

  test('should handle missing file', async () => {
    const runner = new AnalyzerRunner();
    await assert.rejects(() => runner.analyzeFile('nonexistent.ts'));
  });
});
```

Run with:
```bash
npm test
```

### Integration Tests

Test extension in real VS Code:

```typescript
// extension.test.ts
import * as vscode from 'vscode';
import * as assert from 'assert';

suite('Extension Integration', () => {
  test('should activate', async () => {
    const ext = vscode.extensions.getExtension('senior-code-reviewer');
    assert.ok(ext);
    await ext.activate();
    assert.ok(ext.isActive);
  });

  test('should show diagnostics', async () => {
    const doc = await vscode.workspace.openTextDocument({
      content: 'const x = 5;',
      language: 'typescript'
    });

    await vscode.window.showTextDocument(doc);
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait for analysis

    const diagnostics = vscode.languages.getDiagnostics(doc.uri);
    assert.ok(diagnostics.length > 0);
  });
});
```

## Packaging for Distribution

### Step 1: Pre-packaging Checklist

- [ ] All features working
- [ ] Manual testing complete
- [ ] Version number updated in `package.json`
- [ ] CHANGELOG.md updated
- [ ] README.md complete
- [ ] No console.log left in code
- [ ] No debug mode enabled by default
- [ ] Dependencies minimal (dev vs prod)

### Step 2: Build

```bash
# Clean build
rm -rf out node_modules
npm install
npm run compile

# Verify no errors
ls out/
```

### Step 3: Package

```bash
# Install vsce if not already
npm install -g @vscode/vsce

# Package
vsce package

# Output: senior-code-reviewer-0.1.0.vsix
```

### Step 4: Test VSIX

```bash
# Install
code --install-extension senior-code-reviewer-0.1.0.vsix

# Test
# (Run through manual testing checklist again)

# Uninstall
code --uninstall-extension senior-code-reviewer
```

### Step 5: Publish (Optional)

**To VS Code Marketplace:**

1. **Create publisher account:**
   - Go to https://marketplace.visualstudio.com/manage
   - Create organization
   - Get Personal Access Token (PAT)

2. **Login:**
   ```bash
   vsce login <publisher-name>
   # Paste PAT when prompted
   ```

3. **Publish:**
   ```bash
   vsce publish
   ```

4. **Verify:**
   - Check https://marketplace.visualstudio.com/items?itemName=<publisher>.<extension>
   - Install from marketplace to test

**To share privately:**

Just distribute the `.vsix` file:
- Email to team
- Upload to GitHub releases
- Host on internal server
- Share via Slack/Teams

## Versioning

Follow [Semantic Versioning](https://semver.org/):

- **Major** (1.0.0): Breaking changes
- **Minor** (0.1.0): New features, backwards compatible
- **Patch** (0.0.1): Bug fixes

Update version in:
1. `package.json`
2. `CHANGELOG.md`
3. Git tag

```bash
# Update version
npm version patch  # or minor, or major

# Create git tag
git tag v0.1.0
git push --tags
```

## Continuous Integration (Future)

### GitHub Actions

Create `.github/workflows/extension.yml`:

```yaml
name: VS Code Extension CI

on: [push, pull_request]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
        with:
          node-version: '20'
      - run: cd scripts/code-review/vscode-extension
      - run: npm install
      - run: npm run compile
      - run: npm run lint
      # - run: npm test  # When tests are added
      - run: npx vsce package

  publish:
    if: startsWith(github.ref, 'refs/tags/v')
    needs: build
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-node@v2
      - run: cd scripts/code-review/vscode-extension
      - run: npm install
      - run: npx vsce publish -p ${{ secrets.VSCE_PAT }}
```

## Debugging Tips

### Common Issues

**Extension not loading:**
- Check Developer Tools (Help → Toggle Developer Tools)
- Look for JavaScript errors
- Check extension host output

**Diagnostics not showing:**
- Verify analyzer script path in `analyzer-runner.ts`
- Check if file is excluded
- Enable debug mode and check logs

**Performance issues:**
- Profile with Developer Tools
- Check for infinite loops
- Verify debouncing works
- Monitor memory usage

### Debug Tools

**VS Code Developer Tools:**
```
Help → Toggle Developer Tools
Console tab → See all logs
```

**Extension Host Log:**
```
View → Output → "Extension Host"
```

**Extension Logs:**
```
View → Output → "Senior Code Reviewer"
```

## Release Checklist

Before releasing version X.Y.Z:

- [ ] Feature complete
- [ ] Manual testing passed
- [ ] No known critical bugs
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in package.json
- [ ] Git tag created
- [ ] VSIX package built
- [ ] VSIX tested locally
- [ ] README screenshots updated
- [ ] GitHub release created (if applicable)
- [ ] Marketplace published (if applicable)
- [ ] Team notified
- [ ] Twitter/blog announcement (if public)

## Getting Help

**During testing:**
- Enable debug mode
- Check Output channels
- Use Developer Tools
- Review extension host logs

**For issues:**
- Create GitHub issue
- Include logs and screenshots
- Provide reproduction steps
- Mention VS Code version

---

Happy testing! 🧪

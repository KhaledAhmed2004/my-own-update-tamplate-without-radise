# Quick Reference Card

One-page cheat sheet for Senior Code Reviewer VS Code Extension.

---

## 🚀 Installation

```bash
cd scripts/code-review/vscode-extension
npm install
npm run compile
# Press F5 in VS Code
```

**Or install VSIX:**
```bash
vsce package
code --install-extension senior-code-reviewer-0.1.0.vsix
```

---

## ⌨️ Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl+S` | Save file → triggers analysis |
| `Ctrl+Shift+M` | Open Problems panel |
| `Ctrl+.` | Quick fix menu |
| `F8` | Next problem |
| `Shift+F8` | Previous problem |
| `F5` | Launch Extension Development Host (dev mode) |

---

## 🎯 Quick Start (30 seconds)

1. **Install** (see above)
2. **Open** any TypeScript file
3. **Save** file (`Ctrl+S`)
4. **Check** Problems panel (`Ctrl+Shift+M`)
5. **Hover** over red/yellow lines for details
6. **Fix** with `Ctrl+.`

✅ Done!

---

## ⚙️ Essential Settings

```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true,
  "seniorCodeReviewer.validateOnType": false,
  "seniorCodeReviewer.severity": ["critical", "architecture", "security"],
  "seniorCodeReviewer.excludePatterns": ["**/*.test.ts", "**/dist/**"]
}
```

Access: `Ctrl+,` → Search "Senior Code Reviewer"

---

## 📋 Commands

**Command Palette** (`Ctrl+Shift+P`):

- `Senior Code Reviewer: Review Current File`
- `Senior Code Reviewer: Review Entire Workspace`
- `Senior Code Reviewer: Clear Cache`

---

## 🔍 What You See

### Status Bar (Bottom Right)
```
🎯 Code Review: 2 🔴 5 ⚠️ 3 💡
```
- 🔴 = Critical errors
- ⚠️ = Warnings
- 💡 = Suggestions

**Click** to open Problems panel

### Problems Panel (`Ctrl+Shift+M`)
```
PROBLEMS (10)
⊖ src/app.ts
  ❌ Import order violation [Ln 5]
  ⚠️ Direct query in service [Ln 23]
```

### Inline (Editor)
- **Red squiggly** = Critical issue
- **Yellow squiggly** = Warning
- **Blue squiggly** = Suggestion

**Hover** = Detailed tooltip

### Hover Tooltip
```
🔴 Critical Issue
Category: import-order

Message: OpenTelemetry imported AFTER routes

💭 Senior Engineer Says:
"This breaks tracing..."

⚡ Impact: No tracing data

🔧 Fix: Move import before routes

📚 Documentation: CLAUDE.md
```

### Quick Fix Menu (`Ctrl+.`)
```
Quick Fix...
  ✓ Fix import order
  ✓ Wrap with catchAsync
  ⓘ Learn more
```

---

## 🎨 Severity Levels

| Level | Icon | Color | Meaning |
|-------|------|-------|---------|
| critical | 🔴 | Red | Must fix! |
| architecture | ⚠️ | Yellow | Should fix |
| over-engineering | 💡 | Blue | Consider |
| security | 🔒 | Red | Vulnerability |
| scalability | 📈 | Yellow | Performance |
| maintainability | 🔧 | Yellow | Tech debt |
| readability | 📖 | Blue | Clarity |
| pragmatism | 🎯 | Blue | Best practice |

---

## 📁 File Structure

```
vscode-extension/
├── src/
│   ├── extension.ts         # Entry point
│   ├── diagnostics.ts       # Problems panel
│   ├── statusBar.ts         # Status bar
│   ├── hover.ts             # Tooltips
│   ├── codeActions.ts       # Quick fixes
│   ├── config.ts            # Settings
│   └── analyzer-runner.ts   # CLI wrapper
├── package.json             # Extension manifest
└── out/                     # Compiled (auto-generated)
```

---

## 🛠️ Development

### Run in Dev Mode
```bash
cd vscode-extension
code .
# Press F5
```

### Make Changes
1. Edit TypeScript files
2. Save
3. Press `Ctrl+R` in Extension Development Host to reload

### Debug
1. Set breakpoints in `.ts` files
2. Press F5
3. Trigger extension feature
4. Debugger pauses at breakpoint

### View Logs
**Output channel:**
- View → Output → "Senior Code Reviewer"

**Enable debug mode:**
```json
{ "seniorCodeReviewer.debugMode": true }
```

---

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| Extension not loading | Check Developer Tools (`Help → Toggle Developer Tools`) |
| No issues showing | Enable debug mode, check Output channel |
| Slow performance | Disable `validateOnType`, add excludePatterns |
| Analyzer not found | Check path in `analyzer-runner.ts` |

---

## 📦 Packaging

### Create VSIX
```bash
npm install -g @vscode/vsce
cd vscode-extension
vsce package
# Output: senior-code-reviewer-0.1.0.vsix
```

### Install VSIX
```bash
code --install-extension senior-code-reviewer-0.1.0.vsix
```

### Uninstall
```bash
code --uninstall-extension senior-code-reviewer
```

---

## 🔧 Common Tasks

### Exclude Test Files
```json
{
  "seniorCodeReviewer.excludePatterns": [
    "**/*.test.ts",
    "**/*.spec.ts"
  ]
}
```

### Focus on Critical Only
```json
{
  "seniorCodeReviewer.severity": ["critical"]
}
```

### Disable Extension Temporarily
```json
{
  "seniorCodeReviewer.enabled": false
}
```

### Review Entire Project
```
Ctrl+Shift+P → "Senior Code Reviewer: Review Entire Workspace"
```

---

## 📚 Documentation

| File | Purpose |
|------|---------|
| **QUICKSTART.md** | 5-minute getting started |
| **README.md** | Full feature list |
| **INSTALLATION.md** | Detailed setup |
| **TESTING.md** | Testing & packaging |
| **CHANGELOG.md** | Version history |

---

## 🎓 Learning Path

1. **Day 1:** Install, try on one file
2. **Day 2:** Configure settings for your workflow
3. **Day 3:** Review entire workspace
4. **Week 1:** Learn from hover explanations
5. **Week 2:** Share with team

---

## ✅ Checklist

**Before first use:**
- [ ] Installed extension
- [ ] Configured excludePatterns
- [ ] Tested on sample file
- [ ] Opened Problems panel

**Daily workflow:**
- [ ] Write code
- [ ] Save file
- [ ] Check squiggly lines
- [ ] Read hover tooltips
- [ ] Apply quick fixes
- [ ] Learn from feedback

**Before commit:**
- [ ] Review entire workspace
- [ ] Fix all critical issues
- [ ] Status bar shows 0 🔴

---

## 🚀 Next Steps

1. ✅ Install extension
2. ✅ Test on your codebase
3. ✅ Configure settings
4. ✅ Share with team
5. ✅ Provide feedback
6. ✅ Enjoy better code quality!

---

**Version:** 0.1.0
**Last Updated:** 2025-01-25
**Support:** [GitHub Issues]

---

*Happy coding!* 🎯

# Quick Start Guide

Get started with Senior Code Reviewer in 5 minutes!

## Step 1: Install (Choose One)

### Option A: Development Mode (Testing)
```bash
cd scripts/code-review/vscode-extension
npm install
npm run compile
# Open in VS Code and press F5
```

### Option B: Install VSIX (Permanent)
```bash
cd scripts/code-review/vscode-extension
npm install -g @vscode/vsce
vsce package
code --install-extension senior-code-reviewer-0.1.0.vsix
```

## Step 2: Verify Installation

1. Open any TypeScript/JavaScript file
2. Look for 🎯 in status bar (bottom-right)
3. Save file (`Ctrl+S`)
4. Check Problems panel (`Ctrl+Shift+M`)

✅ **Success!** If you see the status bar icon, extension is working.

## Step 3: First Analysis

### Try It:

1. **Create a test file:** `test.ts`
   ```typescript
   export const greet = async (name) => {
     return `Hello ${name}`;
   };
   ```

2. **Save file** (`Ctrl+S`)

3. **See issues:**
   - ❌ Missing return type
   - ❌ Async function without catchAsync
   - ⚠️ Parameter type missing

### View Details:

- **Hover** over red squiggly line
- See detailed explanation
- Read "Senior Engineer Says"
- Learn why it matters

### Try Quick Fix:

1. Click on issue
2. Press `Ctrl+.` (Quick Fix)
3. Select fix option
4. See result!

## Step 4: Configure (Optional)

Open Settings (`Ctrl+,`) → Search "Senior Code Reviewer"

### Essential Settings:

```json
{
  "seniorCodeReviewer.enabled": true,
  "seniorCodeReviewer.validateOnSave": true
}
```

### Exclude Files:

```json
{
  "seniorCodeReviewer.excludePatterns": [
    "**/*.test.ts",
    "**/old-code/**"
  ]
}
```

## Step 5: Daily Usage

### Workflow:

1. **Write code** normally
2. **Save** (`Ctrl+S`)
3. **See issues** instantly
4. **Hover** for details
5. **Quick fix** (`Ctrl+.`)
6. **Done!**

### Commands:

Press `Ctrl+Shift+P`, then type:

- `Senior Code Reviewer: Review Current File`
- `Senior Code Reviewer: Review Entire Workspace`
- `Senior Code Reviewer: Clear Cache`

### Status Bar:

Click 🎯 icon to open Problems panel.

## Common Scenarios

### Scenario 1: Check Before Commit

```bash
# Run command:
Ctrl+Shift+P → "Senior Code Reviewer: Review Entire Workspace"

# Fix all critical issues
# Status bar shows: 🎯 0 🔴 ✓

# Safe to commit!
```

### Scenario 2: Fix Import Order

```typescript
// ❌ Wrong order
import router from './routes';
import './app/logging/opentelemetry';

// Hover → See issue
// Ctrl+. → "Fix import order"
// Or manually rearrange based on guidance
```

### Scenario 3: Add Error Handling

```typescript
// ❌ Missing catchAsync
export const createUser = async (req, res) => {
  const user = await UserService.create(req.body);
  sendResponse(res, { data: user });
};

// Hover → See "Wrap with catchAsync"
// Ctrl+. → Select fix
// ✅ Done!
```

## Tips & Tricks

### 💡 Tip 1: Focus on Critical First
```json
{
  "seniorCodeReviewer.severity": ["critical"]
}
```
Fix critical issues, then enable others.

### 💡 Tip 2: Learn from Hover
Don't just fix - **read the explanation**!
- Why is this an issue?
- What's the impact?
- How to fix properly?

### 💡 Tip 3: Use Keyboard Shortcuts
- `Ctrl+Shift+M` - Problems panel
- `Ctrl+.` - Quick fix
- `F8` - Next problem
- `Shift+F8` - Previous problem

### 💡 Tip 4: Check Good Patterns
Enable `showGoodPatterns` to see what you're doing right!

### 💡 Tip 5: Project Settings
Create `.vscode/settings.json` in project root for team-wide config.

## Troubleshooting

### ❓ No issues showing?

1. Is extension enabled?
2. Is file TypeScript/JavaScript?
3. Did you save the file?
4. Check excludePatterns

### ❓ Too many issues?

Filter by severity:
```json
{
  "seniorCodeReviewer.severity": ["critical", "architecture"]
}
```

### ❓ Slow performance?

Ensure these are set:
```json
{
  "seniorCodeReviewer.validateOnType": false,  // ✓ Off
  "seniorCodeReviewer.validateOnSave": true    // ✓ On
}
```

## Next Steps

### ✅ You're Ready!

Now you know:
- ✅ How to install
- ✅ How to use
- ✅ How to configure
- ✅ How to fix issues

### 📚 Learn More:

- **README.md** - Full feature list
- **INSTALLATION.md** - Detailed setup
- **CHANGELOG.md** - What's new
- **CLAUDE.md** (project root) - Analyzer rules

### 🚀 Advanced:

- Customize severity levels
- Create project templates
- Add to CI/CD pipeline (use CLI)
- Share config with team

---

**Happy coding!** May your code be bug-free and your reviews be thorough! 🎯

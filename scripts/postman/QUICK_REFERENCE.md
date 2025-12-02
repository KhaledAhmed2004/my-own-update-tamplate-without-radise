# 📮 Postman Generator - Quick Reference

One-page cheat sheet for the Postman Collection Generator.

---

## ⚡ Quick Commands

### Postman Collection Generator

```bash
# Generate all modules
node scripts/postman/generate-all.js

# Generate single module
node scripts/postman/generate-all.js auth

# Generate environments
node scripts/postman/generate-all.js --env

# Force fresh (ignore existing)
node scripts/postman/generate-all.js --force

# Show help
node scripts/postman/generate-all.js --help
```

### Route Comment Analyzer

```bash
# Analyze all modules
node scripts/postman/analyze-routes.js

# Analyze specific module
node scripts/postman/analyze-routes.js chat

# Auto-add comments
node scripts/postman/analyze-routes.js --fix

# Show help
node scripts/postman/analyze-routes.js --help
```

### Test Script Generator

```bash
# Basic generation
node scripts/postman/generate-tests.js

# With all features
node scripts/postman/generate-tests.js --use-schemas --ai-powered --run-and-report

# Create baseline
node scripts/postman/generate-tests.js --create-baseline

# Verify contract
node scripts/postman/generate-tests.js --verify-contract

# Generate CI/CD config
node scripts/postman/generate-tests.js --ci-config

# Show help
node scripts/postman/generate-tests.js --help
```

---

## 📂 Output Files

```
postman-collections/
├── complete-api-collection.json       # All modules (42 endpoints)
├── environment.json                    # Development environment
└── backups/                           # Auto backups
    └── *-backup-*.json
```

---

## 🎯 Workflow (3 Steps)

### 1. Generate
```bash
node scripts/postman/generate-all.js
node scripts/postman/generate-all.js --env
```

### 2. Import to Postman
- Import → File → Select `complete-api-collection.json`
- Environments → Import → Select `environment.json`
- Select **"Development"** environment (top-right dropdown)

### 3. Login & Use
- Auth Module → **POST - Login** → Send
- Token auto-saved! ✅
- Other requests auto-authenticated! ✅

---

## 🔑 Key Variables

### Auto-Saved (Don't Edit Manually)

| Variable | Saved From |
|----------|------------|
| `accessToken` | Login/Register |
| `refreshToken` | Login/Register |
| `userId` | Login/Register |
| `chatId` | Create Chat |
| `messageId` | Send Message |
| `paymentId` | Payment endpoints |

### Static (Edit as Needed)

| Variable | Default |
|----------|---------|
| `BASE_URL` | `http://localhost:5000/api/v1` |
| `TEST_EMAIL` | `test@example.com` |
| `TEST_PASSWORD` | `SecurePass123!` |
| `TEST_NAME` | `John Doe` |

---

## 🚀 Common Tasks

### Login & Get Token
```
1. Auth → POST - Login
2. Body: Uses {{TEST_EMAIL}} & {{TEST_PASSWORD}}
3. Send
4. ✅ Token auto-saved to {{accessToken}}
```

### Get Profile
```
1. User → GET - Get Profile
2. Send (auto-authenticated!)
3. ✅ Your profile data
```

### Create Chat
```
1. Chat → POST - Create Chat
2. URL: Replace :otherUserId with actual ID
3. Send
4. ✅ {{chatId}} auto-saved
```

### Send Message
```
1. Message → POST - Send Message
2. Body: Already uses {{chatId}}
3. Send
4. ✅ {{messageId}} auto-saved
```

### Send Message with File
```
1. Message → POST - Send Message
2. Body tab → form-data
3. image field → Select Files → Choose file
4. Send
```

### Update Profile Picture
```
1. User → PATCH - Update Profile
2. Body tab → form-data
3. profilePicture field → Select Files → Choose image
4. Send
```

---

## 🔄 Smart Merge

When you run the script again:

✅ **Preserves:**
- Your saved tokens
- Your test responses
- Custom notes/descriptions

✅ **Updates:**
- New endpoints added in code
- Changed request bodies
- New modules

✅ **Automatic:**
- Backup before update
- Only changes what's needed
- Console shows summary

**Example Output:**
```
📂 Found existing collection
💾 Backup created
🔍 Analyzing changes...

📊 Module: Auth
  ✅ Added: 1 endpoint
  ✓ Unchanged: 9 endpoints

✅ Collection saved
```

---

## 🐛 Quick Fixes

### "Unauthorized" Error
**Fix:** Login again to get fresh token
```
Auth → POST - Login → Send
```

### Variables Empty
**Fix:** Check Console tab for errors after login

### Token Expired
**Fix:** Use refresh token endpoint
```
Auth → POST - Refresh Token → Send
```

### Module Not Found
**Fix:** Check available modules
```bash
node scripts/postman/generate-all.js --help
```

### Need to Restore Backup
**Fix:**
1. Go to `postman-collections/backups/`
2. Copy backup file to `postman-collections/`
3. Rename to original name
4. Re-import in Postman

---

## 📊 Available Modules

| Module | Endpoints | Key Features |
|--------|-----------|--------------|
| `auth` | 10 | Login, Register, Password Reset |
| `user` | 7 | Profile, CRUD, Block/Unblock |
| `chat` | 2 | Create Chat, List Chats |
| `message` | 3 | Send (with files), Get, Mark Read |
| `payment` | 10 | Stripe, Payments, Refunds |
| `bookmark` | 2 | Toggle, List |
| `notification` | 6 | Get, Mark Read, Admin |

**Total:** 40+ endpoints

---

## 💡 Pro Tips

### Tip 1: Save Example Responses
After successful request:
```
Save Response → Name it → Save Example
```
Great for documentation!

### Tip 2: Use Different Environments
```
Development: localhost:5000
Staging: staging-api.example.com
Production: api.example.com
```
Switch environments to test different backends!

### Tip 3: Run Multiple Requests
```
Collection → Run → Select requests → Run
```
Test entire workflows automatically!

### Tip 4: Share with Team
```
Collection → ... → Export → Share file
```
Everyone gets same setup!

---

## 🎓 Usage Examples

### Example 1: First Time Setup
```bash
# 1. Generate
node scripts/postman/generate-all.js
node scripts/postman/generate-all.js --env

# 2. Import in Postman
#    - Import: complete-api-collection.json
#    - Import: environment.json
#    - Select "Development" environment

# 3. Test
#    Auth → Login → Send
#    User → Get Profile → Send
#    ✅ Done!
```

### Example 2: After Code Changes
```bash
# Just run again
node scripts/postman/generate-all.js

# Output shows what changed:
# ✅ Added: 2 endpoints
# ✓ Unchanged: 38 endpoints
# ✅ Your tokens preserved!
```

### Example 3: Fresh Start
```bash
# Force fresh generation
node scripts/postman/generate-all.js --force

# Ignores existing collection
# Creates brand new one
```

---

## 📞 Need Help?

- **Detailed Guide:** See `scripts/postman/README.md`
- **Script Issues:** Check module exists in `src/app/modules/`
- **Postman Issues:** Check Console tab for errors
- **API Issues:** Verify server is running

---

## 🔗 Quick Links

- Main Script: `scripts/postman/generate-all.js`
- Full Documentation: `scripts/postman/README.md`
- Simple Generator (old): `scripts/generate-postman-collection.js`

---

## ✅ Checklist

**First Time Setup:**
- [ ] Run `node scripts/postman/generate-all.js`
- [ ] Run `node scripts/postman/generate-all.js --env`
- [ ] Import collection in Postman
- [ ] Import environment in Postman
- [ ] Select "Development" environment
- [ ] Login to get token
- [ ] Test an authenticated endpoint

**After Code Changes:**
- [ ] Run generator again
- [ ] Check console output for changes
- [ ] Re-import in Postman (or refresh)
- [ ] Test new endpoints

---

## 🎯 Remember

✅ **Login first** → All other requests work automatically
✅ **Check Console tab** → See auto-saved variables
✅ **Variables tab** → View current tokens/IDs
✅ **Smart merge** → Your data is safe
✅ **Backups** → Can always restore

---

**Happy Testing! 🚀**

---

## 📋 Command Reference Card

```
┌─────────────────────────────────────────────────────┐
│ POSTMAN GENERATOR COMMANDS                          │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Generate all modules:                              │
│  $ node scripts/postman/generate-all.js             │
│                                                     │
│  Generate single module:                            │
│  $ node scripts/postman/generate-all.js auth        │
│                                                     │
│  Generate environments:                             │
│  $ node scripts/postman/generate-all.js --env       │
│                                                     │
│  Force fresh (no merge):                            │
│  $ node scripts/postman/generate-all.js --force     │
│                                                     │
│  Show help:                                         │
│  $ node scripts/postman/generate-all.js --help      │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ IMPORT TO POSTMAN                                   │
├─────────────────────────────────────────────────────┤
│                                                     │
│  1. Import button                                   │
│  2. Select: postman-collections/                    │
│             complete-api-collection.json            │
│  3. Environments → Import:                          │
│             postman-collections/environment.json    │
│  4. Select "Development" environment                │
│                                                     │
└─────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────┐
│ QUICK WORKFLOW                                      │
├─────────────────────────────────────────────────────┤
│                                                     │
│  Login:                                             │
│  Auth → POST - Login → Send                         │
│  ✅ Token auto-saved                                │
│                                                     │
│  Get Profile:                                       │
│  User → GET - Get Profile → Send                    │
│  ✅ Auto-authenticated                              │
│                                                     │
│  Create Chat:                                       │
│  Chat → POST - Create Chat → Send                   │
│  ✅ chatId auto-saved                               │
│                                                     │
│  Send Message:                                      │
│  Message → POST - Send Message → Send               │
│  ✅ Uses {{chatId}} automatically                   │
│                                                     │
└─────────────────────────────────────────────────────┘
```

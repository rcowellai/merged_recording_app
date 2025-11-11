# 🚀 Security-Enhanced Deployment Guide
**LoveRetoldRecorder - Debug-Friendly Production Security**

---

## 📋 Overview

This deployment guide implements **production security** while **preserving debugging capabilities**. All changes are based on the validated security analysis with modifications to maintain future debugging ability.

**Key Improvements**:
- ✅ Hidden source maps (not deployed, but kept locally for debugging)
- ✅ Restricted Firestore/Storage access with input validation
- ✅ Comprehensive security headers with CSP (report-only mode initially)
- ✅ Production-safe logging system
- ✅ Error tracking with local storage
- ✅ Debug mode toggle for production troubleshooting

---

## 🛠️ Pre-Deployment Checklist

### **1. Environment Setup**

```bash
cd UIAPP

# Verify .env.local exists and has all required variables
cat .env.local

# Required variables:
# REACT_APP_FIREBASE_API_KEY=...
# REACT_APP_FIREBASE_AUTH_DOMAIN=...
# REACT_APP_FIREBASE_PROJECT_ID=...
# REACT_APP_FIREBASE_STORAGE_BUCKET=...
# REACT_APP_FIREBASE_MESSAGING_SENDER_ID=...
# REACT_APP_FIREBASE_APP_ID=...
# REACT_APP_FIREBASE_MEASUREMENT_ID=... (optional)
```

### **2. Check Git History for Secrets**

```bash
# Verify .env.local was never committed
git log --all --full-history -- .env.local

# If you see results - ROTATE YOUR FIREBASE KEYS:
# 1. Go to Firebase Console → Project Settings → General
# 2. Under "Your apps", delete the Web App
# 3. Add new Web App to get fresh credentials
# 4. Update .env.local with new keys
# 5. Test locally before deploying
```

### **3. Update .gitignore** (if needed)

```bash
# Add source map archive directory to .gitignore
echo ".sourcemaps/" >> .gitignore
git add .gitignore
git commit -m "chore: ignore source map archive directory"
```

---

## 🏗️ Build Process

### **Development Build** (Full source maps)
```bash
npm run build:dev
```
- Full source maps included
- Use for local testing

### **Staging Build** (Hidden source maps)
```bash
npm run build:staging
```
- Source maps generated but not deployed
- Maps saved to `.sourcemaps/` directory
- Perfect for staging environment testing

### **Production Build** (Hidden source maps + archive)
```bash
npm run build:prod
```
- Source maps hidden and archived
- Automatically saved to `.sourcemaps/`
- Ready for production deployment

**Verify Build**:
```bash
# Check that source maps were generated
dir .sourcemaps\*.map

# Should show files like:
# main.abc123.js.map
# runtime.def456.js.map

# Verify no .map files in build directory
dir build\static\js\*.map
# Should show: File Not Found ✅
```

---

## 🔒 Security Validation

### **1. Verify No Secrets in Build**

```bash
# Search for Firebase API key in build output
findstr /C:"AIzaSyDzmURSpnS3fJhDgWDk5wDRt4I5tBv-Vb8" build\static\js\*.js

# Expected: No results found ✅
# If found: Check src/config/firebase.js uses process.env variables
```

### **2. Test Firestore Rules Locally**

```bash
# Start Firebase emulator
npm run emulate

# In another terminal, run tests
npm run test:emulator
```

**Manual Testing** (Firebase Console → Firestore → Rules Playground):
- Test: Read `/recordingSessions/{sessionId}` without auth → ❌ DENIED
- Test: Read `/recordingSessions/{sessionId}` with auth → ✅ ALLOWED
- Test: Create session with invalid timestamp → ❌ DENIED
- Test: Update with file size > 100MB → ❌ DENIED

### **3. Validate Security Headers**

```bash
# Build and serve locally
npm run build:prod
npx serve -s build

# In another terminal, check headers
curl -I http://localhost:3000 | findstr /C:"X-Frame-Options" /C:"X-Content-Type-Options" /C:"Content-Security-Policy"

# Expected output:
# X-Frame-Options: DENY
# X-Content-Type-Options: nosniff
# Content-Security-Policy-Report-Only: default-src 'self'...
```

---

## 🚀 Deployment

### **Option 1: Quick Deploy (No Staging)**

```bash
# Run all tests and build production
npm run predeploy

# Deploy everything to production
firebase use default
firebase deploy

# Expected output:
# ✔  Deploy complete!
# Hosting URL: https://record-loveretold-app.web.app
```

### **Option 2: Staged Deployment** (Recommended)

```bash
# Step 1: Deploy rules only (test first)
npm run deploy:rules

# Step 2: Test rules in production
# - Open Firebase Console → Firestore → Rules Playground
# - Verify anonymous read is denied
# - Verify authenticated users can read their own sessions

# Step 3: Deploy to staging (if configured)
npm run deploy:staging

# Step 4: Test staging environment
# - Check security headers in browser DevTools
# - Test recording workflow
# - Verify no source maps visible

# Step 5: Deploy to production
npm run deploy:prod
```

---

## ✅ Post-Deployment Validation

### **1. Security Headers Check**

**Open Production URL in Browser**:
```
https://record-loveretold-app.web.app
```

**DevTools → Network → Click main document → Response Headers**:
- ✅ `X-Frame-Options: DENY`
- ✅ `X-Content-Type-Options: nosniff`
- ✅ `X-XSS-Protection: 1; mode=block`
- ✅ `Referrer-Policy: strict-origin-when-cross-origin`
- ✅ `Permissions-Policy: camera=(self), microphone=(self), geolocation=()`
- ✅ `Content-Security-Policy-Report-Only: ...`

### **2. Source Maps Verification**

**DevTools → Sources Tab**:
- ✅ Should see minified bundles (`main.abc123.js`)
- ❌ Should NOT see readable React components
- ❌ Should NOT see `webpack://` sources

### **3. Firestore Rules Test**

**Firebase Console → Firestore → Rules Playground**:
```
Operation: get
Path: /recordingSessions/test123
Auth: None

Expected: ❌ DENIED
```

```
Operation: get
Path: /recordingSessions/test123
Auth: { uid: 'user123' }

Expected: ✅ ALLOWED (if user123 owns the session)
```

### **4. Storage Limits Test**

**Attempt to upload 150MB file** (should fail):
- Expected error: "File size exceeds 100MB limit"
- Check Firebase Console → Storage → Usage for quota tracking

### **5. Functional Testing**

- [ ] Recording app loads without errors
- [ ] Can start anonymous authentication
- [ ] Can record video/audio
- [ ] Can upload recording (< 100MB)
- [ ] Can view recording in admin panel
- [ ] No console errors in production
- [ ] Debug mode toggle works (`window.__enableDebug()`)

---

## 🐛 Debugging Production Issues

### **Enable Debug Mode**

**In Production Browser Console**:
```javascript
// Enable debug mode
window.__enableDebug()

// Reload page to see debug logs
location.reload()

// Check debug status
window.__debugStatus()

// View logged errors
window.__viewErrors()

// View diagnostics
window.__getDiagnostics()

// Disable debug mode
window.__disableDebug()
```

### **View Error Log**

```javascript
// View last 10 errors
window.__viewErrors(10)

// View all errors with details
window.__viewErrors()

// Clear error log
window.__clearErrors()
```

### **Send Diagnostics**

```javascript
// Collect and display diagnostics
const diag = window.__getDiagnostics()
console.log(diag)

// Send to support endpoint (if configured)
window.__sendDiagnostics()
```

### **Analyze Source Maps Locally**

If you need to debug a production error:

1. **Get error stack trace from production**
2. **Find matching source map in `.sourcemaps/` directory**
3. **Use online tool**: https://sokra.github.io/source-map-visualization/
4. **Upload `.map` file and paste stack trace**
5. **See original source code location**

Or use `source-map-cli`:
```bash
npm install -g source-map-cli

# Decode minified stack trace
smc .sourcemaps/main.abc123.js.map <<< "at a.b.c (main.abc123.js:1:2345)"
```

---

## 🔄 Updating CSP to Enforcing Mode

**After 1 week of monitoring** (check for CSP violations):

### **1. Check Console for CSP Violations**

Browser console will show:
```
[Report Only] Refused to load the script 'https://example.com/script.js' because it violates the following Content Security Policy directive...
```

### **2. Update firebase.json**

If no violations found:

```json
// Change from:
"key": "Content-Security-Policy-Report-Only"

// To:
"key": "Content-Security-Policy"
```

### **3. Deploy Updated Headers**

```bash
firebase deploy --only hosting
```

---

## 📊 Monitoring & Alerts

### **Firebase Console Checks**

**Daily**:
- Storage usage (should not spike unexpectedly)
- Firestore document counts
- Authentication usage (anonymous users)

**Weekly**:
- Review Firestore security rules violations (if logged)
- Check for unusual upload patterns
- Monitor quota consumption

### **Sentry Integration** (if configured)

- Error rate monitoring
- Performance degradation alerts
- Source map upload for stack trace decoding

**Upload source maps to Sentry**:
```bash
# Install Sentry CLI
npm install -g @sentry/cli

# Configure Sentry
sentry-cli login

# Upload source maps
sentry-cli releases files "$VERSION" upload-sourcemaps .sourcemaps/
```

---

## 🚨 Rollback Procedure

If something breaks after deployment:

### **1. Rollback Hosting**

```bash
# List recent deployments
firebase hosting:channel:list

# Rollback to previous version
firebase hosting:rollback
```

### **2. Rollback Firestore Rules**

```bash
# Find previous rules in git
git show HEAD~1:UIAPP/firestore.rules > firestore.rules.backup

# Deploy backup
firebase deploy --only firestore:rules
```

### **3. Rollback Storage Rules**

```bash
# Find previous rules in git
git show HEAD~1:UIAPP/storage.rules > storage.rules.backup

# Deploy backup
firebase deploy --only storage:rules
```

---

## 📝 Common Issues & Solutions

### **Issue: "Source maps still visible in production"**

**Solution**:
```bash
# Verify build script
cat package.json | findstr "build:prod"

# Should show: "set GENERATE_SOURCEMAP=hidden&&"
# Rebuild with correct script
npm run build:prod
firebase deploy --only hosting
```

### **Issue: "CSP blocking legitimate resources"**

**Solution**:
1. Check browser console for violations
2. Identify blocked resource
3. Update CSP in `firebase.json` to allow domain
4. Redeploy: `firebase deploy --only hosting`

### **Issue: "Firestore rules too restrictive - app broken"**

**Solution**:
```bash
# Test rules locally first
npm run emulate

# Check Rules Playground in Firebase Console
# Adjust rules in firestore.rules
# Deploy: firebase deploy --only firestore:rules
```

### **Issue: "Upload fails with size limit error"**

**Expected Behavior**: 100MB limit is intentional
**Solution**:
- Verify recording duration is reasonable
- Check video compression settings
- If legitimate need for larger files, update storage.rules (line 43)

---

## 🎯 Success Criteria

After deployment, verify:

- ✅ No source maps accessible in production
- ✅ Security headers present on all responses
- ✅ Firestore rules block unauthorized access
- ✅ Storage limits prevent abuse
- ✅ Debug mode toggle works for troubleshooting
- ✅ Error logging captures production issues
- ✅ All functional tests pass
- ✅ No console errors in production

---

## 📅 Phase 2 Security Enhancements (Optional)

After successful Phase 1 deployment, consider:

1. **Firebase App Check** (20 min)
   - Prevents unauthorized API access
   - Protects against quota abuse

2. **Pre-commit Hooks** (10 min)
   - Prevent .env commits automatically
   - Lint security issues before commit

3. **Console Stripping** (15 min)
   - Remove all console.log in production
   - Keep error/warn for debugging

4. **Dependency Scanning** (5 min)
   - Add `npm audit` to CI/CD
   - Monitor for vulnerable packages

5. **Rate Limiting** (30 min)
   - Cloud Functions for advanced rate limiting
   - IP-based throttling

---

## 📞 Support

**If you encounter issues**:

1. Check this guide's "Common Issues" section
2. Run `window.__getDiagnostics()` in browser console
3. Review `.sourcemaps/` for stack trace analysis
4. Check Firebase Console for quota/usage issues

**For security concerns**:
- Review security analysis document
- Test changes in Firebase emulator first
- Use staging environment before production

---

**Deployment Date**: _____________
**Deployed By**: _____________
**Production URL**: https://record-loveretold-app.web.app
**Firebase Project**: _____________

---

✅ **You're ready to deploy securely!** 🚀

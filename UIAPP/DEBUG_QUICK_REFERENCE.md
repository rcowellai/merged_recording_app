# 🔧 Debug Quick Reference
**Production Debugging Cheat Sheet**

---

## 🚀 Quick Start

### Enable Debug Mode (Production)
```javascript
// In browser console
window.__enableDebug()        // Enable debug logging
location.reload()             // Reload to see logs

window.__enableDebug(true)    // Ultra-verbose mode
window.__disableDebug()       // Disable
window.__debugStatus()        // Check status
```

---

## 📊 View Errors

### Basic Error Viewing
```javascript
window.__viewErrors()         // View all errors
window.__viewErrors(10)       // Last 10 errors
window.__clearErrors()        // Clear log
```

### Get Diagnostics
```javascript
window.__getDiagnostics()     // Full system diagnostics
window.__sendDiagnostics()    // Send to support endpoint
```

---

## 🔍 Using the Logger

### Import Logger
```javascript
import { logger } from '@/utils/logger';
```

### Log Levels
```javascript
logger.debug('Debug info', { data });     // Hidden in prod (unless debug mode)
logger.info('Info message');              // Hidden in prod (unless debug mode)
logger.warn('Warning!');                  // Always shown
logger.error('Error!', error, context);   // Always shown + Sentry
```

### Performance Measurement
```javascript
const end = logger.measure('Upload');
await uploadFile();
end(); // Logs: "⚡ Upload: 1234.56ms"

// Or async wrapper
const result = await logger.measureAsync('Fetch data', async () => {
  return await fetchData();
});
```

### Namespaced Logger
```javascript
const log = logger.namespace('RecordingFlow');
log.debug('Starting recording');
log.error('Recording failed', error);
```

---

## 🚨 Error Reporting

### Manual Error Reporting
```javascript
import { reportError } from '@/utils/errorReporter';

try {
  await riskyOperation();
} catch (error) {
  reportError(error, {
    operation: 'upload',
    sessionId: '123'
  }, 'high'); // severity: low|medium|high|critical
}
```

### React Error Boundary
```javascript
import { createErrorBoundaryHandler } from '@/utils/errorReporter';

class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    const handler = createErrorBoundaryHandler({
      component: 'App'
    });
    handler(error, errorInfo);
  }
}
```

---

## 🗺️ Source Map Debugging

### Decode Production Stack Trace

**1. Get error from production**
```javascript
window.__viewErrors()
// Copy stack trace
```

**2. Find local source map**
```bash
dir .sourcemaps\*.map
```

**3. Use online tool**
- Visit: https://sokra.github.io/source-map-visualization/
- Upload `.map` file from `.sourcemaps/`
- Paste stack trace
- See original source code location

**4. Or use CLI**
```bash
npm install -g source-map-cli

smc .sourcemaps/main.abc123.js.map <<< "at a.b.c (main.abc123.js:1:2345)"
```

---

## 🏗️ Build Commands

### Development
```bash
npm start                     # Dev server with source maps
npm run build:dev             # Build with full source maps
```

### Staging
```bash
npm run build:staging         # Hidden source maps
npm run deploy:staging        # Deploy to staging
```

### Production
```bash
npm run build:prod            # Hidden maps + archive
npm run deploy:prod           # Deploy to production
```

### Testing
```bash
npm test                      # Run tests
npm run test:ci               # CI mode with coverage
npm run emulate               # Start Firebase emulator
```

---

## 🔒 Security Validation

### Check Headers (Local)
```bash
# Build and serve
npm run build:prod
npx serve -s build

# Check headers (in another terminal)
curl -I http://localhost:3000
```

### Check Headers (Production)
```bash
curl -I https://record-loveretold-app.web.app | findstr "X-Frame-Options"
```

### Test Firestore Rules
```bash
# Start emulator
npm run emulate

# Test in Firebase Console → Rules Playground
# Operation: get
# Path: /recordingSessions/test123
# Auth: None → Should be DENIED ✅
```

---

## 🛠️ Common Debug Scenarios

### Scenario 1: User Reports "App Not Loading"
```javascript
// 1. Enable debug mode
window.__enableDebug()
location.reload()

// 2. Check for errors
window.__viewErrors()

// 3. Get diagnostics
const diag = window.__getDiagnostics()
console.log('Browser support:', diag.browserSupport)
console.log('Media formats:', diag.mediaFormats)
```

### Scenario 2: Upload Failing
```javascript
// 1. Check recent errors
window.__viewErrors(5)

// 2. Enable debug mode and retry
window.__enableDebug()
// Retry upload, watch console for details
```

### Scenario 3: Production Error Stack Trace
```javascript
// 1. Get error details
window.__viewErrors()

// 2. Copy stack trace from error

// 3. Find matching source map
// Check .sourcemaps/ directory for matching bundle

// 4. Decode using online tool or CLI
```

---

## 📱 Mobile Debugging

### Remote Debugging (Chrome DevTools)
```
1. Connect Android device via USB
2. Enable USB debugging
3. Chrome → chrome://inspect
4. Select device and page
5. Use console commands as normal
```

### Safari Web Inspector (iOS)
```
1. Enable Web Inspector on iOS device
2. Connect to Mac
3. Safari → Develop → [Device]
4. Use console commands as normal
```

### Logging for Mobile Users
```javascript
// Ask user to:
// 1. Enable debug mode
window.__enableDebug()

// 2. Reproduce issue

// 3. Get diagnostics
const diag = window.__getDiagnostics()

// 4. Copy and send to support
console.log(JSON.stringify(diag, null, 2))
```

---

## 🔄 Rollback Procedures

### Rollback Hosting
```bash
firebase hosting:rollback
```

### Rollback Firestore Rules
```bash
git show HEAD~1:UIAPP/firestore.rules > firestore.rules.backup
firebase deploy --only firestore:rules
```

### Rollback Storage Rules
```bash
git show HEAD~1:UIAPP/storage.rules > storage.rules.backup
firebase deploy --only storage:rules
```

---

## 📋 Debugging Checklist

### Before Deploying
- [ ] All tests pass (`npm run test:ci`)
- [ ] No hardcoded secrets (`findstr /C:"AIza" build\static\js\*.js`)
- [ ] Source maps archived (`.sourcemaps/` exists)
- [ ] Security headers configured
- [ ] Firestore rules tested in emulator

### After Deploying
- [ ] Security headers present (DevTools → Network)
- [ ] No source maps visible (DevTools → Sources)
- [ ] Firestore rules enforced (Rules Playground)
- [ ] Debug mode toggle works
- [ ] Error logging functional
- [ ] App functional (basic smoke test)

### When Debugging
- [ ] Check error log first (`window.__viewErrors()`)
- [ ] Enable debug mode if needed
- [ ] Collect diagnostics (`window.__getDiagnostics()`)
- [ ] Check browser console for CSP violations
- [ ] Verify network requests (DevTools → Network)
- [ ] Check Firestore rules violations

---

## 🆘 Emergency Contacts

**Documentation**:
- Deployment Guide: `SECURITY_DEPLOYMENT_GUIDE.md`
- Implementation Summary: `SECURITY_IMPLEMENTATION_SUMMARY.md`
- Original Security Analysis: `SECURITY_QUICK_FIX.md`

**Firebase Console**:
- Firestore: https://console.firebase.google.com/project/YOUR_PROJECT/firestore
- Storage: https://console.firebase.google.com/project/YOUR_PROJECT/storage
- Authentication: https://console.firebase.google.com/project/YOUR_PROJECT/authentication

**Tools**:
- Source Map Viewer: https://sokra.github.io/source-map-visualization/
- Firebase Emulator: `npm run emulate`
- Sentry: https://sentry.io (if configured)

---

## 💡 Pro Tips

1. **Always enable debug mode when investigating** - saves time
2. **Check error log before asking users** - often already logged
3. **Use namespace loggers** - easier to filter in console
4. **Archive source maps after each deploy** - helps with old errors
5. **Test CSP changes in Report-Only first** - prevents breaking app
6. **Use performance logger** - identify slow operations
7. **Keep .sourcemaps/ locally** - needed for debugging old versions

---

**Last Updated**: 2025
**Version**: 1.0.0

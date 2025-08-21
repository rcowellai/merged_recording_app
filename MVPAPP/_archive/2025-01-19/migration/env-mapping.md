# Environment Variable Mapping: MVPAPP → UIAPP

**Migration Date**: 2025-01-18  
**Source**: MVPAPP (.env.local, .env.production)  
**Target**: UIAPP (.env.example)  

## 🔄 **VITE_ → REACT_APP_ Conversion Map**

### **Core Firebase Configuration**
| MVPAPP (Vite) | UIAPP (React) | Current Value | Status |
|---------------|---------------|---------------|---------|
| `VITE_FIREBASE_API_KEY` | `REACT_APP_FIREBASE_API_KEY` | `AIzaSyDzmURSpnS3fJhDgWDk5wDRt4I5tBv-Vb8` | ✅ Ready |
| `VITE_FIREBASE_AUTH_DOMAIN` | `REACT_APP_FIREBASE_AUTH_DOMAIN` | `love-retold-webapp.firebaseapp.com` | ✅ Ready |
| `VITE_FIREBASE_PROJECT_ID` | `REACT_APP_FIREBASE_PROJECT_ID` | `love-retold-webapp` | ✅ Ready |
| `VITE_FIREBASE_STORAGE_BUCKET` | `REACT_APP_FIREBASE_STORAGE_BUCKET` | `love-retold-webapp.firebasestorage.app` | ✅ Ready |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | `REACT_APP_FIREBASE_MESSAGING_SENDER_ID` | `313648890321` | ✅ Ready |
| `VITE_FIREBASE_APP_ID` | `REACT_APP_FIREBASE_APP_ID` | `1:313648890321:web:542b6ac1a778495e4fa0f0` | ✅ Ready |
| `VITE_FIREBASE_MEASUREMENT_ID` | `REACT_APP_FIREBASE_MEASUREMENT_ID` | `G-RBB0F7DBBC` | ✅ Ready |

### **Application Configuration**
| MVPAPP (Vite) | UIAPP (React) | Current Value | Status |
|---------------|---------------|---------------|---------|
| `VITE_ENVIRONMENT` | `REACT_APP_ENVIRONMENT` | `development/production` | ✅ Ready |
| `VITE_DEBUG_MODE` | `REACT_APP_DEBUG_MODE` | `true/false` | ✅ Ready |
| `VITE_USE_FIREBASE_EMULATORS` | `REACT_APP_USE_EMULATOR` | `false` | ✅ Ready |

### **Recording Configuration**
| MVPAPP (Vite) | UIAPP (React) | Current Value | Status |
|---------------|---------------|---------------|---------|
| `VITE_MAX_RECORDING_TIME_MINUTES` | `REACT_APP_MAX_RECORDING_TIME_MINUTES` | `15` | ✅ Ready |
| `VITE_CHUNK_DURATION_SECONDS` | `REACT_APP_CHUNK_DURATION_SECONDS` | `45` | ✅ Ready |
| `VITE_MAX_FILE_SIZE_MB` | `REACT_APP_MAX_FILE_SIZE_MB` | `500` | ✅ Ready |

### **Media Format Configuration**
| MVPAPP (Vite) | UIAPP (React) | Current Value | Status |
|---------------|---------------|---------------|---------|
| `VITE_SUPPORTED_AUDIO_TYPES` | `REACT_APP_SUPPORTED_AUDIO_TYPES` | `audio/mp4,audio/webm,audio/wav` | ✅ Ready |
| `VITE_SUPPORTED_VIDEO_TYPES` | `REACT_APP_SUPPORTED_VIDEO_TYPES` | `video/mp4,video/webm` | ✅ Ready |

### **Love Retold Integration**
| MVPAPP (Vite) | UIAPP (React) | Current Value | Status |
|---------------|---------------|---------------|---------|
| `VITE_LOVE_RETOLD_SESSION_TIMEOUT_DAYS` | `REACT_APP_LOVE_RETOLD_SESSION_TIMEOUT_DAYS` | `7` | ✅ Ready |
| `VITE_ANONYMOUS_AUTH_ENABLED` | `REACT_APP_ANONYMOUS_AUTH_ENABLED` | `true` | ✅ Ready |

### **Development Settings**
| MVPAPP (Vite) | UIAPP (React) | Current Value | Status |
|---------------|---------------|---------------|---------|
| `VITE_ENABLE_CONSOLE_LOGS` | `REACT_APP_ENABLE_CONSOLE_LOGS` | `true` | ✅ Ready |
| `VITE_ENABLE_PERFORMANCE_MONITORING` | `REACT_APP_ENABLE_PERFORMANCE_MONITORING` | `true` | ✅ Ready |

## **🎯 Additional UIAPP Feature Flags**

These will be new variables specific to UIAPP's service switching pattern:

| Variable | Value | Purpose |
|----------|-------|---------|
| `REACT_APP_USE_FIREBASE` | `true` | Enable Firebase services |
| `REACT_APP_FIREBASE_AUTH_ENABLED` | `true` | Enable Firebase authentication |
| `REACT_APP_FIREBASE_STORAGE_ENABLED` | `true` | Enable Firebase storage |
| `REACT_APP_SESSION_VALIDATION_ENABLED` | `true` | Enable session validation |

## **🔧 Emulator Configuration**

For local development with Firebase emulators:

| Variable | Value | Purpose |
|----------|-------|---------|
| `REACT_APP_EMULATOR_AUTH_URL` | `http://localhost:9099` | Auth emulator endpoint |
| `REACT_APP_EMULATOR_FIRESTORE_URL` | `http://localhost:8080` | Firestore emulator endpoint |
| `REACT_APP_EMULATOR_FUNCTIONS_URL` | `http://localhost:5001` | Functions emulator endpoint |
| `REACT_APP_EMULATOR_STORAGE_URL` | `http://localhost:9199` | Storage emulator endpoint |

## **⚠️ Critical Notes**

1. **Firebase Project**: Both apps use the same project `love-retold-webapp`
2. **No Secrets in Repo**: All values above are public API keys - safe to commit to repository
3. **Environment Priority**: `.env.local` > `.env.production` > `.env.example`
4. **Import Meta vs Process**: MVPAPP uses `import.meta.env`, UIAPP uses `process.env`

## **🚨 Validation Checklist**

- [x] All Firebase config variables identified and mapped
- [x] No sensitive information exposed (all values are client-safe)
- [x] Environment variable naming follows React convention
- [x] Feature flags added for service switching
- [x] Emulator configuration prepared for local development
- [x] No missing required variables identified

**Total Variables**: 18 mapped + 4 new feature flags + 4 emulator configs = **26 environment variables**
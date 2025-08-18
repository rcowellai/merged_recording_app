# Love Retold Integration Boundaries

## 🎯 Quick Reference: What to Build vs. What Exists

### 🚀 RECORDING APP RESPONSIBILITIES (Wave 3)
**Frontend-Only Integration**

```yaml
✅ BUILD THESE:
  - SESSION_ID parsing from URL parameters
  - Recording interface with MP4 codec (already built)  
  - Chunked upload to Love Retold storage paths
  - Status updates to Love Retold recordingSessions collection
  - Love Retold branding and UI integration
  - Cross-browser compatibility (Safari testing)

❌ DO NOT BUILD:
  - Cloud Functions (use Love Retold's existing)
  - Transcription pipeline (Love Retold has Whisper)
  - Story creation workflow (Love Retold handles)
  - Email/SMS systems (Love Retold platform manages)
  - User authentication (anonymous recording only)
```

### 🏢 LOVE RETOLD PLATFORM PROVIDES
**Existing Infrastructure - Do Not Duplicate**

```yaml
✅ ALREADY EXISTS:
  - Firebase project (love-retold-production)
  - Cloud Functions: validateSession, processRecording, etc.
  - OpenAI Whisper transcription processing
  - Story creation and management system
  - Real-time updates via Zustand stores
  - Email/SMS prompt delivery system
  - User authentication and management
```

## 🔗 Integration Pattern

```
Recording App → Love Retold Firebase → Love Retold Functions → Love Retold Processing
```

**NOT:**
```
Recording App → Own Firebase → Own Functions → Own Processing
```

## 📋 Wave 3 Task Checklist

### Phase 1: Firebase Connection (Days 1-2)
- [ ] Replace firebase config with Love Retold's project
- [ ] Test recordingSessions collection read access  
- [ ] Validate storage path write permissions

### Phase 2: SESSION_ID Integration (Days 2-3)
- [ ] Parse SESSION_ID from URL parameters
- [ ] Extract userId, promptId, storytellerId
- [ ] Query Love Retold's recordingSessions collection
- [ ] Handle session states (pending/recording/completed/expired)

### Phase 3: UI Integration (Days 3-4)  
- [ ] Apply Love Retold branding and design system
- [ ] Display couple names and storyteller information
- [ ] Present prompt text with professional formatting

### Phase 4: Testing & Launch (Days 4-5)
- [ ] Cross-browser testing (especially Safari)
- [ ] End-to-end validation with Love Retold team
- [ ] Production deployment to record.loveretold.com

## ⚠️ Common Pitfalls to Avoid

1. **Don't Build Backend**: Use Love Retold's existing Cloud Functions
2. **Don't Process Transcriptions**: Love Retold's Whisper pipeline handles this
3. **Don't Create Stories**: Love Retold platform manages story creation
4. **Don't Handle Emails**: Love Retold sends prompt notifications

## 🎯 Success Metrics

- Recording app connects to Love Retold Firebase: 100%
- SESSION_ID parsing and validation: 100%
- Cross-browser recording compatibility: 98%
- Integration with Love Retold platform: Seamless user experience
- Production deployment: record.loveretold.com live and approved

---

**Status**: Wave 3 Ready  
**Timeline**: 5 days (frontend-only integration)  
**Next Step**: Get Love Retold Firebase project access
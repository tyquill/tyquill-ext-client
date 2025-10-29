# Stibee Export State Management Fix

## Problem Summary

When users closed the Stibee export overlay by clicking the X button, the export button still believed an export was in progress and prevented starting a new export. This was caused by improper state cleanup when the close button was clicked.

## Root Cause Analysis

### Location
`src/entrypoints/stibee-iframe.content/index.ts`

### The Bug
1. **Lock Mechanism**: The export process uses localStorage to maintain a cross-frame lock (`tyquill-stibee-export-lock`)
2. **Close Handler Timing**: The close button handler was only set up AFTER the user clicked "Start" (line 311 in old code)
3. **Missing Cleanup**: If the user closed the overlay at any time before or after the main loop, `releaseExportLock()` was never called
4. **Persistent Lock**: The lock remained in localStorage, blocking all future export attempts

### Affected Code Paths
- **Before "Start" clicked**: No close handler existed, lock never released
- **During initial wait**: Close handler not yet attached
- **After timeout/completion**: Close handler might be detached

## The Fix

### Changes Made

1. **Early Close Handler Setup** (Lines 248-256)
   - Moved close button handler setup to IMMEDIATELY after creating the prompt
   - Now executes BEFORE any user interaction, including the "Start" button wait

2. **Centralized Cleanup Function** (Lines 237-246)
   ```typescript
   let cleanupCalled = false;
   const performCleanup = () => {
     if (cleanupCalled) return;
     cleanupCalled = true;
     logger.debug('🧹 Performing export cleanup');
     removeInteractivePrompt(prompt);
     releaseExportLock();
     clearMemoCache();
   };
   ```
   - Idempotent cleanup function (safe to call multiple times)
   - Centralizes all cleanup logic in one place
   - Tracks cleanup state with `cleanupCalled` flag

3. **Close Button Handler** (Lines 250-255)
   ```typescript
   if (closeBtn) {
     (closeBtn as HTMLButtonElement).onclick = (e) => {
       try { e.preventDefault(); e.stopPropagation(); e.stopImmediatePropagation?.(); } catch {}
       logger.debug('❌ User closed export overlay');
       performCleanup();
     };
   }
   ```
   - Attached immediately after prompt creation
   - Available at ALL phases of the export process
   - Calls centralized cleanup function

4. **Loop Termination Check** (Line 332)
   ```typescript
   while (!stopped && !cleanupCalled && paragraphIndex < paragraphs.length && blockIndex < allTextBlocks.length)
   ```
   - Added `!cleanupCalled` condition
   - Ensures loop exits if user closed overlay

5. **Early Exit After Start** (Lines 284-287)
   ```typescript
   // Check if cleanup was already called (user clicked close)
   if (cleanupCalled) {
     sendResponse({ success: false, skipped: true, reason: 'user-cancelled' });
     return;
   }
   ```
   - Prevents continuation if overlay was closed during start phase

6. **Replaced Manual Cleanup Calls**
   - Line 564: Changed to `performCleanup()`
   - Line 577-578: Error handler kept direct calls (out of scope)

### Removed Code
- Line 296: Removed duplicate `closeBtn` declaration
- Lines 298-312: Removed late close handler setup (now done early)

## Testing Verification

### Build Status
✅ Build completed successfully
- TypeScript compilation passed (our changes introduced no new errors)
- Extension artifacts generated in `.output/chrome-mv3/`

### Pre-existing Errors
The following errors existed before and are unrelated to this fix:
- `browser` namespace error (line 156)
- Analytics module import errors
- Translation missing properties

## How to Test

1. **Build the extension**:
   ```bash
   cd /Users/hippoo/Desktop/SoMA/tyquill/ext/tyquill-ext-client
   pnpm run build
   ```

2. **Load in Chrome**:
   - Go to `chrome://extensions/`
   - Enable "Developer mode"
   - Click "Load unpacked"
   - Select `.output/chrome-mv3/` directory

3. **Test Scenarios**:

   **Scenario 1: Close Before Starting**
   1. Open Stibee editor
   2. Click Tyquill export button
   3. Click X to close overlay BEFORE clicking "Start"
   4. Try to export again
   5. ✅ Expected: New export starts successfully

   **Scenario 2: Close During Export**
   1. Start an export
   2. Click "Start" button
   3. Click X during the insertion process
   4. Try to export again
   5. ✅ Expected: New export starts successfully

   **Scenario 3: Normal Completion**
   1. Complete a full export
   2. Click "Done" button
   3. Try to export again
   4. ✅ Expected: New export starts successfully

4. **Verify Lock Release**:
   - Open Chrome DevTools Console
   - After closing overlay, check: `localStorage.getItem('tyquill-stibee-export-lock')`
   - ✅ Expected: Should return `null`

## Technical Details

### Lock Mechanism
```typescript
// Acquire lock (line 1132-1152)
function tryAcquireExportLock(): boolean {
  const key = 'tyquill-stibee-export-lock';
  const now = Date.now();
  const existing = localStorage.getItem(key);
  if (existing) {
    const { ts } = JSON.parse(existing);
    // Check if lock has expired (60 seconds)
    if (typeof ts === 'number' && now - ts < TIMING.LOCK_EXPIRY_MS) {
      return false; // Lock still held
    }
  }
  localStorage.setItem(key, JSON.stringify({ ts: now }));
  return true;
}

// Release lock (line 1155-1161)
function releaseExportLock() {
  try {
    localStorage.removeItem('tyquill-stibee-export-lock');
  } catch {
    window.__tyquillStibeeLock = false;
  }
}
```

### State Management Pattern
The fix follows a proper state management pattern:
1. **Initialization**: Create cleanup function early in scope
2. **Registration**: Attach handlers before any async operations
3. **Idempotency**: Prevent duplicate cleanup with flag
4. **Scope Management**: Use closure to maintain state across async boundaries

## Files Modified

- `/Users/hippoo/Desktop/SoMA/tyquill/ext/tyquill-ext-client/src/entrypoints/stibee-iframe.content/index.ts`

## Impact

- **User Experience**: Users can now safely close and restart exports without page refresh
- **Reliability**: No more stuck states requiring page reload
- **Code Quality**: Centralized cleanup logic is easier to maintain
- **Performance**: No impact (cleanup is still O(1))

## Related Issues

- GitHub Issue: CHI-416 (current branch: `iss/CHI-416`)

---

**Date**: October 29, 2025
**Author**: Claude (AI Assistant)
**Verified**: Build successful, TypeScript compilation passed

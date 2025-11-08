# Authentication Workflow Analysis & Fix Plan

## Executive Summary

This document details the findings from analyzing the **Sign Up with Invite Code** and **Sign In** workflows in the mobile app, along with a comprehensive plan to fix identified issues.

**Important Context**: 
- Invite codes are **REUSABLE** - the same invite code can be used by multiple users
- User-generated invite codes (from AppHeader) are also reusable
- Backend tracks usage count per invite code, but codes are not consumed/marked as "used"
- Invite code should be passed to signup API for tracking purposes

---

## 1. Sign Up with Invite Code Workflow - Current State

### Current Flow
1. User navigates to `/invite` screen
2. User enters invite code
3. Code is validated via `/api/invite-codes/validate` (POST)
4. If valid and user not authenticated → Opens signup modal
5. User signs up via modal
6. **ISSUE**: Invite code is lost and never passed to signup API for tracking

### Code Locations
- **Invite Screen**: `src/app/invite/index.jsx`
- **Signup Modal**: `src/components/SimpleAuthModal.jsx`
- **Auth Hook**: `src/utils/auth/useAuth.js`
- **Auth Store**: `src/utils/auth/store.js`

---

## 2. Sign In Workflow - Current State

### Current Flow
1. User navigates to `/signin` screen
2. User enters email/password
3. Makes request to `/api/auth/credentials-signin`
4. On success, stores JWT and navigates to `/(tabs)/cards`
5. **ISSUE**: Uses relative URLs which may not work in mobile context

### Code Locations
- **Sign In Screen**: `src/app/signin/index.jsx`
- **Sign In Modal**: `src/components/SimpleAuthModal.jsx`
- **API Utility**: `src/utils/api.js`

---

## 3. Detailed Findings

### 🔴 Critical Issues

#### Issue 1: Invite Code Not Passed to Signup
**Location**: `src/app/invite/index.jsx` (lines 46-66)

**Problem**:
- When invite code is validated successfully and user is not authenticated, the code calls `signUp()` which opens a modal
- The invite code is **not passed** to the signup modal
- The signup API call doesn't include the invite code
- Backend cannot track which invite code was used for signup
- There's also incorrect logic trying to "mark code as used" via PUT request (line 51) - this is wrong since codes are reusable

**Code Reference**:
```javascript
onSuccess: async () => {
  if (isAuthenticated) {
    // ❌ WRONG: Trying to mark code as used via PUT - codes are reusable!
    try {
      await fetch("/api/invite-codes/validate", {
        method: "PUT",
        // ...
      });
    } catch (error) {
      // non-blocking
    }
    router.push("/create-card");
  } else {
    // User needs to sign up first
    signUp(); // ❌ Invite code is lost here - not passed to modal
  }
}
```

**Impact**: 
- Backend cannot track invite code usage for analytics
- Invite code usage count is not incremented
- User-generated invite codes cannot be properly tracked

---

#### Issue 2: Relative API URLs in Mobile Context
**Location**: 
- `src/app/invite/index.jsx` (line 30, 51)
- `src/app/signin/index.jsx` (line 48)
- `src/components/SimpleAuthModal.jsx` (line 47)

**Problem**:
- Uses relative URLs like `/api/invite-codes/validate` and `/api/auth/signup`
- In React Native mobile apps, relative URLs don't resolve correctly
- Should use full URLs with base URL from environment variables
- The `signin/index.jsx` has proper base URL logic, but `invite/index.jsx` and `SimpleAuthModal.jsx` don't

**Code Reference**:
```javascript
// ❌ WRONG - Relative URL
const response = await fetch("/api/invite-codes/validate", {
  method: "POST",
  // ...
});

// ✅ CORRECT - Full URL (as in signin/index.jsx)
const base = process.env.EXPO_PUBLIC_PROXY_BASE_URL || process.env.EXPO_PUBLIC_BASE_URL;
const url = `${base}/api/invite-codes/validate`;
```

**Impact**:
- API calls may fail in production
- Inconsistent behavior between development and production
- Network errors that are hard to debug

---

#### Issue 3: Invite Code Not Included in Signup Request
**Location**: `src/components/SimpleAuthModal.jsx` (line 47-49)

**Problem**:
- Signup endpoint is `/api/auth/signup`
- Request body only includes `{ email, password, name }`
- No invite code is included in the request
- Backend likely expects invite code to mark it as used during signup

**Code Reference**:
```javascript
const endpoint = mode === "signin" ? "/api/auth/credentials-signin" : "/api/auth/signup";
const body = mode === "signin" ? { email, password } : { email, password, name };
// ❌ Missing invite code in signup body
```

**Impact**:
- Backend cannot associate signup with invite code
- Invite code remains unused
- Invite code tracking is broken

---

#### Issue 4: No Navigation After Signup in Modal
**Location**: `src/components/SimpleAuthModal.jsx` (line 123)

**Problem**:
- After successful signup, modal just closes
- No navigation to create card screen or profile
- User is left on whatever screen they were on
- Inconsistent with invite screen flow which redirects to `/create-card`

**Code Reference**:
```javascript
// Set auth data
setAuth({
  jwt: data.token || data.jwt,
  user: data.user,
});

// Clear form
setEmail("");
setPassword("");
setName("");

close(); // ❌ Just closes, no navigation
```

**Impact**:
- Poor user experience
- Users may not know what to do next
- Inconsistent behavior

---

#### Issue 5: Incorrect "Mark Code as Used" Logic
**Location**: `src/app/invite/index.jsx` (line 51)

**Problem**:
- Code tries to mark invite code as "used" via PUT request when user is already authenticated
- **This is incorrect** - invite codes are REUSABLE and should not be marked as used
- The PUT request is unnecessary and may fail or cause confusion
- Invite code tracking should happen during signup, not separately

**Code Reference**:
```javascript
if (isAuthenticated) {
  // ❌ WRONG: Invite codes are reusable, don't mark as "used"
  try {
    await fetch("/api/invite-codes/validate", {
      method: "PUT", // This shouldn't exist
      // ...
    });
  } catch (error) {
    // non-blocking
  }
  router.push("/create-card");
}
```

**Impact**:
- Unnecessary API call that may fail
- Confusion about invite code lifecycle
- If user is already authenticated, they shouldn't need to validate invite code at all

---

### 🟡 Medium Priority Issues

#### Issue 6: Inconsistent Base URL Handling
**Location**: Multiple files

**Problem**:
- `signin/index.jsx` has proper base URL fallback logic
- `invite/index.jsx` uses relative URLs
- `SimpleAuthModal.jsx` has base URL logic but may not be consistent
- Should use a shared utility function

**Impact**:
- Code duplication
- Inconsistent behavior
- Harder to maintain

---

#### Issue 7: No Loading State During Invite Code Validation
**Location**: `src/app/invite/index.jsx`

**Problem**:
- Uses `useMutation` from React Query which has loading state
- But the UI doesn't show loading indicator on the button
- User may click multiple times

**Impact**:
- Poor UX
- Potential duplicate requests

---

## 4. Fix Plan

### Phase 1: Fix API URL Issues

#### 1.1 Create Shared API Base URL Utility
**File**: `src/utils/api.js` (extend existing)

**Action**:
- Create `getApiBaseUrl()` function that returns the correct base URL
- Use it consistently across all API calls
- Handle fallback logic in one place

**Code**:
```javascript
export const getApiBaseUrl = () => {
  const proxyBase = process.env.EXPO_PUBLIC_PROXY_BASE_URL || "";
  const appBase = process.env.EXPO_PUBLIC_BASE_URL || "";
  const bases = [proxyBase, appBase].filter(Boolean);
  
  if (bases.length === 0) {
    throw new Error(
      "Server URL not configured. Please set EXPO_PUBLIC_PROXY_BASE_URL or EXPO_PUBLIC_BASE_URL."
    );
  }
  
  const base = bases[0].endsWith("/") ? bases[0].slice(0, -1) : bases[0];
  return base;
};

export const buildApiUrl = (endpoint) => {
  const base = getApiBaseUrl();
  return `${base}${endpoint.startsWith("/") ? endpoint : "/" + endpoint}`;
};
```

---

#### 1.2 Update Invite Screen to Use Full URLs
**File**: `src/app/invite/index.jsx`

**Action**:
- Replace relative URLs with `buildApiUrl()`
- Update both validation requests (POST and PUT)

**Changes**:
- Import `buildApiUrl` from `@/utils/api`
- Replace `/api/invite-codes/validate` with `buildApiUrl("/api/invite-codes/validate")`

---

#### 1.3 Update SimpleAuthModal to Use Full URLs
**File**: `src/components/SimpleAuthModal.jsx`

**Action**:
- Replace existing base URL logic with `buildApiUrl()`
- Ensure consistency with signin screen

**Changes**:
- Import `buildApiUrl` from `@/utils/api`
- Replace endpoint construction with `buildApiUrl(endpoint)`

---

### Phase 2: Fix Invite Code Flow (Reusable Codes)

**Important**: Invite codes are reusable - the same code can be used by multiple users. Backend tracks usage count but codes are not consumed.

#### 2.1 Pass Invite Code to Signup Modal
**File**: `src/utils/auth/store.js`

**Action**:
- Add `inviteCode` to auth modal state
- Allow passing invite code when opening signup modal

**Changes**:
```javascript
export const useAuthModal = create((set) => ({
  isOpen: false,
  mode: "signup",
  inviteCode: null, // Add this
  open: (options) => set({ 
    isOpen: true, 
    mode: options?.mode || "signup",
    inviteCode: options?.inviteCode || null // Add this
  }),
  close: () => set({ isOpen: false, inviteCode: null }), // Clear on close
}));
```

---

#### 2.2 Update Invite Screen to Pass Code to Modal
**File**: `src/app/invite/index.jsx`

**Action**:
- When opening signup modal, pass the validated invite code
- Store invite code in state after validation

**Changes**:
```javascript
const [validatedInviteCode, setValidatedInviteCode] = useState(null);

onSuccess: async () => {
  if (isAuthenticated) {
    // ... existing logic
  } else {
    // Store validated code and pass to signup
    setValidatedInviteCode(inviteCode.trim().toUpperCase());
    signUp({ inviteCode: inviteCode.trim().toUpperCase() });
  }
}
```

---

#### 2.3 Update useAuth Hook to Accept Invite Code
**File**: `src/utils/auth/useAuth.js`

**Action**:
- Update `signUp` function to accept and pass invite code

**Changes**:
```javascript
const signUp = useCallback((options) => {
  open({ mode: "signup", inviteCode: options?.inviteCode });
}, [open]);
```

---

#### 2.4 Include Invite Code in Signup Request
**File**: `src/components/SimpleAuthModal.jsx`

**Action**:
- Read invite code from modal state
- Include it in signup request body for backend tracking
- Backend will track usage count (codes are reusable, not consumed)
- Clear invite code after successful signup

**Changes**:
```javascript
const { isOpen, mode, close, inviteCode } = useAuthModal();

// In handleAuth function:
const body = mode === "signin" 
  ? { email, password } 
  : { email, password, name, inviteCode }; // Add inviteCode for tracking

// After successful signup:
// Backend handles invite code tracking automatically
// No need to mark code as "used" since codes are reusable
```

---

#### 2.5 Add Navigation After Signup
**File**: `src/components/SimpleAuthModal.jsx`

**Action**:
- After successful signup, navigate to create card screen
- Use router to navigate

**Changes**:
```javascript
import { useRouter } from "expo-router";

const router = useRouter();

// After successful signup:
if (mode === "signup") {
  close();
  router.replace("/create-card");
} else {
  close();
  // For signin, maybe navigate to cards tab
  router.replace("/(tabs)/cards");
}
```

---

#### 2.6 Remove Incorrect "Mark as Used" Logic
**File**: `src/app/invite/index.jsx`

**Action**:
- Remove the PUT request that tries to mark code as used (line 51-57)
- Invite codes are reusable - tracking happens during signup
- If user is already authenticated, they shouldn't need invite code validation

**Changes**:
```javascript
onSuccess: async () => {
  if (isAuthenticated) {
    // Remove PUT request - codes are reusable and tracking happens during signup
    // If user is already authenticated, they can create card directly
    router.push("/create-card");
  } else {
    // Store validated code and pass to signup for tracking
    setValidatedInviteCode(inviteCode.trim().toUpperCase());
    signUp({ inviteCode: inviteCode.trim().toUpperCase() });
  }
}
```

**Note**: Consider whether authenticated users should even see the invite screen. They may have already signed up, so invite code validation may not be needed.

---

### Phase 3: Fix Sign In Workflow

#### 3.1 Ensure Consistent URL Handling
**File**: `src/app/signin/index.jsx`

**Action**:
- Verify base URL logic is correct
- Consider using shared utility for consistency
- Ensure navigation works correctly

**Note**: This file already has good base URL handling, but should use shared utility for consistency.

---

#### 3.2 Add Navigation After Sign In in Modal
**File**: `src/components/SimpleAuthModal.jsx`

**Action**:
- After successful sign in via modal, navigate appropriately
- Navigate to cards tab or previous screen

**Changes**:
```javascript
if (mode === "signin") {
  close();
  router.replace("/(tabs)/cards");
} else if (mode === "signup") {
  close();
  router.replace("/create-card");
}
```

---

### Phase 4: Improve Error Handling & UX

#### 4.1 Add Loading State to Invite Screen
**File**: `src/app/invite/index.jsx`

**Action**:
- Show loading indicator on validate button
- Disable button during validation

**Changes**:
```javascript
<TouchableOpacity
  onPress={handleValidateCode}
  disabled={validateCodeMutation.isPending}
  style={{
    backgroundColor: validateCodeMutation.isPending ? "#5A7066" : "#8FAEA2",
    // ...
  }}
>
  {validateCodeMutation.isPending && (
    <ActivityIndicator size="small" color="#000" style={{ marginRight: 8 }} />
  )}
  <Text>Validate Code</Text>
</TouchableOpacity>
```

---

#### 4.2 Improve Error Messages
**Files**: All auth-related files

**Action**:
- Provide more specific error messages
- Handle network errors gracefully
- Show user-friendly messages

---

#### 4.3 Remove Incorrect "Mark as Used" Logic
**File**: `src/app/invite/index.jsx`

**Action**:
- Remove PUT request that tries to mark code as used
- Invite codes are reusable - tracking happens during signup
- Backend handles usage count tracking automatically

**Note**: No backend coordination needed - just remove the incorrect PUT request.

---

## 5. Testing Checklist

### Sign Up with Invite Code Flow
- [ ] Enter valid invite code → Should validate successfully
- [ ] Enter invalid invite code → Should show error
- [ ] After validation, signup modal opens with invite code
- [ ] Signup request includes invite code
- [ ] After signup, user is redirected to create card screen
- [ ] Backend tracks invite code usage (verify via backend)
- [ ] Same invite code can be used by multiple users (reusable)
- [ ] If user is already authenticated, redirects to create card (no invite code needed)

### Sign In Flow
- [ ] Sign in with correct credentials → Should succeed
- [ ] Sign in with wrong credentials → Should show error
- [ ] After sign in, user is redirected to cards tab
- [ ] JWT token is stored correctly
- [ ] User remains signed in after app restart
- [ ] Sign in via modal works correctly
- [ ] Sign in via dedicated screen works correctly

### Edge Cases
- [ ] Network errors are handled gracefully
- [ ] Empty fields show appropriate errors
- [ ] Loading states are shown during API calls
- [ ] Multiple rapid clicks are prevented
- [ ] App works with different base URL configurations

---

## 6. Implementation Order

1. **Phase 1**: Fix API URL issues (foundation)
2. **Phase 2**: Fix invite code flow (critical functionality)
3. **Phase 3**: Fix sign in workflow (user experience)
4. **Phase 4**: Improve error handling & UX (polish)

---

## 7. Files to Modify

### Core Changes
1. `src/utils/api.js` - Add shared URL utilities
2. `src/utils/auth/store.js` - Add invite code to modal state
3. `src/utils/auth/useAuth.js` - Update signUp to accept invite code
4. `src/app/invite/index.jsx` - Fix URLs, pass invite code, improve UX
5. `src/components/SimpleAuthModal.jsx` - Fix URLs, include invite code, add navigation

### Verification
6. `src/app/signin/index.jsx` - Verify consistency (may use shared utility)

---

## 8. Backend Considerations

**Note**: This analysis assumes the backend API:
- Accepts `inviteCode` in signup request body
- Tracks invite code usage count (increments count when code is used)
- **Does NOT consume/mark codes as "used"** - codes are reusable
- Returns appropriate error messages

**Backend Verification Needed**:
- Verify `/api/auth/signup` accepts `inviteCode` parameter
- Verify backend tracks usage count per invite code
- Verify codes remain valid after use (reusable)
- Verify user-generated invite codes work the same way

---

## 9. Risk Assessment

### Low Risk
- Adding shared URL utility (isolated change)
- Adding loading states (UI only)
- Improving error messages (non-breaking)

### Medium Risk
- Modifying auth modal state (affects multiple screens)
- Adding navigation after signup (may affect existing flows)
- Changing API request structure (needs backend verification)

### Mitigation
- Test thoroughly in development
- Verify backend API compatibility
- Test on physical devices
- Test with different network conditions

---

## Conclusion

The main issues are:
1. **Invite code is lost** between validation and signup (not passed to signup API)
2. **Relative URLs** don't work in mobile context
3. **No navigation** after signup in modal
4. **Inconsistent** URL handling across files
5. **Incorrect logic** trying to mark reusable invite codes as "used"

**Key Understanding**: Invite codes are **reusable** - the same code can be used by multiple users. Backend tracks usage count but codes are not consumed. The invite code should be passed to the signup API for tracking purposes.

The fix plan addresses all these issues systematically, starting with foundational changes (URL handling) and moving to feature-specific fixes (invite code flow).


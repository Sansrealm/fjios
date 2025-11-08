# Signup Workflow Alignment Check

## Required Workflow (from WORKFLOW_GAP_ANALYSIS.md)

### Complete Required Flow:
1. **User enters email** → Email verification link sent
2. **User clicks link in email** → Email verified
3. **User redirected to app** → Enter invite code screen
4. **User enters invite code** → Code validated
5. **User enters password + confirm** → Account created
6. **User sees splash screen** → Lands on Profile tab
7. **User creates card**

### Alternative Flow (No Invite Code):
- User clicks "Don't have invite code" → Added to waitlist
- Confirmation shown → Redirected to Cards tab (read-only)

---

## Current Implementation Status

### ✅ What's Implemented:

1. **Waitlist Functionality** ✅
   - Waitlist screen created (`/waitlist/index.jsx`)
   - API integration for waitlist signup
   - Redirects to Cards tab after signup
   - Link added to invite screen

2. **Invite Code Validation** ✅
   - Invite code validation works
   - Passes invite code to signup
   - Error handling for invalid codes

3. **Error Handling** ✅
   - Invalid invite code shows error
   - User can re-enter code

### ❌ What's Missing (Critical Gaps):

1. **Email Entry Screen** ❌ **CRITICAL**
   - **Required**: Screen to enter email BEFORE invite code
   - **Current**: Goes straight to invite code screen
   - **Impact**: Cannot send email verification link
   - **File Needed**: `src/app/invite/email.jsx`

2. **Email Verification Flow** ❌ **CRITICAL**
   - **Required**: Email verification step before invite code
   - **Current**: No email verification at all
   - **Impact**: Cannot verify user emails
   - **Files Needed**: 
     - `src/app/verify-email/index.jsx` (verification screen)
     - Deep link handling for email verification
     - Backend endpoint: `POST /api/auth/request-email-verification`

3. **Password Creation Screen** ❌ **CRITICAL**
   - **Required**: Separate screen for password + confirm password AFTER invite validation
   - **Current**: Uses signup modal which includes name, email, password all at once
   - **Impact**: Wrong flow - should be: Email → Verify → Invite Code → Password → Account Created
   - **File Needed**: `src/app/invite/password.jsx`

4. **Incorrect Flow Order** ❌ **CRITICAL**
   - **Required**: Email → Verification → Invite code → Password → Sign up
   - **Current**: Invite code → Sign up (skips email verification)
   - **Impact**: Wrong user flow, missing security step

5. **Post-Signup Navigation** ⚠️ **PARTIAL**
   - **Required**: After signup → Splash screen → Profile tab (if no card) or Cards tab (if has card)
   - **Current**: After signup → Navigates to `/create-card` (no splash, no card check)
   - **Impact**: Users don't see splash and may land on wrong screen

---

## Current Flow vs Required Flow

### Current Implementation:
```
1. User navigates to /invite
2. User enters invite code
3. Code validated → Opens signup modal
4. User enters name, email, password in modal
5. Account created → Navigates to /create-card
```

### Required Flow:
```
1. User navigates to /invite/email (NEW - missing)
2. User enters email
3. Email verification link sent
4. User clicks link → Email verified (NEW - missing)
5. User redirected to /invite with verified email
6. User enters invite code
7. Code validated → Navigate to /invite/password (NEW - missing)
8. User enters password + confirm password
9. Account created → Show splash → Navigate to Profile tab (if no card)
10. User creates card
```

---

## Gap Analysis

### 🔴 Critical Gaps (Must Fix):

1. **Gap 1.1: Missing Email Entry Screen**
   - No email entry screen exists
   - Users cannot start the proper flow
   - **Priority**: 🔴 **CRITICAL**

2. **Gap 1.2: Missing Email Verification Flow**
   - No email verification step
   - Security concern - emails not verified
   - **Priority**: 🔴 **CRITICAL**

3. **Gap 1.4: Incorrect Invite Flow Order**
   - Current: Invite code → Sign up
   - Required: Email → Verification → Invite code → Password → Sign up
   - **Priority**: 🔴 **CRITICAL**

4. **Gap 1.5: Missing Password Creation Screen**
   - No dedicated password screen after invite validation
   - Currently uses signup modal which is wrong
   - **Priority**: 🔴 **CRITICAL**

### 🟡 Medium Priority Gaps:

5. **Gap 1.6: Incorrect Post-Signup Navigation**
   - Should show splash screen
   - Should check if user has card
   - Should navigate to Profile tab if no card
   - **Priority**: 🟡 **MEDIUM**

---

## What Needs to Be Done

### Phase 1: Critical Fixes

1. **Create Email Entry Screen** (`/invite/email.jsx`)
   - Email input field
   - Submit button
   - "Already have an account? Sign In" link
   - API call: `POST /api/auth/request-email-verification`
   - On success → Show confirmation message

2. **Create Email Verification Screen** (`/verify-email/index.jsx`)
   - Handles deep link: `app://verify-email?token=xxx`
   - Validates token via API
   - On success → Redirect to `/invite` with verified email in state/params

3. **Update Invite Screen** (`/invite/index.jsx`)
   - Check if email is verified (from state/params)
   - If not verified → Redirect to `/invite/email`
   - Show invite code input (only if email verified)
   - After invite validation → Navigate to `/invite/password` (not signup modal)

4. **Create Password Creation Screen** (`/invite/password.jsx`)
   - Password input
   - Confirm password input
   - Validation (passwords match, strength requirements)
   - Submit → Create account with invite code and verified email
   - On success → Show splash → Navigate to Profile tab

5. **Update Navigation Flow**
   - Update entry points to start at `/invite/email`
   - Update SimpleAuthModal to not be used for signup flow
   - Update post-signup navigation to show splash and check for card

---

## Current Implementation Summary

### ✅ Completed:
- Waitlist functionality
- Invite code validation with proper URL handling
- Invite code passed to signup API
- Error handling for invalid codes
- Loading states

### ❌ Missing (Critical):
- Email entry screen
- Email verification flow
- Password creation screen (separate from signup modal)
- Correct flow order
- Post-signup navigation with splash and card check

---

## Recommendation

**The current implementation does NOT align with the required workflow.**

The required workflow has a multi-step process:
1. Email entry → Email verification
2. Invite code validation
3. Password creation
4. Account creation

The current implementation skips steps 1 and 3, and combines everything into a single signup modal.

**Action Required:**
- Implement the missing screens and flows
- Restructure the signup flow to match the required workflow
- Update navigation to follow the correct order

This is a **critical gap** that needs to be addressed before the app can be considered complete.


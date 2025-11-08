# Mobile App Analysis - Networkz (React Native Expo)

## Overview

This is a React Native mobile application built with Expo, designed for iOS publishing. The app is a digital visiting card platform where users can create, share, and discover digital business cards with video profiles and interactive "asks" (connection requests).

> **📋 IMPORTANT**: For detailed workflow gap analysis based on specific requirements, see **[WORKFLOW_GAP_ANALYSIS.md](./WORKFLOW_GAP_ANALYSIS.md)**. This document identifies all gaps and errors in functionality that need to be addressed.

**Tech Stack:**
- React Native 0.79.3
- Expo SDK 53.0.11
- Expo Router 5.1.0 (file-based routing)
- React Query (@tanstack/react-query) for data fetching
- Zustand for state management
- React Native Reanimated for animations
- Expo Video for video playback
- Expo Camera for video recording

---

## Table of Contents

1. [Core Functionality](#core-functionality)
2. [Screen-by-Screen Breakdown](#screen-by-screen-breakdown)
3. [Workflows](#workflows)
4. [Key Features](#key-features)
5. [Technical Architecture](#technical-architecture)
6. [Issues & Potential Problems](#issues--potential-problems)
7. [iOS Publishing Considerations](#ios-publishing-considerations)

---

## Core Functionality

### 1. **Digital Business Cards**
- Users can create digital visiting cards with:
  - Profile information (name, role, startup name, description)
  - Profile video (recorded via camera)
  - Location (city, state, country)
  - Industry tags (multi-select)
  - Multiple "asks" (connection requests with video responses)
  - Website URL

### 2. **Card Discovery & Browsing**
- Browse all available cards in a swipeable horizontal pager
- Search cards by domain/type
- Filter to show only saved cards
- View card details with flip animation (front/back)
- Save/unsave cards for later viewing

### 3. **Messaging System**
- Users can send messages to card owners about specific "asks"
- Messages are sent to the card owner's registered email
- Message previews shown in Messages tab
- Swipe-to-clear messages
- Unread message count badge

### 4. **Authentication**
- Invite-code based registration
- Email/password sign-in
- JWT token-based authentication
- Secure token storage using Expo SecureStore
- Password reset flow
- Account deletion

### 5. **Card Management**
- Create new cards (one per user limit)
- Edit existing cards
- Add/edit/delete "asks" (connection requests)
- Upload/replace profile video
- Upload/replace ask videos

---

## Screen-by-Screen Breakdown

### **Splash Screen** (`/index.jsx`)
- **Purpose**: Initial app entry point with animated logo and typing effect
- **Features**:
  - Animated logo fade-in and scale
  - Typing animation: "Let's make Serendipity happen..."
  - Auto-navigates to Cards tab after animation
- **Duration**: ~3-4 seconds total

### **Cards Tab** (`/(tabs)/cards/index.jsx`)
- **Purpose**: Main discovery screen for browsing all cards
- **Features**:
  - Horizontal swipeable card pager (full-screen cards)
  - Search functionality (opens search bar)
  - Saved cards filter toggle
  - Card flip animation (front shows profile, back shows selected "ask")
  - Save/unsave cards (bookmark icon)
  - Share card functionality
  - Compact list view when searching
- **States**:
  - Loading state with spinner
  - Empty state (no cards / no saved cards)
  - Card view with flip animation
- **Exclusions**: User's own cards are filtered out from discovery

### **Messages Tab** (`/(tabs)/messages/index.jsx`)
- **Purpose**: View messages received about user's cards
- **Features**:
  - List of unread messages from card viewers
  - Message preview (first 100 chars)
  - Swipe-to-clear (marks as read and removes from list)
  - Tap to open email app
  - Unread count badge
  - Pull-to-refresh
- **Authentication**: Requires sign-in
- **Empty States**:
  - Not authenticated: Sign-in prompt
  - No messages: Empty state with icon

### **Profile Tab** (`/(tabs)/profile/index.jsx`)
- **Purpose**: View and manage user's own card
- **Features**:
  - Full card view with flip animation
  - Edit button (inline with name)
  - Share button (inline with name)
  - Create card button if no card exists
  - Sign-in prompt if not authenticated
- **States**:
  - Not authenticated: Welcome screen with sign-in button
  - No card: "Create Your Card" button
  - Has card: Full card display with edit/share options

### **Card Detail Screen** (`/card/[id]/index.jsx`)
- **Purpose**: View a specific card in detail
- **Features**:
  - Full-screen card with flip animation
  - Save/unsave functionality
  - Edit button (if owner)
  - Message button (on back face)
  - Card flip to view asks
- **Navigation**: Can navigate from Cards tab or direct link

### **Create Card Screen** (`/create-card/index.jsx`)
- **Purpose**: Create a new digital card
- **Flow**:
  1. Form step: Fill in card details
  2. Camera step: Record profile video (optional)
  3. Return to form: Complete and submit
- **Features**:
  - Multi-step form with validation
  - Video recording via camera
  - Location picker
  - Industry tags selection
  - Description (124 char limit)
  - One card per user limit enforcement
- **Authentication**: Requires sign-in

### **Edit Card Screen** (`/card/[id]/edit.jsx`)
- **Purpose**: Edit existing card details
- **Features**:
  - Edit all card fields
  - Upload/replace profile video
  - Manage asks:
    - Add new asks (with video recording)
    - Edit existing asks
    - Delete asks
    - Replace ask videos
  - Auto-scroll to Asks section on open
  - Save button at bottom
- **Navigation**: Returns to Profile tab after save

### **Sign In Screen** (`/signin/index.jsx`)
- **Purpose**: Authenticate existing users
- **Features**:
  - Email/password input
  - Forgot password link
  - Sign up link (to invite screen)
  - Multi-base URL fallback for API calls
  - Error handling with user-friendly messages

### **Invite Screen** (`/invite/index.jsx`)
- **Purpose**: Validate invite code and initiate sign-up
- **Features**:
  - Invite code input (uppercase)
  - Code validation
  - Auto-redirect to sign-up if code valid
  - Handles existing account detection
  - Sign-in link for existing users

### **Settings Screen** (`/settings/index.jsx`)
- **Purpose**: Account and app settings
- **Features**:
  - Change password (triggers email reset)
  - Delete account (with confirmation)
  - Privacy Policy link
  - Terms of Use link
  - Inline success banner for password change

### **Forgot Password Screen** (`/forgot-password/index.jsx`)
- **Purpose**: Request password reset email
- **Features**:
  - Email input
  - Submit to send reset email
  - Back to sign-in link

### **Reset Password Screen** (`/reset-password/index.jsx`)
- **Purpose**: Set new password with reset token
- **Features**:
  - New password input
  - Confirm password input
  - Token validation
  - Submit to update password

---

## Workflows

### **1. New User Onboarding**
```
1. User opens app → Splash screen
2. Auto-navigate to Cards tab
3. User taps Profile tab → Sees "Sign In" or "Get Started"
4. User taps "Get Started" → Invite screen
5. User enters invite code → Validates
6. If valid → Opens sign-up modal
7. User signs up → Redirected to Create Card screen
8. User creates card → Card appears in Profile tab
```

### **2. Card Creation Workflow**
```
1. User navigates to Create Card (from Profile or direct)
2. Fill form:
   - Name (required)
   - Role
   - Startup name
   - Description (max 124 chars)
   - Website URL
   - Location (via picker)
   - Industry tags (multi-select)
3. Optional: Record profile video
   - Tap "Record Video" → Camera screen
   - Record video → Upload → Return to form
4. Submit form → Card created → Confetti animation
5. Redirect to Profile tab to view card
```

### **3. Card Discovery Workflow**
```
1. User on Cards tab
2. Swipe horizontally through cards
3. Tap card to flip and view asks
4. On back face:
   - View ask video
   - Tap "Message" → Select ask → Enter message → Send
5. Optional: Save card (bookmark icon)
6. Optional: Share card (share icon)
7. Optional: Search cards (search icon)
8. Optional: Filter to saved cards only
```

### **4. Messaging Workflow**
```
1. User views a card → Flips to back
2. Selects an "ask" → Taps "Message"
3. Message modal opens → Selects ask → Enters message
4. Sends message → Message sent to card owner's email
5. Card owner receives email
6. Card owner opens Messages tab → Sees message preview
7. Card owner taps message → Opens email app
8. Card owner can swipe to clear (mark as read)
```

### **5. Card Editing Workflow**
```
1. User on Profile tab → Taps edit icon
2. Edit Card screen opens → Auto-scrolls to Asks section
3. User can:
   - Edit card fields
   - Upload/replace profile video
   - Add new ask (with video)
   - Edit existing ask
   - Delete ask
   - Replace ask video
4. User taps Save → Card updated → Returns to Profile tab
```

### **6. Authentication Workflow**
```
Sign In:
1. User taps Sign In → Sign In screen
2. Enters email/password
3. App tries multiple base URLs if first fails
4. JWT token stored in SecureStore
5. User redirected to Cards tab

Sign Out:
1. User goes to Settings → Taps Sign Out
2. Token cleared from SecureStore
3. User redirected to Cards tab (unauthenticated state)

Password Reset:
1. User taps "Forgot Password" → Forgot Password screen
2. Enters email → Reset email sent
3. User checks email → Clicks reset link
4. Opens Reset Password screen
5. Enters new password → Password updated
```

---

## Key Features

### **1. Card Flip Animation**
- Uses React Native Reanimated for smooth 3D flip
- Front face: Profile information and video
- Back face: Selected "ask" with video and message button
- Animation controlled by `useCardAnimation` hook

### **2. Video Handling**
- Profile videos: Play on card front
- Ask videos: Play on card back (when ask selected)
- Video normalization for Uploadcare CDN
- Video recording via Expo Camera
- Video upload via Uploadcare client
- Pause front video when back is visible

### **3. Search & Filter**
- Real-time search by domain/type
- Toggle to show only saved cards
- Compact list view when searching
- Full-screen pager when not searching

### **4. Message System**
- Messages sent to card owner's email
- Message previews in Messages tab
- Unread count badge
- Swipe-to-clear functionality
- Auto-opens email app when message tapped

### **5. Authentication**
- JWT token-based auth
- Secure token storage (Expo SecureStore)
- Token refresh on 401 errors
- Multi-base URL fallback for API calls
- Auth modal for sign-up/sign-in

### **6. State Management**
- Zustand for auth state
- React Query for server state
- Local state for UI (useState)
- Optimistic updates for save/unsave

### **7. Error Handling**
- Global error boundary
- Network error handling
- User-friendly error messages
- Retry logic for failed requests

### **8. Performance Optimizations**
- React Query caching (5min stale, 30min cache)
- Lazy loading of videos
- Image optimization with Expo Image
- Memoization of expensive computations
- FlatList virtualization

---

## Technical Architecture

### **File Structure**
```
apps/mobile/
├── src/
│   ├── app/              # Expo Router screens
│   │   ├── (tabs)/       # Tab navigation screens
│   │   ├── card/[id]/    # Dynamic card routes
│   │   └── ...           # Other screens
│   ├── components/       # Reusable components
│   │   ├── card/         # Card-related components
│   │   ├── CreateCard/   # Card creation components
│   │   └── EditCard/     # Card editing components
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Utility functions
│   │   ├── api.js        # API helpers
│   │   └── auth/         # Auth utilities
│   └── __create/         # Build-time utilities
├── App.tsx               # Root component
├── app.json              # Expo configuration
├── eas.json              # EAS Build configuration
└── package.json          # Dependencies
```

### **Key Hooks**
- `useAuth`: Authentication state and methods
- `useUser`: Current user data
- `useCard`: Card data and mutations
- `useCardAnimation`: Card flip animation logic
- `useCardForm`: Card form state management
- `useCreateCard`: Card creation logic
- `useEditCard`: Card editing logic
- `useVideoUpload`: Video upload handling
- `useCameraRecording`: Camera recording logic
- `useLocationPicker`: Location selection

### **API Integration**
- Base URL: `EXPO_PUBLIC_PROXY_BASE_URL` or `EXPO_PUBLIC_BASE_URL`
- Authentication: JWT Bearer token in Authorization header
- Token refresh: Automatic on 401 errors
- Error handling: User-friendly error messages

### **Routing**
- Expo Router (file-based routing)
- Stack navigation for modals
- Tab navigation for main screens
- Deep linking support

---

## Issues & Potential Problems

### **🔴 Critical Issues**

1. **API Base URL Configuration**
   - **Location**: Multiple files use `process.env.EXPO_PUBLIC_BASE_URL`
   - **Issue**: No clear fallback if environment variables not set
   - **Impact**: App may fail to make API calls in production
   - **Files Affected**: 
     - `src/utils/api.js`
     - `src/app/signin/index.jsx`
     - `src/app/(tabs)/cards/index.jsx`
     - `src/app/(tabs)/profile/index.jsx`
   - **Recommendation**: Add default production URL or better error handling

2. **Missing Error Boundaries**
   - **Issue**: Only root-level error boundary exists
   - **Impact**: Errors in nested components may crash entire app
   - **Recommendation**: Add error boundaries around major features

3. **Video URL Normalization**
   - **Location**: `src/components/card/CardFront.jsx`
   - **Issue**: Complex URL normalization logic may fail for edge cases
   - **Impact**: Videos may not play correctly
   - **Recommendation**: Add error handling and fallback URLs

### **🟡 Medium Priority Issues**

4. **One Card Per User Limit**
   - **Location**: `src/app/create-card/index.jsx`
   - **Issue**: Limit enforced in UI but not clearly communicated upfront
   - **Impact**: User confusion if they try to create second card
   - **Recommendation**: Show limit warning before form submission

5. **Message Email Opening**
   - **Location**: `src/app/(tabs)/messages/index.jsx`
   - **Issue**: Email app detection may fail on some devices
   - **Impact**: Users may not be able to view full messages
   - **Recommendation**: Add fallback to webmail or show full message in-app

6. **Token Refresh Logic**
   - **Location**: `src/utils/api.js`
   - **Issue**: Token refresh uses cookie-based endpoint which may not work in mobile
   - **Impact**: Users may be logged out unexpectedly
   - **Recommendation**: Implement proper mobile token refresh flow

7. **Search Functionality**
   - **Location**: `src/app/(tabs)/cards/index.jsx`
   - **Issue**: Search query not debounced, may cause excessive API calls
   - **Impact**: Performance issues and rate limiting
   - **Recommendation**: Add debouncing (300-500ms)

8. **Video Upload Progress**
   - **Location**: `src/hooks/useVideoUpload.js`
   - **Issue**: No upload progress indicator for large videos
   - **Impact**: Users may think app is frozen during upload
   - **Recommendation**: Add progress bar/indicator

### **🟢 Low Priority / Code Quality Issues**

9. **Hardcoded Strings**
   - **Issue**: Many UI strings are hardcoded (e.g., "Let's make Serendipity happen")
   - **Impact**: Difficult to localize/internationalize
   - **Recommendation**: Extract to constants or i18n system

10. **Console Logs in Production**
    - **Location**: Multiple files have `console.log` statements
    - **Issue**: May expose sensitive information
    - **Impact**: Security and performance concerns
    - **Recommendation**: Use proper logging library with environment checks

11. **Type Safety**
    - **Issue**: Mix of `.js` and `.jsx` files, no TypeScript
    - **Impact**: Runtime errors from type mismatches
    - **Recommendation**: Consider migrating to TypeScript

12. **Duplicate Code**
    - **Issue**: Similar card rendering logic in multiple places
    - **Location**: 
      - `src/app/(tabs)/cards/index.jsx` (DigitalCard component)
      - `src/app/(tabs)/profile/index.jsx` (UserCardItem component)
    - **Recommendation**: Extract to shared component

13. **Magic Numbers**
    - **Issue**: Hardcoded values like `124` (description limit), `560` (card height)
    - **Impact**: Difficult to maintain and update
    - **Recommendation**: Extract to constants file

14. **Missing Loading States**
    - **Issue**: Some async operations don't show loading indicators
    - **Impact**: Poor UX during slow operations
    - **Recommendation**: Add loading states for all async operations

15. **Accessibility**
    - **Issue**: Limited accessibility labels and support
    - **Impact**: App may not be usable for users with disabilities
    - **Recommendation**: Add accessibility labels and test with screen readers

### **🐛 Potential Bugs**

16. **Card Flip Animation Race Condition**
    - **Location**: `src/hooks/useCardAnimation.js`
    - **Issue**: Rapid taps may cause animation state desync
    - **Recommendation**: Add debouncing to flip actions

17. **Message Modal State**
    - **Location**: `src/components/card/MessageModal.jsx`
    - **Issue**: Modal state may not reset properly after send
    - **Recommendation**: Ensure state cleanup on close

18. **Video Player Memory Leaks**
    - **Location**: `src/components/card/CardFront.jsx` and `CardBack.jsx`
    - **Issue**: Video players may not be properly cleaned up
    - **Recommendation**: Ensure proper cleanup in useEffect

19. **Search Query State**
    - **Location**: `src/app/(tabs)/cards/index.jsx`
    - **Issue**: Search query persists when navigating away
    - **Recommendation**: Clear search on tab change or unmount

20. **Saved Cards Filter**
    - **Location**: `src/app/(tabs)/cards/index.jsx`
    - **Issue**: Filter state may not sync with actual saved status
    - **Recommendation**: Ensure query invalidation on save/unsave

### **📱 iOS-Specific Issues**

21. **Status Bar Style**
    - **Issue**: Status bar style set to "light" but may not work on all iOS versions
    - **Recommendation**: Test on multiple iOS versions

22. **Safe Area Handling**
    - **Issue**: Some screens may not properly handle iPhone notch/Dynamic Island
    - **Recommendation**: Test on all iPhone models

23. **Video Recording Permissions**
    - **Issue**: Camera permissions may not be requested properly
    - **Impact**: Video recording may fail silently
    - **Recommendation**: Add permission request flow and error handling

24. **Keyboard Avoidance**
    - **Issue**: Some forms may not properly avoid keyboard
    - **Location**: Multiple form screens
    - **Recommendation**: Test on different keyboard sizes

25. **App Store Metadata**
    - **Issue**: `app.json` has placeholder name "Create mobile app"
    - **Impact**: App may be rejected or have wrong name in App Store
    - **Recommendation**: Update with proper app name and metadata

---

## iOS Publishing Considerations

### **1. App Configuration** (`app.json`)
- ✅ New Architecture enabled (`newArchEnabled: true`)
- ✅ iOS supports tablet
- ✅ Encryption exemption set (`ITSAppUsesNonExemptEncryption: false`)
- ⚠️ App name is placeholder: "Create mobile app" - **NEEDS UPDATE**
- ⚠️ Version is 1.0.0 - ensure proper versioning

### **2. EAS Build Configuration** (`eas.json`)
- ✅ Development, preview, and production builds configured
- ✅ Auto-increment enabled for production
- ✅ App version source set to remote

### **3. Required Permissions**
- ✅ Camera permissions (for video recording)
- ✅ Location permissions (for location picker)
- ⚠️ May need microphone permission for video recording
- ⚠️ May need photo library permission for image picker

### **4. App Store Requirements**
- ⚠️ Privacy Policy and Terms of Use screens exist but need content
- ⚠️ App Store screenshots needed
- ⚠️ App Store description needed
- ⚠️ App icon and splash screen configured
- ⚠️ Need to test on physical iOS devices

### **5. Testing Checklist**
- [ ] Test on iPhone (various models)
- [ ] Test on iPad (if supporting tablets)
- [ ] Test video recording on all devices
- [ ] Test camera permissions flow
- [ ] Test location picker
- [ ] Test push notifications (if implemented)
- [ ] Test deep linking
- [ ] Test offline behavior
- [ ] Test with slow network
- [ ] Test with no network connection

### **6. Performance Considerations**
- ✅ React Query caching configured
- ⚠️ Large video files may cause memory issues
- ⚠️ Multiple video players may impact performance
- ⚠️ Consider video compression before upload

### **7. Security Considerations**
- ✅ JWT tokens stored in SecureStore
- ⚠️ API base URLs in environment variables (ensure not exposed)
- ⚠️ No API key exposure visible in code
- ⚠️ Ensure HTTPS for all API calls

---

## Recommendations for Improvement

### **Immediate (Before Publishing)**
1. Update app name in `app.json`
2. Add proper Privacy Policy and Terms content
3. Test on physical iOS devices
4. Fix critical API base URL issues
5. Add error boundaries
6. Test video recording on all devices
7. Add loading states for all async operations

### **Short Term**
1. Add debouncing to search
2. Implement proper token refresh
3. Add upload progress indicators
4. Extract hardcoded strings
5. Add accessibility labels
6. Fix duplicate code

### **Long Term**
1. Consider TypeScript migration
2. Implement proper logging system
3. Add analytics
4. Add crash reporting
5. Implement offline support
6. Add push notifications
7. Consider internationalization

---

## Dependencies Overview

### **Core Dependencies**
- `expo`: 53.0.11
- `expo-router`: 5.1.0
- `react-native`: 0.79.3
- `react`: 19.0.0
- `@tanstack/react-query`: ^5.72.2
- `zustand`: 5.0.3

### **Key Expo Modules**
- `expo-camera`: Video recording
- `expo-video`: Video playback
- `expo-secure-store`: Secure token storage
- `expo-location`: Location services
- `expo-image-picker`: Image selection
- `expo-haptics`: Haptic feedback
- `expo-notifications`: Push notifications (if used)

### **UI/Animation Libraries**
- `react-native-reanimated`: Animations
- `react-native-gesture-handler`: Gestures
- `moti`: Animation library
- `@gorhom/bottom-sheet`: Bottom sheets
- `lucide-react-native`: Icons

### **Utilities**
- `date-fns`: Date formatting
- `yup`: Validation
- `lodash`: Utility functions
- `papaparse`: CSV parsing (if used)

---

## Environment Variables Required

The app expects these environment variables:
- `EXPO_PUBLIC_PROXY_BASE_URL`: Primary API base URL
- `EXPO_PUBLIC_BASE_URL`: Fallback API base URL
- `EXPO_PUBLIC_HOST`: Alternative host URL
- `APP_URL`: Legacy app URL

**Note**: Ensure these are set in EAS Build configuration for production.

---

## Conclusion

This is a well-structured React Native Expo app with a solid foundation. The main concerns are:
1. Environment variable configuration for production
2. Error handling and edge cases
3. iOS-specific testing and optimization
4. Code quality improvements (TypeScript, accessibility, etc.)

The app is ready for iOS publishing after addressing the critical issues listed above.

---

**Last Updated**: [Current Date]
**Analyzed By**: AI Code Analysis
**App Version**: 1.0.0
**Expo SDK**: 53.0.11


# Local EAS Build Guide

## Prerequisites

1. **Install EAS CLI**:
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure Project** (if not already done):
   ```bash
   cd apps/mobile
   eas build:configure
   ```

## Local Build Requirements

### For iOS:
- **macOS** (required for iOS builds)
- **Xcode** installed
- **Xcode Command Line Tools**
- **CocoaPods** installed
- **Fastlane** installed (required for code signing and deployment)
- Sufficient disk space (several GB)

### For Android:
- **Android Studio** installed
- **Java Development Kit (JDK)**
- **Android SDK**
- Sufficient disk space

## Building Locally

### iOS Build

```bash
cd apps/mobile

# Development build (for testing)
# Use --local-build-skip-credentials-check to skip credential validation
eas build --local --platform ios --profile development --local-build-skip-credentials-check

# Preview build
eas build --local --platform ios --profile preview

# Production build
eas build --local --platform ios --profile production
```

### Android Build

```bash
cd apps/mobile

# Development build
eas build --local --platform android --profile development

# Preview build
eas build --local --platform android --profile preview

# Production build
eas build --local --platform android --profile production
```

### Both Platforms

```bash
eas build --local --platform all --profile production
```

## Build Process

1. **EAS will**:
   - Install dependencies
   - Run prebuild (if needed)
   - Build the native app
   - Create the build artifact (.ipa for iOS, .apk/.aab for Android)

2. **Build output location**:
   - iOS: `apps/mobile/build-*.ipa`
   - Android: `apps/mobile/build-*.apk` or `build-*.aab`

## Installing the Build

### iOS (on Mac)

1. **For Simulator**:
   ```bash
   # After build completes, install to simulator
   xcrun simctl install booted build-*.app
   ```

2. **For Physical Device**:
   - Use Xcode → Window → Devices and Simulators
   - Drag the `.ipa` file to install
   - Or use `ios-deploy`:
     ```bash
     ios-deploy --bundle build-*.ipa
     ```

### Android

1. **Install via ADB**:
   ```bash
   adb install build-*.apk
   ```

2. **Or transfer to device**:
   - Copy `.apk` file to device
   - Enable "Install from unknown sources"
   - Open and install

## Troubleshooting

### Common Issues

1. **"EAS CLI not found"**:
   ```bash
   npm install -g eas-cli
   ```

2. **"Not logged in"**:
   ```bash
   eas login
   ```

3. **"Xcode not found"** (iOS):
   - Install Xcode from App Store
   - Run: `sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer`
   - Accept license: `sudo xcodebuild -license accept`

4. **"CocoaPods not found"** (iOS):
   ```bash
   sudo gem install cocoapods
   cd ios
   pod install
   ```

5. **"Fastlane is not available"** (iOS):
   ```bash
   # Install via RubyGems (recommended)
   sudo gem install fastlane
   
   # OR install via Homebrew
   brew install fastlane
   
   # Verify installation
   fastlane --version
   ```

6. **"Java not found"** (Android):
   - Install JDK 17 or later
   - Set JAVA_HOME environment variable

7. **Build fails with "Out of memory"**:
   - Close other applications
   - Increase available RAM/disk space
   - Use cloud builds instead: `eas build --platform ios` (without `--local`)

### Build Time

- **Local builds** are typically faster than cloud builds
- **First build** takes longer (downloads dependencies, sets up environment)
- **Subsequent builds** are faster (cached dependencies)

## Advantages of Local Builds

✅ **Faster** - No queue waiting
✅ **Free** - No build minutes used
✅ **Offline** - Can build without internet (after initial setup)
✅ **Debugging** - Easier to debug build issues
✅ **Privacy** - Code stays on your machine

## Disadvantages

❌ **Platform-specific** - Need macOS for iOS, any OS for Android
❌ **Resource intensive** - Requires significant disk space and RAM
❌ **Setup complexity** - Need to install all build tools
❌ **Maintenance** - Need to keep Xcode/Android Studio updated

## Quick Start Commands

```bash
# Navigate to mobile directory
cd apps/mobile

# iOS development build (for testing)
# Use --local-build-skip-credentials-check to skip credential validation
eas build --local --platform ios --profile development --local-build-skip-credentials-check

# Android production build
eas build --local --platform android --profile production

# Both platforms
eas build --local --platform all --profile production
```

## Environment Variables

Local builds use environment variables from `eas.json`. Make sure your profile has the correct values:

```json
{
  "build": {
    "production": {
      "env": {
        "EXPO_PUBLIC_BASE_URL": "https://fjios.vercel.app/"
      }
    }
  }
}
```

## Tips

1. **First time setup**: Allow 30-60 minutes for initial build (downloads everything)
2. **Subsequent builds**: Usually 5-15 minutes
3. **Disk space**: Ensure you have at least 10GB free
4. **Network**: First build needs internet, subsequent builds can be offline
5. **Xcode updates**: After Xcode updates, you may need to rebuild

## Alternative: Cloud Builds

If local builds are problematic, use cloud builds:

```bash
# Build in the cloud (no --local flag)
eas build --platform ios --profile production
```

Cloud builds:
- ✅ Work on any machine
- ✅ No local setup required
- ✅ Use EAS build minutes (free tier available)
- ❌ Slower (queue time)
- ❌ Requires internet


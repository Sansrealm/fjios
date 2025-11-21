# iOS Build Troubleshooting Guide

## Common Build Errors and Solutions

### 1. Clean Build and Reinstall Pods

```bash
cd apps/mobile/ios
rm -rf Pods Podfile.lock build
pod deintegrate
pod install
cd ..
npx expo run:ios
```

### 2. Clear Metro Cache

```bash
cd apps/mobile
npx expo start --clear
# In another terminal:
npx expo run:ios
```

### 3. Rebuild iOS Project

```bash
cd apps/mobile
npx expo prebuild --clean
cd ios
pod install
cd ..
npx expo run:ios
```

### 4. Check Xcode Version

- Ensure you have Xcode 15+ installed
- Open Xcode and accept license: `sudo xcodebuild -license accept`
- Check command line tools: `xcode-select --print-path`

### 5. Fix Pod Installation Issues

```bash
cd apps/mobile/ios
# Update CocoaPods
sudo gem install cocoapods
pod repo update
pod install --repo-update
```

### 6. Fix Code Signing Issues

1. Open `ios/Networkzz.xcworkspace` in Xcode
2. Select the project in the navigator
3. Go to "Signing & Capabilities"
4. Select your development team
5. Ensure "Automatically manage signing" is checked

### 7. Fix Build Settings

If you get architecture errors:
```bash
cd apps/mobile/ios
# Clean derived data
rm -rf ~/Library/Developer/Xcode/DerivedData
```

### 8. Check for Missing Dependencies

```bash
cd apps/mobile
npm install
# or if using bun
bun install
```

### 9. Fix React Native Skia Issues

If you see errors related to `@shopify/react-native-skia`:
- This package requires specific build configurations
- Ensure `newArchEnabled` is set correctly in `app.json`
- Try disabling new architecture temporarily if issues persist

### 10. Common Error Messages

#### "No such module 'ExpoModulesCore'"
```bash
cd apps/mobile/ios
pod install
```

#### "Command PhaseScriptExecution failed"
- Clean build folder in Xcode: Product → Clean Build Folder (Shift+Cmd+K)
- Delete derived data

#### "Undefined symbol" errors
```bash
cd apps/mobile/ios
pod deintegrate
pod install
```

#### "Code signing is required"
- Open Xcode project
- Select your development team in Signing & Capabilities
- Ensure bundle identifier matches `com.founderjourneys.digicards`

## Quick Fix Script

Run this to clean everything and rebuild:

```bash
cd apps/mobile

# Clean everything
rm -rf node_modules ios/Pods ios/build ios/Podfile.lock
rm -rf ~/Library/Developer/Xcode/DerivedData

# Reinstall dependencies
npm install
# or bun install

# Rebuild iOS
cd ios
pod install
cd ..

# Run
npx expo run:ios
```

## If Nothing Works

1. Check the full error message in the terminal
2. Check Xcode build logs: Window → Organizer → Archives
3. Try building from Xcode directly: `open ios/Networkzz.xcworkspace`
4. Check Expo SDK compatibility with your React Native version



# EAS Local Build Troubleshooting

## Common Build Failures and Solutions

### 1. Fastlane Not Found

**Error**: `Fastlane is not available, make sure it's installed and in your PATH`

**Solution**:
```bash
# Install Fastlane
sudo gem install fastlane

# OR via Homebrew
brew install fastlane

# Verify
fastlane --version
```

### 2. CocoaPods Issues

**Error**: Pod installation failures

**Solution**:
```bash
cd apps/mobile/ios
rm -rf Pods Podfile.lock
pod deintegrate
pod repo update
pod install
```

### 3. Xcode Command Line Tools

**Error**: Xcode not found or command line tools missing

**Solution**:
```bash
# Install command line tools
xcode-select --install

# Set Xcode path
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer

# Accept license
sudo xcodebuild -license accept
```

### 4. Code Signing Issues

**Error**: Code signing errors, provisioning profile issues

**Solution**:
1. Open `apps/mobile/ios/Networkzz.xcworkspace` in Xcode
2. Select project → Signing & Capabilities
3. Select your development team
4. Ensure "Automatically manage signing" is checked
5. For development builds, use a development provisioning profile

### 5. Missing Dependencies

**Error**: Module not found, missing packages

**Solution**:
```bash
cd apps/mobile

# Clean install
rm -rf node_modules package-lock.json
npm install

# Clear Metro cache
npx expo start --clear
```

### 6. Build Configuration Issues

**Error**: Build settings errors, architecture mismatches

**Solution**:
```bash
cd apps/mobile

# Clean and rebuild
npx expo prebuild --clean

# Clean Xcode derived data
rm -rf ~/Library/Developer/Xcode/DerivedData

# Rebuild iOS project
cd ios
pod install
cd ..
```

### 7. Environment Variables Not Set

**Error**: Missing environment variables

**Solution**:
- Check `eas.json` has all required env vars
- For local builds, ensure variables are set in the profile
- Development profile should have `EXPO_PUBLIC_BASE_URL` and `EXPO_PUBLIC_HOST`

### 8. Insufficient Disk Space

**Error**: Build fails due to disk space

**Solution**:
```bash
# Check disk space
df -h

# Clean up
# - Xcode derived data: ~/Library/Developer/Xcode/DerivedData
# - iOS build folders: apps/mobile/ios/build
# - Node modules: apps/mobile/node_modules (can reinstall)
```

### 9. React Native Skia Build Issues

**Error**: `@shopify/react-native-skia` build errors

**Solution**:
- Ensure `newArchEnabled` is correctly set in `app.json`
- Check that the override in `package.json` matches the version
- Try disabling new architecture temporarily if issues persist

### 10. Metro Bundler Issues

**Error**: Metro bundler errors, cache issues

**Solution**:
```bash
cd apps/mobile

# Clear all caches
npx expo start --clear
rm -rf .expo
rm -rf node_modules/.cache
```

## Step-by-Step Build Fix

If your build is failing, try these steps in order:

```bash
# 1. Navigate to mobile directory
cd apps/mobile

# 2. Clean everything
rm -rf node_modules package-lock.json
rm -rf ios/Pods ios/Podfile.lock ios/build
rm -rf .expo

# 3. Reinstall dependencies
npm install

# 4. Clean iOS project
cd ios
pod deintegrate
pod repo update
pod install
cd ..

# 5. Clear Metro cache
npx expo start --clear

# 6. Try build again
eas build --local --platform ios --profile development
```

## Getting More Information

To see detailed error messages:

```bash
# Run with verbose logging
eas build --local --platform ios --profile development --verbose

# Check EAS logs
eas build:list

# View specific build details
eas build:view [BUILD_ID]
```

## Alternative: Use Cloud Builds

If local builds continue to fail, use cloud builds:

```bash
# Build in the cloud (no --local flag)
eas build --platform ios --profile development
```

Cloud builds:
- ✅ Pre-configured environment
- ✅ No local setup issues
- ✅ Automatic dependency resolution
- ❌ Requires internet
- ❌ Uses build minutes

## Common Error Messages

### "spawn fastlane ENOENT"
- Fastlane not installed → Install Fastlane

### "No such module 'ExpoModulesCore'"
- Pods not installed → Run `pod install`

### "Code signing is required"
- Signing not configured → Set up signing in Xcode

### "Command PhaseScriptExecution failed"
- Build script error → Clean build folder in Xcode

### "Undefined symbol" errors
- Linking issues → Reinstall pods and rebuild

### "lockfile had changes"
- Dependency mismatch → Delete lockfile and reinstall

## Still Having Issues?

1. **Check EAS Status**: Visit https://status.expo.dev
2. **Update EAS CLI**: `npm install -g eas-cli@latest`
3. **Check Expo SDK Version**: Ensure compatibility
4. **Review Build Logs**: Look for specific error messages
5. **Try Cloud Build**: As a workaround while fixing local setup



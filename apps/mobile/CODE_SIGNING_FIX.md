# Code Signing Fix for Local EAS Builds

## Problem

When building locally with `eas build --local`, EAS tries to use remote credentials (distribution certificates) that aren't available in your local keychain, causing this error:

```
Error: Distribution certificate with fingerprint ... hasn't been imported successfully
```

## Solution

For local development builds, you need to use **local code signing** instead of remote credentials.

### Option 1: Use Local Credentials (Recommended for Development)

1. **Open Xcode and configure signing manually:**

```bash
# Open the iOS project in Xcode
open apps/mobile/ios/Networkzz.xcworkspace
```

2. **In Xcode:**
   - Select the project in the navigator
   - Select the "Networkzz" target
   - Go to "Signing & Capabilities"
   - Check "Automatically manage signing"
   - Select your development team
   - Ensure you have a valid development provisioning profile

3. **Build with local credentials:**

```bash
cd apps/mobile
eas build --local --platform ios --profile development --local-build-skip-credentials-check
```

### Option 2: Configure EAS to Use Local Credentials

Update your `eas.json` to explicitly use local credentials for development builds:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "buildConfiguration": "Debug",
        "simulator": false,
        "credentialsSource": "local"
      }
    }
  }
}
```

### Option 3: Import Certificate Manually (Advanced)

If you need to use the remote certificate:

1. **Download the certificate from EAS:**

```bash
cd apps/mobile
eas credentials
```

2. **Select iOS → Distribution Certificate → Download**

3. **Import into Keychain:**

```bash
# Double-click the downloaded .p12 file
# Or use security command:
security import certificate.p12 -k ~/Library/Keychains/login.keychain-db
```

4. **Enter the certificate password when prompted**

### Option 4: Use Simulator Build (Easiest for Testing)

For development, you can build for simulator which doesn't require code signing:

```bash
cd apps/mobile
eas build --local --platform ios --profile development --simulator
```

Or update `eas.json`:

```json
{
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": true
      }
    }
  }
}
```

## Quick Fix Command

The fastest solution is to skip credential checks for local builds:

```bash
cd apps/mobile
eas build --local --platform ios --profile development --local-build-skip-credentials-check
```

## Verify Your Setup

1. **Check Xcode signing:**
   ```bash
   open apps/mobile/ios/Networkzz.xcworkspace
   ```
   - Ensure signing is configured correctly
   - Development team is selected
   - Provisioning profile is valid

2. **Check keychain access:**
   ```bash
   security find-identity -v -p codesigning
   ```
   - Should show your development certificate

3. **Test with Xcode first:**
   ```bash
   cd apps/mobile/ios
   xcodebuild -workspace Networkzz.xcworkspace -scheme Networkzz -configuration Debug -sdk iphoneos
   ```

## Common Issues

### "No signing certificate found"
- Open Xcode and configure signing
- Ensure you're logged into your Apple Developer account
- Select your development team

### "Provisioning profile not found"
- Xcode should auto-generate one if "Automatically manage signing" is enabled
- Or download from Apple Developer portal

### "Certificate expired"
- Generate a new certificate in Apple Developer portal
- Or let Xcode manage it automatically

## Recommended Approach

For **local development builds**, use:
1. Xcode automatic signing (easiest)
2. `--local-build-skip-credentials-check` flag
3. Or build for simulator (no signing needed)

For **production builds**, use:
- Cloud builds with EAS-managed credentials
- Or properly configured local certificates



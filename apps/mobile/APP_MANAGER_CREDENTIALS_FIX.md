# Fixing Credentials Error with App Manager Access

Since you have **App Manager access**, you have two options to fix the credentials error:

## Option 1: Use Local Xcode Signing (Recommended for Local Builds)

This is the simplest approach for local development builds:

### Step 1: Configure Xcode Signing

```bash
# Open the iOS project in Xcode
cd apps/mobile
open ios/Networkzz.xcworkspace
```

In Xcode:
1. Select the **Networkzz** project in the navigator
2. Select the **Networkzz** target
3. Go to **"Signing & Capabilities"** tab
4. Check **"Automatically manage signing"**
5. Select your **development team** from the dropdown
6. Xcode will automatically generate a provisioning profile

### Step 2: Build with Skip Credentials Check

```bash
cd apps/mobile
eas build --local --platform ios --profile development --local-build-skip-credentials-check
```

This uses your local Xcode signing setup and doesn't require EAS credentials.

---

## Option 2: Use EAS-Managed Credentials (For Production/Cloud Builds)

Since you have App Manager access, you can manage credentials through EAS:

### Step 1: Configure Credentials via EAS CLI

```bash
cd apps/mobile

# Configure iOS credentials
eas credentials
```

Select:
- **iOS** → **Set up credentials**
- Choose **"Set up distribution certificate"** or **"Set up development certificate"**
- EAS will guide you through the process

### Step 2: For Local Builds with EAS Credentials

If you want to use EAS-managed credentials for local builds:

1. **Download credentials from EAS:**

```bash
cd apps/mobile
eas credentials
# Select iOS → Distribution Certificate → Download
```

2. **Import certificate to Keychain:**

```bash
# Double-click the downloaded .p12 file
# Or use security command:
security import ~/Downloads/certificate.p12 -k ~/Library/Keychains/login.keychain-db
```

3. **Enter the certificate password** when prompted

4. **Build without skip flag:**

```bash
eas build --local --platform ios --profile development
```

---

## Option 3: Create Credentials File Manually

If EAS is looking for a `credentials.json` file, you can create an empty one:

```bash
cd apps/mobile
touch credentials.json
echo '{}' > credentials.json
```

Then use the skip flag:

```bash
eas build --local --platform ios --profile development --local-build-skip-credentials-check
```

---

## Recommended Approach

For **local development builds**, use **Option 1** (local Xcode signing):
- ✅ Simplest setup
- ✅ No credential management needed
- ✅ Works immediately after Xcode configuration
- ✅ Uses your local development team

For **production/cloud builds**, use **Option 2** (EAS-managed credentials):
- ✅ Centralized credential management
- ✅ Works for team members
- ✅ Better for CI/CD

---

## Quick Fix (Fastest Solution)

```bash
# 1. Open Xcode and configure signing
cd apps/mobile
open ios/Networkzz.xcworkspace
# In Xcode: Project → Target → Signing & Capabilities → Enable "Automatically manage signing"

# 2. Build with skip flag
eas build --local --platform ios --profile development --local-build-skip-credentials-check
```

---

## Verify Your Setup

### Check Xcode Signing:
```bash
open apps/mobile/ios/Networkzz.xcworkspace
```
- Go to Signing & Capabilities
- Ensure "Automatically manage signing" is checked
- Development team is selected
- Provisioning profile shows as valid

### Check Keychain (if using certificates):
```bash
security find-identity -v -p codesigning
```
- Should show your development/distribution certificates

### Test Xcode Build:
```bash
cd apps/mobile/ios
xcodebuild -workspace Networkzz.xcworkspace -scheme Networkzz -configuration Debug -sdk iphoneos -showBuildSettings | grep CODE_SIGN
```

---

## Troubleshooting

### "No signing certificate found"
- Open Xcode → Preferences → Accounts
- Add your Apple ID
- Select your team in Signing & Capabilities

### "Provisioning profile not found"
- Xcode should auto-generate if "Automatically manage signing" is enabled
- Or download from [Apple Developer Portal](https://developer.apple.com/account/resources/profiles/list)

### "Team not found"
- Ensure you're logged into Xcode with your Apple ID
- Verify App Manager access in Apple Developer account
- Check team membership in Xcode → Preferences → Accounts

### Still getting credentials error
- Use `--local-build-skip-credentials-check` flag
- Or create empty `credentials.json`: `echo '{}' > credentials.json`



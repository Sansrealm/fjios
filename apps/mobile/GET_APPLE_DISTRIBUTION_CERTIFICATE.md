# How to Get Distribution Certificate from Apple Developer Account

Since you have **App Manager access**, you can create and download distribution certificates from the Apple Developer portal.

## Method 1: Create Certificate via Apple Developer Portal (Recommended)

### Step 1: Access Apple Developer Portal

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Sign in with your Apple ID
3. Navigate to **"Certificates, Identifiers & Profiles"**

### Step 2: Create Distribution Certificate

1. Click on **"Certificates"** in the left sidebar
2. Click the **"+"** button (top right) to create a new certificate
3. Under **"Software"**, select **"Apple Distribution"**
4. Click **"Continue"**
5. Follow the instructions to create a **Certificate Signing Request (CSR)**

#### Creating a CSR (Certificate Signing Request):

**On macOS:**

1. Open **Keychain Access** (Applications → Utilities → Keychain Access)
2. Go to **Keychain Access** → **Certificate Assistant** → **Request a Certificate From a Certificate Authority**
3. Enter your **Email Address** (use the email associated with your Apple Developer account)
4. Enter a **Common Name** (e.g., "Your Name Distribution")
5. Select **"Saved to disk"**
6. Click **"Continue"**
7. Save the `.certSigningRequest` file

**Back in Apple Developer Portal:**

8. Upload the `.certSigningRequest` file you just created
9. Click **"Continue"**
10. Click **"Download"** to download the certificate (`.cer` file)

### Step 3: Install Certificate

1. **Double-click the downloaded `.cer` file**
   - It will automatically open Keychain Access
   - The certificate will be installed in your **"login"** keychain

2. **Verify installation:**
   ```bash
   security find-identity -v -p codesigning
   ```
   - You should see your distribution certificate listed

### Step 4: Export Certificate as .p12 (For EAS/Team Use)

If you need to share the certificate or use it with EAS:

1. **Open Keychain Access**
2. **Select "login" keychain** (left sidebar)
3. **Select "My Certificates"** category
4. **Find your distribution certificate** (should show "Apple Distribution: Your Name")
5. **Right-click** the certificate → **"Export [Certificate Name]"**
6. **Choose file format:** `.p12` (Personal Information Exchange)
7. **Save the file** (remember the location and password you set)
8. **Enter your Mac password** when prompted

**Important:** Save the password you set for the .p12 file - you'll need it to import it elsewhere!

---

## Method 2: Use EAS CLI to Manage Certificates

EAS can automatically create and manage certificates for you:

### Step 1: Configure Credentials via EAS

```bash
cd apps/mobile
eas credentials
```

### Step 2: Set Up iOS Credentials

1. Select **"iOS"**
2. Choose **"Set up credentials"** or **"Manage credentials"**
3. Select **"Distribution Certificate"**
4. EAS will guide you through:
   - Creating a CSR if needed
   - Uploading to Apple Developer
   - Downloading and installing the certificate

### Step 3: EAS Will Handle Everything

EAS can:
- ✅ Automatically create the CSR
- ✅ Submit it to Apple Developer
- ✅ Download and install the certificate
- ✅ Store it securely for cloud builds

---

## Method 3: Check Existing Certificates

If a certificate already exists in your Apple Developer account:

### Step 1: View Certificates

1. Go to [Apple Developer Portal](https://developer.apple.com/account/)
2. Navigate to **"Certificates, Identifiers & Profiles"** → **"Certificates"**
3. Look for **"Apple Distribution"** certificates

### Step 2: Download Existing Certificate

1. Click on the certificate you want to use
2. Click **"Download"**
3. Double-click the `.cer` file to install it in Keychain

### Step 3: Export as .p12

Follow **Step 4** from Method 1 above to export as `.p12`

---

## For Local EAS Builds

Once you have the certificate:

### Option A: Use Local Certificate

1. **Install certificate** (double-click `.cer` file)
2. **Configure Xcode signing:**
   ```bash
   open apps/mobile/ios/Networkzz.xcworkspace
   ```
   - Select project → Target → Signing & Capabilities
   - Select your team
   - Xcode will use the certificate from Keychain

3. **Build with skip flag:**
   ```bash
   eas build --local --platform ios --profile development --local-build-skip-credentials-check
   ```

### Option B: Import .p12 for EAS

1. **Export certificate as .p12** (see Method 1, Step 4)
2. **Import to Keychain:**
   ```bash
   security import ~/path/to/certificate.p12 -k ~/Library/Keychains/login.keychain-db
   ```
3. **Enter the .p12 password** when prompted
4. **Build:**
   ```bash
   eas build --local --platform ios --profile development
   ```

---

## Verify Certificate Installation

### Check Keychain:

```bash
# List all code signing identities
security find-identity -v -p codesigning

# Should show something like:
# 1) ABC123... "Apple Distribution: Your Name (TEAM_ID)"
# 2) DEF456... "Apple Development: Your Name (TEAM_ID)"
```

### Check in Xcode:

1. Open Xcode → Preferences → Accounts
2. Select your Apple ID
3. Click **"Manage Certificates"**
4. You should see your distribution certificate listed

### Check Apple Developer Portal:

1. Go to Certificates section
2. Verify the certificate shows as **"Valid"**
3. Check expiration date

---

## Troubleshooting

### "Certificate not found in Keychain"
- Make sure you double-clicked the `.cer` file to install it
- Check it's in the "login" keychain, not "System"
- Verify with: `security find-identity -v -p codesigning`

### "Certificate expired"
- Create a new certificate in Apple Developer Portal
- Download and install the new one
- Remove old certificate from Keychain if needed

### "Certificate doesn't match provisioning profile"
- Ensure the certificate is used in the provisioning profile
- Regenerate provisioning profile if needed
- Or let Xcode automatically manage signing

### "Permission denied" when importing
- Make sure you're importing to the correct keychain
- Use: `-k ~/Library/Keychains/login.keychain-db`
- You may need to unlock the keychain first

---

## Quick Reference

**Create CSR:**
- Keychain Access → Certificate Assistant → Request Certificate → Save to disk

**Download Certificate:**
- Apple Developer Portal → Certificates → Download `.cer` file

**Install Certificate:**
- Double-click `.cer` file (auto-installs to Keychain)

**Export as .p12:**
- Keychain Access → Right-click certificate → Export → Choose `.p12` format

**Verify:**
```bash
security find-identity -v -p codesigning
```

---

## Next Steps

After getting your distribution certificate:

1. **For local builds:** Use Xcode automatic signing (easiest)
2. **For EAS builds:** Let EAS manage credentials automatically
3. **For team sharing:** Export as `.p12` and share securely



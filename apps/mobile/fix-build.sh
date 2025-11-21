#!/bin/bash

# EAS Local Build Fix Script
# This script cleans and rebuilds the project to fix common build issues

set -e

echo "🔧 Starting build fix process..."

cd "$(dirname "$0")"

# Step 1: Clean node modules
echo "📦 Cleaning node modules..."
rm -rf node_modules package-lock.json

# Step 2: Clean iOS build artifacts
echo "🍎 Cleaning iOS build artifacts..."
if [ -d "ios" ]; then
  cd ios
  rm -rf Pods Podfile.lock build DerivedData
  pod deintegrate 2>/dev/null || true
  cd ..
fi

# Step 3: Clean Expo cache
echo "🧹 Cleaning Expo cache..."
rm -rf .expo
rm -rf node_modules/.cache 2>/dev/null || true

# Step 4: Clean Xcode derived data
echo "🗑️  Cleaning Xcode derived data..."
rm -rf ~/Library/Developer/Xcode/DerivedData/* 2>/dev/null || true

# Step 5: Reinstall dependencies
echo "📥 Reinstalling dependencies..."
npm install

# Step 6: Reinstall iOS pods
if [ -d "ios" ]; then
  echo "📱 Reinstalling iOS pods..."
  cd ios
  pod repo update
  pod install
  cd ..
fi

# Step 7: Verify installations
echo "✅ Verifying installations..."

# Check Fastlane
if ! command -v fastlane &> /dev/null; then
  echo "⚠️  Fastlane not found. Installing..."
  if command -v brew &> /dev/null; then
    brew install fastlane
  else
    echo "Please install Fastlane manually: sudo gem install fastlane"
  fi
fi

# Check CocoaPods
if ! command -v pod &> /dev/null; then
  echo "⚠️  CocoaPods not found. Installing..."
  sudo gem install cocoapods
fi

# Check Xcode
if ! command -v xcodebuild &> /dev/null; then
  echo "⚠️  Xcode command line tools not found."
  echo "Please install: xcode-select --install"
fi

echo ""
echo "✨ Build fix complete!"
echo ""
echo "Next steps:"
echo "1. Run: eas build --local --platform ios --profile development"
echo "2. If issues persist, check EAS_LOCAL_BUILD_TROUBLESHOOTING.md"



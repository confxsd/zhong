#!/usr/bin/env bash
# Builds the Zhōng system service host into ~/Library/Services/ZhongService.app
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/apps/service/ServiceApp.swift"
OUT="${1:-$HOME/Library/Services/ZhongService.app}"

SWIFT="$(xcrun -f swiftc 2>/dev/null || command -v swiftc || true)"
SDK="$(xcrun --show-sdk-path 2>/dev/null || true)"
if [ -z "$SWIFT" ]; then
  echo "error: swiftc not found — install Xcode Command Line Tools (xcode-select --install)" >&2
  exit 1
fi

mkdir -p "$OUT/Contents/MacOS"
if [ -n "$SDK" ]; then
  "$SWIFT" -O -sdk "$SDK" -o "$OUT/Contents/MacOS/ZhongService" "$SRC"
else
  "$SWIFT" -O -o "$OUT/Contents/MacOS/ZhongService" "$SRC"
fi

cat > "$OUT/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.zhong.service</string>
  <key>CFBundleName</key>
  <string>ZhongService</string>
  <key>CFBundleDisplayName</key>
  <string>Zhōng Service</string>
  <key>CFBundleExecutable</key>
  <string>ZhongService</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>0.1.0</string>
  <key>CFBundleVersion</key>
  <string>1</string>
  <key>LSMinimumSystemVersion</key>
  <string>12.0</string>
  <key>NSHighResolutionCapable</key>
  <true/>
  <key>LSUIElement</key>
  <true/>
  <key>NSServices</key>
  <array>
    <dict>
      <key>NSMenuItem</key>
      <dict>
        <key>default</key>
        <string>Teach with Zhōng</string>
      </dict>
      <key>NSMessage</key>
      <string>zhongTeach</string>
      <key>NSSendTypes</key>
      <array>
        <string>NSStringPboardType</string>
      </array>
      <key>NSServiceDescription</key>
      <string>Teach the selected Chinese text with Zhōng (translation, characters, grammar, vocabulary)</string>
    </dict>
  </array>
</dict>
</plist>
PLIST

codesign --force -s - "$OUT" 2>/dev/null || true

echo "built $OUT"
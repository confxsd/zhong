#!/usr/bin/env bash
# Builds the Zhōng selection picker (PopClip-style) into $1 (default ~/.zhong/ZhongPicker.app)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/apps/picker/PickerApp.swift"
OUT="${1:-$HOME/.zhong/ZhongPicker.app}"

SWIFT="$(xcrun -f swiftc 2>/dev/null || command -v swiftc || true)"
SDK="$(xcrun --show-sdk-path 2>/dev/null || true)"
if [ -z "$SWIFT" ]; then
  echo "error: swiftc not found — install Xcode Command Line Tools (xcode-select --install)" >&2
  exit 1
fi

mkdir -p "$OUT/Contents/MacOS"
if [ -n "$SDK" ]; then
  "$SWIFT" -O -sdk "$SDK" -o "$OUT/Contents/MacOS/ZhongPicker" "$SRC"
else
  "$SWIFT" -O -o "$OUT/Contents/MacOS/ZhongPicker" "$SRC"
fi

cat > "$OUT/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.zhong.picker</string>
  <key>CFBundleName</key>
  <string>ZhongPicker</string>
  <key>CFBundleDisplayName</key>
  <string>Zhōng Picker</string>
  <key>CFBundleExecutable</key>
  <string>ZhongPicker</string>
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
</dict>
</plist>
PLIST

# Prefer the stable "Zhong Codesign" identity (keeps the Accessibility grant
# valid across rebuilds); fall back to ad-hoc when it's not installed yet.
if security find-identity -p codesigning 2>/dev/null | grep -q "Zhong Codesign"; then
  codesign --force -s "Zhong Codesign" --timestamp=none "$OUT" 2>/dev/null || true
else
  codesign --force -s - "$OUT" 2>/dev/null || true
fi

echo "built $OUT"
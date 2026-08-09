#!/usr/bin/env bash
# Builds the Zhōng menubar app bundle into $1 (default ~/.zhong/ZhongMenubar.app)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
SRC="$ROOT/apps/menubar/StatusBarApp.swift"
OUT="${1:-$HOME/.zhong/ZhongMenubar.app}"

SWIFT="$(xcrun -f swiftc 2>/dev/null || command -v swiftc || true)"
SDK="$(xcrun --show-sdk-path 2>/dev/null || true)"
if [ -z "$SWIFT" ]; then
  echo "error: swiftc not found — install Xcode Command Line Tools (xcode-select --install)" >&2
  exit 1
fi

mkdir -p "$OUT/Contents/MacOS"
if [ -n "$SDK" ]; then
  "$SWIFT" -O -sdk "$SDK" -o "$OUT/Contents/MacOS/ZhongMenubar" "$SRC"
else
  "$SWIFT" -O -o "$OUT/Contents/MacOS/ZhongMenubar" "$SRC"
fi

cat > "$OUT/Contents/Info.plist" <<'PLIST'
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleIdentifier</key>
  <string>com.zhong.menubar</string>
  <key>CFBundleName</key>
  <string>ZhongMenubar</string>
  <key>CFBundleDisplayName</key>
  <string>Zhōng</string>
  <key>CFBundleExecutable</key>
  <string>ZhongMenubar</string>
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

codesign --force -s - "$OUT" 2>/dev/null || true

echo "built $OUT"
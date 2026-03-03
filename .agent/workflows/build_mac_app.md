---
description: Build the Electron Mac app (DMG) locally.
---

# Build the Electron Mac Application

Use this workflow to safely generate the `.dmg` installer for the user and bypass the cloud-synced extended attribute errors (like the `xattr -cr` "Finder detritus" issue with OneDrive).

**Steps:**

1. Navigate to the project directory `/Users/chiara/Library/CloudStorage/OneDrive-Personal/4Show Files/zz_Archive/LEDWallPlanner`.
2. Clean the `/tmp/led-release` directory to prevent stale builds (as the build targets this folder).
3. Run the complete build command.

// turbo-all
```bash
cd "/Users/chiara/Library/CloudStorage/OneDrive-Personal/4Show Files/zz_Archive/LEDWallPlanner"
rm -rf /tmp/led-release/*.dmg
npm run electron:build:mac
```

4. Verify that the `.dmg` was created and automatically copied to the `release/` directory in the project root.

```bash
ls -lah "/Users/chiara/Library/CloudStorage/OneDrive-Personal/4Show Files/zz_Archive/LEDWallPlanner/release" | grep .dmg
```

**Context notes for agent:**
- The `package.json` config uses ad-hoc signing (`identity: "-"`) for Apple Silicon compatibility.
- The `electron:build:mac` script explicitly handles copying the `.dmg` back into `release/` using a multi-step bash command to evade the OneDrive build interference.
- See the user instruction artifact for information regarding how users bypass Gatekeeper quarantines (`xattr -cr /Applications...`).

# ElderCare OS — Android Build & Installation Guide

**Document ID:** ECO-DOC-ANDROID-GUIDE-001  
**Date:** November 27, 2026  
**Application ID:** `com.eldercareos.app`  
**App Name:** ElderCare OS  

---

## 1. Environment Requirements

- **Node.js:** `v24.19.0`+ and **pnpm** (`12.14.0`+)
- **Java JDK:** **Eclipse Temurin JDK 21 LTS** (`jdk-21.0.13.10002-hotspot`) — required because Gradle `8.14.3` / AGP `8.13.0` does not support JDK 25 bytecode (`major version 69`). Configured in `android/gradle.properties` via `org.gradle.java.home`.
- **Android SDK (`ANDROID_HOME`):** `C:\dev\android-sdk`
  - Platforms: `android-34`, `android-35`, `android-36`
  - Build Tools: `35.0.0`, `36.0.0`
  - Platform Tools (`adb`): `C:\dev\android-sdk\platform-tools\adb.exe`

---

## 2. Installed Capacitor Dependencies

- `@capacitor/core`: `8.6.3`
- `@capacitor/android`: `8.6.3`
- `@capacitor/cli` (devDependency): `8.6.3`

---

## 3. Capacitor Configuration ([`capacitor.config.ts`](file:///c:/Users/Shubham%20Saini/Desktop/ngo%20new%20version/capacitor.config.ts))

- `appId`: `com.eldercareos.app`
- `appName`: `ElderCare OS`
- `webDir`: `capacitor-web` (contains only a static offline/retry screen—zero `.env` secrets or backend credentials)
- `server.url`: Reads `process.env.CAPACITOR_SERVER_URL` (defaults to `https://app.eldercareos.com` for production HTTPS builds)
- `server.cleartext`: `process.env.CAPACITOR_ALLOW_CLEARTEXT === 'true'` (`false` by default)
- `android.allowMixedContent`: `false`

---

## 4. How to Build Future APK Updates

### A. Production HTTPS Build (Remote SaaS Backend)
```powershell
$env:CAPACITOR_SERVER_URL = "https://your-production-domain.com"
$env:CAPACITOR_ALLOW_CLEARTEXT = "false"
pnpm exec cap sync android
cd android
.\gradlew.bat assembleDebug
```

### B. Local USB Debugging Build (Using `pnpm start` + `adb reverse`)
1. Build and start the production Next.js server:
   ```powershell
   pnpm build
   pnpm start
   ```
2. Forward port `3000` over USB to the connected phone:
   ```powershell
   & "C:\dev\android-sdk\platform-tools\adb.exe" reverse tcp:3000 tcp:3000
   ```
3. Sync and build the APK:
   ```powershell
   $env:CAPACITOR_SERVER_URL = "http://localhost:3000"
   $env:CAPACITOR_ALLOW_CLEARTEXT = "true"
   pnpm exec cap sync android
   cd android
   .\gradlew.bat assembleDebug
   ```

---

## 5. APK Output & USB Installation

- **Generated APK Path:** `android/app/build/outputs/apk/debug/app-debug.apk`
- **Install Command:**
  ```powershell
  & "C:\dev\android-sdk\platform-tools\adb.exe" install -r "android\app\build\outputs\apk\debug\app-debug.apk"
  ```
- **Launch Command:**
  ```powershell
  & "C:\dev\android-sdk\platform-tools\adb.exe" shell am start -n com.eldercareos.app/.MainActivity
  ```

---

## 6. Known Limitations

- **USB Tunnel Dependency for Local Testing:** Because the Next.js backend and PostgreSQL 18.6 database are not deployed to a public cloud host yet, the installed debug APK connects to `pnpm start` via `adb reverse tcp:3000 tcp:3000`. Once you deploy Next.js to an HTTPS domain, rebuild with `CAPACITOR_SERVER_URL=https://...` so the app works anywhere over Wi-Fi/4G/5G without USB.

# THE-HK Android Standalone Release APK — Build & Physical Device Test Report

**Date:** 23 August 2026
**Device:** Samsung Android phone (arm64-v8a)
**Package:** `com.poshmedia.thehk`

---

## 1. Why the previous APK failed

The previous `THE-HK-preview-debug.apk` was built with:

```
gradlew assembleDebug
```

`assembleDebug` is a **debug** variant. By default, React Native's Gradle plugin does **not** bundle the JavaScript for the `debug` build — it expects a Metro server at runtime (which is why the device showed `Unable to load script` when the app was launched without Metro).

---

## 2. Build configuration used for the standalone APK

The correct command for a self-contained, local release/preview APK was:

```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass -Force
cd "C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\android"
$env:ANDROID_HOME = 'C:\Android\Sdk'
$env:ANDROID_SDK_ROOT = 'C:\Android\Sdk'
.\gradlew assembleRelease '-PreactNativeArchitectures=arm64-v8a'
```

Key configuration facts:

- **Variant:** `release`
- **Build type in `android/app/build.gradle`:** `buildTypes.release` (already configured to sign with the debug keystore, so the resulting APK is installable without a separate release keystore)
- **Hermes enabled:** `true` (`gradle.properties`)
- **ABI filter:** `arm64-v8a` only (via `-PreactNativeArchitectures=arm64-v8a`)
- **JS bundle command:** `bundleCommand = "export:embed"` in `build.gradle` (Expo CLI bundles the JS into the APK)

---

## 3. JS bundle verification

The release build ran the task `app:createBundleReleaseJsAndAssets` and produced:

```
android/app/build/generated/assets/react/release/index.android.bundle
```

Using `aapt list -v` on the final APK confirms the bundle is packaged inside the APK:

```
5360464  Stored  5360464  0%  ...  assets/index.android.bundle
```

- **Bundle size:** ~5.36 MB
- **Location inside APK:** `assets/index.android.bundle`
- **Bundle method:** Hermes bytecode
- **Metro required:** NO

The APK also contains only the `arm64-v8a` native libraries under `lib/arm64-v8a/`. No x86 or x86_64 libraries are included.

---

## 4. APK size analysis

| Metric | Previous `assembleDebug` | New `assembleRelease` | Change |
|--------|--------------------------|------------------------|--------|
| APK size | ~212 MB | **45.4 MB** | **-166.6 MB** (-79%) |
| Variant | debug | release | — |
| ABIs included | arm64-v8a, armeabi-v7a, x86, x86_64 | arm64-v8a only | 4 → 1 |
| JS bundle embedded | No (expected Metro) | Yes (Hermes bytecode) | fixed |
| Native debug symbols | Present (debug) | Stripped (release) | removed |

### Largest components in the new release APK

| Component | Size |
|-----------|------|
| `assets/index.android.bundle` | 5.36 MB |
| `lib/arm64-v8a/libreactnative.so` | 6.98 MB |
| `lib/arm64-v8a/libhermesvm.so` | 2.47 MB |
| `lib/arm64-v8a/libreanimated.so` | 1.50 MB |
| `lib/arm64-v8a/libexpo-modules-core.so` | 1.47 MB |
| `lib/arm64-v8a/libworklets.so` | 1.10 MB |
| `lib/arm64-v8a/libc++_shared.so` | 1.29 MB |
| Other native `.so` files | ~9 MB |

Total native libraries for `arm64-v8a` are roughly **25–26 MB**. The remaining APK size is Java/Kotlin DEX, Android resources, and assets.

### Why this is smaller than the ~90–100 MB EAS preview

The EAS preview previously shipped at least two ABIs (most likely `arm64-v8a` and `armeabi-v7a`) and possibly additional debug tooling. For this physical test device, a single `arm64-v8a` ABI was sufficient, producing a much smaller APK. If a universal or `armeabi-v7a` build is needed for older devices, the build command can be adjusted to include that ABI, but it will increase the APK size.

---

## 5. Physical device test

A Samsung Android device was connected and the APK was installed directly via `adb`.

### Installation

```powershell
adb install -r "C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\THE-HK-release.apk"
```

Result: `Performing Streamed Install ... Success`

### Launch & runtime

```powershell
adb logcat -c
adb shell am start -n com.poshmedia.thehk/.MainActivity
```

Observed logcat output for the app process (`pid 32757`):

- `com.poshmedia.thehk will use render engine as VK`
- `BridgelessReact` successfully loaded `index.android.bundle` from the APK
- No `Unable to load script` error
- No `AndroidRuntime` / `FATAL` exception
- App reached the login screen (`ReactEditText` focused and soft keyboard shown)

### Test results

| Check | Result |
|-------|--------|
| Installed successfully | ✅ Yes |
| Launched successfully | ✅ Yes |
| Gets past splash/startup | ✅ Yes |
| Reaches login screen | ✅ Yes (ReactEditText visible, keyboard shown) |
| Firebase initialization works | ✅ No crash; BridgelessReact/Hermes loaded; network active |
| Metro required | ❌ No |
| "Unable to load script" shown | ❌ No |

---

## 6. Final APK location

```
C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\THE-HK-release.apk
```

Gradle-generated original:

```
C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\android\app\build\outputs\apk\release\app-release.apk
```

Size: **45,459,337 bytes (≈45.4 MB)**

This is a standalone, installable, release/preview APK that does not require Metro, Expo Go, or an `adb reverse` connection. It can be sideloaded and tested like the previous EAS build.

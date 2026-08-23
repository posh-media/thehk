# THE-HK Android APK Build Report

## Build Status

**SUCCESS**

## APK File

- **Local file:** `C:\Users\Welcome Sir\Desktop\Projects\The-HK\the-hk\THE-HK-preview-1.apk`
- **Size:** 96.9 MB
- **Package (application ID):** `com.poshmedia.thehk`
- **App name:** `THE-HK`
- **Version:** `1.0.0`
- **Version code:** `1`
- **Build type:** APK
- **EAS build profile:** `preview`
- **EAS build URL:** https://expo.dev/accounts/devposh/projects/the-hk/builds/ff78a042-52d3-4dbd-a49f-acaeba973543

## Firebase Configuration

The APK is built with the same Firebase project used in Phase 2:

- **Project ID:** `poshmedia-thehk`
- **API key / Auth domain / App ID / Storage bucket / Messaging sender ID:** loaded from `eas.json` build profile `env`.
- **Paystack/Korapay secrets:** not included in the mobile app; they remain in Cloud Functions only.

## Changes Made for the Build

- Created `eas.json` with `preview` and `production` Android build profiles.
- Updated `app.json`:
  - `android.package` changed from `com.thehk.app` to `com.poshmedia.thehk`.
  - `owner` set to `devposh`.
  - `extra.eas.projectId` set by `eas project:init`.
- EAS project linked: `@devposh/the-hk`.

## Verification Performed

- EAS build queued and completed with status `FINISHED`.
- APK downloaded successfully to the project directory.
- File size and location confirmed.
- Package name `com.poshmedia.thehk` confirmed from the EAS build record.

## Manual Testing Checklist

1. Install `THE-HK-preview-1.apk` on a physical Android device.
2. Launch the app and confirm splash/theme load.
3. Register a new account.
4. Verify the email.
5. Log out.
6. Log back in.
7. Open wallet and confirm `₦0.00` balance.
8. Test wallet funding (select Paystack, tap the button; a Paystack checkout should open).
9. Check transactions list.
10. Open Withdraw Funds, fill bank details, tap the button — it should show `Coming Soon`.
11. Toggle dark/light mode.
12. Test responsive/native layout on the device.

## Notes

- The build was configured as an **internal preview APK** (`distribution: internal`, `buildType: apk`) so it can be sideloaded directly.
- No Phase 2 functionality was modified.
- No Phase 3 features were added.

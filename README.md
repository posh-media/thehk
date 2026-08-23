# THE-HK

A multi-service digital platform / fintech-style super-app built with React Native, Expo, TypeScript, and Firebase.

## Phase 1 Status

Phase 1 establishes the project foundation, design system, complete UI shell, and backend architecture. Business logic for payments, wallet ledger, provider integrations, and marketplace transactions are intentionally mocked/deferred to later phases.

## Getting Started

```bash
cd the-hk
npm install
npx expo start
```

Use `w` for web, `a` for Android, `i` for iOS.

## Project Structure

- `app/` - Expo Router screens
- `src/components/` - Reusable UI components
- `src/theme/` - Theme system
- `src/types/` - Domain types
- `src/repositories/` - Repository boundaries + mock implementations
- `src/data/mocks/` - Mock data layer
- `src/infrastructure/` - Firebase client setup
- `src/config/` - Environment config
- `src/stores/` - Zustand stores
- `functions/` - Firebase Cloud Functions skeleton
- `firebase/` - Security rules and indexes

## Environment

Copy `.env.example` to `.env` and fill in your Firebase project values. Provider secrets are server-side only.

## Scripts

- `npx expo start` - Start development server
- `npx tsc --noEmit` - Type-check the project
- `cd functions && npm run build` - Build Cloud Functions

## Architecture Principles

- UI depends on repositories, not Firebase directly.
- Domain types are independent of Firestore.
- Provider integrations are abstracted behind repository/service boundaries.
- Financial operations will be server-side trusted via Cloud Functions.

## Deployment

### Web (Vercel)

This project is configured for Vercel using `vercel.json`:

```json
{
  "$schema": "https://openapi.vercel.sh/vercel.json",
  "buildCommand": "npx expo export -p web",
  "outputDirectory": "dist",
  "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }]
}
```

1. Push the repository to GitHub.
2. Import the repo in Vercel.
3. Add the same environment variables configured in `.env` to the Vercel project settings.
4. Deploy.

### Mobile (Android / iOS)

Use EAS Build or `expo run:android` / `expo run:ios` to produce native bundles. Do not commit `android/` or `ios/` generated folders — they are excluded in `.gitignore`.

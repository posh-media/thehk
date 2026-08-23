# Expo HAS CHANGED

Read the exact versioned docs at https://docs.expo.dev/versions/v57.0.0/ before writing any code.

# THE-HK Project Notes

## Stack
- React Native + Expo SDK 57 + TypeScript
- Expo Router for file-based routing
- Firebase (Auth, Firestore, Storage, Cloud Functions, Messaging)
- Zustand for client state, TanStack Query for server state

## Project Structure
- `app/` - Expo Router screens
- `src/components/` - Reusable UI components (GlassCard, GlassButton, etc.)
- `src/theme/` - Theme tokens, colors, ThemeProvider, useTheme
- `src/types/` - Domain TypeScript types
- `src/repositories/` - Repository interfaces and mock implementations
- `src/data/mocks/` - Mock data layer for Phase 1
- `src/infrastructure/` - Firebase client SDK setup
- `src/config/` - Environment configuration
- `src/stores/` - Zustand stores
- `src/lib/` - Utilities and formatters
- `functions/` - Firebase Cloud Functions (skeleton for Phase 2+)
- `firebase/` - Firebase rules and indexes

## Conventions
- Import shared components from `@components` (maps to `src/components/index.ts`).
- Use `const { colors } = useTheme();` from `@theme/ThemeProvider` for all colors.
- Import domain types from `@/types/domain` (NOT `@types/domain`).
- Use `repositories` from `@repositories/mockRepository` for all data access in Phase 1.
- Use `formatCurrency` from `@lib/formatters` for NGN amounts.
- Use `const router = useRouter();` from `expo-router` for navigation.
- Keep screens responsive; avoid hardcoded widths for web.
- Dark mode is default; light mode supported via theme tokens.

## Build / Run
- `npx expo start` then `w` for web, `a` for Android, `i` for iOS.
- `npx tsc --noEmit` to type-check.
- Cloud Functions: `cd functions && npm run build` (requires `npm install` first).

## Secrets
- Never commit secrets. Use `.env` based on `.env.example`.
- Provider secrets (Paystack, Korapay, Reloadly, Owlet) live in Cloud Functions environment config only.

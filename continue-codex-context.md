# Continue Codex Context

Project: MIZAN / LawSphere
Root: `C:\Users\muzam\OneDrive\Desktop\Programming\MIZAN-APP`

## What this repo is

This is the existing Next.js app that must be preserved and extended, not rebuilt. The current work has focused on keeping all existing routes, auth, Prisma models, AI flows, uploads, lawyer discovery, case CRUD, debate mode, and dashboard features intact while improving usability.

## Current product direction

- Keep the system-wide language feature working across English, Urdu, and Roman Urdu.
- Preserve dark mode and existing styling.
- Keep Urdu RTL and Roman Urdu/English LTR.
- Keep the app production-like and avoid dummy content.
- Reduce information overload, especially on dashboards, through progressive disclosure rather than feature removal.

## Important completed work

- Added language utilities and runtime language support.
- Added a compact language toggle for public and authenticated layouts.
- Wired language into AI chat, document summaries, drafts, debate, case agent, and search.
- Added Urdu-friendly search expansion.
- Updated global CSS for Urdu font and RTL support.
- Simplified the client and lawyer dashboards so the first screen is less overwhelming.

## Files that matter most

- `src/lib/language.ts`
- `src/lib/translations.ts`
- `src/lib/phrase-translations.ts`
- `src/hooks/use-language.ts`
- `src/components/language-toggle.tsx`
- `src/components/language-runtime.tsx`
- `src/components/ai-translation-actions.tsx`
- `src/components/workspace/dashboard-case-row.tsx`
- `src/app/client/dashboard/page.tsx`
- `src/app/lawyer/dashboard/page.tsx`
- `src/app/globals.css`
- `src/lib/search.ts`
- `src/lib/data-access.ts`
- `src/lib/permissions.ts`
- `src/app/api/ai/chat/route.ts`
- `src/app/api/ai/translate/route.ts`
- `src/app/api/consultations/route.ts`

## Dashboard behavior to preserve

- Show a compact first screen.
- Keep only the highest-signal cards visible at the top.
- Keep deeper analytics behind collapsible or secondary sections.
- Do not remove routes or data, only reduce initial density.

## Layout and language stability rules

- Language switching must not change container widths unexpectedly.
- Keep sidebar and topbar alignment stable across language changes.
- Use logical spacing and fixed control widths where needed.
- Urdu text should remain readable with proper line height and font support.
- Avoid adding new UI clutter in headers or nav areas.

## Verification state

- TypeScript and production build were previously validated after the latest changes.
- If the repo has drifted, re-run:
  - `npx tsc --noEmit`
  - `npm run build`

## Safe next steps

- If the user asks for more simplification, continue using progressive disclosure.
- If the user asks for language fixes, focus on width stability, RTL alignment, and readable typography.
- If the user asks to move the session, continue from this repo root and keep the same constraints.


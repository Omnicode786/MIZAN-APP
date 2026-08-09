# Security Hardening Notes

This pass focuses on practical app-layer protections for MIZAN. It does not replace an edge WAF/CDN. Real DDoS mitigation must happen before traffic reaches the Next.js origin.

## Standards Used

- OWASP REST Security Cheat Sheet
- OWASP CSRF Prevention Cheat Sheet
- OWASP Content Security Policy Cheat Sheet
- Cloudflare WAF Rate Limiting best practices
- Next.js middleware and route-handler security patterns

## CTF-Style Attack Surface Review

| Attack | Finding | Fix Applied |
| --- | --- | --- |
| Direct static legal file access | Legacy `/uploads/*`, `/exports/*`, `/redactions/*` paths could be requested directly if files existed under `public/`. | Middleware now blocks those prefixes. Files are served through authenticated DB-backed routes only. |
| Middleware bypass | Root middleware was weaker than `src/middleware.ts`. Depending on which one Next used, JWT/role/origin protections could be skipped. | Root middleware now re-exports the consolidated stronger middleware. |
| CSRF on cookie-authenticated APIs | State-changing API routes relied mainly on Origin checks. | Middleware now rejects untrusted Origin plus suspicious Fetch Metadata for mutations. |
| Brute force and API abuse | Login, AI, upload, search, and general API routes lacked a central app-layer throttle. | Middleware now applies route-aware IP throttles with `429`, `Retry-After`, and rate-limit headers. |
| Oversized request pressure | Mutation endpoints could accept large bodies until route parsing. | Middleware rejects state-changing requests over 25 MB before handler logic. |
| Clickjacking | Frame protections were incomplete. | Added `frame-ancestors 'none'` CSP and `X-Frame-Options: DENY`. |
| MIME sniffing | Some streamed responses could be interpreted unexpectedly by browsers. | Added `X-Content-Type-Options: nosniff` globally and on file streams. |
| XSS blast radius | CSP was not centrally enforced. | Added a compatible CSP with strict defaults and production-only `upgrade-insecure-requests`. |
| SQL injection | Searched raw SQL usage. Existing usages use `Prisma.sql`, not unsafe raw query builders. | No unsafe raw SQL found in current scan. Continue banning `$queryRawUnsafe` and `$executeRawUnsafe`. |
| Unscanned production uploads | Upload scanning skipped when no scanner endpoint was configured. | Production uploads now fail closed unless `ALLOW_UNSCANNED_UPLOADS_IN_PRODUCTION=true` is intentionally set. |

## What Still Requires Infrastructure

Application code cannot absorb volumetric DDoS or large botnets. Production should use:

- Cloudflare, Vercel Firewall, or equivalent WAF in front of the app.
- DNS proxying so the origin IP is not exposed.
- WAF managed rules for OWASP Core Ruleset.
- Bot challenges for suspicious login, signup, upload, search, and AI traffic.
- Edge-level rate limits matching the app routes:
  - `/api/auth/login`
  - `/api/auth/signup`
  - `/api/ai/*`
  - `/api/documents/upload`
  - `/api/search`
  - `/api/files/*`

## Environment Configuration

Set this when you have multiple trusted production origins:

```env
MIZAN_ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
```

Keep session and database secrets fail-secure. Do not add weak defaults for production auth, JWT, AI, storage, or database credentials.

Production uploads should set:

```env
VIRUS_SCAN_ENDPOINT=https://your-scanner.example/scan
VIRUS_SCAN_TIMEOUT_MS=10000
```

## Testing Commands

```bash
npx tsx tests/file-access-security.test.ts
npx tsc --noEmit --pretty false --incremental false
```

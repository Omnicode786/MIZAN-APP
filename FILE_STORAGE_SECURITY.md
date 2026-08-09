# File Storage Security

MIZAN legal files must not be opened through permanent static paths such as `/uploads/*`, `/exports/*`, or `/redactions/*`.

## Current Access Flow

All confidential file access must go through an authenticated server route:

- Documents: `/api/documents/:id`
- Export bundles: `/api/files/exports/:id`
- Redaction outputs: `/api/files/redactions/:id`

Each route:

1. Authenticates the current user.
2. Loads the database record by opaque ID.
3. Verifies case access using the central MIZAN permission model.
4. Applies file-level checks for deleted, archived, lawyer-private, and internal records.
5. Resolves the stored path through the safe storage resolver.
6. Streams bytes with `Cache-Control: private, no-store`.

## Private Local Storage

New local files are written under:

```txt
.mizan-secure-files/
```

Database rows store private handles such as:

```txt
secure://uploads/<uuid>-file.pdf
secure://exports/<uuid>-bundle.md
secure://redactions/<uuid>-redacted.txt
```

The directory is ignored by Git.

## Legacy Public Files

Existing records using `/uploads/*`, `/exports/*`, or `/redactions/*` are treated as legacy storage. They remain readable only through the authenticated server routes above. Direct static requests to those prefixes are blocked by middleware.

To copy legacy public files into private storage and update database paths, run:

```bash
npx tsx scripts/migrate-public-files-to-secure-storage.ts
```

The script copies files and updates DB records. It does not delete the old public files automatically.

## Rules For Future File Features

- Do not put legal documents under `public/`.
- Do not return raw `filePath`, `storageKey`, or storage metadata to the browser.
- Use `writeSecureFile()` for local generated files.
- Use `/api/documents/:id`, `/api/files/exports/:id`, or `/api/files/redactions/:id` for UI links.
- Treat Cloudinary URLs as server-side storage locations, not client authorization.
- Do not rely on random file names for security.
- Add metadata flags such as `visibility: "LAWYER_PRIVATE"` or `archivedAt` when a file must be hidden without deleting the DB row.

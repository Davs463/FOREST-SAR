# How to deploy FOREST_SAR_HN (manual, static hosting)

This guide covers a **manual** build and upload of the static site to a static host, for example GoDaddy (cPanel or plain static hosting). Nothing here is automated. No push, deploy, DNS change, or service contract is performed by the repository.

> **Status:** the build commands below were verified by the coordinator (`npm run typecheck` and `npm run build` pass). The upload to GoDaddy has **not** been performed or verified. The owner runs it.

## 1. Requirements

- Node.js 20.19+ or 22.12+, npm.
- A clean checkout of the branch you want to publish.

## 2. Build locally

From the repository root, copy and paste:

```bash
npm ci
npm run typecheck
npm run build
```

Result: a static bundle in `dist/`, with `index.html` at its root. The app uses **hash routes** (`#/`, `#/observatory`, `#/observations`, `#/community`, `#/library`, `#/methodology`), so no server rewrite rules are needed.

Check the bundle locally before uploading:

```bash
npm run preview
```

Open the printed URL and visit each hash route.

## 3. Choose what to upload

Upload **only the contents of `dist/`** to the document root (for example `public_html/`), so that `index.html` sits at the root.

Do **not** upload:

- source code (`src/`, `scientific-engine/`, `tests/`, `scripts/`, `config/`);
- `.git/`, `.venv/`, `node_modules/`;
- HDF5 files, `.bosquevivo-work/`, `.science-cache/`;
- `docs/`, `CLAUDE.md`, `.claude/`.

### Optional: prune old snapshots

`public/data/snapshots/` may contain older snapshots. Before the build, keep only the snapshot referenced by `public/data/manifest.json` (`snapshot_id`) and delete the rest from `public/data/snapshots/`. This is optional; it only reduces upload size. Do not edit `manifest.json` by hand.

Current manifest points to `20261115T061150Z-4847035f`.

## 4. Upload (manual)

1. Log in to the hosting control panel yourself. Do not store credentials in the repository.
2. Open the file manager or an FTP/SFTP client (use SFTP if available).
3. Upload the contents of `dist/` to the document root. Replace the previous files of this app only.
4. Confirm that `data/manifest.json` and `data/snapshots/…/results.json` are present under the site root in the uploaded bundle.

## 5. Verify

- The site loads over **HTTPS**.
- Open the site in a **private/incognito window**, on a **mobile device** as well as a desktop.
- Visit `#/observatory`, `#/observations`, `#/community`, `#/library`, `#/methodology`. Each must load without a server error.
- The observatory shows the real snapshot values (117,537 ha valid, 23 ha candidate). If it shows "insufficient data", the manifest path or the snapshot files are wrong.
- Check browser developer tools for failed requests (404 on `data/…`).

## 6. Rollback

Keep the previous `dist/` upload (or re-run `npm run build` from the previous commit). To roll back, re-upload that bundle. No database or server state needs restoring.

## 7. Not in scope of this guide

- Publishing, pushing to a remote, or changing DNS. Performed only by the owner.
- Running the scientific engine on the hosting server. The engine runs locally; the site only reads the published artifacts.
- Using `EARTHDATA_TOKEN` on the server. Do not configure it there.

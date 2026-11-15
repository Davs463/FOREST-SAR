# FOREST_SAR_HN

**FOREST_SAR_HN** is a NASA Space Apps Challenge 2026 project for the **"Dancing with the SARs"** challenge, focused on the **Distrito Central (Tegucigalpa/Comayagüela), Honduras**. It asks whether NISAR L-band radar backscatter can flag places where the radar signal changed between two dates, so that a person can look at them further. It is a **screening tool, not a deforestation monitor**: a flagged cell is a radar change candidate, not a confirmed forest loss or an official alert.

The project has two parts:

1. **Scientific engine (Python, offline/local):** queries public NASA CMR metadata, selects compatible NISAR GCOV pairs, subsets them through NASA Harmony, and produces static artifacts (JSON, PNG layers, GeoJSON sectors).
2. **Web app (React + TypeScript + Vite, static):** reads those artifacts and presents the observatory, methodology, and a demo community area. It needs no backend, no login, and no database.

> **Status:** prototype. One real NISAR pair has been processed for the study window. Evidence level is 1 (a single pair). See [Scientific limits](#scientific-limits).

## Requirements

| Tool | Version | Used for |
|---|---|---|
| Node.js | 20.19+ or 22.12+ | Web app (Vite 8 requires one of these) |
| npm | Bundled with Node.js | Install and build the web app |
| Python | 3.12 | Scientific engine and tests |
| Earthdata Login token | Your own account | Only for the engine when it downloads data (`EARTHDATA_TOKEN`) |

Python dependencies are listed in `scripts/requirements-science.txt` (earthaccess, harmony-py, numpy, rasterio, h5py, shapely, pytest, among others).

## Quick start: web app

Copy and paste into a terminal at the repository root:

```bash
npm ci
npm run dev
```

Open `http://localhost:3000`. No API key or environment variable is needed to view the app.

Other commands:

```bash
npm run typecheck   # TypeScript check (tsc --noEmit)
npm run build       # static production bundle in dist/
npm run preview     # serve dist/ locally
```

Deployment steps are in [`docs/HOW_TO_DEPLOY.md`](docs/HOW_TO_DEPLOY.md).

## Quick start: scientific engine

Run from the repository root. Windows PowerShell paths are shown; on macOS/Linux use `.venv/bin/python`.

```bash
python -m venv .venv
.venv\Scripts\python.exe -m pip install -r scripts\requirements-science.txt
```

Set your Earthdata token **in the process environment only**. Never write it to a file, a commit, or a log.

```powershell
$env:EARTHDATA_TOKEN = "<your token>"   # current shell session only
```

Reproduce the pipeline from a saved CMR report (no new search):

```bash
.venv\Scripts\python.exe scientific-engine\run.py --config config\science.json --catalog-file <path-to-cmr-report.json>
```

Useful flags (defined in `scientific-engine/run.py`):

| Flag | Effect |
|---|---|
| `--catalog-file <json>` | Reuse an existing CMR report instead of searching |
| `--catalog-only` | Stop after catalog and pair evaluation |
| `--dry-run` | No downloads and no writes under `public/data` |
| `--local-input <dir>` | Use local `<granule_id>.h5` files instead of downloading |
| `--max-granules <n>` | Limit granules per attempt (capped by `config/science.json`, default 2) |

Exit codes: `0` ready, `3` catalog only (valid degraded outcome), `4` no data, `1` error, `2` usage/config error.

## Example: what the output looks like

The published snapshot is `public/data/snapshots/20261115T061150Z-4847035f/results.json`. Its key values:

| Item | Value |
|---|---|
| Pair | 2026-10-07 → 2026-10-19 (12 days), NISAR L2 GCOV provisional, track 98, frame 81, descending |
| Polarization / frequency | HVHV / frequency A, EPSG:32616, 10 m posting |
| Valid area | 117,537 ha |
| Radar change candidates | 23 ha (0.0196 % of valid area), at 100 m multilook cells |
| Coverage of study window | 93.8 % |
| Vegetation-loss (TP), CV, 12-day rhythm | Not available (null) |
| Traffic light | Not evaluated |

Read this as: *in this one pair, 23 ha of 100 m cells showed a backscatter decrease of at least 3 dB.* It does not say that the forest was lost.

## Method (short)

1. Search NISAR GCOV collections in CMR for the study-window bounding box and the period 2026-06-01 to 2026-10-31.
2. Pair compatible acquisitions (same track, frame, direction, and frequency).
3. Subset HVHV, mask, and numberOfLooks through NASA Harmony.
4. Convert to linear power, average it over 10 × 10 px blocks (100 m) that have ≥ 90 % valid pixels on both dates, then convert to dB.
5. `delta_db = final − initial`. A cell is a candidate if `delta_db ≤ −3 dB` (exploratory threshold).

Full parameters are in `config/science.json`. The scientific contract is in `docs/CONTRATO_CIENTIFICO.md`.

## Scientific limits

- **Radar change only.** HVHV gamma0 at L-band. Tillage, soil moisture, rain, phenology, slope, and geometry can all produce the same signal.
- **No forest mask.** The population is every valid pixel in the window. The window is a provisional bounding box, not the municipal boundary.
- **One pair.** No repetition, persistence, trend, or external confirmation.
- **Speckle is reduced, not removed.** At native 10 m the decreases and increases are almost equally common, which is what speckle looks like. The published product uses the 100 m multilook cells.
- **Provisional product.** `NISAR_L2_GCOV_PROVISIONAL_V1`, not a validated release. ASF reports a possible mask misalignment at product edges (2026-02-27); edge pixels may be affected.
- **Not an alert.** No threshold has been validated against field data. The 3 dB value is exploratory.

## Data sources

- **NISAR L2 GCOV** (NASA–ISRO), accessed via NASA CMR and NASA Harmony / ASF DAAC. Documentation: [NISAR GCOV](https://nisar-docs.asf.alaska.edu/gcov/), [Harmony](https://nisar-docs.asf.alaska.edu/harmony/), [CMR search API](https://cmr.earthdata.nasa.gov/search/site/docs/search/api.html).
- **Map tiles:** © OpenStreetMap contributors (ODbL), shown through Leaflet 1.9.4.

Details, dates, and identifiers: [`docs/SOURCES_AND_AI.md`](docs/SOURCES_AND_AI.md).

## Environment variables

| Name | Description | Example | Required |
|---|---|---|---|
| `EARTHDATA_TOKEN` | NASA Earthdata Login token. Read from the process environment by the engine (`scientific-engine/acquisition.py`, `util.py`). Never store it in a file. | `<token from your Earthdata account>` | Only for the scientific engine when it downloads granules. Not needed for the web app or for `--catalog-file` / `--local-input` runs. |

No other environment variables are read by the code in this repository.

## Tests

```bash
.venv\Scripts\python.exe -m pytest tests\python -q
npm run typecheck
npm run build
```

Last verified results (recorded by the coordinator for this snapshot): `pytest tests/python -q` → 35 passed; `npm run typecheck` and `npm run build` pass. Re-run them before any release.

## Project structure

```text
config/science.json          Single source for scientific parameters (AOI, dates, threshold, budget)
scientific-engine/           Python engine: CMR search, pairing, Harmony acquisition, processing, export
scripts/                     Python requirements and search helper
tests/python/                pytest suite for the engine
public/data/                 Published artifacts read by the app (manifest.json, snapshots/)
src/app/                     Shell, router, route-to-view map
src/config/app.config.ts     Brand, routes, feature flags, storage namespace
src/i18n/                    English and Spanish text
src/components/              Shared UI (Button, Navbar, Tabs, Modal, Card, ...)
src/services/               Loads and validates the published science artifacts
src/shared/                  Types, formatting, semaphore and error helpers
src/features/                Observatory, observations, community (demo), library, methodology, home
docs/                        Contracts, plans, architecture, deployment, sources, progress, handoff
```

Full map with descriptions: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Contributing

This is a hackathon project. Before changing science parameters, read `docs/CONTRATO_CIENTIFICO.md`. Before changing structure, read `docs/ARQUITECTURA_MODULAR.md`. Record each change in `docs/PROGRESS.md`. Documentation inside `docs/` is written in Spanish; this README and the deliverables are in English.

## Credits and licenses

- **Mission:** NISAR is a NASA–ISRO mission. [NASA/JPL NISAR](https://nisar.jpl.nasa.gov/). This project is an independent challenge entry, not an official NASA or ISRO product.
- **Design:** the visual language is adapted from a supplied landing-page template. The template's remote images and video were not carried over. All scenes in the app are original SVG/CSS illustrations.
- **Fonts:** Inter Tight and JetBrains Mono (SIL Open Font License), loaded from Google Fonts.
- **Icons:** Lucide React (ISC license).
- **Mapping:** Leaflet 1.9.4 (BSD-2-Clause).
- **Project license:** **not yet defined.** The repository contains no LICENSE file. The owner must choose and add one before public release.

## AI use

Code, documentation, and processing were orchestrated with Claude Code. The web app and the engine use no generative AI at runtime, and no image in the app was generated by AI. Full statement: [`docs/SOURCES_AND_AI.md`](docs/SOURCES_AND_AI.md).

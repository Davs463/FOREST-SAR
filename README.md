# BosqueVivo HN

BosqueVivo HN is an English-first, responsive educational prototype for exploring how satellite radar can help people study environmental change in Honduras. It was prepared as a NASA Space Apps Challenge concept for **Dancing with the SARs**.

The prototype explains the NISAR mission, offers a conceptual comparison experience, and demonstrates ways a community might share observations. It is not connected to live NISAR data, does not confirm environmental events, and does not issue alerts. All map-like scenes, indicators, sample posts, polls, and event listings are illustrative or simulated.

## Run locally

**Requirements:** Node.js 20.19+ or 22.12+, and npm. Vite 8 requires one of these supported Node.js versions.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite (the default for this project is `http://localhost:3000`). No API key, backend, or database is required.

Useful commands:

```bash
npm run typecheck
npm run build
npm run preview
```

`npm run build` creates a static production bundle in `dist/`. Upload the contents of that directory to any static web host. The current Vite config assumes the site is served from the host root; configure Vite's `base` option if hosting under a subpath.

## What is implemented

- Editorial landing page with the forest palette, large typography, and data labels adapted from the supplied design template. Its sticky scroll story restores the floating-rock visual, using original SVG islands, pointer parallax, staged copy, a scan cue, and a progress line.
- Responsive navigation and an accessible hero-to-observatory path.
- Observatory with three Honduran study-area choices, illustrative layer controls, a before/after swipe, dates, a selectable marker, and a local illustrative signal chart.
- Community prototype with local field notes, sample replies, reactions, a simulated poll, unpublished poll/event suggestions, sample events, preparedness checklists, and SAR learning cards.
- Clear labels that distinguish demonstration visuals and content from real observations or public notices.
- Keyboard focus states and reduced-motion styles; reduced-motion users receive a static, fully readable story instead of a pinned scroll sequence.

## Data and scientific limits

There is no live satellite imagery, NISAR API, geospatial boundary dataset, or scientific processing in this version. The observatory visuals are generated locally with SVG and CSS and are not geographic imagery. Numeric signal values and chart series are illustrative demo values, not measurements. Study-area labels are starting points for the concept; availability of NISAR observations for a selected place and date has not been verified here.

Community examples are also local demonstration content. New field notes are saved in this browser's local storage; replies, suggestions, poll choices, and checklist states remain only for the current page session. Nothing is uploaded or reviewed. Events are examples only and have no real date or registration. Preparedness checklists are educational and do not replace official instructions.

## Template, resources, and attribution

The supplied `index.html` was a standalone Mossline business landing page. Its visual references included a deep green palette, warm neutral surfaces, lime accents, monospaced labels, layered landscape imagery, scroll-timed transitions, pointer parallax, and a fixed header. BosqueVivo keeps those visual cues and uses CSS/SVG motion and responsive layouts in the React app.

The original template referenced remote Higgs AI images and a CloudFront video, but the repository contained no visible license or attribution record for those assets. They were not carried into this prototype. No third-party raster imagery is used; the visual scenes are original SVG/CSS illustrations.

- **NISAR mission information:** [NASA/JPL NISAR](https://nisar.jpl.nasa.gov/) and [Mission Concept](https://nisar.jpl.nasa.gov/mission/mission-concept/).
- **SAR learning:** [NASA Earthdata: What is SAR?](https://www.earthdata.nasa.gov/learn/backgrounders/what-is-sar).
- **Preparedness link:** [COPECO, Honduras](https://www.copeco.gob.hn/). This is a link to the official agency site, not an emergency alert integration.
- **Fonts:** Inter Tight and JetBrains Mono are loaded from Google Fonts. Their font software is distributed under the SIL Open Font License; see the [Inter Tight metadata](https://github.com/google/fonts/blob/main/ofl/intertight/METADATA.pb) and [JetBrains Mono license](https://github.com/google/fonts/blob/main/ofl/jetbrainsmono/OFL.txt). If a deployment needs offline font loading, bundle the font files with their license notices.
- **Icons:** Lucide React, distributed under the ISC license; [project license](https://github.com/lucide-icons/lucide/blob/main/LICENSE).

NISAR is a NASA–ISRO mission. This prototype is an independent educational concept and is not an official NASA or ISRO product.

## Project structure

```text
src/
  App.tsx                         Landing page, navigation, and page composition
  index.css                       Global design tokens, responsive shell, motion
  features/
    observatory/                  Study-area comparison and illustrative signal UI
    community/                    Community, poll, events, education, preparedness
```

See [`PROGRESS.md`](./PROGRESS.md) for the implementation record, decisions, and remaining work.

## Development handoff

This clean repository preserves the current React/Vite prototype. Read `LEEME_PRIMERO.md`, `CLAUDE.md`, and `docs/BASELINE_AUDIT.md` before starting. The scientific data pipeline remains to be implemented; the existing illustrative visuals are not satellite data. The previous progress record is in `docs/PROGRESS_BASELINE.md`.

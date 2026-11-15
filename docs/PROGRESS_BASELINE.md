# BosqueVivo HN — Progress

Updated: 2026-11-14

## Completed in this implementation

- Audited the supplied standalone HTML template and current React/Vite project.
- Replaced the unrelated Mossline business story and unsupported business statistics with the BosqueVivo HN concept.
- Preserved the template's forest palette, editorial typography, monospaced data labels, layered landscape feel, hover feedback, and staged entrance motion in a lighter responsive implementation.
- Restored the template's defining pinned scroll narrative: floating rock-like forest islands, pointer parallax, staged story copy, scan detail, and a scroll progress line, rebuilt as original SVG/CSS rather than unlicensed external artwork/video.
- Built responsive landing, NISAR explainer, observatory, and community areas.
- Added study-area selection, illustrative date controls, layer selection, swipe comparison, selectable change-candidate marker, and illustrative signal chart.
- Added local-only field notes/replies, voting, simulated poll results, unpublished poll/event suggestions, sample events and replies, educational checklists, and SAR learning content.
- Added visible demo-data and emergency-information caveats, keyboard focus styles, and reduced-motion support.
- Removed unused AI Studio/Gemini, Express, dotenv, and Tailwind scaffold dependencies; corrected the Vite/esbuild version mismatch by aligning esbuild to 0.28.
- Replaced the old misleading setup guide with English run/deploy instructions and a source/attribution record.
- Installed the trimmed dependency set, generated a lockfile, and confirmed TypeScript typecheck and Vite production build pass.

## Design decisions

- Retain the reference's deep forest, warm neutral, restrained lime, editorial spacing, mono labels, gentle hover response, and atmospheric layered graphics.
- Use original SVG/CSS diagrams instead of the template's remote image/video assets because their reuse terms were not recorded in the repository.
- Keep the prototype single-page and English-first. Use anchor navigation to keep the observatory easy to reach.
- Make the home story feel cinematic while keeping motion short, light, and disabled in favor of readable static copy when reduced motion is requested.
- Keep interactions local; avoid authentication, backend services, and private API keys during the demo phase.
- Use generated illustrative surfaces and explicitly say they are not geographic imagery or scientific observations.

## Simulated functionality and content

- All observation surfaces, radar layers, chart series, and numeric signal values are illustrative local demo data.
- Study regions are candidate examples. Data coverage and date availability have not been verified against NISAR products.
- Posts, poll totals, events, and sample replies are examples. New posts save to browser local storage; replies, suggestions, votes, interest flags, and checklist state remain in page memory only.
- No emergency alerts, live processing, production accounts, or remote storage are implemented.

## Pending

- Review keyboard and touch interactions in a browser at approximately 390, 768, 1024, and 1440 px widths.
- Validate study-area boundaries and observation availability before connecting real data.
- Replace demo graphics and series with cited, permissioned, calibrated data only when a suitable source and processing path are selected.
- Consider adding a real map with an appropriate open map/data source and attribution once the prototype's data scope is set.
- Confirm external font loading or bundle licensed font files for offline demos.

## Known limitations

- Observatory terrain textures are conceptual graphics, not a geospatial map or satellite product.
- The date controls label comparison sides but do not query or recalculate data.
- This is a hackathon prototype, not a production environmental monitoring or emergency response system.

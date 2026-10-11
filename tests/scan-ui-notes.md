# Scan UI and SuperCharlie update

## Scope

- Lead with the actual number of current matches, including while a new scan runs.
- Show opportunity details immediately, ranked by score, before execution/preferences controls.
- Explain that ATS/platform applications require the user to complete and submit the form.
- Hide empty direct-email metrics and entry points. Preserve real email activity/history and access to disconnect an existing mailbox.
- Reuse the same floating, hideable SuperCharlie on the homepage and Agent pages. No enclosing mascot card.
- No matching, authorization, or email-sending backend logic changed.

## Verification

`node tests/scan-ui.cjs` passed: result headline, background scanning, zero-email visibility, platform details, ATS submission CTA, mixed channels, process metrics.

The isolated browser fixture verified the rendered character silhouette (no rectangular backdrop), hide/show controls, hidden preference surviving reload, and fixed viewport position before/after scrolling. The fixture was also rendered with the compiled project stylesheet. The local production homepage showed the same character with no console errors. No live user CV, applications, or emails were submitted during these checks.

The original directory repeatedly stalled on dependency reads. A clean temporary copy with the same package lock passed `npm run build`, including the full TypeScript check and all 67 static-page generation steps. The render regressions also passed in that clean environment.

## Production release — September 3, 2026

The earlier access failure was resolved through the authenticated Vercel CLI, which confirmed the existing project `prj_FlZ8SXoJaNClwLtWcuJRRGFR3Nvq`. The connected MCP project interface still returned an inconsistent 404; no project was recreated or relinked.

Deployment `dpl_D6GigBfWFPMVb9JxuiJuTSn3dDPc` passed the Vercel production build, TypeScript check and all 67 static-page generation steps. The staged deployment was inspected as READY and its mascot loading, hide/show controls and visual cutout verified in the browser before promotion.

The deployment was promoted successfully. `vercel inspect https://getmonetizable.com` resolved to this new deployment, and a fresh browser navigation to the production domain verified the new mascot image loaded successfully and its hide control was present. Scan UI render regressions were rerun and passed. Authenticated live dashboard data was not exercised; no live applications or outreach emails were submitted during deployment verification.

## Character asset

- Image: `public/supercharlie-pet-v2.png`
- Browser-native silhouette mask: `public/supercharlie-pet-mask.svg`
- Component: `src/components/supercharlie-companion.tsx`
- Generation mode: built-in image generation/editing tool, not CLI/API fallback.
- Source reference: `public/supercharlie-guide-v1.png`.
- Final edit prompt: “Background-extraction correction only: prior output is RGB with checkerboard baked into the pixels, not transparent. Remove the checkerboard and return a PNG with an ACTUAL alpha channel and fully transparent pixels outside the character silhouette. Preserve the character exactly, including gold body, face, hair, compass, full feet and pose. Do not draw checkerboard, white background, black background, glow, floor, panel, or shadow. Genuine transparent background, clean isolated cutout.”
- The tool still returned RGB; the original raster is preserved, and the website uses the SVG silhouette mask to remove its backdrop at render time. Do not describe the source PNG itself as alpha-transparent.

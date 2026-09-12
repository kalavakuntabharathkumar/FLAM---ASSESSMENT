# Adaptive Layout Engine for Multi-Surface Ads

A React + TypeScript + Vite demonstration of a framework-independent, constraint-based adaptive layout engine. One shared `AdSpecification` is resolved independently against four required surfaces plus an intentionally unknown fifth surface (`713 × 287`).

## Run

```bash
npm install
npm run dev
```

Open the localhost URL printed by Vite.

## Verification commands

```bash
npm run typecheck
npm run build
npm run test
npm run test:e2e
npm run test:all
```

`test:all` is the complete local verification pipeline.

## Architecture

`AdSpecification + SurfaceProfile → generic resolver → ResolvedLayout → React renderer`.

The resolver is framework-independent TypeScript. It does not import React, DOM APIs, CSS, browser measurements, or surface names. Geometry is owned by the resolver; the renderer only presents the resolved geometry.

## Surfaces

- Mobile Portrait — `320 × 480`
- Mobile Landscape — `480 × 320`
- Broadcast Lower Third — `1920 × 250`
- Retail Kiosk — `1080 × 1080`
- Unknown — `713 × 287`

The fifth surface uses the same resolver without a new surface-specific branch.

## Content and QA

The demo includes headline, product image, price, CTA, and FLAM AI logo content. Text sizing is calculated from the final candidate width, image geometry preserves aspect ratio, CTA sizing respects touch requirements, and degradation triggers a fresh resolution pass.

The automated suite checks deterministic resolution, safe-area bounds, overlap, text fit, image ratio, CTA constraints, extreme price content, all five surfaces, and real browser DOM geometry. Playwright checks the rendered frame and visible element bounding boxes independently of the resolver's validation status.

## Layout algorithm (step by step)

Given one `AdSpecification` and one `SurfaceProfile`, `resolveLayout()` in `src/resolver/resolver.ts` runs:

1. **Usable area** — subtract the surface's `safeArea` from its width/height (`geometry.ts`). If nothing is left, resolution fails fast.
2. **Composition candidates** — `composition.ts` scores three generic arrangement families (`vertical`, `horizontal`, `mixed`) purely from the surface's aspect ratio and the spec's content pressure (total preferred/min width vs. available width, total preferred height vs. available height). No surface id or name is ever read here — a 1920×250 surface and a hypothetical unseen 1900×260 surface score the same way.
3. **Content-aware sizing** — for each candidate, `placement.ts` sizes every element: images keep their declared aspect ratio and are bounded by the candidate box; text is sized at the exact candidate width via `fitTextFontSize`/`estimateText` in `constraints.ts`, shrinking toward its declared minimum font size before anything is dropped.
4. **Placement** — elements are placed into the composition without overlap, respecting priority order (`ordered()` in `placement.ts`).
5. **Validation** — `validator.ts` checks bounds, safe-area containment, pairwise overlap, minimum text size, minimum tap target (on touch surfaces), image aspect ratio, text overflow, and that no required element went missing.
6. **Scoring** — each valid-or-not candidate gets a score (`resolver.ts`, `score()`) rewarding visible elements, higher priority retained, area efficiency, and penalizing validation issues and truncation. The resolver keeps the best-scoring candidate from this iteration.
7. **Degradation** — if the best candidate still has validation issues, `degradation.ts` picks the next degradation step: at the *lowest* priority tier present, drop a droppable element first, then truncate a truncatable one. It never touches a higher-priority element while a lower-priority option remains.
8. **Re-resolution** — after every degradation decision, steps 2–6 run again from scratch (new candidates, new sizing, new placement, new validation) rather than patching the previous layout, so stale coordinates never leak into the result. This repeats until a valid layout is found or no further degradation is possible.

## TypeScript design

Invalid specs are rejected at compile time, not just at runtime, via discriminated unions in `src/types/ad.ts`:

- `AdElementSpec` is a union of `TextElementSpec | HeroImageElementSpec | BrandingImageElementSpec | ButtonElementSpec`, discriminated on `type` (and, for images, `role`).
- A `text` element is required to carry a `text: TextConstraints` block and is typed `image?: never` — you cannot construct a text element with image constraints, or omit its text constraints, without a compile error.
- Only an image can have `role: 'hero'` or `role: 'branding'`; `TextElementSpec` and `ButtonElementSpec` type their `role` as `Exclude<ElementRole, 'hero' | 'branding'>`, so assigning `role: 'hero'` to a text element is a compile-time error, not a runtime surprise.
- `HeroImageElementSpec` requires `image: ImageConstraints` (aspect ratio, min/preferred size); `BrandingImageElementSpec` allows either `image` or `text` constraints since branding can render as a wordmark or a logo image.
- On the surface side, `SurfaceProfile` (`src/types/surface.ts`) is a single flat interface — every profile must supply `safeArea`, `minTapTarget`, `minTextSize`, `viewingDistance`, and `touchOnly`, so a surface missing a hard constraint fails to typecheck rather than silently defaulting.
- The resolver's output, `ResolvedLayout`/`ResolvedElement` (`src/types/layout.ts`), is fully typed with position/size/visibility/font metrics per element, so a renderer consumes it without guessing shapes or doing `any`-typed lookups.

Run `npm run typecheck` to verify — it currently passes with zero errors.

## Known limitations

- No animated transition when switching surfaces; the layout swaps instantly.
- Text sizing uses a character-width heuristic (`estimateText` in `src/resolver/constraints.ts`), not real browser/canvas text measurement — it does not account for font kerning or non-monospace width variance, so very unusual fonts could shift results slightly from what's estimated.
- Only a DOM/CSS renderer is implemented (`src/rendering/renderDom.ts`); no Canvas backend exists yet, though the resolver takes no DOM/React dependency so one could be added without touching resolution logic.
- The element type set is fixed to `text | image | button`; adding a new element kind requires extending the discriminated union in `src/types/ad.ts`.
- No accessibility-specific constraint type (e.g. contrast-aware branding placement) beyond tap-target sizing.

## Time spent

About 3.5 days — 3 full days at ~12 hours plus another 6 hours on top, roughly 42 hours total.

## AI tool usage

I used AI only for comments and documentation in this project. The resolver, types, and logic are my own.

import type { AdSpecification, AdElementSpec } from '../types/ad';
import type { SurfaceProfile } from '../types/surface';
import type { ResolvedLayout, Composition } from '../types/layout';
import { usable } from './geometry';
import { candidates } from './composition';
import { place } from './placement';
import { validate } from './validator';
import { nextDegradation } from './degradation';

function areaEfficiency(layout: ResolvedLayout): number {
  const visible = layout.elements.filter(e => e.visible);
  const used = visible.reduce((sum, e) => sum + e.width * e.height, 0);
  const safeArea = Math.max(1, (layout.safeArea.right - layout.safeArea.left) * (layout.safeArea.bottom - layout.safeArea.top));
  return used / safeArea;
}

function score(layout: ResolvedLayout): number {
  const visible = layout.elements.filter(e => e.visible);
  const priorityValue = visible.reduce((sum, e) => sum + (4 - e.priority), 0);
  const issues = layout.validation.issues.length;
  const efficiency = areaEfficiency(layout);
  const truncations = visible.filter(e => e.truncated).length;
  return (
    (layout.validation.valid ? 100000 : 0) +
    visible.length * 1000 +
    priorityValue * 25 +
    efficiency * 100 -
    truncations * 120 -
    issues * 10000
  );
}

function withTruncationState(ad: AdSpecification, trunc: Set<string>): AdElementSpec[] {
  return ad.elements.map(e => {
    if (!trunc.has(e.id) || !e.text) return e;
    return { ...e, text: { ...e.text, maxLines: e.text.maxLines ?? 1, allowTruncation: true } };
  });
}

/**
 * Font-size shrinking happens silently inside `fitTextFontSize` — it is not
 * part of the hide/truncate priority loop, so it never produced a tracked
 * `DegradationDecision` even though `DegradationOperation` declares 'resize'
 * as a valid operation.
 *
 * This scans the final resolved layout and records a 'resize' decision for
 * every visible text (or branding-image) element whose font ended up below
 * its declared preferred size, so "why did this element end up at this
 * size" has an actual answer in the degradation log instead of only being
 * inferable from the raw fontSize number.
 */
function resizeDecisions(
  ad: AdSpecification,
  layout: ResolvedLayout,
): ResolvedLayout['degradation'] {
  const out: ResolvedLayout['degradation'] = [];

  for (const e of layout.elements) {
    if (!e.visible || e.fontSize === undefined) continue;

    const spec = ad.elements.find(s => s.id === e.id);
    const preferred = spec?.text?.preferredFontSize;
    if (preferred === undefined) continue;

    if (e.fontSize < preferred - 0.01) {
      out.push({
        operation: 'resize',
        elementId: e.id,
        reason: `Reduced font size from ${preferred}px to ${Math.round(e.fontSize)}px to fit the available space before further degradation.`,
      });
    }
  }

  return out;
}

function resolveCandidate(
  ad: AdSpecification,
  surface: SurfaceProfile,
  composition: Composition,
  hidden: Set<string>,
  trunc: Set<string>,
) {
  const specs = withTruncationState(ad, trunc);
  const elements = place(specs, surface, composition, hidden, trunc);
  const validation = validate(elements, specs, surface);
  return { elements, validation };
}

export function resolveLayout(
  ad: AdSpecification,
  surface: SurfaceProfile,
  { maxIterations = ad.elements.length * 3 + 3 }: { maxIterations?: number } = {},
): ResolvedLayout {
  const seenIds = new Set<string>();
  for (const el of ad.elements) {
    if (seenIds.has(el.id)) {
      throw new Error(
        `Invalid ad specification: duplicate element id "${el.id}". Element ids must be unique so the resolver, validator, and renderer can key off them unambiguously.`,
      );
    }
    seenIds.add(el.id);
  }

  const u = usable(surface.width, surface.height, surface.safeArea);
  if (u.width <= 0 || u.height <= 0) throw new Error('Surface safe area leaves no usable space.');

  const state = { hidden: new Set<string>(), trunc: new Set<string>() };
  const decisions: ResolvedLayout['degradation'] = [];
  let final: ResolvedLayout | undefined;

  for (let iteration = 0; iteration < maxIterations; iteration++) {
    const activeSpecs = ad.elements.filter(e => !state.hidden.has(e.id));
    const layoutCandidates = candidates(surface, activeSpecs)
      .map(composition => {
        const r = resolveCandidate(ad, surface, composition, state.hidden, state.trunc);
        const layout: ResolvedLayout = {
          surfaceId: surface.id,
          width: surface.width,
          height: surface.height,
          safeArea: {
            left: surface.safeArea.left,
            top: surface.safeArea.top,
            right: surface.width - surface.safeArea.right,
            bottom: surface.height - surface.safeArea.bottom,
          },
          composition,
          elements: r.elements,
          validation: r.validation,
          degradation: [...decisions],
          score: 0,
        };
        layout.score = score(layout);
        return layout;
      })
      .sort((a, b) => b.score - a.score);

    const winner = layoutCandidates[0];
    if (winner?.validation.valid) {
      final = winner;
      break;
    }

    const degradation = nextDegradation(ad.elements, state);
    if (!degradation) {
      final = winner;
      break;
    }
    decisions.push(degradation);
  }

  if (!final) throw new Error('No candidate layout could be generated.');
  final.degradation = [...decisions, ...resizeDecisions(ad, final)];
  final.score = score(final);
  return final;
}
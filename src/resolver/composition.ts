import type { AdElementSpec } from '../types/ad';
import type { SurfaceProfile } from '../types/surface';
import type { Composition } from '../types/layout';

/**
 * Composition selection is deliberately based only on geometry and content pressure.
 * No surface id/name/dimension is special-cased here.
 */
export function candidates(surface: SurfaceProfile, elements: AdElementSpec[]): Composition[] {
  const ratio = surface.width / Math.max(1, surface.height);
  const totalPreferred = elements.reduce((sum, e) => sum + e.preferredWidth, 0);
  const totalMin = elements.reduce((sum, e) => sum + e.minWidth, 0);
  const widthPressure = totalPreferred / Math.max(1, surface.width);
  const minPressure = totalMin / Math.max(1, surface.width);
  const heightPressure = elements.reduce((sum, e) => sum + e.preferredHeight, 0) / Math.max(1, surface.height);

  const scored: Array<{ composition: Composition; score: number }> = [
    {
      composition: 'vertical',
      score: Math.abs(Math.log(Math.max(0.01, ratio) / 0.85)) + Math.max(0, widthPressure - 1) * 1.5,
    },
    {
      composition: 'horizontal',
      score: Math.abs(Math.log(Math.max(0.01, ratio) / 2.6)) + Math.max(0, heightPressure - 1) * 1.5,
    },
    {
      composition: 'mixed',
      score:
        Math.abs(Math.log(Math.max(0.01, ratio) / 1.45)) +
        Math.max(0, minPressure - 0.9) * 0.5 +
        Math.max(0, widthPressure - 1.4) * 0.4,
    },
  ];

  return scored
    .sort((a, b) => a.score - b.score || a.composition.localeCompare(b.composition))
    .map(x => x.composition);
}

import {it,expect} from 'vitest'; import {resolveLayout} from '../../src/resolver/resolver'; import {adSpec} from '../../src/spec/adSpec'; import {surfaces} from '../../src/surfaces/surfaces';
it('never overlaps visible elements',()=>{for(const s of surfaces){const l=resolveLayout(adSpec,s);const v=l.elements.filter(e=>e.visible);for(let i=0;i<v.length;i++)for(let j=i+1;j<v.length;j++)expect(v[i].x>=v[j].x+v[j].width||v[j].x>=v[i].x+v[i].width||v[i].y>=v[j].y+v[j].height||v[j].y>=v[i].y+v[i].height).toBe(true)}});


import { describe } from 'vitest';

describe('composition vertical balance', () => {
  it('keeps a sparse composition centered inside the safe area without changing element sizes', () => {
    const kiosk = surfaces.find(s => s.width === 1080 && s.height === 1080)!;
    const layout = resolveLayout(adSpec, kiosk);
    const visible = layout.elements.filter(e => e.visible);
    const top = Math.min(...visible.map(e => e.y));
    const bottom = Math.max(...visible.map(e => e.y + e.height));
    const safeTop = kiosk.safeArea.top;
    const safeBottom = kiosk.height - kiosk.safeArea.bottom;
    const topFree = top - safeTop;
    const bottomFree = safeBottom - bottom;

    expect(Math.abs(topFree - bottomFree)).toBeLessThan(0.1);
    expect(visible.every(e => e.y >= safeTop - 0.01)).toBe(true);
    expect(visible.every(e => e.y + e.height <= safeBottom + 0.01)).toBe(true);
  });
});

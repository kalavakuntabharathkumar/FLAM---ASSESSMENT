import {useMemo,useState} from 'react';
import {adSpec} from './spec/adSpec';
import {surfaces, unknownSurface} from './surfaces/surfaces';
import {resolveLayout} from './resolver/resolver';
import {SurfacePicker} from './components/SurfacePicker';
import {AdRenderer} from './components/AdRenderer';
import {ResolutionDebug} from './components/ResolutionDebug';
import './styles.css';
export default function App(){const allSurfaces=[...surfaces,unknownSurface]; const [selected,setSelected]=useState(allSurfaces[0].id); const surface=allSurfaces.find(s=>s.id===selected)!; const layout=useMemo(()=>resolveLayout(adSpec,surface),[surface]); return <main><header><div><p className="eyebrow">FLAM AI · CONSTRAINT-BASED DEMO</p><h1>Adaptive Layout Engine</h1><p className="subtitle">One surface-independent ad specification, resolved against different mathematical surface constraints.</p></div><div className="badge">{layout.validation.valid?'✓ Valid':'! Review'}</div></header><SurfacePicker surfaces={allSurfaces} selected={selected} onSelect={setSelected}/><section className="workspace"><div className="preview-panel"><div className="preview-label">LIVE RESOLUTION · {surface.name}</div><div className="preview-stage"><AdRenderer layout={layout} ad={adSpec}/></div></div><ResolutionDebug layout={layout}/></section></main>}

import type { AdElementSpec } from '../types/ad';
export interface DegradeState { hidden:Set<string>; trunc:Set<string>; }
export function nextDegradation(specs:AdElementSpec[],state:DegradeState){
 const byPriorityDesc=[...specs].sort((a,b)=>b.priority-a.priority||b.id.localeCompare(a.id));
 const priorities=[...new Set(byPriorityDesc.map(e=>e.priority))].sort((a,b)=>b-a);
 for(const p of priorities){
  const atThisPriority=byPriorityDesc.filter(e=>e.priority===p);
  const droppable=atThisPriority.find(e=>!state.hidden.has(e.id)&&e.flexibility.droppable);
  if(droppable){state.hidden.add(droppable.id); return {operation:'hide' as const,elementId:droppable.id,reason:`Dropped priority ${p} droppable content before compromising higher-priority elements.`};}
  const truncatable=atThisPriority.find(e=>!state.trunc.has(e.id)&&e.flexibility.truncate&&e.text?.allowTruncation);
  if(truncatable){state.trunc.add(truncatable.id); return {operation:'truncate' as const,elementId:truncatable.id,reason:`Truncated priority ${p} content before compromising higher-priority elements.`};}
 }
 return null;
}
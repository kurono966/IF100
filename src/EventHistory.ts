import type {WorldState,HistoryEvent} from './WorldState';
export function record(w:WorldState,title:string,cell:number,parents:string[]=[],root?:string):string {
 const id=`e${w.events.length}`;const ancestors=parents.map(p=>w.events[Number(p.slice(1))]).filter(Boolean);
 w.events.push({id,year:w.year,title,cell,parents:[...parents],root,roots:[...new Set([...ancestors.flatMap(e=>e.roots||[]),...(root?[root]:[])])],phases:[...new Set(ancestors.flatMap(e=>e.phases||[]))],depth:1+Math.max(0,...ancestors.map(e=>e.depth||0))});return id;
}
// Keep one strongest dependency per intervention and one background dependency.
// This bounds history storage while preserving all five intervention origins.
export function combine(w:WorldState,...lists:string[][]):string[]{
 const chosen=new Map<string,HistoryEvent>();
 for(const id of new Set(lists.flat())){const e=w.events[Number(id.slice(1))];if(!e)continue;for(const root of e.roots?.length?e.roots:['background']){const previous=chosen.get(root);const score=(event:HistoryEvent)=>(event.phases?.length||0)*10000+(event.depth||0);if(!previous||score(e)>score(previous)||(score(e)===score(previous)&&e.year>previous.year))chosen.set(root,e);}}
 return [...new Set([...chosen.values()].map(e=>e.id))];
}
export function chain(w:WorldState,root:string,baseline?:WorldState):HistoryEvent[] {
 const paths=new Map<string,HistoryEvent[]>();let best:HistoryEvent[]=[];
 const score=(path:HistoryEvent[])=>new Set(path.map(e=>e.phase).filter(Boolean)).size*10000+path.length;
 const impact=(path:HistoryEvent[])=>{const end=path.at(-1);if(!baseline||!end||end.year!==100)return 0;const a=baseline.cells[end.cell],b=w.cells[end.cell];return Math.abs(a.population-b.population)+Math.abs(a.forest-b.forest)*300+Math.abs(a.stage-b.stage)*200;};
 for(const e of w.events){const previous=e.parents.map(p=>paths.get(p)||[]).sort((a,b)=>score(b)-score(a))[0]||[];
 if(e.root===root||previous.length){const path=[...previous,e];paths.set(e.id,path);if((e.year===100&&best.at(-1)?.year===100&&impact(path)>impact(best))||(e.year===100&&best.at(-1)?.year!==100)||(e.year===best.at(-1)?.year&&(!baseline||e.year!==100||impact(path)===impact(best))&&score(path)>score(best))||(!best.length)||(best.at(-1)?.year!==100&&score(path)>score(best)))best=path;}}
 return best;
}

import type {WorldState,HistoryEvent} from './WorldState';
export function record(w:WorldState,title:string,cell:number,parents:string[]=[],root?:string):string {
 const id=`e${w.events.length}`; w.events.push({id,year:w.year,title,cell,parents:[...parents],root});return id;
}
export function chain(w:WorldState,root:string):HistoryEvent[] {
 const paths=new Map<string,HistoryEvent[]>(); let best:HistoryEvent[]=[];
 for(const e of w.events){const previous=e.parents.map(p=>paths.get(p)||[]).sort((a,b)=>b.length-a.length)[0]||[];
 if(e.root===root||previous.length){const path=[...previous,e];paths.set(e.id,path);if(path.length>best.length)best=path;}}
 return best;
}

import {structuralDifference} from './WorldComparison';
import type {WorldState,HistoryEvent,EventType,Phase} from './WorldState';
export function record(w:WorldState,title:string,cell:number,parents:string[]=[],root?:string):string {
 const id=`e${w.events.length}`,ancestors=parents.map(p=>w.events[Number(p.slice(1))]).filter(Boolean);
 w.events.push({id,year:w.year,title,cell,parents:[...parents],root,
 roots:[...new Set([...ancestors.flatMap(e=>e.roots||[]),...(root?[root]:[])])],
 types:[...new Set(ancestors.flatMap(e=>e.types||[]))],phases:[...new Set(ancestors.flatMap(e=>e.phases||[]))],depth:1+Math.max(0,...ancestors.map(e=>e.depth||0))});return id;
}
const transitions=new Set(['region_transition','mass_migration','resource_use','migration','settlement','market','trade_route','road','urbanization','industry','decline','abandonment','skill_adoption','inheritance','cultural_spread','regional_tradition','realm_formation','realm_collapse','renaissance','zenith']);
const value=(e:HistoryEvent)=>(e.types||[]).reduce((s,t)=>s+(transitions.has(t)?3:1),0)*100000+(e.phases?.length||0)*1000+(e.depth||0);
// Bound parents to one strongest dependency per intervention plus background.
export function combine(w:WorldState,...lists:string[][]):string[]{
 const chosen=new Map<string,HistoryEvent>();
 for(const id of new Set(lists.flat())){const e=w.events[Number(id.slice(1))];if(!e)continue;
 for(const root of e.roots?.length?e.roots:['background']){const previous=chosen.get(root);if(!previous||value(e)>value(previous)||(value(e)===value(previous)&&e.year>previous.year))chosen.set(root,e);}}
 return [...new Set([...chosen.values()].map(e=>e.id))];
}
const eventTypes:EventType[]=['region_transition','mass_migration','anomaly','wildfire','flood','drought','epidemic','shortage','harvest','migration','settlement','abandonment','market','trade_route','road','industry','urbanization','decline','forest_recovery','ecosystem_collapse','resource_use','ecology','outcome','arrival','death','skill_adoption','inheritance','cultural_spread','regional_tradition','realm_formation','realm_collapse','renaissance','zenith'];
const phases:Phase[]=['weather','vegetation','animals','food','population','civilization','life','migration','trade','knowledge','culture'];
const bits=(n:number)=>{let count=0;while(n){count+=n&1;n>>>=1;}return count;};
interface PathNode {event:HistoryEvent;previous?:PathNode;types:bigint;phases:number;length:number;score:number}
export function chain(w:WorldState,root:string,baseline?:WorldState,targetCell?:number,mode:'impact'|'longest'='impact'):HistoryEvent[]{
 const nodes=new Map<string,PathNode>();let best:PathNode|undefined;
 const impact=(node:PathNode)=>{if(mode==='longest'||!baseline||node.event.type!=='outcome')return 0;const a=baseline.cells[node.event.cell],b=w.cells[node.event.cell];return structuralDifference(a,b).score*1000+Math.abs(a.stage-b.stage)*700+Math.abs(a.markets-b.markets)*500+Math.abs(a.population-b.population)+Math.abs(a.trade-b.trade)*180+Math.abs(a.forest-b.forest)*100;};
 for(const e of w.events){let node:PathNode|undefined;
 const parents=e.root===root?[undefined]:e.parents.map(id=>nodes.get(id)).filter((n):n is PathNode=>!!n);
 for(const parent of parents){const typeBit=e.type?1n<<BigInt(eventTypes.indexOf(e.type)):0n,phaseBit=e.phase?1<<phases.indexOf(e.phase):0;
 const types=(parent?.types||0n)|typeBit,phaseMask=(parent?.phases||0)|phaseBit,length=(parent?.length||0)+1;
 const diversity=eventTypes.reduce((s,t,i)=>s+((types&(1n<<BigInt(i)))?(transitions.has(t)?3:1):0),0)*100000+bits(phaseMask)*1000+length;const score=mode==='longest'?length*1000000+bits(phaseMask)*1000:diversity;
 if(!node||score>node.score)node={event:e,previous:parent,types,phases:phaseMask,length,score};}
 if(!node)continue;nodes.set(e.id,node);
 if(targetCell!==undefined&&(e.cell!==targetCell||e.type!=='outcome'))continue;
 const final=e.type==='outcome',bestFinal=best?.event.type==='outcome';
 if(!best||(final&&!bestFinal)||(final===bestFinal&&(impact(node)>impact(best)||(impact(node)===impact(best)&&node.score>best.score))))best=node;
 }
 const path:HistoryEvent[]=[];for(let node=best;node;node=node.previous)path.push(node.event);return path.reverse();
}

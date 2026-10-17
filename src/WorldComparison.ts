import type {Cell,WorldState} from './WorldState';
export interface CellDifference {score:number;reasons:string[]}
export function structuralDifference(a:Cell,b:Cell):CellDifference {
 let score=0;const reasons:string[]=[];const add=(condition:boolean,weight:number,reason:string)=>{if(condition){score+=weight;reasons.push(reason);}};
 add(a.regionState!==b.regionState,3,'地域状態');add(a.stage!==b.stage,2,'集落段階');add((a.stage>=2)!==(b.stage>=2),3,'都市');add((a.roads>0)!==(b.roads>0),2,'道路');add(Math.abs(a.forest-b.forest)>.25,2,'森林');
 const population=Math.abs(a.population-b.population);add(population>100&&population/Math.max(100,a.population,b.population)>.35,2,'人口');add((a.ruins>0)!==(b.ruins>0),2,'廃墟');
 if(score===0&&(population>20||Math.abs(a.forest-b.forest)>.07||a.markets!==b.markets))score=.5;
 return {score:Math.min(12,score),reasons};
}
export interface CausalInfluence {level:0|1|2|3|4;roots:string[];event?:string}
export const influenceColors=[0,0xe6c653,0xde9142,0xcf5e50,0x9b6bb1];
// Inspect current dependency links; neither distance nor the mere location of a touch is evidence.
// This is causal ancestry, not a claim that the intervention alone produced the outcome.
export function causalInfluence(w:WorldState,c:Cell):CausalInfluence {
 const roots=new Set(w.interventions.map(i=>i.id));let best:CausalInfluence={level:0,roots:[]};
 const candidates=new Set(Object.values(c.links).flat());
 for(const id of candidates){const e=w.events[Number(id.slice(1))];if(!e)continue;const ancestry=(e.roots||[]).filter(r=>roots.has(r));if(!ancestry.length)continue;
 const types=e.types||[],phases=e.phases||[];
 const structural=e.cell===c.id&&(e.phase==='civilization'||e.phase==='trade'||e.phase==='culture'||e.type==='outcome')&&types.some(t=>['market','road','trade_route','urbanization','region_transition','realm_formation','industry'].includes(t));
 const level:CausalInfluence['level']=structural&&phases.length>=4?4:phases.length>=3?3:e.type==='anomaly'||e.type==='arrival'?1:2;
 if(level>best.level)best={level,roots:ancestry,event:id};else if(level===best.level)best.roots=[...new Set([...best.roots,...ancestry])];
 }
 return best;
}

import type {WorldState,Cell,EventType,Phase} from './WorldState';
import {record,combine} from './EventHistory';
export const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
export const distance=(a:Cell,b:Cell)=>Math.abs(a.x-b.x)+Math.abs(a.y-b.y);
export function emit(w:WorldState,c:Cell,type:EventType,title:string,phase:Phase,parents=c.links[phase]):string {
 const id=record(w,title,c.id,combine(w,parents));const e=w.events.at(-1)!;
 e.type=type;e.types=[...new Set([...(e.types||[]),type])];e.phase=phase;e.phases=[...new Set([...(e.phases||[]),phase])];c.links[phase]=[id];return id;
}
export function sustained(c:Cell,key:string,condition:boolean,years:number):boolean {
 c.counters[key]=condition?(c.counters[key]||0)+1:0;return c.counters[key]===years;
}
export function cooldown(w:WorldState,c:Cell,key:string,years:number):boolean {
 if(w.year-(c.counters[`last:${key}`]??-100)<years)return false;c.counters[`last:${key}`]=w.year;return true;
}
// Deterministic shortest walk. Rivers allow ferries; mountains and sea block land routes.
export function pathBetween(w:WorldState,from:number,to:number,max=12):number[]|undefined {
 const queue:number[][]=[[from]],seen=new Set([from]);
 for(let head=0;head<queue.length;head++){const path=queue[head],id=path.at(-1)!;if(id===to)return path;if(path.length>max)continue;
 const c=w.cells[id];for(const next of [id-16,id-1,id+1,id+16]){const a=w.cells[next];if(!a||distance(c,a)!==1||seen.has(next)||['sea','mountain'].includes(a.terrain))continue;seen.add(next);queue.push([...path,next]);}}
}

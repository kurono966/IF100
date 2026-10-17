import type {WorldState,Cell} from './WorldState';
import {combine} from './EventHistory';
import {land} from './Intervention';
import {SeededRandom as R} from './SeededRandom';
import {clamp,emit,sustained,cooldown} from './Dynamics';
// Upstream runoff is shared down a river, carrying event provenance with the water.
export function updateHydrology(w:WorldState,old:Cell[]):void {
 let flow=.1;let upstream:string[]=[];
 for(let y=0;y<16;y++){
 const river=w.cells.find(c=>c.y===y&&c.terrain==='river');if(!river)continue;
 const basin=w.cells.filter(c=>c.y===y&&land(c));
 const runoff=basin.reduce((s,c)=>s+c.rainfall*(1-old[c.id].forest*.65),0)/Math.max(1,basin.length);
 const pulse=w.effects.filter(e=>e.intervention.type==='river'&&Math.abs(e.intervention.position.y-y)<=2).length*.18;
 flow=clamp(flow*.8+runoff*.55+pulse,0,2);
 upstream=combine(w,upstream,...basin.map(c=>combine(w,c.links.weather,old[c.id].links.vegetation)));
 river.riverFlow=flow;river.links.weather=upstream;
 for(const c of basin){const bank=Math.abs(c.x-river.x);c.riverFlow=bank<=3?flow:0;
 c.links.weather=combine(w,c.links.weather,bank<=3?upstream:[]);
 c.floodRisk=bank<=2?clamp((flow-.38)*.65*(1-c.forest*.55)+(1-c.forest)*c.rainfall*.12):0;
 if(flow>.6&&c.floodRisk>.20&&R.value(w.seed,'flood',w.year,c.id)<c.floodRisk*.14&&cooldown(w,c,'flood',7)){
 c.floodedUntil=w.year+1;c.soilFertility=clamp(c.soilFertility+.025);emit(w,c,'flood','上流の流出と保水力低下から洪水発生','weather');}
 }
 }
 for(const c of w.cells.filter(land))if(sustained(c,'drought',c.water<.24,3))emit(w,c,'drought','少雨が続き干ばつが定着','weather');
}

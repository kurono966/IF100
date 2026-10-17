import type {WorldState,Cell} from './WorldState';
import {combine} from './EventHistory';
import {land} from './Intervention';
import {SeededRandom as R} from './SeededRandom';
import {biomes} from './Biomes';
import {clamp,emit,sustained,cooldown} from './Dynamics';
// Gravity-ordered drainage follows generated watersheds, including bends and tributaries.
export function updateHydrology(w:WorldState,old:Cell[]):void {
 const discharge=w.cells.map(c=>c.terrain==='sea'?0:c.rainfall*(1-old[c.id].forest*.65)*.16);
 const provenance=w.cells.map(c=>combine(w,c.links.weather,old[c.id].links.vegetation));
 for(const effect of w.effects.filter(e=>e.intervention.type==='river')){
 const origin=w.cells[effect.intervention.position.y*16+effect.intervention.position.x];
 const target=origin.terrain==='river'?origin.id:origin.basinRiver;
 if(target!==null){discharge[target]+=.18;provenance[target]=combine(w,provenance[target],[effect.event]);}
 }
 for(const id of w.geography.drainageOrder){const c=w.cells[id];if(c.drainageTo!==null){discharge[c.drainageTo]+=discharge[id];provenance[c.drainageTo]=combine(w,provenance[c.drainageTo],provenance[id]);}if(c.terrain==='river'){c.riverFlow=clamp(discharge[id],0,3);c.links.weather=provenance[id];}}
 for(const c of w.cells.filter(land)){
 const river=c.basinRiver===null?undefined:w.cells[c.basinRiver];const distance=river?Math.hypot(c.x-river.x,c.y-river.y):99;
 const bank=Math.max(0,1-distance/3);c.riverFlow=river?river.riverFlow*bank:0;
 c.links.weather=combine(w,c.links.weather,river?provenance[river.id]:[]);
 c.water=clamp(c.water+Math.min(.04,c.riverFlow*.025));
 const lowland=clamp(1-(c.elevation-w.geography.seaLevel)/Math.max(.01,w.geography.mountainLevel-w.geography.seaLevel));
 c.floodRisk=clamp(biomes[c.biome].flood+Math.max(0,c.riverFlow-.35)*.42*(1-c.forest*.55)*lowland);
 if((c.riverFlow>.6||(c.biome==='wetland'&&c.water>.8))&&c.floodRisk>.2&&R.value(w.seed,'flood',w.year,c.id)<c.floodRisk*.14&&cooldown(w,c,'flood',7)){
 c.floodedUntil=w.year+1;c.soilFertility=clamp(c.soilFertility+.025);emit(w,c,'flood','上流の流出と保水力低下から洪水発生','weather');}
 if(sustained(c,'drought',c.water<.24,3))emit(w,c,'drought','少雨が続き干ばつが定着','weather');
 }
}

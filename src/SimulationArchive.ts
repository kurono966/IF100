import type {WorldState,Intervention} from './WorldState';
import {generate} from './WorldGenerator';
import {step,measure} from './Simulation';
import {apply} from './Intervention';
interface Checkpoint {world:WorldState;eventCount:number}
export class SimulationArchive {
 readonly checkpoints=new Map<number,Checkpoint>();
 constructor(public live:WorldState){this.save();}
 save():void {if(this.live.year%25!==0)return;const {events,...rest}=this.live;this.checkpoints.set(this.live.year,{world:{...structuredClone(rest),events:[]},eventCount:events.length});}
 seek(year:number):WorldState {
 if(!Number.isInteger(year)||year<0||year>this.live.year)throw Error('観測済みの年だけを閲覧できます。');
 if(year===this.live.year)return this.live;
 const latest=[...this.checkpoints.keys()].filter(y=>y<=year).sort((a,b)=>b-a)[0];
 const point=this.checkpoints.get(latest)!;const w=structuredClone(point.world);w.events=this.live.events.slice(0,point.eventCount);
 const applyAtYear=()=>{for(const i of this.live.interventions.filter(i=>i.year===w.year))if(!w.interventions.some(a=>a.id===i.id))apply(w,i);};
 while(w.year<year){applyAtYear();step(w);}applyAtYear();return w;
 }
}
export function initialWorld(seed:number):WorldState {const w=generate(seed);measure(w);return w;}
export function replay(seed:number,interventions:Intervention[],year:number):WorldState {
 const w=initialWorld(seed);while(w.year<year){for(const i of interventions.filter(i=>i.year===w.year))apply(w,i);step(w);}return w;
}

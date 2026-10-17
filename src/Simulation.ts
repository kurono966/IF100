import {END_YEAR} from './HistoryConfig';
import {updateCulture,seedResidents} from './CultureSystem';
import {updateLongHistory} from './LongHistorySystem';
import {updateLife} from './LifeSystem';
import {updatePopulation} from './SocietySystem';
import {updateCivilization} from './CivilizationSystem';
import {updateHydrology} from './NatureSystem';
import {emit,sustained} from './Dynamics';
import {generate} from './WorldGenerator';
import {SeededRandom as R} from './SeededRandom';
import {apply,land} from './Intervention';
import {record,combine} from './EventHistory';
import type {WorldState,Intervention,Cell,Phase} from './WorldState';
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));

const neighbors=new Map<number,number[]>();
for(let id=0;id<256;id++)neighbors.set(id,Array.from({length:256},(_,i)=>i).filter(i=>i!==id&&Math.abs(i%16-id%16)+Math.abs(Math.floor(i/16)-Math.floor(id/16))===1));
function milestone(w:WorldState,c:Cell,key:keyof Cell & string,phase:Phase,delta:number,up:string,down:string){
 const value=c[key] as number,previous=c.checkpoints[key]??value;
 if(Math.abs(value-previous)<delta)return;
 emit(w,c,key==='forest'&&value>previous?'forest_recovery':'ecology',value>previous?up:down,phase);
 c.checkpoints[key]=value;
}
export function measure(w:WorldState):void {
 const a=w.cells.filter(land),sum=(key:'population'|'wealth'|'forest'|'technology'|'herbivores'|'predators'|'biodiversity'|'food'|'vegetation')=>a.reduce((s,c)=>s+c[key],0);
 const nature=sum('vegetation')/a.length*100,tech=sum('technology')/a.length;
 w.metrics={population:Math.round(sum('population')),economy:Math.round(sum('wealth')),nature:Math.round(nature),technology:Math.round(tech),happiness:Math.round(clamp(.35+nature*.004+sum('food')/a.length*.2)*100),stability:Math.round(clamp(.9-a.filter(c=>c.food<.3).length/a.length*.6)*100),cities:a.filter(c=>c.stage>=2).length,forestRate:Math.round(sum('forest')/a.length*100),herbivores:Math.round(sum('herbivores')),predators:Math.round(sum('predators')),biodiversity:Math.round(sum('biodiversity')/a.length*100),food:Math.round(sum('food')/a.length*100)};
}
export function step(w:WorldState):WorldState {
 if(w.year>=END_YEAR)return w;
 seedResidents(w);
 const old=w.cells.map(c=>({...c,links:{...c.links},checkpoints:{...c.checkpoints},counters:{...c.counters},traditions:{...c.traditions}}));w.year++;
 // 1. Weather: independent random streams, plus strictly time-limited anomalies.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];const near=neighbors.get(c.id)!.map(i=>old[i]);
 const cycle=Math.floor(w.year/80),fraction=(w.year%80)/80;
 const climateShift=((1-fraction)*R.value(w.seed,'longClimate',cycle)+fraction*R.value(w.seed,'longClimate',cycle+1)-.5)*.20;
 const base=.35+R.value(w.seed,'rainfall',0,c.id)*.5+climateShift;
 const effects=w.effects.filter(e=>e.expires>=w.year&&Math.hypot(e.intervention.position.x-c.x,e.intervention.position.y-c.y)<=2);
 c.rainfall=clamp(base+(R.value(w.seed,'climate',w.year)-.5)*.25+(R.value(w.seed,'localWeather',w.year,c.id)-.5)*.12+effects.reduce((s,e)=>s+(e.intervention.type==='rain'?.16:e.intervention.type==='drought'?-.20:0),0),0,1.5);
 c.links.weather=effects.map(e=>e.event);
 c.temperature=12+R.value(w.seed,'temperature',0,c.id)*14+(R.value(w.seed,'temperature',w.year)-.5)*5+effects.filter(e=>e.intervention.type==='warmth').length*1.5;
 c.water=clamp(p.water*.58+c.rainfall*.40+(near.some(a=>a.terrain==='river')?.13:0)-Math.max(0,c.temperature-20)*.006);
 if(effects.some(e=>e.intervention.type==='wind'))c.water=clamp(c.water-.05);
 c.fireRisk=clamp((1-c.water)*p.vegetation*.65);
 }
 updateHydrology(w,old);
 // 2. Vegetation and soil. Dense woodland competes with farmland later.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id],near=neighbors.get(c.id)!.map(i=>old[i]).filter(land);
 const dispersal=near.reduce((s,a)=>s+a.vegetation,0)/Math.max(1,near.length);
 c.links.vegetation=combine(w,p.links.vegetation,c.links.weather,p.links.animals,...near.filter(a=>a.vegetation>.45).map(a=>a.links.vegetation));
 c.soilFertility=clamp(p.soilFertility+.009*p.vegetation-.003*(1-p.vegetation)+.0035*(1-Math.min(1,p.population/200))-p.development*.000025);
 const growth=(.035*c.water*c.soilFertility+.004*dispersal)*(1-p.vegetation)+.35*p.vegetation*(1-p.vegetation)*(p.vegetation-.48);
 c.vegetation=clamp(p.vegetation+growth-.0005*p.herbivores-.018*Math.max(0,.3-c.water)-p.development*.000035);
 c.forest=clamp(p.forest+(c.vegetation>.52?.022*c.vegetation:-.008)*(1-p.forest)-p.development*.000025);
 if(c.counters.ignition===1||R.value(w.seed,'fire',w.year,c.id)<c.fireRisk*.012){c.vegetation*=.65;c.forest*=.8;c.soilFertility=clamp(c.soilFertility+.06);c.burnedUntil=w.year+1;emit(w,c,'wildfire','山火事で森林が減り、灰が土壌に残る','vegetation',combine(w,c.links.vegetation,c.links.weather));c.counters.ignition=0;}
 c.biodiversity=clamp(p.biodiversity+.015*(c.vegetation+.2*Math.min(1,p.predators/3)-p.biodiversity)-.003*p.development/30);
 milestone(w,c,'vegetation','vegetation',.07,'植生が回復・拡大','植生が減少');
 milestone(w,c,'forest','vegetation',.07,'森林が拡大','森林が縮小');
 if(sustained(c,'forest-recovery',c.forest>.55&&old[c.id].checkpoints.forest<.5,3))emit(w,c,'forest_recovery','森林回復で保水と生息環境が変わる','vegetation');
 if(sustained(c,'collapse',c.vegetation<.08&&c.biodiversity<.3,4))emit(w,c,'ecosystem_collapse','植生と多様性が閾値を下回り生態系崩壊','vegetation');
 }
 // 3. Food chain and local migration, simultaneously from last year's animals.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id],near=neighbors.get(c.id)!.map(i=>old[i]).filter(land);
 c.links.animals=combine(w,p.links.animals,c.links.vegetation,...near.map(a=>a.links.animals));
 const capacity=3+c.vegetation*35*(1-c.forest*.5);
 c.herbivores=Math.max(0,p.herbivores+p.herbivores*.16*(1-p.herbivores/capacity)-.038*p.predators*p.herbivores/(1+p.herbivores/18)+near.reduce((s,a)=>s+a.herbivores-p.herbivores,0)*.018);
 c.predators=Math.max(0,p.predators+p.predators*(.12*p.herbivores/(p.herbivores+8)-.07)+near.reduce((s,a)=>s+a.predators-p.predators,0)*.012);
 milestone(w,c,'herbivores','animals',4,'草食動物が増加','草食動物が減少');
 milestone(w,c,'predators','animals',1,'捕食動物が増加','捕食動物が減少');
 }
 // Living conditions, conservative migration, then threshold-based civilization.
 updateCulture(w);
 updateLife(w,old);
 updatePopulation(w,old);
 updateCivilization(w,old);
 updateLongHistory(w,old);
 if(w.year===END_YEAR)for(const c of w.cells.filter(land)){
 const id=record(w,`${END_YEAR}年後：${['草地と生態系が残る地域','集落が続く地域','交易都市となった地域','産業都市となった地域'][c.stage]}`,c.id,combine(w,c.links.civilization,c.links.trade,c.links.population,c.links.culture,c.links.knowledge,...Object.values(c.traditions).map(t=>[t!.event])));w.events.at(-1)!.type='outcome';c.links.civilization=[id];
 }
 w.effects=w.effects.filter(e=>e.expires>w.year);measure(w);return w;
}
export function simulate(seed:number,interventions:Intervention[]=[],until=END_YEAR):WorldState {
 if(!Number.isInteger(until)||until<0||until>END_YEAR)throw Error('終了年は0〜1000です。');
 if(interventions.some(i=>!Number.isInteger(i.year)||i.year<0||i.year>=until))throw Error('介入年がシミュレーション範囲外です。');
 const w=generate(seed);measure(w);for(let year=0;year<until;year++){for(const i of interventions.filter(i=>i.year===year))apply(w,i);step(w);}return w;
}
export function classify(w:WorldState):string {const m=w.metrics;return m.forestRate>35?'森と共にある世界':m.biodiversity>55?'生命が巡る世界':m.cities>40?'都市が連なる世界':m.technology>12?'交易で結ばれた世界':m.herbivores>2500?'草食動物の世界':'分散した集落の世界';}


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
 const roots=new Set(c.links[phase].flatMap(id=>w.events[Number(id.slice(1))]?.roots||[]));
 const newOrigin=[...roots].some(root=>!c.checkpoints[`traced:${phase}:${root}`]);
 if(Math.abs(value-previous)<delta&&!(newOrigin&&Math.abs(value-previous)>.0001))return;
 for(const root of roots)c.checkpoints[`traced:${phase}:${root}`]=1;
 const parents=c.links[phase];const id=record(w,value>previous?up:down,c.id,parents);w.events[w.events.length-1].phase=phase;w.events[w.events.length-1].phases=[...new Set([...(w.events[w.events.length-1].phases||[]),phase])];
 c.links[phase]=[id];c.checkpoints[key]=value;
}
export function measure(w:WorldState):void {
 const a=w.cells.filter(land),sum=(key:'population'|'wealth'|'forest'|'technology'|'herbivores'|'predators'|'biodiversity'|'food'|'vegetation')=>a.reduce((s,c)=>s+c[key],0);
 const nature=sum('vegetation')/a.length*100,tech=sum('technology')/a.length;
 w.metrics={population:Math.round(sum('population')),economy:Math.round(sum('wealth')),nature:Math.round(nature),technology:Math.round(tech),happiness:Math.round(clamp(.35+nature*.004+sum('food')/a.length*.2)*100),stability:Math.round(clamp(.9-a.filter(c=>c.food<.3).length/a.length*.6)*100),cities:a.filter(c=>c.stage>=2).length,forestRate:Math.round(sum('forest')/a.length*100),herbivores:Math.round(sum('herbivores')),predators:Math.round(sum('predators')),biodiversity:Math.round(sum('biodiversity')/a.length*100),food:Math.round(sum('food')/a.length*100)};
}
export function step(w:WorldState):WorldState {
 if(w.year>=100)return w;
 const old=structuredClone(w.cells);w.year++;
 // 1. Weather: independent random streams, plus strictly time-limited anomalies.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];const near=neighbors.get(c.id)!.map(i=>old[i]);
 const base=.35+R.value(w.seed,'rainfall',0,c.id)*.5;
 const effects=w.effects.filter(e=>e.expires>=w.year&&Math.hypot(e.intervention.position.x-c.x,e.intervention.position.y-c.y)<=2);
 c.rainfall=clamp(base+(R.value(w.seed,'climate',w.year)-.5)*.25+(R.value(w.seed,'localWeather',w.year,c.id)-.5)*.12+effects.reduce((s,e)=>s+(e.intervention.type==='rain'?.4:-.45),0),0,1.5);
 c.links.weather=effects.map(e=>e.event);
 c.temperature=12+R.value(w.seed,'temperature',0,c.id)*14+(R.value(w.seed,'temperature',w.year)-.5)*5;
 c.water=clamp(p.water*.58+c.rainfall*.40+(near.some(a=>a.terrain==='river')?.13:0)-Math.max(0,c.temperature-20)*.006);
 c.fireRisk=clamp((1-c.water)*p.vegetation*.65);
 }
 // 2. Vegetation and soil. Dense woodland competes with farmland later.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id],near=neighbors.get(c.id)!.map(i=>old[i]).filter(land);
 const dispersal=near.reduce((s,a)=>s+a.vegetation,0)/Math.max(1,near.length);
 c.links.vegetation=combine(w,p.links.vegetation,c.links.weather,p.links.animals,...near.filter(a=>a.vegetation>.45).map(a=>a.links.vegetation));
 c.soilFertility=clamp(p.soilFertility+.009*p.vegetation-.005*(1-p.vegetation)-p.development*.000025);
 const growth=(.035*c.water*c.soilFertility+.004*dispersal)*(1-p.vegetation)+.35*p.vegetation*(1-p.vegetation)*(p.vegetation-.48);
 c.vegetation=clamp(p.vegetation+growth-.0005*p.herbivores-.018*Math.max(0,.3-c.water)-p.development*.000035);
 c.forest=clamp(p.forest+(c.vegetation>.52?.022*c.vegetation:-.008)*(1-p.forest)-p.development*.000025);
 if(R.value(w.seed,'fire',w.year,c.id)<c.fireRisk*.012){c.vegetation*=.65;c.forest*=.8;c.soilFertility=clamp(c.soilFertility+.06);c.burnedUntil=w.year+1;const id=record(w,'乾いた植生で山火事',c.id,c.links.vegetation);c.links.vegetation=[id];}
 c.biodiversity=clamp(p.biodiversity+.015*(c.vegetation+.2*Math.min(1,p.predators/3)-p.biodiversity)-.003*p.development/30);
 milestone(w,c,'vegetation','vegetation',.07,'植生が回復・拡大','植生が減少');
 milestone(w,c,'forest','vegetation',.07,'森林が拡大','森林が縮小');
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
 // 4. Food / carrying capacity: woodland helps wildlife, but reduces open farmland.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];
 c.links.food=combine(w,p.links.food,c.links.vegetation,c.links.animals);
 const farmland=(1-c.forest*.85)*c.water*c.soilFertility;
 c.food=clamp(farmland*1.3+c.vegetation*.12+c.herbivores*.006-c.predators*.012,0,1.5);
 milestone(w,c,'food','food',.09,'食料供給が増加','食料供給が減少');
 }
 // 5. Population: ONLY environment, food, and existing population determine change.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id],near=neighbors.get(c.id)!.map(i=>old[i]).filter(land);
 c.links.population=combine(w,p.links.population,c.links.food,...near.filter(a=>a.population>50).map(a=>a.links.population));
 const capacity=40+c.food*1250,nearPopulation=near.reduce((s,a)=>s+a.population,0);
 const fertility=.018+c.food*.06;
 c.population=Math.max(0,p.population+p.population*fertility*(1-p.population/capacity)+nearPopulation*.0018*Math.max(0,c.food-.2)-p.population*Math.max(0,.23-c.food)*.15);
 milestone(w,c,'population','population',70,'食料を支えに人口が増加','地域の人口が減少');
 }
 // 6. Civilization: no direct intervention lookup or type-specific bonus.
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id],near=neighbors.get(c.id)!.map(i=>old[i]).filter(land);
 c.links.civilization=combine(w,p.links.civilization,c.links.population,c.links.food);
 const surplus=Math.max(0,c.food-.27);
 c.trade=near.reduce((s,a)=>s+Math.min(c.population,a.population),0)/1300*(.3+p.infrastructure);
 c.wealth=Math.max(0,p.wealth+c.population*.003*surplus+c.trade*.4-p.wealth*.002);
 c.technology=p.technology+surplus*.12+c.trade*.035;
 c.development=clamp(p.development+surplus*.55+c.trade*.15+c.population*.0003-Math.max(0,.25-c.food)*.2,0,120);
 c.infrastructure=clamp(c.development/45,0,2.8);
 const stage=c.population>650&&c.development>55&&c.technology>12?3:c.population>350&&c.development>30?2:c.population>100&&c.development>10?1:0;
 if(stage!==c.stage){const id=record(w,stage>c.stage?['','集落が形成された','集落が都市へ発展','産業地域が形成された'][stage]:'食料と人口の変化で集落が縮小',c.id,c.links.civilization);w.events[w.events.length-1].phase='civilization';w.events[w.events.length-1].phases=[...new Set([...(w.events[w.events.length-1].phases||[]),'civilization' as const])];c.links.civilization=[id];c.stage=stage;}
 milestone(w,c,'trade','civilization',.6,'集落間の交易が拡大','集落間の交易が縮小');
 if(w.year===100&&Object.values(c.links).some(a=>a.length)){record(w,`100年後：${['草地と生態系が残る地域','集落が続く地域','都市が成立した地域','産業都市となった地域'][c.stage]}`,c.id,c.links.civilization);}
 }
 w.effects=w.effects.filter(e=>e.expires>w.year);measure(w);return w;
}
export function simulate(seed:number,interventions:Intervention[]=[],until=100):WorldState {
 if(!Number.isInteger(until)||until<0||until>100)throw Error('終了年は0〜100です。');
 if(interventions.some(i=>!Number.isInteger(i.year)||i.year<0||i.year>=until))throw Error('介入年がシミュレーション範囲外です。');
 const w=generate(seed);measure(w);for(let year=0;year<until;year++){for(const i of interventions.filter(i=>i.year===year))apply(w,i);step(w);}return w;
}
export function classify(w:WorldState):string {const m=w.metrics;return m.forestRate>35?'森と共にある世界':m.biodiversity>55?'生命が巡る世界':m.cities>40?'都市が連なる世界':m.technology>12?'交易で結ばれた世界':m.herbivores>2500?'草食動物の世界':'分散した集落の世界';}


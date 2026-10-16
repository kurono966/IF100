import {generate} from './WorldGenerator';
import {SeededRandom as R} from './SeededRandom';
import {apply,land} from './Intervention';
import {record} from './EventHistory';
import type {WorldState,Intervention} from './WorldState';
const clamp=(n:number,a=0,b=100)=>Math.max(a,Math.min(b,n));
export function measure(w:WorldState):void {
 const a=w.cells.filter(land),sum=(key:'population'|'wealth'|'forest'|'technology')=>a.reduce((s,c)=>s+c[key],0);
 const nature=sum('forest')/a.length*100,tech=sum('technology')/a.length;
 w.metrics={population:Math.round(sum('population')),economy:Math.round(sum('wealth')),nature:Math.round(nature),technology:Math.round(tech),happiness:Math.round(clamp(40+nature*.35+tech*.25-a.filter(c=>c.stage===3).length*.3)),stability:Math.round(clamp(65+nature*.2-a.filter(c=>c.population>1200).length)),cities:a.filter(c=>c.stage>=2).length,forestRate:Math.round(nature)};
}
export function step(w:WorldState):WorldState {
 if(w.year>=100)return w;const old=structuredClone(w.cells);w.year++;
 const climate=.8+R.value(w.seed,'climate',w.year)*.4;
 const flood=R.value(w.seed,'disaster',w.year)<.085;
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];
 const near=old.filter(a=>Math.abs(a.x-c.x)+Math.abs(a.y-c.y)<=2&&a.id!==c.id);
 const hospital=w.interventions.some(i=>i.type==='hospital'&&Math.hypot(i.position.x-c.x,i.position.y-c.y)<3.5);
 const research=w.interventions.filter(i=>i.type==='research'&&Math.hypot(i.position.x-c.x,i.position.y-c.y)<4.5).length;
 const market=near.reduce((s,a)=>s+a.population,0)/2200;
 c.trade=p.infrastructure*(.3+market)+near.reduce((s,a)=>s+a.infrastructure,0)*.09;
 c.technology=p.technology+.07+research*.6+near.reduce((s,a)=>s+a.technology,0)/Math.max(1,near.length)*.004+c.trade*.016;
 c.wealth=p.wealth+(p.population*.004+c.trade*.8)*(1+c.technology*.012)*climate;
 c.development=p.development+(.17+c.trade*.20+c.wealth*.0015+c.technology*.015)*(c.protected?.42:1);
 const capacity=100+c.development*12+c.trade*150;
 const growth=.014+Number(hospital)*.016+c.trade*.003+(R.value(w.seed,'population',w.year,c.id)-.5)*.008;
 c.population=Math.max(0,p.population*(1+growth*(1-p.population/(capacity*2)))+Math.min(market,3)*(.4+c.trade*.4));
 if(flood&&near.some(a=>a.terrain==='river')){c.population*=hospital?.97:.90;c.wealth*=.96;if(c.population>160)record(w,'洪水が川沿いを襲う',c.id);}
 c.forest=clamp(p.forest-(c.protected?.0003:.0015+c.development*.000035),0,1);
 if(c.development>25)c.infrastructure=Math.min(2.8,c.infrastructure+.012+c.wealth*.000015);
 const stage=c.development>72&&c.technology>24?3:c.population>550&&c.development>42?2:c.population>130?1:0;
 if(stage>c.stage){const id=record(w,['','集落が形成された','集落が都市へ発展','産業地域が形成された'][stage],c.id,c.causes.slice(-3));c.causes=[id];c.stage=stage;}
 if(w.year%15===0&&c.trade>1.1&&c.causes.length){const id=record(w,c.trade>2.5?'広域市場と道路網が発達':'地域の交易が拡大',c.id,c.causes.slice(-3));c.causes=[id];}
 // Carry knowledge and causality across actual neighboring trade links.
 if(w.year%10===0&&c.trade>.5){for(const a of near.filter(a=>a.infrastructure>.6&&a.causes.length))c.causes=[...new Set([...c.causes,...a.causes])].slice(-4);}
 }
 measure(w);return w;
}
export function simulate(seed:number,interventions:Intervention[]=[],until=100):WorldState {
 const w=generate(seed);measure(w);for(let year=0;year<until;year++){for(const i of interventions.filter(i=>i.year===year))apply(w,i);step(w);}return w;
}
export function classify(w:WorldState):string {const m=w.metrics;return m.nature>40?'緑の世界':m.technology>25?'技術中心社会':w.cells.filter(c=>c.stage===3).length>12?'工業世界':m.cities>25?'巨大都市文明':m.economy/Math.max(1,m.population)>.7?'小さく豊かな世界':'分散型社会';}



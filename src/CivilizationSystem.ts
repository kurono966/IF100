import type {WorldState,Cell} from './WorldState';
import {combine} from './EventHistory';
import {land} from './Intervention';
import {SeededRandom as R} from './SeededRandom';
import {clamp,distance,emit,sustained,cooldown,pathBetween} from './Dynamics';
export const MARKET_POPULATION=400;
export function updateCivilization(w:WorldState,old:Cell[]):void {
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];
 c.links.civilization=combine(w,p.links.civilization,c.links.population,c.links.migration,c.links.food,p.links.trade,c.links.knowledge,c.links.culture);
 const neighbors=old.filter(a=>a.id!==c.id&&a.stage>=1&&distance(c,a)<=5);
 c.urbanInfluence=clamp(old.filter(a=>distance(c,a)<=5).reduce((s,a)=>s+(a.stage>=2?1:0),0)/5);
 const craft=Object.values(c.traditions).reduce((sum,t)=>sum+(t?.industrial?t.strength*.015:0),0);
 c.wealth=Math.max(0,p.wealth+c.population*craft*.015+c.population*.002*Math.max(0,c.foodSurplus)+p.trade*.9-p.wealth*.003);
 c.technology=p.technology*(c.population>50?.9995:.995)+Math.max(0,c.foodSurplus)*.08+p.trade*.075;
 c.development=clamp(p.development+Math.max(0,c.foodSurplus)*.45+c.population*.0002+p.trade*.28-Math.max(0,-c.foodSurplus)*.3,0,150);
 if(w.year>=100&&!c.markets&&sustained(c,'market',c.population>=MARKET_POPULATION&&c.foodSurplus>.025&&neighbors.length>=2,3)){
  c.markets=1;emit(w,c,'market','食料余剰・人口400人・周辺集落がそろい市場成立','trade',c.links.civilization);
 }
 if(c.markets&&sustained(c,'market-loss',c.population<220||c.foodSurplus<-.15,5)){
  c.markets=0;emit(w,c,'decline','人口と食料の減少で市場が閉鎖','trade',c.links.civilization);
 }
 if(c.stage===0&&sustained(c,'settlement',c.population>100&&c.development>8,3)){
  c.stage=1;emit(w,c,'settlement',`${c.livelihood==='hunting'?'狩猟':c.livelihood==='forestry'?'林業':'農耕'}集落が形成される`,'civilization');
 }else if(w.year>=300&&c.stage===1&&sustained(c,'city',c.markets>0&&p.trade>.35&&c.population>650&&c.development>30,5)){
  c.stage=2;emit(w,c,'urbanization','市場・交易路・人口流入が結びつき都市化','civilization',combine(w,c.links.civilization,c.links.trade));
 }else if(w.year>=300&&c.stage===2&&sustained(c,'industry',c.population>950&&c.technology>9&&p.trade>.8&&c.resourceAvailability>.25,5)){
  c.stage=3;c.livelihood='craft';emit(w,c,'industry','資源と交易を基盤に地域産業が成立','civilization',combine(w,c.links.civilization,c.links.trade,c.links.life));
 }
 if(c.stage>=2&&sustained(c,'decline',c.population<450||c.markets===0,5)){
  c.stage=1;emit(w,c,'decline','交易と人口が他地域へ移り都市が衰退','civilization');
 }
 if(c.stage===1&&sustained(c,'abandon',c.population<55,4)){
  c.stage=0;c.markets=0;emit(w,c,'abandonment','移住と食料不足で集落が放棄される','civilization');
 }
 c.settlementStage=c.stage;
 }
 if(w.year>=100&&w.year%5===0)formRoutes(w);
 updateRoutes(w);
}
function formRoutes(w:WorldState):void {
 for(const c of w.cells.filter(c=>c.markets>0)){
 const existing=w.routes.filter(r=>(r.from===c.id||r.to===c.id)&&(r.volume>.03||w.year-r.formed<20));if(existing.length>=3||!cooldown(w,c,'route-attempt',4))continue;
 const destinations=w.cells.filter(a=>a.stage>=1&&a.id!==c.id&&distance(a,c)<=10&&!existing.some(r=>r.from===a.id||r.to===a.id))
 .sort((a,b)=>(b.localDemand+b.markets*.5-distance(b,c)*.06)-(a.localDemand+a.markets*.5-distance(a,c)*.06)||a.id-b.id);
 for(const target of destinations){const path=pathBetween(w,c.id,target.id,14);if(!path)continue;
  const parents=combine(w,c.links.trade,c.links.civilization,target.links.life,target.links.civilization);
  const event=emit(w,c,'trade_route',`${c.livelihood==='hunting'?'毛皮':c.livelihood==='forestry'?'木材':'食料・資源'}の新交易路が (${target.x}, ${target.y}) へ形成`,'trade',parents);
  w.events.at(-1)!.destination=target.id;
  w.routes.push({id:`r${w.routes.length}`,from:c.id,to:target.id,path,formed:w.year,volume:0,parents,event});
  target.links.trade=combine(w,target.links.trade,[event]);break;
 }
 }
}
function updateRoutes(w:WorldState):void {
 const trade=w.cells.map(()=>0),roads=w.cells.map(()=>0);
 for(const route of w.routes){const a=w.cells[route.from],b=w.cells[route.to];
 const oldAge=w.year-route.formed;
 const strain=oldAge>120?Math.max(0,(a.exhaustion+b.exhaustion)*.4):0;
 const active=(a.markets>0||b.markets>0)&&a.stage>0&&b.stage>0;
 const demand=Math.min(a.localDemand,b.localDemand);
 const skillBonus=(a.traditions.boats?.adopted?a.traditions.boats.strength*.06:0)+(b.traditions.commerce?.adopted?b.traditions.commerce.strength*.06:0);
 const target=active?demand*(1+skillBonus)*(1-strain)*(.5+(a.markets+b.markets)*.25)*(route.roadYear?1.45:1):0;
 route.volume+=(target-route.volume)*.14;
 if(w.year>=120&&!route.roadYear&&w.year-route.formed>=6&&route.volume>.18&&R.value(w.seed,'road',w.year,route.from*256+route.to)<.22){
  route.roadYear=w.year;route.event=emit(w,a,'road',`商人の往来が積み重なり (${b.x}, ${b.y}) への道路形成`,'trade',[route.event]);
 }
 trade[a.id]+=route.volume;trade[b.id]+=route.volume;
 a.links.trade=combine(w,a.links.trade,[route.event]);b.links.trade=combine(w,b.links.trade,[route.event]);
 for(const id of route.path){if(route.roadYear&&route.volume>.03)roads[id]++;if(id!==a.id&&id!==b.id){trade[id]+=route.volume*.16;w.cells[id].links.trade=combine(w,w.cells[id].links.trade,[route.event]);}}
 }
 for(const c of w.cells){c.trade=trade[c.id];c.roads=roads[c.id];c.infrastructure=clamp(c.roads*.65,0,2.8);}
}

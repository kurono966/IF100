import {thermalSuitability} from './Biomes';
import type {WorldState,Cell} from './WorldState';
import {combine} from './EventHistory';
import {land} from './Intervention';
import {clamp,distance,emit,pathBetween} from './Dynamics';
export function updatePopulation(w:WorldState,old:Cell[]):void {
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];
 c.links.population=combine(w,p.links.population,c.links.food,c.links.life,p.links.trade,p.links.civilization);
 const imports=Math.min(.35,p.trade*.08),supply=c.foodProduction+imports;
 const capacity=(30+supply*1550*(.65+c.health*.35))*thermalSuitability(c.temperature);c.populationCapacity=capacity;
 const births=p.population*(.025+supply*.025)*c.health;
 const deaths=p.population*(.012+Math.max(0,p.population/capacity-1)*.055+(1-c.health)*.018+(c.epidemicUntil>=w.year?.035:0));
 c.population=Math.max(0,p.population+births-deaths);
 c.foodSurplus=supply-c.population/1600;
 c.localDemand=c.population/400*(.6+c.resourceAvailability*.4);
 const crowding=Math.max(0,c.population/capacity-1)*.26;
 c.settlementAttractiveness=clamp(c.habitability+p.markets*.24+Math.min(.28,p.trade*.09)+Math.min(.12,p.roads*.04)+p.urbanInfluence*.08-crowding-(c.floodedUntil>=w.year?.3:0),0,1.5);
 c.migration=0;
 }
 if(w.year<=100||w.year%3===0)migrate(w);
 for(const c of w.cells.filter(land)){if(Math.abs(c.population-(c.checkpoints.population??0))>=60){
 emit(w,c,'ecology',c.population>(c.checkpoints.population??0)?'生活条件と移住の蓄積で地域人口が増加':'生活条件と移住の蓄積で地域人口が減少','population',combine(w,c.links.population,c.links.migration,c.links.food));c.checkpoints.population=c.population;
 }}
}
// Population moves are transfers, never creation. Plans use one frozen snapshot.
export function migrate(w:WorldState):void {
 const snapshot=w.cells.map(c=>({...c,links:{...c.links}})),plans:{from:number;to:number;amount:number;route?:string}[]=[];
 for(const source of snapshot.filter(land)){
 if(source.population<15)continue;
 const forced=source.floodedUntil>=w.year||source.foodSurplus<-.08||source.epidemicUntil>=w.year;
 const candidates=snapshot.filter(c=>land(c)&&c.id!==source.id&&distance(c,source)<=9&&c.settlementAttractiveness-source.settlementAttractiveness>.085+distance(c,source)*.012)
 .sort((a,b)=>(b.settlementAttractiveness-distance(b,source)*.012)-(a.settlementAttractiveness-distance(a,source)*.012)||a.id-b.id);
 const destination=candidates.slice(0,4).find(c=>pathBetween(w,source.id,c.id,12));if(!destination)continue;
 const amount=Math.min(source.population*.12,source.population*(forced?.045:.009)*(1+destination.markets*.7));
 if(amount<.25)continue;
 const route=w.routes.find(r=>(r.from===source.id&&r.to===destination.id)||(r.to===source.id&&r.from===destination.id));
 plans.push({from:source.id,to:destination.id,amount,route:route?.event});
 }
 for(const plan of plans){const a=w.cells[plan.from],b=w.cells[plan.to];a.population-=plan.amount;b.population+=plan.amount;a.migration-=plan.amount;b.migration+=plan.amount;
 const parents=combine(w,a.links.population,a.links.life,a.links.food,b.links.trade,b.links.civilization,plan.route?[plan.route]:[]);
 if(plan.amount>=2&&(w.year%5===0||a.floodedUntil===w.year+1)){
 const large=plan.amount>=Math.max(18,snapshot[a.id].population*.07);
 const id=emit(w,a,large?'mass_migration':'migration',`${large?'大移住：':''}${a.floodedUntil>=w.year?'洪水を避け':a.foodSurplus<0?'食料を求め':'暮らしと交易を求め'}住民が (${b.x}, ${b.y}) へ移住`,'migration',parents);
 const e=w.events.at(-1)!;e.destination=b.id;e.amount=plan.amount;
 b.links.migration=combine(w,b.links.migration,[id]);b.links.population=combine(w,b.links.population,[id]);
 }else{b.links.population=combine(w,b.links.population,parents);}
 }
}

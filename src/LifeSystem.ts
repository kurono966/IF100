import {agriculture,biomes} from './Biomes';
import type {WorldState,Cell} from './WorldState';
import {combine} from './EventHistory';
import {land} from './Intervention';
import {SeededRandom as R} from './SeededRandom';
import {clamp,emit,sustained,cooldown} from './Dynamics';
// A disaster changes living conditions here; only the population system applies mortality.
export function updateLife(w:WorldState,old:Cell[]):void {
 for(const c of w.cells){if(!land(c))continue;const p=old[c.id];
 c.links.life=combine(w,p.links.life,c.links.vegetation,c.links.animals,c.links.weather,c.links.knowledge,c.links.culture,p.links.civilization);
 const windy=w.effects.some(e=>e.intervention.type==='wind'&&Math.hypot(e.intervention.position.x-c.x,e.intervention.position.y-c.y)<=2);
 const wetland=c.water*(1-c.forest*.45)*(c.biome==='rainforest'||c.biome==='wetland'?1.25:1)*(windy?.6:1);
 c.pests=clamp(p.pests+(wetland*.8+.15*(1-c.biodiversity)-p.pests)*.16-c.predators*.003);
 c.diseaseRisk=clamp(biomes[c.biome].disease*.25+c.pests*.55+c.water*.10+Math.max(0,p.population-400)*.00013-c.biodiversity*.12);
 if(c.diseaseRisk>.35&&R.value(w.seed,'epidemic',w.year,c.id)<c.diseaseRisk*.13&&cooldown(w,c,'epidemic',8)){
  c.epidemicUntil=w.year+3;emit(w,c,'epidemic','害虫と人口密集から疫病流行','life');
 }
 const flooded=c.floodedUntil>=w.year,epidemic=c.epidemicUntil>=w.year;
 c.health=clamp(p.health+(1-c.diseaseRisk-p.health)*.12-(epidemic?.10:0)-(flooded?.08:0),.08,1);
 c.resourceAvailability=clamp((c.biome==='taiga'?.12:0)+c.forest*.38+c.herbivores*.013+c.soilFertility*.28);
 const storage=c.traditions.pottery?.adopted?c.traditions.pottery.strength*.035:0;
 const learned=c.traditions.agronomy?.adopted?c.traditions.agronomy.strength*.08:0;
 const medicine=c.traditions.healing?.adopted?c.traditions.healing.strength*.04:0;
 c.health=clamp(c.health+medicine*.05-c.exhaustion*.003,.08,1);
 const farmland=(1-c.forest*.85)*c.water*c.soilFertility*agriculture(c);
 c.foodProduction=clamp((farmland*1.3+c.vegetation*.12+c.herbivores*.006-c.predators*.012)*(1-c.pests*.3)*(flooded?.55:1)*(1-c.exhaustion*.3)+learned,0,1.5);
 // Resource discoveries are persistent new practices; bonuses require their ecological resource.
 if(c.livelihood==='subsistence'&&sustained(c,'resource',c.population>50&&c.resourceAvailability>.32,4)){
  c.livelihood=c.herbivores>12&&c.forest<.5?'hunting':c.forest>.5?'forestry':'farming';
  emit(w,c,'resource_use',{hunting:'草原の獣を利用する狩猟・毛皮生活が始まる',forestry:'森林資源と木材の利用が始まる',farming:'開けた土地で農耕生活が始まる'}[c.livelihood],'life');
 }
 if(c.livelihood==='hunting')c.foodProduction+=Math.min(.05,c.herbivores*.002);
 if(c.livelihood==='farming')c.foodProduction+=farmland*(.08+Math.min(.22,p.development/300))*(1-c.exhaustion);
 // Local farming practice and market storage persist only while people maintain them.
 if(p.regionState==='agricultural')c.foodProduction+=farmland*.10*(1-c.exhaustion);
 if(p.markets)c.foodProduction*=1+Math.min(.08,p.trade*.035);
 c.foodProduction*=1+storage;
 c.foodSurplus=c.foodProduction-p.population/1600;
 c.food=c.foodProduction;
 c.habitability=clamp(c.health*.33+c.foodProduction*.65+c.resourceAvailability*.12-(flooded?.25:0)-Math.max(0,c.temperature-28)*.01);
 c.links.food=combine(w,p.links.food,c.links.life);
 if(sustained(c,'shortage',c.foodSurplus<-.025,2)&&cooldown(w,c,'shortage',8))emit(w,c,'shortage','食料不足が続き暮らしが不安定に','food');
 if(sustained(c,'harvest',c.foodSurplus>.12&&c.population>50,3)&&cooldown(w,c,'harvest',10))emit(w,c,'harvest','豊作が続き食料余剰が生まれる','food');
 // A meaningful change of living conditions carries causes across layers, rather than a bonus.
 if(Math.abs(c.foodProduction-(c.checkpoints.food??0))>.065){emit(w,c,'ecology',c.foodProduction>(c.checkpoints.food??0)?'生態系の変化で食料供給が増加':'生態系の変化で食料供給が減少','food');c.checkpoints.food=c.foodProduction;}
 }
}

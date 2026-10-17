import type {WorldState,Cell} from './WorldState';
import {SeededRandom as R} from './SeededRandom';
import {generateGeography} from './GeographyGenerator';
import {biomes,agriculture,thermalSuitability} from './Biomes';
export function generate(seed:number):WorldState {
 const {tiles,settings:geography}=generateGeography(seed);
 const cells:Cell[]=tiles.map(g=>{
 const {id,x,y}=g,profile=biomes[g.biome],land=!['sea','river','mountain'].includes(g.terrain),waterAccess=Math.exp(-g.distanceToWater*.5);
 const rainfall=Math.max(.01,Math.min(1.4,g.moisture*1.25+(g.biome==='rainforest'?.15:0)));
 const riverBank=g.basinRiver!==null&&Math.hypot(tiles[g.basinRiver].x-x,tiles[g.basinRiver].y-y)<=1.5;
 const soilFertility=Math.min(1,profile.fertility+(riverBank?.10:0));
 const water=Math.min(1,profile.water*.65+rainfall*.25+waterAccess*.1);
 const vegetation=profile.vegetation,forest=profile.forest,herbivores=land?profile.animals*(.9+R.value(seed,'initialAnimals',0,id)*.2):0;
 const predators=land?herbivores*.07:0;
 const floodRisk=profile.flood+(riverBank?.12:0),diseaseRisk=profile.disease;
 const foodProduction=land?((1-forest*.85)*water*soilFertility*1.3*agriculture({temperature:g.temperature,biome:g.biome})+vegetation*.12+herbivores*.006):0;
 const habitability=land?Math.max(0,Math.min(1,foodProduction*.8+waterAccess*.16+thermalSuitability(g.temperature)*.18-floodRisk*.16-diseaseRisk*.15)):0;
 const population=land?1+habitability*7:0;
 return {...g,baseRainfall:rainfall,baseTemperature:g.temperature,fertilityPotential:soilFertility,populationCapacity:land?(30+foodProduction*1550)*thermalSuitability(g.temperature):0,
 population,wealth:land?3:0,development:0,forest,infrastructure:0,technology:land?1:0,trade:0,stage:0,
 rainfall,temperature:g.temperature,soilFertility,vegetation,water,herbivores,predators,biodiversity:profile.diversity,fireRisk:(1-water)*vegetation*.5,food:foodProduction,burnedUntil:-1,
 riverFlow:g.terrain==='river'?.2:0,floodRisk,pests:profile.pests,diseaseRisk,foodProduction,foodSurplus:foodProduction-population/1600,health:Math.max(.3,1-diseaseRisk*.65),resourceAvailability:forest*.38+herbivores*.013+soilFertility*.28,habitability,migration:0,localDemand:0,settlementAttractiveness:habitability,settlementStage:0,roads:0,markets:0,urbanInfluence:0,livelihood:'subsistence',counters:{},floodedUntil:-1,epidemicUntil:-1,
 cultureId:`c${Math.floor(x/6)}${Math.floor(y/6)}`,cultureName:['葦辺','森丘','赤土','風原','川輪','石野'][(Math.floor(x/6)+Math.floor(y/6)*3)%6],placeName:`${['葦','森','土','風','川','石'][id%6]}の${['里','丘','浜','原'][Math.floor(id/6)%4]}`,traditions:{},ruins:0,exhaustion:0,civicAge:0,prestige:0,
 links:{knowledge:[],culture:[],life:[],migration:[],trade:[],weather:[],vegetation:[],animals:[],food:[],population:[],civilization:[]},checkpoints:{vegetation,forest,herbivores,predators,food:foodProduction,population,development:0,trade:0}};
 });
 // Weighted sampling without replacement. Favor water, fertile soil and tolerable climate.
 const candidates=cells.filter(c=>!['sea','river','mountain'].includes(c.terrain)).map(c=>({cell:c,key:-Math.log(Math.max(1e-9,R.value(seed,'initialSettlement',0,c.id)))/Math.pow(Math.max(.03,c.habitability),3)})).sort((a,b)=>a.key-b.key||a.cell.id-b.cell.id);
 const count=Math.min(candidates.length,Math.max(2,Math.round(candidates.length*(.055+R.value(seed,'settlementDensity')*.06))));
 for(const {cell:c} of candidates.slice(0,count)){c.population=Math.max(25,Math.min(c.populationCapacity*.7,60+c.habitability*300));c.wealth=8;c.development=12;c.infrastructure=.15;c.stage=c.settlementStage=1;c.checkpoints.population=c.population;c.checkpoints.development=12;}
 return {geography,seed,year:0,cells,events:[],interventions:[],effects:[],routes:[],people:[],realms:[],traces:[],metrics:{population:0,economy:0,nature:0,technology:0,happiness:0,stability:0,cities:0,forestRate:0,herbivores:0,predators:0,biodiversity:0,food:0}};
}

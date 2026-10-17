import type {WorldState,Cell} from './WorldState';
import {SeededRandom as R} from './SeededRandom';
export function generate(seed:number):WorldState {
 const cells:Cell[]=[];const river=6+Math.floor(R.value(seed,'river')*4);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
 const id=y*16+x,r=R.value(seed,'terrain',0,id),edge=Math.min(x,y,15-x,15-y);
 const terrain=edge===0||(edge===1&&r<.48)?'sea':x===river+Math.round(Math.sin(y*.65))?'river':r<.13?'mountain':r<.55?'forest':'plain';
 const land=!['sea','river','mountain'].includes(terrain),settled=land&&R.value(seed,'settlement',0,id)<.15;
 const vegetation=land?(terrain==='forest'?.7:.26)+R.value(seed,'vegetation',0,id)*.15:0;
 const herbivores=land?5+R.value(seed,'animals',0,id)*12:0,predators=land?.5+R.value(seed,'predators',0,id)*2:0;
 const population=settled?100+R.value(seed,'population',0,id)*200:land?8:0;
 cells.push({id,x,y,terrain,population,wealth:land?8:0,development:settled?12:0,forest:terrain==='forest'?.7:land?.10:0,infrastructure:settled?.15:0,technology:land?1:0,trade:0,stage:settled?1:0,
 rainfall:.35+R.value(seed,'rainfall',0,id)*.5,temperature:12+R.value(seed,'temperature',0,id)*14,soilFertility:.35+R.value(seed,'soil',0,id)*.45,vegetation,water:.4,herbivores,predators,biodiversity:land?.3+vegetation*.3:0,fireRisk:0,food:0,burnedUntil:-1,
 links:{weather:[],vegetation:[],animals:[],food:[],population:[],civilization:[]},checkpoints:{vegetation,forest:terrain==='forest'?.7:.1,herbivores,predators,food:0,population,development:settled?12:0,trade:0}});
 }
 return {seed,year:0,cells,events:[],interventions:[],effects:[],metrics:{population:0,economy:0,nature:0,technology:0,happiness:0,stability:0,cities:0,forestRate:0,herbivores:0,predators:0,biodiversity:0,food:0}};
}

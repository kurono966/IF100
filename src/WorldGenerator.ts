import type {WorldState,Cell} from './WorldState';
import {SeededRandom as R} from './SeededRandom';
export function generate(seed:number):WorldState {
 const cells:Cell[]=[];const river=6+Math.floor(R.value(seed,'river')*4);
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
 const id=y*16+x;const r=R.value(seed,'terrain',0,id);const edge=Math.min(x,y,15-x,15-y);
 const terrain=edge===0|| (edge===1&&r<.48)?'sea':x===river+Math.round(Math.sin(y*.65))?'river':r<.13?'mountain':r<.55?'forest':'plain';
 const land=terrain!=='sea'&&terrain!=='river'&&terrain!=='mountain';
 const settled=land&&R.value(seed,'settlement',0,id)<.15;
 cells.push({id,x,y,terrain,population:settled?100+R.value(seed,'population',0,id)*200:land?8:0,wealth:land?8:0,development:settled?12:0,forest:terrain==='forest'?1:land?.12:0,infrastructure:settled?.15:0,technology:land?1:0,trade:0,protected:false,buildings:[],causes:[],stage:settled?1:0});
 }
 return {seed,year:0,cells,events:[],interventions:[],metrics:{population:0,economy:0,nature:0,technology:0,happiness:0,stability:0,cities:0,forestRate:0}};
}

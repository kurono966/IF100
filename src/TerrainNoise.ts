// Continuous, counter-seeded lattice noise. Sampling never consumes shared RNG state.
import {SeededRandom as R} from './SeededRandom';
const smooth=(t:number)=>t*t*t*(t*(t*6-15)+10);
const mix=(a:number,b:number,t:number)=>a+(b-a)*t;
export class TerrainNoise {
 constructor(readonly seed:number,readonly stream:string){}
 value(x:number,y:number):number {
  const ix=Math.floor(x),iy=Math.floor(y),u=smooth(x-ix),v=smooth(y-iy);
  const sample=(a:number,b:number)=>R.value(this.seed,`${this.stream}:${a}:${b}`);
  return mix(mix(sample(ix,iy),sample(ix+1,iy),u),mix(sample(ix,iy+1),sample(ix+1,iy+1),u),v);
 }
 fractal(x:number,y:number,octaves=4):number {
  let sum=0,weight=0,amplitude=1;for(let i=0;i<octaves;i++){sum+=this.value(x,y)*amplitude;weight+=amplitude;x=x*2.03+17.2;y=y*2.03-11.7;amplitude*=.48;}return sum/weight;
 }
}

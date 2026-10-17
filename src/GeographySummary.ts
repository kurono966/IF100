import type {WorldState} from './WorldState';
import {biomes} from './Biomes';
export function geographySummary(w:WorldState):string {
 const land=w.cells.filter(c=>c.terrain!=='sea'),sea=Math.round((256-land.length)/256*100);
 const temperature=land.reduce((s,c)=>s+c.baseTemperature,0)/Math.max(1,land.length);
 const counts=new Map<string,number>();for(const c of land)counts.set(c.biome,(counts.get(c.biome)||0)+1);
 const dominant=[...counts.entries()].sort((a,b)=>b[1]-a[1]).slice(0,3).map(([b])=>biomes[b as keyof typeof biomes].name).join('・');
 return `海 ${sea}% / 陸地平均 ${temperature.toFixed(0)}℃ / 水系 ${w.geography.riverPaths.length}本 / ${dominant}`;
}

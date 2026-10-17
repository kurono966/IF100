import type {WorldState,Cell} from './WorldState';
import {TerrainNoise} from './TerrainNoise';
import {SeededRandom as R} from './SeededRandom';
export type LocalSurface='water'|'sand'|'grass'|'forest'|'rock'|'snow'|'marsh';
export interface LocalTile {x:number;y:number;elevation:number;surface:LocalSurface;building:boolean;field:boolean;road:boolean;ruin:boolean}
export const LOCAL_SIZE=32;
// Visual subdivision only: never writes back to the civilization simulation.
export function generateLocalMap(w:WorldState,c:Cell):LocalTile[]{
 const noise=new TerrainNoise(w.seed,'local-relief'),cover=new TerrainNoise(w.seed,'local-cover');
 const sampleElevation=(gx:number,gy:number)=>{const fx=gx-.5,fy=gy-.5,x=Math.floor(fx),y=Math.floor(fy),u=fx-x,v=fy-y;const at=(a:number,b:number)=>w.cells[Math.max(0,Math.min(15,b))*16+Math.max(0,Math.min(15,a))].elevation;return at(x,y)*(1-u)*(1-v)+at(x+1,y)*u*(1-v)+at(x,y+1)*(1-u)*v+at(x+1,y+1)*u*v;};
 const neighbor=(dx:number,dy:number)=>w.cells.find(a=>a.x===c.x+dx&&a.y===c.y+dy)||c;
 const rivers=w.geography.riverPaths.filter(p=>p.includes(c.id));
 const ports:{x:number;y:number}[]=[];
 for(const path of rivers){const i=path.indexOf(c.id);for(const id of [path[i-1],path[i+1]]){if(id===undefined)continue;const a=w.cells[id];ports.push({x:16+(a.x-c.x)*16,y:16+(a.y-c.y)*16});}}
 if(c.terrain==='river'&&ports.length===0){const d=c.drainageTo===null?undefined:w.cells[c.drainageTo];ports.push({x:16,y:0},{x:d?16+(d.x-c.x)*16:16,y:d?16+(d.y-c.y)*16:32});}
 const distance=(x:number,y:number,a:{x:number;y:number},b:{x:number;y:number})=>{const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((x-a.x)*dx+(y-a.y)*dy)/(dx*dx+dy*dy||1)));return Math.hypot(x-a.x-t*dx,y-a.y-t*dy);};
 return Array.from({length:1024},(_,id)=>{const x=id%32,y=Math.floor(id/32),u=(x+.5)/32,v=(y+.5)/32;
 const elevation=sampleElevation(c.x+u,c.y+v)+(noise.fractal((c.x+u)*5,(c.y+v)*5)-.5)*.16;
 const n=cover.fractal((c.x+u)*9,(c.y+v)*9),r=R.value(w.seed,'local-objects',0,c.id*1024+id);
 const bend=Math.sin((x+y)*.24+R.value(w.seed,'local-bend',0,c.id)*6)*.65;
 const river=ports.some(p=>distance(x+.5,y+.5,{x:16,y:16},p)<1+Math.min(1.4,c.riverFlow*.25)+bend*.35);
 let surface:LocalSurface=elevation<w.geography.seaLevel?'water':elevation<w.geography.seaLevel+.025?'sand':c.temperature< -3&&n>.4?'snow':c.terrain==='mountain'&&elevation>c.elevation-.03?'rock':c.biome==='desert'?'sand':c.water>.72&&n>.55?'marsh':n<Math.max(0,Math.min(.92,c.regionState==='forest_region'?Math.max(.74,c.forest):c.regionState==='degraded'?c.forest*.3:c.forest))?'forest':'grass';
 if(c.terrain==='sea'&&neighbor(-1,0).terrain==='sea'&&neighbor(1,0).terrain==='sea'&&neighbor(0,1).terrain==='sea'&&neighbor(0,-1).terrain==='sea')surface='water';
 if(c.regionState==='degraded'&&surface==='grass'&&n>.34)surface='sand';
 if(c.biome==='lake'||river)surface='water';
 const dry=!['water','rock','snow','marsh'].includes(surface),center=Math.hypot(x-16,y-16),road=(c.roads>0||c.regionState==='trade_hub')&&Math.abs(y-16-Math.sin(x*Math.PI/16)*2)<.65&&dry;
 return {x,y,elevation,surface,road,building:dry&&center<(c.regionState==='urban_region'?13:3+c.stage*2)&&r<(c.regionState==='urban_region'?.75:Math.min(.65,c.population/16000+.025)*c.stage),field:dry&&center>5&&center<12&&c.development>10&&n>(c.regionState==='agricultural'?.22:.42)&&n<(c.regionState==='agricultural'?.85:.65),ruin:dry&&c.ruins>0&&r<(c.regionState==='ruins_region'?.14:.012)};
 });
}

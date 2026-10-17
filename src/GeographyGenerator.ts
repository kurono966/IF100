import {TerrainNoise} from './TerrainNoise';
import {SeededRandom as R} from './SeededRandom';
import {chooseBiome} from './Biomes';
import type {Biome,Terrain,WorldGeography} from './WorldState';
export interface GeoTile {id:number;x:number;y:number;elevation:number;moisture:number;temperature:number;terrain:Terrain;biome:Biome;drainageTo:number|null;basinRiver:number|null;distanceToWater:number}
const clamp=(n:number,a=0,b=1)=>Math.max(a,Math.min(b,n));
const neighbors=(id:number)=>Array.from({length:256},(_,i)=>i).filter(i=>i!==id&&Math.abs(i%16-id%16)<=1&&Math.abs(Math.floor(i/16)-Math.floor(id/16))<=1);
export function generateGeography(seed:number):{tiles:GeoTile[];settings:WorldGeography}{
 const random=(stream:string)=>R.value(seed,`geography:${stream}`);
 const continentScale=.7+random('scale')*3.5,oceanFraction=.18+random('ocean')*.60,moistureBias=.10+random('humidity')*.80,meanTemperature=-5+random('warmth')*39;
 const height=new TerrainNoise(seed,'elevation'),warp=new TerrainNoise(seed,'domainWarp'),ridge=new TerrainNoise(seed,'ridges'),moist=new TerrainNoise(seed,'moisture'),heat=new TerrainNoise(seed,'thermal');
 const angle=random('plateAngle')*Math.PI*2,ax=Math.cos(angle),ay=Math.sin(angle),climateAngle=random('climateAngle')*Math.PI*2;
 const tiles:GeoTile[]=[];
 for(let y=0;y<16;y++)for(let x=0;x<16;x++){
 const u=x/15,v=y/15,wx=(warp.fractal(u*2+3,v*2)-.5)*.85,wy=(warp.fractal(u*2,v*2+7)-.5)*.85;
 const broad=height.fractal(u*continentScale+wx,v*continentScale+wy,4);
 const plate=(u-.5)*ax+(v-.5)*ay,cross=-(u-.5)*ay+(v-.5)*ax;
 const ranges=1-Math.abs(2*ridge.fractal(plate*1.2+4,cross*4.5-3,3)-1);
 const elevation=clamp(broad*.78+ranges*.22);
 tiles.push({id:y*16+x,x,y,elevation,moisture:0,temperature:0,terrain:'plain',biome:'grassland',drainageTo:null,basinRiver:null,distanceToWater:99});
 }
 const sorted=tiles.map(c=>c.elevation).sort((a,b)=>a-b),seaLevel=sorted[Math.floor(oceanFraction*255)];
 const landHeights=sorted.filter(e=>e>=seaLevel),mountainFraction=.08+random('ruggedness')*.24,mountainLevel=landHeights[Math.floor((1-mountainFraction)*(landHeights.length-1))];
 for(const c of tiles){
 const latitude=((c.x/15-.5)*Math.cos(climateAngle)+(c.y/15-.5)*Math.sin(climateAngle));
 c.temperature=meanTemperature-latitude*26+(heat.fractal(c.x/6+9,c.y/6-5)-.5)*16-Math.max(0,c.elevation-seaLevel)*35;
 const windX=Math.round(Math.cos(angle)*2),windY=Math.round(Math.sin(angle)*2),windward=tiles[clamp(c.y-windY,0,15)*16+clamp(c.x-windX,0,15)];
 const shadow=Math.max(0,windward.elevation-c.elevation)*.65;
 c.moisture=clamp(moistureBias+(moist.fractal(c.x/5-7,c.y/5+13)-.5)*.95-shadow);
 const nearSea=neighbors(c.id).some(id=>tiles[id].elevation<seaLevel);
 c.biome=chooseBiome(c.elevation,seaLevel,mountainLevel,c.moisture,c.temperature,nearSea);
 c.terrain=c.biome==='ocean'?'sea':c.biome==='alpine'?'mountain':['woodland','rainforest','taiga','dry_forest'].includes(c.biome)?'forest':'plain';
 }
 // A strictly descending graph gives every stream a finite route. Interior sinks become lakes.
 for(const c of tiles.filter(c=>c.terrain!=='sea')){
 const lower=neighbors(c.id).map(id=>tiles[id]).filter(a=>a.elevation<c.elevation-1e-9).sort((a,b)=>(a.elevation-R.value(seed,'streamMeander',0,a.id)*.015)-(b.elevation-R.value(seed,'streamMeander',0,b.id)*.015)||a.id-b.id);
 c.drainageTo=lower[0]?.id??null;
 }
 const trace=(start:number)=>{const path:number[]=[];let id:number|null=start;while(id!==null){path.push(id);if(tiles[id].terrain==='sea')break;id=tiles[id].drainageTo;}return path;};
 const desired=Math.max(1,Math.round((1+random('rivers')*5)*(1-oceanFraction*.5)));
 const sources=tiles.filter(c=>c.terrain!=='sea'&&c.elevation>seaLevel+(mountainLevel-seaLevel)*.4).map(c=>({cell:c,path:trace(c.id),score:c.elevation+c.moisture*.15+trace(c.id).length*.035+R.value(seed,'riverSource',0,c.id)*.08})).filter(a=>a.path.length>=3).sort((a,b)=>b.score-a.score||a.cell.id-b.cell.id);
 const riverPaths:number[][]=[];
 for(const source of sources){if(riverPaths.length>=desired)break;if(riverPaths.some(p=>Math.hypot(tiles[p[0]].x-source.cell.x,tiles[p[0]].y-source.cell.y)<3))continue;
 const path=source.path;riverPaths.push(path);const endpoint=tiles[path.at(-1)!];
 for(const id of path){const c=tiles[id];if(c.terrain==='sea')continue;c.terrain='river';c.biome=c.drainageTo===null?'lake':'river';}
 if(endpoint.terrain==='sea'){const mouth=tiles[path[path.length-2]];mouth.biome='estuary';}
 }
 // Associate each tile with its own nearest watercourse, not a fixed screen row.
 const water=tiles.filter(c=>c.terrain==='sea'||c.terrain==='river');
 for(const c of tiles){c.distanceToWater=Math.min(...water.map(a=>Math.hypot(a.x-c.x,a.y-c.y)));
 const river=tiles.filter(a=>a.terrain==='river').sort((a,b)=>Math.hypot(a.x-c.x,a.y-c.y)-Math.hypot(b.x-c.x,b.y-c.y)||a.id-b.id)[0];
 if(river&&Math.hypot(river.x-c.x,river.y-c.y)<=3)c.basinRiver=river.id;
 if(c.terrain!=='sea'&&c.terrain!=='river'&&c.terrain!=='mountain'&&c.basinRiver!==null&&Math.hypot(river!.x-c.x,river!.y-c.y)<=1.5){
 c.moisture=clamp(c.moisture+.13);c.biome=chooseBiome(c.elevation,seaLevel,mountainLevel,c.moisture,c.temperature,neighbors(c.id).some(id=>tiles[id].terrain==='sea'));if(c.temperature>8&&c.elevation<seaLevel+(mountainLevel-seaLevel)*.65)c.biome=c.moisture>.77?'wetland':'floodplain';c.terrain=['woodland','rainforest','taiga','dry_forest'].includes(c.biome)?'forest':'plain';
 }
 }
 return {tiles,settings:{version:2,seaLevel,mountainLevel,continentScale,oceanFraction,moistureBias,meanTemperature,riverPaths,drainageOrder:tiles.filter(c=>c.terrain!=='sea').sort((a,b)=>b.elevation-a.elevation||a.id-b.id).map(c=>c.id)}};
}

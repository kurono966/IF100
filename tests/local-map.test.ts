import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../src/WorldGenerator';
import {generateLocalMap} from '../src/LocalMapGenerator';
test('local subdivision is deterministic, detailed, and read only',()=>{
 const w=generate(654321),c=w.cells.find(c=>c.terrain==='forest')!,before=JSON.stringify(w);
 const a=generateLocalMap(w,c);
 assert.equal(a.length,1024);assert.deepEqual(a,generateLocalMap(generate(w.seed),c));
 assert.ok(new Set(a.map(t=>t.elevation.toFixed(4))).size>100);
 assert.ok(new Set(a.map(t=>t.surface)).size>1);
 assert.equal(JSON.stringify(w),before);
 const other=generate(57);assert.notDeepEqual(a,generateLocalMap(other,other.cells[c.id]));
});
test('local civilization responds to world state while underlying relief stays fixed',()=>{
 const w=generate(654321),c=w.cells.find(c=>c.terrain==='plain'&&c.distanceToWater>1)!;
 c.biome='grassland';c.water=.3;c.temperature=20;c.elevation=w.geography.seaLevel+.25;c.forest=.2;
 c.stage=0;c.roads=0;c.development=0;c.ruins=0;
 const before=generateLocalMap(w,c);assert.ok(before.every(t=>!t.building&&!t.road&&!t.field&&!t.ruin));
 c.stage=3;c.population=16000;c.roads=1;c.development=30;c.ruins=5;
 const after=generateLocalMap(w,c);
 assert.deepEqual(before.map(t=>t.elevation),after.map(t=>t.elevation));
 assert.ok(after.some(t=>t.building));assert.ok(after.some(t=>t.road));assert.ok(after.some(t=>t.field));
});


test('neighboring local maps share a continuous elevation field at their border',()=>{
 const w=generate(654321);
 for(const id of [34,87,168]){const c=w.cells[id],a=generateLocalMap(w,c),b=generateLocalMap(w,w.cells[id+1]);
 for(let y=0;y<32;y++)assert.ok(Math.abs(a[y*32+31].elevation-b[y*32].elevation)<.05);}
});

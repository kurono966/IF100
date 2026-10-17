import test from 'node:test';
import assert from 'node:assert/strict';
import {generate} from '../src/WorldGenerator';
import {updateRegions,regionCandidate} from '../src/RegionSystem';
import {causalInfluence,structuralDifference} from '../src/WorldComparison';
import {apply,land} from '../src/Intervention';
import {emit} from '../src/Dynamics';
import {generateLocalMap} from '../src/LocalMapGenerator';
import {simulate,step} from '../src/Simulation';

test('regional transitions require consecutive years and use separate exit thresholds',()=>{
 const w=generate(654321),c=w.cells.find(land)!;c.regionState='wilderness';c.stage=0;c.ruins=0;c.forest=.7;c.vegetation=.8;
 for(let i=1;i<=7;i++){w.year=i;updateRegions(w);}assert.equal(c.regionState,'wilderness');
 c.forest=.4;w.year++;updateRegions(w);c.forest=.7;
 for(let i=0;i<14;i++){w.year++;updateRegions(w);}assert.equal(c.regionState,'wilderness');
 w.year++;updateRegions(w);assert.equal(c.regionState,'forest_region');assert.equal(c.regionSince,w.year);
 c.forest=.55;assert.equal(regionCandidate(c),'forest_region');
 for(let i=0;i<20;i++){w.year++;updateRegions(w);}assert.equal(c.regionState,'forest_region');
 const events=w.events.filter(e=>e.cell===c.id&&e.type==='region_transition');assert.equal(events.length,1);
});

test('regional history keeps intervention parents and heatmap follows links, not distance',()=>{
 const w=generate(654321),c=w.cells.find(land)!,far=w.cells.filter(land).at(-1)!;
 apply(w,{id:'touch',type:'plant',year:0,position:{x:c.x,y:c.y}});
 assert.equal(causalInfluence(w,c).level,1);assert.equal(causalInfluence(w,far).level,0);
 w.year=1;const ecological=emit(w,far,'ecology','植物の分布変化','vegetation',c.links.vegetation);
 assert.equal(causalInfluence(w,far).level,2);
 w.year=2;const food=emit(w,far,'harvest','食料供給が変化','food',[ecological]);
 w.year=3;const population=emit(w,far,'migration','人口が移動','population',[food]);
 assert.equal(causalInfluence(w,far).level,3);
 w.year=4;emit(w,far,'market','市場が成立','trade',[population]);assert.equal(causalInfluence(w,far).level,4);
 far.regionState='wilderness';far.stage=0;far.ruins=0;far.forest=.8;far.vegetation=.8;
 for(let i=0;i<15;i++){w.year++;updateRegions(w);}
 const event=w.events.filter(e=>e.cell===far.id&&e.type==='region_transition').at(-1)!;
 assert.ok(event.roots?.includes('touch'));assert.ok(event.parents.length>0);
 // A nearby cell without a dependency is not highlighted.
 const unrelated=w.cells.find(a=>a.id!==c.id&&a.id!==far.id&&Object.values(a.links).every(ids=>!ids.length))!;
 assert.equal(causalInfluence(w,unrelated).level,0);
});

test('structural differences outweigh small numeric changes and local maps reflect land use',()=>{
 const w=generate(654321),c=w.cells.find(a=>land(a)&&a.distanceToWater>1)!;
 const original=structuredClone(c);assert.equal(structuralDifference(c,original).score,0);
 c.population+=30;const small=structuralDifference(c,original).score;
 c.regionState='urban_region';c.stage=2;c.population=1100;c.roads=1;
 const large=structuralDifference(c,original);assert.ok(large.score>small);assert.ok(large.reasons.includes('都市'));
 c.biome='grassland';c.elevation=w.geography.seaLevel+.3;c.temperature=20;c.water=.3;c.forest=.2;c.development=30;
 c.regionState='agricultural';const farms=generateLocalMap(w,c).filter(t=>t.field).length;
 c.regionState='wilderness';assert.ok(farms>generateLocalMap(w,c).filter(t=>t.field).length);
 c.regionState='urban_region';const buildings=generateLocalMap(w,c).filter(t=>t.building).length;
 c.regionState='wilderness';assert.ok(buildings>generateLocalMap(w,c).filter(t=>t.building).length);
});

test('five small natural touches can change multiple millennium settlement locations and routes',()=>{
 const seed=654321,baseline=simulate(seed),w=generate(seed);let index=0;
 const kinds=['rain','fire','plant','predator','drought'] as const;
 for(let year=0;year<1000;year++){
 if([12,30,65,115,170].includes(year)){
 const candidates=w.cells.filter(c=>land(c)&&c.stage>0).sort((a,b)=>(Math.abs(a.population-400)+a.forest*40)-(Math.abs(b.population-400)+b.forest*40));
 const c=candidates[index%candidates.length];apply(w,{id:`test-${index}`,year,type:kinds[index],position:{x:c.x,y:c.y}});index++;
 }step(w);
 }
 assert.equal(w.interventions.length,5);
 assert.ok(w.cells.filter((c,i)=>c.stage!==baseline.cells[i].stage).length>=3);
 assert.ok(w.cells.filter((c,i)=>c.regionState!==baseline.cells[i].regionState).length>=3);
 const active=(world:typeof w)=>world.routes.filter(r=>r.volume>.03).map(r=>`${r.from}:${r.to}`).sort();assert.notDeepEqual(active(w),active(baseline));
 assert.ok(w.cells.some((c,i)=>c.stage>=2&&baseline.cells[i].stage<2));
 assert.deepEqual(simulate(seed,w.interventions),w);
});

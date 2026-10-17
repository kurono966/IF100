import {simulate,step} from '../src/Simulation';
import {generate} from '../src/WorldGenerator';
import {apply,land} from '../src/Intervention';
import {structuralDifference} from '../src/WorldComparison';
for(const seed of [654321,108,57]){
 const base=simulate(seed),w=generate(seed);let touches=0;
 for(let y=0;y<1000;y++){
 if([12,30,65,115,170].includes(y)){
 const candidates=w.cells.filter(c=>land(c)&&c.stage>0).sort((a,b)=>(Math.abs(a.population-400)+a.forest*40)-(Math.abs(b.population-400)+b.forest*40));
 const c=candidates[touches%candidates.length];if(c){apply(w,{id:`probe-${touches}`,year:y,type:['rain','fire','plant','predator','drought'][touches] as any,position:{x:c.x,y:c.y}});touches++;}
 }step(w);
 }
 const differences=w.cells.map((c,i)=>structuralDifference(c,base.cells[i]));
 console.log(JSON.stringify({seed,touches,population:[base.metrics.population,w.metrics.population],cities:[base.metrics.cities,w.metrics.cities],regionChanges:w.cells.filter((c,i)=>c.regionState!==base.cells[i].regionState).length,stageChanges:w.cells.filter((c,i)=>c.stage!==base.cells[i].stage).length,major:differences.filter(d=>d.score>=3).length,routes:[base.routes.filter(r=>r.volume>.03).length,w.routes.filter(r=>r.volume>.03).length],states:w.cells.filter(land).reduce((a,c)=>(a[c.regionState]=(a[c.regionState]||0)+1,a),{} as Record<string,number>)}));
}

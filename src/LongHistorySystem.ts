import type {WorldState,Cell} from './WorldState';
import {clamp,emit,distance,cooldown} from './Dynamics';
import {combine} from './EventHistory';
import {SeededRandom as R} from './SeededRandom';
// Urban maintenance and depleted resources compete with growth. No city is immortal.
export function updateLongHistory(w:WorldState,old:Cell[]):void {
 for(const c of w.cells){if(['sea','river','mountain'].includes(c.terrain))continue;const p=old[c.id];
 c.exhaustion=clamp(p.exhaustion+(c.stage>=2?.0015+Math.min(.002,c.trade*.0003):-.0025));
 c.civicAge=c.stage>=2?p.civicAge+1:Math.max(0,p.civicAge-2);
 c.prestige=clamp(c.trade*.2+c.technology*.015+c.stage*.1,0,3);
 if(c.stage===0&&p.stage>0){c.ruins++;w.traces.push({cell:c.id,name:`旧${c.placeName}の遺構`,year:w.year,event:c.links.civilization.at(-1)||''});}
 if(c.stage>0&&p.stage===0&&c.ruins>0)emit(w,c,'renaissance',`旧${c.placeName}の遺構を使い集落が再興`,'civilization',combine(w,c.links.civilization,c.links.culture));
 if(c.stage>=2&&c.civicAge>70&&c.prestige>1.2&&cooldown(w,c,'zenith',150))emit(w,c,'zenith',`${c.placeName}が交易・文化の最盛期を迎える`,'civilization',combine(w,c.links.civilization,c.links.culture,c.links.trade));
 // Maintenance fails after prolonged strain, not at a scripted calendar year.
 const strain=c.exhaustion>.5&&(c.foodSurplus<.03||c.trade<.4||c.civicAge>190);
 c.counters.strain=strain?(c.counters.strain||0)+1:Math.max(0,(c.counters.strain||0)-2);
 if(c.stage>=2&&c.counters.strain>=12){c.stage=1;c.settlementStage=1;c.markets=0;c.civicAge=0;c.counters.strain=0;
 emit(w,c,'decline',`${c.placeName}は資源と維持負担に耐えられず都市衰退`,'civilization',combine(w,c.links.civilization,c.links.life,c.links.trade,c.links.culture));}
 }
 if(w.year<300||w.year%25!==0)return;
 // Civilization spheres emerge around networks of cities with shared cultural practices.
 const centers=w.cells.filter(c=>c.stage>=2&&c.population>600).sort((a,b)=>b.prestige-a.prestige||a.id-b.id);
 for(const center of centers){const members=w.cells.filter(c=>c.stage>0&&c.population>50&&distance(center,c)<=6&&(c.cultureId===center.cultureId||w.routes.some(r=>r.volume>.1&&((r.from===center.id&&r.to===c.id)||(r.to===center.id&&r.from===c.id)))));
 if(members.filter(c=>c.stage>=2).length<2||members.reduce((s,c)=>s+c.population,0)<1600||members.some(c=>c.realm&&w.realms.some(r=>r.id===c.realm&&r.active)))continue;
 const id=`realm:${w.realms.length}`,event=emit(w,center,'realm_formation',`${center.cultureName}文明圏が都市と交易を束ねる`,'culture',combine(w,...members.map(c=>combine(w,c.links.culture,c.links.civilization,c.links.trade))));
 const realm={id,name:`${center.cultureName}文明圏`,center:center.id,members:members.map(c=>c.id),formed:w.year,active:true,vitality:1,event,peak:w.year};w.realms.push(realm);for(const c of members){c.realm=id;c.links.culture=combine(w,c.links.culture,[event]);}
 }
 for(const realm of w.realms.filter(r=>r.active)){const members=realm.members.map(id=>w.cells[id]);const viable=members.filter(c=>c.stage>0),cities=viable.filter(c=>c.stage>=2);
 realm.vitality=clamp(cities.length*.3+viable.reduce((s,c)=>s+c.prestige,0)*.04-members.reduce((s,c)=>s+c.exhaustion,0)/Math.max(1,members.length)*.3);
 if(cities.length===0||realm.vitality<.18){realm.active=false;const c=w.cells[realm.center];realm.event=emit(w,c,'realm_collapse',`${realm.name}が都市衰退と交易の変化で崩壊。文化の痕跡が残る`,'culture',combine(w,[realm.event],...members.map(a=>a.links.civilization)));for(const a of members){a.realm=undefined;a.links.culture=combine(w,a.links.culture,[realm.event]);}w.traces.push({cell:c.id,name:`かつての${realm.name}`,year:w.year,event:realm.event});}
 else{const successor=cities.sort((a,b)=>b.prestige-a.prestige||a.id-b.id)[0];if(successor&&successor.id!==realm.center){const previous=w.cells[realm.center];realm.center=successor.id;realm.event=emit(w,successor,'inheritance',`${realm.name}の中心が${previous.placeName}から${successor.placeName}へ移る`,'culture',combine(w,[realm.event],successor.links.trade,successor.links.culture));}}
 }
 // Practices may diversify between regions; their ancestry remains in the tradition record.
 if(w.year>=300)for(const c of w.cells.filter(c=>c.population>80)){if(Object.values(c.traditions).some(t=>t?.regional)&&R.value(w.seed,'cultureBranch',w.year,c.id)<.012&&cooldown(w,c,'cultureBranch',200)){c.cultureId=`${c.cultureId}.${w.year}`;emit(w,c,'regional_tradition',`${c.placeName}で独自の習慣と技術体系が育つ`,'culture',combine(w,c.links.culture,c.links.knowledge));}}
}

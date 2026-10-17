import type {WorldState,Cell,Skill,PersonProfile,Tradition,Individual} from './WorldState';
import {SeededRandom as R} from './SeededRandom';
import {emit,clamp,distance,pathBetween} from './Dynamics';
import {combine} from './EventHistory';
export const skillNames:Record<Skill,string>={pottery:'陶器',boats:'小舟建造',agronomy:'耕作',healing:'薬草',metalwork:'鍛冶',commerce:'交易'};
const names=['アオ','ミナ','レン','ナギ','スイ','ハル','ユイ','トワ'];
export function migrantProfile(seed:number,index=0,profession:Skill='pottery'):PersonProfile {return {name:names[Math.floor(R.value(seed,'personName',index)*names.length)],age:24+Math.floor(R.value(seed,'personAge',index)*12),profession,skills:[profession],knowledge:[profession],personality:['慎重','社交的','探究的'][Math.floor(R.value(seed,'personality',index)*3)] as PersonProfile['personality'],originCulture:['川辺の文化','山麓の文化','海辺の文化'][Math.floor(R.value(seed,'personCulture',index)*3)],family:{members:1,description:'同行する家族ひとり'},health:.85,possessions:[`${skillNames[profession]}の道具`,'種と乾燥食料'],reason:'故郷の生活環境の変化を受け、新しい暮らしを求めて'};}
export function validProfile(p:PersonProfile):boolean {
 return !!p&&typeof p.name==='string'&&p.name.length>0&&p.name.length<=30&&Object.hasOwn(skillNames,p.profession)&&Number.isInteger(p.age)&&p.age>=16&&p.age<=75&&Number.isFinite(p.health)&&p.health>0&&p.health<=1&&['慎重','社交的','探究的'].includes(p.personality)&&typeof p.originCulture==='string'&&p.originCulture.length<=60&&typeof p.reason==='string'&&p.reason.length<=200&&!!p.family&&Number.isInteger(p.family.members)&&p.family.members>=0&&p.family.members<=4&&typeof p.family.description==='string'&&p.family.description.length<=100&&[p.skills,p.knowledge].every(a=>Array.isArray(a)&&a.length<=3&&a.every(s=>Object.hasOwn(skillNames,s)))&&Array.isArray(p.possessions)&&p.possessions.length<=6&&p.possessions.every(s=>typeof s==='string'&&s.length<=60);
}
function affinity(c:Cell,skill:Skill):number {
 switch(skill){case 'pottery':return .3+c.soilFertility*.5+c.water*.2;case 'boats':return c.riverFlow>.1?.9:.1;case 'agronomy':return .25+c.soilFertility*.45+(1-c.forest)*.3;case 'healing':return .25+c.biodiversity*.7;case 'metalwork':return .2+c.resourceAvailability*.8;case 'commerce':return .25+Math.min(.75,c.trade*.3+c.localDemand*.2);}
}
function introduce(w:WorldState,c:Cell,skill:Skill,event:string,sourceName:string,originCell=c.id,started=w.year):Tradition {
 const t:Tradition={origins:[...(w.events[Number(event.slice(1))]?.roots||[])],skill,strength:.04,practice:0,generations:0,households:0,apprentices:0,originCell,started,event,lastPracticed:w.year,adopted:false,regional:false,industrial:false,sourceName};c.traditions[skill]=t;return t;
}
export function addIndividual(w:WorldState,cell:number,profile:PersonProfile,event:string,id:string):Individual {
 const person:Individual={id,profile:structuredClone(profile),cell,arrived:w.year,alive:true,event};w.people.push(person);return person;
}
export function seedResidents(w:WorldState):void {
 if(w.year!==0||w.people.some(p=>p.id.startsWith('resident:')))return;
 const settled=w.cells.filter(c=>c.stage>0).slice(0,8),skills=Object.keys(skillNames) as Skill[];
 for(const c of settled){const profile=migrantProfile(w.seed,c.id,skills[c.id%skills.length]);profile.originCulture=c.cultureName;profile.family.members=0;
 const event=emit(w,c,'arrival',`${c.placeName}に暮らす${skillNames[profile.profession]}の働き手`,'knowledge',[]);addIndividual(w,c.id,profile,event,`resident:${c.id}`);}
}
export function updateCulture(w:WorldState):void {
 for(const p of w.people){if(!p.alive)continue;const c=w.cells[p.cell];p.profile.age++;
 p.profile.health=clamp(p.profile.health+(c.health-p.profile.health)*.035-Math.max(0,p.profile.age-55)*.0007,.01,1);
 const mortality=.002+Math.max(0,p.profile.age-48)*.0015+(1-p.profile.health)*.025;
 if(p.profile.age>=100||R.value(w.seed,`mortality:${p.id}`,w.year,p.cell)<mortality){p.alive=false;p.died=w.year;
 const parents=combine(w,[p.event],...Object.values(c.traditions).map(t=>[t!.event]));p.event=emit(w,c,'death',`${p.profile.name}が亡くなる。家族・弟子に知識が残る可能性`,'knowledge',parents);continue;}
 if(w.year%5===0&&c.population>=15&&c.health>.2){for(const skill of new Set([...p.profile.skills,...p.profile.knowledge])){
 const t=c.traditions[skill]||introduce(w,c,skill,p.event,p.profile.name);t.strength=clamp(t.strength+.035*p.profile.health*affinity(c,skill));if(!c.counters[`taught:${p.id}:${skill}`]){c.counters[`taught:${p.id}:${skill}`]=1;t.origins=[...new Set([...t.origins,...(w.events[Number(p.event.slice(1))]?.roots||[])])];t.event=emit(w,c,'inheritance',`${p.profile.name}が家族・弟子へ${skillNames[skill]}の手ほどきを始める`,'knowledge',combine(w,[t.event],[p.event]));}
 }}
 }
 if(w.year%5!==0)return;
 for(const c of w.cells){for(const t of Object.values(c.traditions)) {if(!t)continue;const capacity=affinity(c,t.skill),practicing=c.population>=20&&c.health>.25&&capacity>.3;
 if(practicing){t.practice+=5;t.lastPracticed=w.year;t.strength=clamp(t.strength+.012*capacity*(1-t.strength));}else t.strength*=.94;
 t.households=Math.floor(c.population/6*t.strength);t.apprentices=Math.floor(t.households*.18);
 if(!t.adopted&&t.strength>=.20&&t.practice>=15){t.adopted=true;t.event=emit(w,c,'skill_adoption',`${skillNames[t.skill]}の技能が現地に定着`,'knowledge',combine(w,[t.event],c.links.life,c.links.knowledge));t.origins=[...new Set([...t.origins,...(w.events.at(-1)?.roots||[])])];w.traces.push({cell:c.id,name:`${t.sourceName}から伝わる${skillNames[t.skill]}`,skill:t.skill,year:w.year,event:t.event});}
 if(t.adopted&&practicing&&w.year-t.started>=(t.generations+1)*25){t.generations++;if(t.generations<=2||t.generations%4===0)t.event=emit(w,c,'inheritance',`${skillNames[t.skill]}を第${t.generations+1}世代の家族・弟子が受け継ぐ`,'culture',[t.event]);}
 if(w.year>=100&&t.adopted&&!t.regional&&t.practice>=75&&t.households>=3){t.regional=true;t.event=emit(w,c,'regional_tradition',`${skillNames[t.skill]}が${c.cultureName}の地域文化になる`,'culture',[t.event]);}
 if(w.year>=150&&t.regional&&!t.industrial&&c.trade>.2&&t.households>=8&&c.markets){t.industrial=true;t.event=emit(w,c,'industry',`${skillNames[t.skill]}が地域産業として交易を支える`,'culture',combine(w,[t.event],c.links.trade));}
 c.links.knowledge=combine(w,c.links.knowledge,[t.event]);c.links.culture=combine(w,c.links.culture,[t.event]);
 }}
 // A frozen list prevents a skill from crossing the entire world in one update.
 if(w.year%10===0){const transfers:{from:number;to:number;tradition:Tradition;route?:string}[]=[];
 for(const c of w.cells){for(const t of Object.values(c.traditions)){if(!t?.adopted||t.strength<.22||c.population<20)continue;
 const routes=w.routes.filter(r=>r.volume>.04&&(r.from===c.id||r.to===c.id));
 const destinations=w.year>=100?routes.map(r=>({cell:w.cells[r.from===c.id?r.to:r.from],event:r.event})):[];
 if(destinations.length===0){const adjacent=w.cells.filter(a=>a.population>20&&a.id!==c.id&&distance(c,a)<=2&&pathBetween(w,c.id,a.id,3));destinations.push(...adjacent.slice(0,2).map(cell=>({cell,event:t.event})));}
 for(const d of destinations)if(!d.cell.traditions[t.skill]&&affinity(d.cell,t.skill)>.3)transfers.push({from:c.id,to:d.cell.id,tradition:{...t},route:d.event});
 }}
 for(const transfer of transfers){const c=w.cells[transfer.to],t=transfer.tradition;if(c.traditions[t.skill])continue;
 const event=emit(w,c,'cultural_spread',`${skillNames[t.skill]}が (${w.cells[transfer.from].x}, ${w.cells[transfer.from].y}) から${c.cultureId!==w.cells[transfer.from].cultureId?'異文化の地域へ':'隣の地域へ'}伝わる`,'culture',combine(w,[t.event],transfer.route?[transfer.route]:[]));
 w.events.at(-1)!.destination=c.id;const next=introduce(w,c,t.skill,event,t.sourceName,t.originCell,t.started);next.strength=.12;next.practice=5;next.generations=t.generations;next.origins=[...t.origins];
 }
 }
}

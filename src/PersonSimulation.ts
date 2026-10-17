import {generate} from './WorldGenerator';
import {SeededRandom} from './SeededRandom';
import {record} from './EventHistory';
import {traits,skills,type Person,type SocialWorld,type Occupation,type SkillName,type Knowledge,type TouchKind,type Relationship} from './SocialTypes';

export const occupationNames:Record<Occupation,string>={farmer:'農民',hunter:'狩人',gatherer:'採集者',builder:'大工',craftsperson:'職人',trader:'商人',healer:'治療師',leader:'指導者',child:'子供'};
export const skillNames:Record<SkillName,string>={farming:'農業',hunting:'狩猟',gathering:'採集',crafting:'製作',construction:'建築',trade:'交易',leadership:'統率',medicine:'医療',exploration:'探索'};
export const knowledgeNames:Record<Knowledge,string>={agriculture:'農耕の知恵',tools:'道具製作',medicine:'薬草学',commerce:'交易の知恵'};
const clamp=(n:number)=>Math.max(0,Math.min(1,n));
const random=(w:SocialWorld,key:string,id=0)=>SeededRandom.value(w.seed,key,w.year,id);
const index=(p:Person)=>Number(p.id.slice(1));
export const living=(w:SocialWorld)=>w.people.filter(p=>p.alive);
export const person=(w:SocialWorld,id:string)=>w.people[Number(id.slice(1))];
function event(w:SocialWorld,kind:string,text:string,people:Person[],parents:string[]=[],root?:string){
 const id=record(w,text,people[0]?.cell??0,[...new Set(parents)].filter(id=>!!w.events[Number(id.slice(1))]),root);
 const e=w.events.at(-1)!; e.personIds=people.map(p=>p.id); e.kind=kind;
 for(const p of people)p.lifeEvents.push({eventId:id,year:w.year,kind,text});
 return id;
}
function influence(p:Person,id:string){
 // One actual causal frontier per intervention. No unrelated life event becomes a cause.
 p.causes=[...new Set([...p.causes,id])];
}
function createPerson(w:SocialWorld,age:number,settlementId:string,parents:Person[]=[],sex?:Person['sex']):Person{
 const n=w.nextPersonId++,id=`p${n}`,r=(key:string)=>random(w,`person:${key}`,n);
 const names=['アオ','ユイ','レン','ミオ','ソラ','ハル','ナギ','リン','トワ','カイ','スイ','アサ','ユズ','シオ','リク','イト'];
 const personality=Object.fromEntries(traits.map(t=>[t,parents.length?clamp(parents.reduce((s,p)=>s+p.personality[t],0)/parents.length+(r(t)-.5)*.28+(t==='empathy'?(parents.reduce((s,p)=>s+p.beliefs.cooperation,0)/parents.length-.5)*.1:0)):.1+r(t)*.8])) as Person['personality'];
 const p:Person={id,name:`${names[Math.floor(r('name')*names.length)]}・${n+1}`,age,birthYear:w.year-age,sex:sex??(r('sex')<.5?'female':'male'),alive:true,
 cell:w.settlements.find(s=>s.id===settlementId)!.cell,settlementId,familyId:parents[0]?.familyId??`f${n}`,parents:parents.map(p=>p.id),children:[],
 health:.85,stamina:.9,fertility:.65+r('fertility')*.3,lifespanTendency:64+r('lifespan')*28,personality,
 skills:Object.fromEntries(skills.map(s=>[s,age<16?.02+r(s)*.08:.15+r(s)*.35])) as Person['skills'],occupation:'child',goal:age<16?'家族から学ぶ':'仕事を探す',wealth:age<16?0:2,
 possessions:[],knowledge:[],knowledgeSources:{},habits:['食料を分かち合う'],beliefs:{cooperation:parents.length?parents.reduce((s,p)=>s+p.beliefs.cooperation,0)/parents.length:personality.empathy},relationships:{},lifeEvents:[],lastBirth:-10,generation:parents.length?Math.max(...parents.map(p=>p.generation))+1:0,homeQuality:.5,causes:[]};
 w.people.push(p);
 const birth=event(w,age===0?'birth':'arrival',age===0?`${p.name}が誕生した（第${p.generation+1}世代）`:`${p.name}、${age}歳。谷での記録が始まる`,[p,...parents],parents.flatMap(p=>p.causes));
 for(const parent of parents){parent.children.push(id);bond(p,parent,'family');}
 if(parents.some(p=>p.causes.length))influence(p,birth);
 return p;
}
function bond(a:Person,b:Person,role?:Relationship['roles'][number]){
 for(const [p,q] of [[a,b],[b,a]]){
  const rel=p.relationships[q.id]??={personId:q.id,familiarity:.1,affection:.25,trust:.25,respect:.25,hostility:0,roles:[]};
  if(role&&!rel.roles.includes(role))rel.roles.push(role);
 }
}
export function createSocialWorld(seed:number):SocialWorld{
 const old=generate(seed);
 // Reuse the geography/cell representation, cropped to a single inhabited valley.
 const cells=old.cells.slice(0,64).map((c,i)=>({...c,id:i,x:i%8,y:Math.floor(i/8),terrain:(i%8===4?'river':i%8===0||i%8===7?'mountain':i%3===0?'forest':'plain') as typeof c.terrain,population:0,stage:0,placeName:'小さな谷',soilFertility:.55+SeededRandom.value(seed,'valley',0,i)*.35}));
 const w:SocialWorld={version:1,seed,year:0,geography:old.geography,cells,people:[],events:[],interventions:[],nextPersonId:0,settlements:[{id:'s0',name:'葦辺の里',cell:26,food:30,houses:10,market:false,foodSources:[]},{id:'s1',name:'森丘の里',cell:45,food:30,houses:10,market:false,foodSources:[]}]};
 for(let f=0;f<10;f++){
  const sid=`s${f%2}`,a=createPerson(w,24+f%12,sid,[],'female'),b=createPerson(w,26+f%15,sid,[],'male');
  a.spouse=b.id;b.spouse=a.id;b.familyId=a.familyId;bond(a,b,'family');
  event(w,'marriage',`${a.name}と${b.name}は夫婦として暮らしている`,[a,b]);
  for(let c=0;c<2;c++)createPerson(w,3+(f+c*4)%12,sid,[a,b]);
 }
 // Initial knowledge belongs to these residents. No cell grants knowledge.
 for(const s of w.settlements){const adults=living(w).filter(p=>p.settlementId===s.id&&p.age>=16);teachKnowledge(w,adults[0],'agriculture');teachKnowledge(w,adults[1],'tools');}
 for(const s of w.settlements)s.food=12;
 for(const p of living(w).filter(p=>p.age>=16))chooseOccupation(w,p);
 refreshPopulation(w);return w;
}
function teachKnowledge(w:SocialWorld,p:Person,k:Knowledge,teacher?:Person,source?:string){
 if(p.knowledge.includes(k))return;
 p.knowledge.push(k);
 const id=event(w,'knowledge',teacher?`${teacher.name}が${p.name}に${knowledgeNames[k]}を教えた`:`${p.name}が${knowledgeNames[k]}を身につけた`,teacher?[teacher,p]:[p],[...(source?[source]:teacher?.knowledgeSources[k]?[teacher.knowledgeSources[k]!]:[]),...(teacher?.relationships[p.id]?.encounterEvent?[teacher.relationships[p.id].encounterEvent!]:[])]);
 p.knowledgeSources[k]=id;
 if(w.events[Number(id.slice(1))].roots?.length)influence(p,id);
 if(teacher){bond(teacher,p);const rel=p.relationships[teacher.id];rel.respect=clamp(rel.respect+.12);if(!rel.roles.includes('mentor'))rel.roles.push('mentor');const reverse=teacher.relationships[p.id];if(!reverse.roles.includes('student'))reverse.roles.push('student');}
}
const workSkill:Record<Exclude<Occupation,'child'>,SkillName>={farmer:'farming',hunter:'hunting',gatherer:'gathering',builder:'construction',craftsperson:'crafting',trader:'trade',healer:'medicine',leader:'leadership'};
function chooseOccupation(w:SocialWorld,p:Person){
 if(p.age<16)return;
 const s=w.settlements.find(s=>s.id===p.settlementId)!,local=living(w).filter(q=>q.settlementId===s.id),foodNeed=s.food/Math.max(1,local.length)<1?1:.15;
 const t=p.personality;
 const scores:Record<Exclude<Occupation,'child'>,number>={
 farmer:p.skills.farming+t.diligence*.5+foodNeed*.8+(p.knowledge.includes('agriculture')?.65:0),
 hunter:p.skills.hunting+t.riskTolerance*.45+foodNeed*.65,
 gatherer:p.skills.gathering+(1-t.riskTolerance)*.3+foodNeed*.8,
 builder:p.skills.construction+t.diligence*.3+(s.houses<local.length/4?.75:0),
 craftsperson:p.skills.crafting+t.curiosity*.45+(p.knowledge.includes('tools')?.5:0)+(foodNeed<.5?.3:-.4),
 trader:p.skills.trade+t.sociability*.45+t.riskTolerance*.2+(p.knowledge.includes('commerce')?.4:0)+(foodNeed<.5?.3:-.5),
 healer:p.skills.medicine+t.empathy*.5+(p.knowledge.includes('medicine')?.55:0),
 leader:p.skills.leadership+t.ambition*.6+t.sociability*.25-(s.leaderId&&s.leaderId!==p.id?.65:0)};
 const occupation=(Object.keys(scores) as (keyof typeof scores)[]).sort((a,b)=>scores[b]-scores[a]||a.localeCompare(b))[0];
 if(occupation!==p.occupation){const old=p.occupation;p.occupation=occupation;const causes=occupation==='farmer'?p.knowledgeSources.agriculture?[p.knowledgeSources.agriculture]:[]:p.causes;
 const e=event(w,'occupation',`${p.name}が${old==='child'?'仕事を始め':'転職し'}、${occupationNames[occupation]}になった`,[p],causes);if(w.events[Number(e.slice(1))].roots?.length)influence(p,e);}
}
export function stats(w:SocialWorld){const alive=living(w);return {population:alive.length,families:new Set(alive.map(p=>p.familyId)).size,births:w.people.filter(p=>p.birthYear>0).length,deaths:w.people.length-alive.length,occupations:Object.fromEntries(Object.keys(occupationNames).map(o=>[o,alive.filter(p=>p.occupation===o).length])),knowledge:alive.reduce((n,p)=>n+p.knowledge.length,0)};}
function refreshPopulation(w:SocialWorld){for(const c of w.cells)c.population=0;for(const p of living(w))w.cells[p.cell].population++;}
function kin(w:SocialWorld,a:Person,b:Person){
 const ancestors=(p:Person)=>{const ids=new Set<string>([p.id]);let frontier=p.parents;for(let i=0;i<3;i++){const next:string[]=[];for(const id of frontier){ids.add(id);next.push(...person(w,id).parents);}frontier=next;}return ids;};
 const aa=ancestors(a),bb=ancestors(b);return [...aa].some(id=>bb.has(id));
}
function move(w:SocialWorld,p:Person,sid:string,parents:string[]=[]){
 const s=w.settlements.find(s=>s.id===sid);if(!s||sid===p.settlementId)return;
 // Dependants and spouse move together; each remains an individual resident.
 const household=[p,...living(w).filter(q=>q.id!==p.id&&q.familyId===p.familyId&&(q.age<16||q.id===p.spouse))];
 for(const q of household){q.settlementId=s.id;q.cell=s.cell;const id=event(w,'migration',`${q.name}が${s.name}へ移住した`,[q],parents.length?parents:p.causes);if(w.events[Number(id.slice(1))].roots?.length)influence(q,id);}
}
export function stepSocial(w:SocialWorld){
 if(w.year>=200)return;w.year++;
 const alive=living(w);
 for(const p of alive){p.age=w.year-p.birthYear;p.stamina=clamp(.95-Math.max(0,p.age-45)*.009);}
 // Production is the sum of actual labour; annual shortages depend on real workers.
 for(const s of w.settlements){
  const local=alive.filter(p=>p.settlementId===s.id),producers:{p:Person;amount:number;causes:string[]}[]=[];
  for(const p of local){
   if(p.age<16){p.goal='家族から学ぶ';const parent=p.parents.map(id=>person(w,id)).find(q=>q.alive);if(parent)learn(w,parent,p);continue;}
   if(s.food<local.length||w.year%3===index(p)%3||p.occupation==='child')chooseOccupation(w,p);
   const t=p.personality,sk=workSkill[p.occupation as Exclude<Occupation,'child'>];p.skills[sk]=clamp(p.skills[sk]+.008+t.diligence*.012);
   p.goal='仕事で暮らしを支える';
   const effort=(.7+t.diligence*.5)*p.stamina*(.5+p.health*.5);
   if(['farmer','hunter','gatherer'].includes(p.occupation)){
    const farming=p.occupation==='farmer',skill=p.skills[sk],amount=(farming?(p.knowledge.includes('agriculture')?4.8:2.8):p.occupation==='hunter'?3:2.8)*(.6+skill)*effort*(.85+random(w,'harvest',index(p))*.3)*(p.possessions.includes('丈夫な道具')?1.2:1);
    const sources=[...p.causes,...(farming&&p.knowledgeSources.agriculture?[p.knowledgeSources.agriculture]:[])];producers.push({p,amount,causes:sources});
   }else if(p.occupation==='builder'){s.houses+=effort*.14;p.homeQuality=clamp(p.homeQuality+.06);}
   else if(p.occupation==='healer'){const patient=local.filter(q=>q.health<.8).sort((a,b)=>a.health-b.health)[0];if(patient){patient.health=clamp(patient.health+.06+p.skills.medicine*.1);if(random(w,'help',index(p))<.25){const id=event(w,'help',`${p.name}が${patient.name}の療養を助けた`,[p,patient],p.knowledgeSources.medicine?[p.knowledgeSources.medicine]:p.causes);bond(p,patient);patient.relationships[p.id].trust=clamp(patient.relationships[p.id].trust+.15);if(p.causes.length)influence(patient,id);}}}
   else if(p.occupation==='leader'&&s.leaderId!==p.id){const current=s.leaderId?person(w,s.leaderId):undefined;if(!current?.alive||p.skills.leadership+p.personality.ambition>current.skills.leadership+current.personality.ambition+.2){s.leaderId=p.id;event(w,'leadership',`${p.name}が${s.name}の指導者になった`,[p],p.causes);}}
   p.wealth+=effort*(p.occupation==='trader'? .4:.12);
   // Weighted personal goals compete with routine labour.
   const goals=[{name:'技能を学ぶ',score:t.curiosity*.7+(1-Math.max(...Object.values(p.skills)))*.3},{name:'人間関係を作る',score:t.sociability*.7+t.empathy*.2},{name:'家族を持つ',score:!p.spouse&&p.age<45?.55+t.empathy*.25:-1},{name:'子供を育てる',score:p.children.some(id=>person(w,id).alive&&person(w,id).age<16)?t.empathy*.65+.2:-1},{name:'新しい土地を探索する',score:t.riskTolerance*.4+t.independence*.3+t.curiosity*.2},{name:'富を増やす',score:t.ambition*.5+(p.wealth<2?.4:0)}].map((g,i)=>({...g,score:g.score+random(w,`goal:${i}`,index(p))*.35})).sort((a,b)=>b.score-a.score);
   p.goal=s.food<local.length*.4?'食料を確保する':goals[0].name;
   if(p.goal==='技能を学ぶ'){const mentor=local.filter(q=>q.id!==p.id&&q.age>p.age&&q.alive).sort((a,b)=>Math.max(...Object.values(b.skills))-Math.max(...Object.values(a.skills))||index(a)-index(b))[0];if(mentor)learn(w,mentor,p);}
   if(p.goal==='子供を育てる')for(const id of p.children){const child=person(w,id);if(child.alive&&child.age<16&&child.age>=4){learn(w,p,child);child.health=clamp(child.health+.02*t.empathy);}}
   if(p.goal==='富を増やす')p.wealth+=.15*t.ambition;
   if(p.goal==='新しい土地を探索する'){p.skills.exploration=clamp(p.skills.exploration+.025);if(random(w,'move',index(p))<.055)move(w,p,w.settlements.find(q=>q.id!==s.id)!.id);}
   if(p.goal==='技能を学ぶ'&&t.curiosity>.65&&random(w,'discovery',index(p))<.035){const k=(Object.keys(knowledgeNames) as Knowledge[]).find(k=>!p.knowledge.includes(k));if(k)teachKnowledge(w,p,k);}
  }
  const produced=producers.reduce((n,q)=>n+q.amount,0),demand=local.reduce((n,p)=>n+(p.age<12?.65:1),0),available=s.food*.65+produced;
  const shortage=available<demand;s.food=Math.max(0,Math.min(demand*3,available-demand));
  s.foodSources=producers.flatMap(q=>q.causes);
  // Only attribute a food rescue when the causally affected production bridges the deficit.
  const affected=producers.filter(q=>q.causes.some(id=>w.events[Number(id.slice(1))].roots?.length));
  if(!shortage&&available-affected.reduce((n,q)=>n+q.amount,0)<demand&&affected.length){
   const recipient=local.filter(p=>!producers.some(q=>q.p.id===p.id)).sort((a,b)=>a.health-b.health||index(a)-index(b))[0];
   if(recipient){const id=event(w,'food_help',`${affected[0].p.name}たちの収穫が不足分を補い、${recipient.name}の食卓を支えた`,[affected[0].p,recipient],affected.flatMap(q=>q.causes));influence(recipient,id);}
  }
  for(const p of local){p.health=clamp(p.health+(shortage?-.2*(1-available/Math.max(1,demand)):.035)-Math.max(0,p.age-55)*.0015);if(shortage)p.goal='食料を確保する';}
  if(shortage&&w.year%3===0)event(w,'shortage',`${s.name}で食料不足。住民が食料確保を優先する`,local.slice(0,1));
  const traders=local.filter(p=>p.occupation==='trader'),crafts=local.filter(p=>p.occupation==='craftsperson');
  if(!s.market&&s.food>local.length*.5&&traders.length&&crafts.length){s.market=true;s.marketEvent=event(w,'market',`${traders[0].name}と${crafts[0].name}の取引から${s.name}に定期市が生まれた`,[traders[0],crafts[0]],[...traders[0].causes,...crafts[0].causes]);}
  if(s.market&&(!traders.length||!crafts.length||shortage)){s.market=false;event(w,'market_closed',`${s.name}の市が休止した`,[],s.marketEvent?[s.marketEvent]:[]);}
 }
 for(const p of alive){
  if(!p.alive)continue;
  const local=alive.filter(q=>q.id!==p.id&&q.alive&&q.settlementId===p.settlementId);
  const contacts=p.goal==='家族を持つ'?local.filter(q=>!q.spouse&&q.age>=18&&q.sex!==p.sex&&!kin(w,p,q)):local;
  // Familiar people are more likely to meet again; an introduced pair can keep interacting.
  const weights=contacts.map(q=>1+(p.relationships[q.id]?.familiarity??0)*3),sum=weights.reduce((a,b)=>a+b,0);
  let pick=random(w,'contact',index(p))*sum;const q=contacts.find((_,i)=>(pick-=weights[i])<=0);
  if(q){bond(p,q);const rel=p.relationships[q.id],reverse=q.relationships[p.id],cooperation=(p.personality.empathy+q.personality.empathy)/2;
   for(const r of [rel,reverse]){r.familiarity=clamp(r.familiarity+.06);r.trust=clamp(r.trust+.025*cooperation);r.affection=clamp(r.affection+.04*cooperation);}
   if(p.occupation===q.occupation){rel.trust=clamp(rel.trust+.04);reverse.trust=clamp(reverse.trust+.04);}
   const s=w.settlements.find(s=>s.id===p.settlementId)!;
   if(s.food<local.length*.3&&random(w,'conflict',index(p))<p.personality.aggression*.3){rel.hostility=clamp(rel.hostility+.2);reverse.hostility=clamp(reverse.hostility+.12);if(!rel.roles.includes('rival')){rel.roles.push('rival');event(w,'conflict',`${p.name}と${q.name}が食料を巡って対立した`,[p,q]);}}
   if(rel.affection>.6&&!rel.roles.includes('friend')){rel.roles.push('friend');if(!reverse.roles.includes('friend'))reverse.roles.push('friend');event(w,'friend',`${p.name}と${q.name}が友人になった`,[p,q]);}
   if(rel.hostility<.4&&random(w,'teach',index(p))<.15+p.personality.sociability*.35+q.personality.conformity*.2)learn(w,p,q);
  }
  if(p.age>=18&&p.age<=48&&!p.spouse){const mate=local.filter(q=>q.age>=18&&q.age<=48&&!q.spouse&&q.sex!==p.sex&&!kin(w,p,q)&&p.relationships[q.id]?.affection>.35).sort((a,b)=>(p.relationships[b.id]?.affection??0)-(p.relationships[a.id]?.affection??0))[0];
   if(mate&&p.health>.45&&random(w,'marry',index(p))<.22){p.spouse=mate.id;mate.spouse=p.id;mate.familyId=p.familyId;bond(p,mate,'family');event(w,'marriage',`${p.name}と${mate.name}が結婚した`,[p,mate],[...p.causes,...mate.causes]);}}
  if(p.sex==='female'&&p.age>=20&&p.age<=41&&p.spouse&&w.people.filter(q=>q.alive).length<95){const mate=person(w,p.spouse),s=w.settlements.find(s=>s.id===p.settlementId)!;
   if(mate.alive&&mate.settlementId===p.settlementId&&w.year-p.lastBirth>=3&&p.health>.55&&s.food>1&&random(w,'birth',index(p))<p.fertility*.22){createPerson(w,0,p.settlementId,[p,mate]);p.lastBirth=w.year;}}
  if(p.health<=.05||p.age>p.lifespanTendency+random(w,'death',index(p))*12||(p.age>60&&random(w,'mortality',index(p))<(p.age-60)*.002)){
   p.alive=false;p.deathYear=w.year;const id=event(w,'death',`${p.name}が${p.age}歳で亡くなった`,[p],p.causes);
   if(p.spouse)person(w,p.spouse).spouse=undefined;
   for(const childId of p.children){const child=person(w,childId);if(child.alive)event(w,'parent_death',`${child.name}が親の${p.name}を亡くした`,[child],[id]);}
  }
 }
 // Rare families arrive as individual agents carrying their own knowledge.
 if(w.year%12===0&&living(w).length<70&&random(w,'immigration')<.75)arriveFamily(w);
 refreshPopulation(w);
}
function learn(w:SocialWorld,teacher:Person,student:Person){
 const best=skills.filter(k=>teacher.skills[k]>student.skills[k]+.08).sort((a,b)=>teacher.skills[b]-teacher.skills[a])[0];
 if(best){const before=student.skills[best];student.skills[best]=clamp(before+.015+student.personality.curiosity*.025);bond(teacher,student);if(!student.relationships[teacher.id].roles.includes('mentor'))student.relationships[teacher.id].roles.push('mentor');if(!teacher.relationships[student.id].roles.includes('student'))teacher.relationships[student.id].roles.push('student');student.relationships[teacher.id].respect=clamp(student.relationships[teacher.id].respect+.025);if(Math.floor(before*5)<Math.floor(student.skills[best]*5)){const id=event(w,'skill',`${student.name}が${teacher.name}から${skillNames[best]}を学んで上達した`,[teacher,student],teacher.causes);if(w.events[Number(id.slice(1))].roots?.length)influence(student,id);}}
 const k=teacher.knowledge.find(k=>!student.knowledge.includes(k));if(k)teachKnowledge(w,student,k,teacher);
 student.beliefs.cooperation=clamp(student.beliefs.cooperation+(teacher.beliefs.cooperation-student.beliefs.cooperation)*student.personality.conformity*.05);
}
function arriveFamily(w:SocialWorld,source?:string,sid='s0'){
 const a=createPerson(w,25,sid,[],'female'),b=createPerson(w,27,sid,[],'male');a.spouse=b.id;b.spouse=a.id;b.familyId=a.familyId;bond(a,b,'family');
 const id=event(w,'immigration',`${a.name}と${b.name}の一家が谷に移り住んだ`,[a,b],source?[source]:[]);if(source){influence(a,id);influence(b,id);}
 teachKnowledge(w,a,'medicine',undefined,id);createPerson(w,0,sid,[a,b]);return a;
}
export function intervene(w:SocialWorld,kind:TouchKind,personId:string,options:{otherId?:string;settlementId?:string;knowledge?:Knowledge}={}){
 const p=person(w,personId);if(!p?.alive)throw new Error('生存している人物を選んでください');
 const q=options.otherId?person(w,options.otherId):undefined;
 if(kind==='meeting'&&(!q?.alive||q.id===p.id))throw new Error('別の生存している人物を選んでください');
 if(kind==='move'&&(!w.settlements.some(s=>s.id===options.settlementId)||options.settlementId===p.settlementId))throw new Error('別の集落を選んでください');
 if(kind==='family'&&living(w).length>92)throw new Error('谷に新たな一家を迎える余裕がありません');
 if(kind==='knowledge'&&p.knowledge.includes(options.knowledge??'agriculture'))throw new Error('すでにその知識を持っています');
 const root=`i${w.interventions.length}`,labels:Record<TouchKind,string>={knowledge:'知識を授けた',tools:'道具を贈った',meeting:'出会いを導いた',move:'移住を導いた',training:'学習の機会を与えた',rescue:'療養と救助を行った',family:'一家の移住を導いた'};
 const id=event(w,'intervention',`プレイヤーが${p.name}に${labels[kind]}`,[p],[],root);
 w.interventions.push({id:root,year:w.year,kind,personId,...options,eventId:id});influence(p,id);
 if(kind==='knowledge')teachKnowledge(w,p,options.knowledge??'agriculture',undefined,id);
 if(kind==='tools'&&!p.possessions.includes('丈夫な道具'))p.possessions.push('丈夫な道具');
 if(kind==='training'){p.skills.farming=clamp(p.skills.farming+.2);event(w,'skill',`${p.name}が農業の実習を受けた`,[p],[id]);}
 if(kind==='rescue'){p.health=clamp(p.health+.45);}
 if(kind==='move')move(w,p,options.settlementId!,[id]);
 if(kind==='meeting'&&q){bond(p,q);const meeting=event(w,'meeting',`${p.name}と${q.name}が出会った`,[p,q],[id]);for(const [a,b] of [[p,q],[q,p]]){a.relationships[b.id].familiarity=clamp(a.relationships[b.id].familiarity+.4);a.relationships[b.id].affection=clamp(a.relationships[b.id].affection+.25);a.relationships[b.id].encounterEvent=meeting;}}
 if(kind==='family')arriveFamily(w,id,p.settlementId);
 refreshPopulation(w);return root;
}

import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createSocialWorld,stepSocial,intervene,living,stats,person} from '../src/PersonSimulation';
import {traits,skills,type SocialWorld} from '../src/SocialTypes';

const run=(w:SocialWorld,n:number)=>{for(let i=0;i<n;i++)stepSocial(w);return w;};
test('40 individually identified residents, complete profiles and reciprocal families',()=>{
 const w=createSocialWorld(100);
 assert.equal(living(w).length,40);assert.equal(stats(w).population,40);
 assert.equal(new Set(w.people.map(p=>p.id)).size,40);
 for(const p of w.people){
  assert.equal(p.age,-p.birthYear);
  for(const t of traits)assert.ok(p.personality[t]>=0&&p.personality[t]<=1);
  for(const s of skills)assert.ok(p.skills[s]>=0&&p.skills[s]<=1);
  for(const id of p.parents)assert.ok(person(w,id).children.includes(p.id));
  if(p.spouse)assert.equal(person(w,p.spouse).spouse,p.id);
  assert.ok(p.lifeEvents.length>0);
 }
 assert.equal(w.cells.reduce((n,c)=>n+c.population,0),40);
 assert.ok(w.people.every(p=>p.causes.length===0),'background learning must not display as player influence');
});
test('200 years remain deterministic, bounded and preserve genealogies and valid causal DAGs',()=>{
 for(const seed of [1,42,100,2026,99999]){
  const a=createSocialWorld(seed),b=createSocialWorld(seed);
  const target=a.people.find(p=>p.age>=16&&!p.knowledge.includes('agriculture'))!;
  for(const w of [a,b]){intervene(w,'knowledge',target.id,{knowledge:'agriculture'});run(w,200);}
  assert.deepEqual(a,b);
  assert.ok(living(a).length>5,`seed ${seed} population ${living(a).length}`);
  assert.ok(living(a).length<=95);
  assert.ok(Math.max(...a.people.map(p=>p.generation))>=3,`seed ${seed} generations`);
  assert.ok(a.events.some(e=>e.kind==='marriage'&&e.year>0));
  for(const kind of ['birth','death','migration','knowledge','occupation'])assert.ok(a.events.some(e=>e.kind===kind),kind);
  assert.equal(a.cells.reduce((n,c)=>n+c.population,0),living(a).length);
  for(const p of a.people){assert.ok(Number.isFinite(p.health));for(const id of p.children)assert.ok(person(a,id).parents.includes(p.id));for(const id of Object.keys(p.relationships))assert.ok(person(a,id).relationships[p.id]);}
  for(const e of a.events)for(const id of e.parents){const parent=a.events[Number(id.slice(1))];assert.ok(parent&&Number(id.slice(1))<Number(e.id.slice(1)));assert.ok(parent.year<=e.year);}
 }
});
test('personal intervention propagates through actual teaching into descendants after a century',()=>{
 const w=createSocialWorld(100),p=w.people.find(p=>p.age>=16&&!p.knowledge.includes('medicine'))!;
 const root=intervene(w,'knowledge',p.id,{knowledge:'medicine'});
 assert.equal(stats(w).population,40);
 assert.equal(w.cells[p.cell].technology,createSocialWorld(100).cells[p.cell].technology);
 run(w,150);
 const effects=w.events.filter(e=>e.roots?.includes(root));
 assert.ok(effects.some(e=>e.kind==='knowledge'&&e.personIds?.some(id=>id!==p.id)));
 assert.ok(effects.some(e=>e.year>=100));
 assert.ok(w.people.some(q=>q.generation>0&&q.causes.some(id=>w.events[Number(id.slice(1))].roots?.includes(root))));
});
test('save/restore yields exactly the same future without hidden random state',()=>{
 const a=run(createSocialWorld(81),45),b:SocialWorld=JSON.parse(JSON.stringify(a));
 const target=living(a)[0];
 intervene(a,'tools',target.id);intervene(b,'tools',target.id);
 assert.equal(JSON.stringify(run(a,100)),JSON.stringify(run(b,100)));
});
test('a single knowledge gift can change the society after 150 years through annual actions',()=>{
 const baseline=createSocialWorld(100),changed=createSocialWorld(100);
 const before=stats(changed);
 const root=intervene(changed,'knowledge','p5',{knowledge:'agriculture'});
 assert.equal(stats(changed).population,before.population);
 assert.deepEqual(stats(changed).occupations,before.occupations,'the intervention cannot directly assign a profession');
 run(baseline,150);run(changed,150);
 assert.notEqual(stats(changed).births,stats(baseline).births);
 assert.notEqual(stats(changed).population,stats(baseline).population);
 assert.ok(changed.events.some(e=>e.kind==='occupation'&&e.roots?.includes(root)));
});
test('person interventions validate before mutation and keep individual counts',()=>{
 const w=createSocialWorld(10),n=w.events.length;
 assert.throws(()=>intervene(w,'meeting','p0',{otherId:'p0'}));assert.equal(w.events.length,n);
 intervene(w,'family','p0');assert.equal(living(w).length,43);
 intervene(w,'move','p0',{settlementId:'s1'});
 assert.equal(person(w,'p0').settlementId,'s1');assert.equal(person(w,'p1').settlementId,'s1');
 assert.equal(stats(w).population,w.cells.reduce((n,c)=>n+c.population,0));
});

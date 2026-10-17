import {END_YEAR} from './HistoryConfig';
import {addIndividual,migrantProfile,validProfile} from './CultureSystem';
import type {WorldState,Intervention,Kind,Cell} from './WorldState';
import {record} from './EventHistory';
export const labels:Record<Kind,string>={rain:'雨',drought:'干ばつ',lightning:'落雷',plant:'植物',herbivore:'草食動物',predator:'捕食動物',fire:'小さな山火事',river:'川の増水',warmth:'気温上昇',wind:'強風',migrant:'移住者'};
export const descriptions:Record<Kind,string>={rain:'半径2マスに、4年間だけ雨を少し増やします。',drought:'半径2マスの雨を、4年間だけ少し減らします。',lightning:'1マスに落雷。植生が焼け、土壌に灰が残ります。',plant:'1マスに少量の植物を芽吹かせます。',herbivore:'1マスに草食動物を少数放ちます。',predator:'1マスに捕食動物を少数放ちます。',fire:'1マスに小さな火を起こします。',river:'付近の川の流量を2年間だけ少し増やします。',warmth:'半径2マスの気温を3年間だけ1.5℃上げます。',wind:'周辺に1年間の強風。水分と害虫の生息環境を少し変えます。',migrant:'技能と生活道具を持つ普通の移住者と、その家族が到着します。'};
export const land=(c:Cell)=> !['sea','river','mountain'].includes(c.terrain);
export function validate(w:WorldState,i:Intervention):string|undefined {
 if(!Object.hasOwn(labels,i.type))return '未知の自然介入です。';
 const {x,y}=i.position;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>15||y<0||y>15)return 'マップ内を選んでください。';
 if(w.year>=END_YEAR||w.interventions.length>=5)return '介入できる回数がありません。';
 if(i.type==='migrant'&&i.profile&&!validProfile(i.profile))return '移住者のプロフィールが不正です。';
 if(i.year!==w.year)return '現在年の介入を選んでください。';
 if(w.interventions.some(a=>a.id===i.id))return '介入IDが重複しています。';
 if(i.type==='river'&&!w.cells.some(c=>c.terrain==='river'&&Math.abs(c.x-x)+Math.abs(c.y-y)<=2))return '川か、川に接する陸地を選んでください。';
 if(!land(w.cells[y*16+x])&&!(i.type==='river'&&w.cells[y*16+x].terrain==='river'))return '平地・森林・集落のある陸地を選んでください。';
}
// Never mutate civilization here. Weather expires; organisms are one-off introductions.
export function apply(w:WorldState,i:Intervention):void {
 const error=validate(w,i);if(error)throw Error(error);
 w.interventions.push(structuredClone(i));const c=w.cells[i.position.y*16+i.position.x];
 const event=record(w,{rain:'局地的な雨量増加',drought:'局地的な干ばつ',lightning:'一度だけの落雷',plant:'植物が芽吹く',herbivore:'草食動物を少数導入',predator:'捕食動物を少数導入',fire:'小さな火種',river:'一時的な川の増水',warmth:'局地的な気温の上昇',wind:'一時的な強風',migrant:'移住者の到着'}[i.type],c.id,[],i.id);
 w.events.at(-1)!.type=i.type==='migrant'?'arrival':'anomaly';
 if(i.type==='migrant'){const profile=i.profile||migrantProfile(w.seed,w.interventions.length);w.events.at(-1)!.title=`${profile.name}（${profile.age}歳）が${profile.originCulture}から移住`;const person=addIndividual(w,c.id,profile,event,i.id);c.population+=1+person.profile.family.members;c.links.knowledge=[...c.links.knowledge,event];return;}
 if(['rain','drought','river','warmth','wind'].includes(i.type)){w.effects.push({intervention:structuredClone(i),event,expires:w.year+({river:2,warmth:3,wind:1}[i.type as 'river'|'warmth'|'wind']??4)});return;}
 if(i.type==='lightning'||i.type==='fire'){c.counters.ignition=1;c.links.vegetation=[...c.links.vegetation,event];}
 if(i.type==='plant'){c.vegetation=Math.min(1,c.vegetation+.18);c.biodiversity=Math.min(1,c.biodiversity+.12);c.links.vegetation=[...c.links.vegetation,event];}
 if(i.type==='herbivore'){c.herbivores+=8;c.links.animals=[...c.links.animals,event];}
 if(i.type==='predator'){c.predators+=3;c.links.animals=[...c.links.animals,event];}
}

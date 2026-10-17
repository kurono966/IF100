import type {WorldState,Intervention,Kind,Cell} from './WorldState';
import {record} from './EventHistory';
export const labels:Record<Kind,string>={rain:'雨',drought:'干ばつ',lightning:'落雷',plant:'植物',herbivore:'草食動物',predator:'捕食動物'};
export const descriptions:Record<Kind,string>={rain:'半径2マスに、4年間だけ雨を増やします。',drought:'半径2マスの雨を、4年間だけ減らします。',lightning:'1マスに落雷。植生が焼け、土壌に灰が残ります。',plant:'1マスに少量の植物を芽吹かせます。',herbivore:'1マスに草食動物を少数放ちます。',predator:'1マスに捕食動物を少数放ちます。'};
export const land=(c:Cell)=> !['sea','river','mountain'].includes(c.terrain);
export function validate(w:WorldState,i:Intervention):string|undefined {
 if(!Object.hasOwn(labels,i.type))return '未知の自然介入です。';
 const {x,y}=i.position;if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>15||y<0||y>15)return 'マップ内を選んでください。';
 if(w.year>=100||w.interventions.length>=5)return '介入できる回数がありません。';
 if(i.year!==w.year)return '現在年の介入を選んでください。';
 if(w.interventions.some(a=>a.id===i.id))return '介入IDが重複しています。';
 if(!land(w.cells[y*16+x]))return '平地・森林・集落のある陸地を選んでください。';
}
// Never mutate civilization here. Weather expires; organisms are one-off introductions.
export function apply(w:WorldState,i:Intervention):void {
 const error=validate(w,i);if(error)throw Error(error);
 w.interventions.push(structuredClone(i));const c=w.cells[i.position.y*16+i.position.x];
 const event=record(w,{rain:'局地的な雨量増加',drought:'局地的な干ばつ',lightning:'落雷と小さな山火事',plant:'植物が芽吹く',herbivore:'草食動物を少数導入',predator:'捕食動物を少数導入'}[i.type],c.id,[],i.id);
 if(i.type==='rain'||i.type==='drought'){w.effects.push({intervention:structuredClone(i),event,expires:w.year+4});return;}
 if(i.type==='lightning'){c.vegetation*=.5;c.forest*=.65;c.soilFertility=Math.min(1,c.soilFertility+.10);c.burnedUntil=w.year+2;c.links.vegetation=[...c.links.vegetation,event];}
 if(i.type==='plant'){c.vegetation=Math.min(1,c.vegetation+.18);c.biodiversity=Math.min(1,c.biodiversity+.12);c.links.vegetation=[...c.links.vegetation,event];}
 if(i.type==='herbivore'){c.herbivores+=8;c.links.animals=[...c.links.animals,event];}
 if(i.type==='predator'){c.predators+=3;c.links.animals=[...c.links.animals,event];}
}

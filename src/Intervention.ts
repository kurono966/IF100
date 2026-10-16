import type {WorldState,Intervention,Kind,Cell} from './WorldState';
import {record} from './EventHistory';
export const labels:Record<Kind,string>={bridge:'橋を架ける',protect:'森林を保護する',road:'道路を作る',hospital:'病院を建てる',research:'研究施設を建てる'};
export const descriptions:Record<Kind,string>={bridge:'川の両岸の交通と交易をつなぎます。',protect:'森林の減少を抑えます。地域の開発は緩やかになります。',road:'2地点をつなぎ、沿線の移動と交易を改善します。',hospital:'周辺地域の死亡率を抑えます。',research:'周辺地域へ知識が伝わりやすくなります。'};
export const land=(c:Cell)=> !['sea','river','mountain'].includes(c.terrain);
export function validate(w:WorldState,i:Intervention):string|undefined {
 const {x,y}=i.position; if(!Number.isInteger(x)||!Number.isInteger(y)||x<0||x>15||y<0||y>15)return 'マップ内を選んでください。';
 if(w.year>=100||w.interventions.length>=5)return '介入できる回数がありません。';
 if(i.year!==w.year)return '現在年の介入を選んでください。';
 const c=w.cells[y*16+x];
 if(c.buildings.includes(i.type))return 'ここにはすでに設置されています。';
 if(i.type==='bridge'){if(c.terrain!=='river'||!w.cells.some(a=>land(a)&&Math.abs(a.x-x)+Math.abs(a.y-y)===1))return '岸に接する川を選んでください。';}
 else if(!land(c))return '平地・森林・集落を選んでください。';
 if(i.type==='protect'&&c.forest<.25)return '森林が残る場所を選んでください。';
 if(i.type==='road'){const e=i.end;if(!e||e.x<0||e.x>15||e.y<0||e.y>15||!land(w.cells[e.y*16+e.x])||(e.x===x&&e.y===y))return '道路の終点に別の陸地を選んでください。';
 if(roadCells(w,i).some(a=>!land(a)&&!a.buildings.includes('bridge')))return '道路は陸地か建設済みの橋を通す必要があります。';}
}
export function roadCells(w:WorldState,i:Intervention):Cell[]{let {x,y}=i.position;const e=i.end!;const a=[w.cells[y*16+x]];while(x!==e.x||y!==e.y){if(x!==e.x)x+=Math.sign(e.x-x);else y+=Math.sign(e.y-y);a.push(w.cells[y*16+x]);}return a;}
export function apply(w:WorldState,i:Intervention):void {
 const error=validate(w,i);if(error)throw Error(error);
 w.interventions.push(structuredClone(i)); const origin=w.cells[i.position.y*16+i.position.x];origin.buildings.push(i.type);
 const event=record(w,labels[i.type],origin.id,[],i.id);
 const affected=i.type==='road'?roadCells(w,i):w.cells.filter(c=>Math.hypot(c.x-origin.x,c.y-origin.y)<=(i.type==='protect'?2.5:3.5));
 for(const c of affected){c.causes.push(event);if(i.type==='protect')c.protected=true;if(i.type==='road'||i.type==='bridge')c.infrastructure+=i.type==='bridge'?.8:1.2;}
}

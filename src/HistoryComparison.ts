import {END_YEAR} from './HistoryConfig';
import {escapeHtml} from './UiText';
import type {WorldState,HistoryEvent,Cell} from './WorldState';
import {chain} from './EventHistory';
export interface HistoricalChange {cell:number;impact:number;path:HistoryEvent[];baseline:HistoryEvent[];before:Cell;after:Cell}
const major=new Set(['wildfire','flood','drought','epidemic','shortage','harvest','migration','settlement','abandonment','market','trade_route','road','industry','urbanization','decline','forest_recovery','ecosystem_collapse','resource_use','arrival','death','skill_adoption','inheritance','cultural_spread','regional_tradition','realm_formation','realm_collapse','renaissance','zenith']);
export function summarize(path:HistoryEvent[],limit=14):HistoryEvent[]{
 if(path.length<=limit)return path;
 const chosen=new Set<number>([0,path.length-1]);
 const priority=(e:HistoryEvent)=>['realm_formation','realm_collapse','cultural_spread','regional_tradition','urbanization','industry','skill_adoption','death','renaissance'].includes(e.type||'')?3:major.has(e.type||'')?2:1;
 for(let start=0;start<END_YEAR;start+=100){const candidates=path.map((e,i)=>({e,i})).filter(({e})=>e.year>=start&&e.year<start+100);candidates.sort((a,b)=>priority(b.e)-priority(a.e)||a.e.year-b.e.year);if(candidates[0])chosen.add(candidates[0].i);}
 for(const type of ['skill_adoption','inheritance','market','trade_route','urbanization']){if(chosen.size>=limit)break;const index=path.findIndex(e=>e.type===type);if(index>=0)chosen.add(index);}
 return [...chosen].sort((a,b)=>a-b).slice(0,limit-1).map(i=>path[i]).concat(path.at(-1)!).filter((e,i,a)=>i===0||e.id!==a[i-1].id);
}
export function historicalChanges(w:WorldState,baseline:WorldState,limit=3):HistoricalChange[]{
 const candidates=w.cells.map(c=>{const a=baseline.cells[c.id];return {c,impact:Math.abs(c.stage-a.stage)*700+Math.abs(c.markets-a.markets)*500+Math.abs(c.trade-a.trade)*180+Math.abs(c.population-a.population)+Math.abs(c.roads-a.roads)*70+Math.abs(c.forest-a.forest)*100};})
 .filter(({c,impact})=>impact>2&&c.terrain!=='sea'&&c.terrain!=='river'&&c.terrain!=='mountain').sort((a,b)=>b.impact-a.impact||a.c.id-b.c.id);
 const result:HistoricalChange[]=[];
 for(const {c,impact} of candidates){if(result.length>=limit)break;
 const paths=w.interventions.map(i=>chain(w,i.id,baseline,c.id)).filter(p=>p.at(-1)?.cell===c.id&&p.at(-1)?.year===END_YEAR);
 paths.sort((a,b)=>new Set(b.map(e=>e.phase)).size-new Set(a.map(e=>e.phase)).size||b.length-a.length);
 if(!paths.length)continue;
 result.push({cell:c.id,impact,path:paths[0],baseline:baseline.events.filter(e=>(e.cell===c.id||e.destination===c.id)&&major.has(e.type||'')).slice(-5),before:baseline.cells[c.id],after:c});
 }
 return result;
}
export function describe(c:Cell):string {return `${['集落のない地域','小さな集落','交易都市','産業都市'][c.stage]}${c.markets?'・市場あり':''} / 人口 ${Math.round(c.population).toLocaleString()} / 森林 ${Math.round(c.forest*100)}%`;}
export function comparisonCards(w:WorldState,baseline:WorldState):string {
 const changes=historicalChanges(w,baseline);
 if(!changes.length)return '<p class="muted">大きな歴史の分岐は記録されませんでした。小さな異常の余波が、いつも都市まで届くとは限りません。</p>';
 return changes.map((change,n)=>`<article class="history-change"><div class="change-heading"><span class="eyebrow">HISTORY 0${n+1} · 地域 (${change.after.x}, ${change.after.y})</span><h3>${change.before.stage!==change.after.stage?`${['自然の地域','集落','交易都市','産業都市'][change.before.stage]}から${['自然の地域','集落','交易都市','産業都市'][change.after.stage]}へ`:change.before.markets!==change.after.markets?'市場の成立が変わった地域':Math.abs(change.before.trade-change.after.trade)>.1?'交易の流れが変わった地域':'暮らしと生態系が変わった地域'}</h3></div><div class="history-pair"><section><div class="eyebrow">BASELINE / 何もしなかった世界</div><p class="outcome-description">${describe(change.before)}</p><ol>${change.baseline.map(e=>`<li><time>${e.year}年</time><span>${escapeHtml(e.title)}</span></li>`).join('')||'<li>主要な社会イベントは記録されていません。</li>'}</ol></section><section><div class="eyebrow">YOUR WORLD / あなたが触れた世界</div><p class="outcome-description">${describe(change.after)}</p><ol>${summarize(change.path).map(e=>`<li><time>${e.year}年</time><span>${escapeHtml(e.title)}<small>地域 (${e.cell%16}, ${Math.floor(e.cell/16)})${e.root?' · あなたの異常':baseline.events.some(a=>a.cell===e.cell&&a.year===e.year&&a.type===e.type&&a.title===e.title)?' · 共通する経過':' · 発生時期・経過に違い'}</small></span></li>`).join('')}</ol></section></div></article>`).join('');
}

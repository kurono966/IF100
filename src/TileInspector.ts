import type {Cell,WorldState} from './WorldState';
import {biomes} from './Biomes';
import {skillNames} from './CultureSystem';
import {escapeHtml as h} from './UiText';
const percent=(n:number)=>`${Math.round(n*100)}%`;
const count=(n:number)=>Math.round(n).toLocaleString();
export function tileSummary(c:Cell,w:WorldState):string {
 return `<strong>${h(c.placeName)} <small>(${c.x}, ${c.y}) · ${w.year}年</small></strong><span>${biomes[c.biome].name} · ${['自然の地域','集落','交易都市','産業都市'][c.stage]}</span><div class="tile-hover-metrics"><span>人口 <b>${count(c.population)}</b></span><span>気温 <b>${c.temperature.toFixed(1)}℃</b></span><span>植生 <b>${percent(c.vegetation)}</b></span><span>森林 <b>${percent(c.forest)}</b></span><span>水分 <b>${percent(c.water)}</b></span><span>食料余剰 <b>${c.foodSurplus.toFixed(2)}</b></span></div><small>クリックで詳細を固定</small>`;
}
export function tileDetails(c:Cell,w:WorldState):string {
 const row=(label:string,value:string)=>`<div><dt>${label}</dt><dd>${h(value)}</dd></div>`;
 const realm=w.realms.find(r=>r.id===c.realm&&r.active);
 const knowledge=Object.values(c.traditions).filter(t=>t?.adopted).map(t=>`${skillNames[t!.skill]}（第${t!.generations+1}世代）`).join('・');
 const events=w.events.filter(e=>e.cell===c.id||e.destination===c.id).slice(-3);
 return `<div class="tile-inspector-heading"><div><span class="eyebrow">REGION (${c.x}, ${c.y}) / ${w.year}年</span><h3>${h(c.placeName)} <small>${biomes[c.biome].name}</small></h3></div><button type="button" class="tile-inspector-close" aria-label="地域の詳細を閉じる">×</button></div><button type="button" class="open-local-map">この地域へズーム ↗</button><div class="tile-detail-groups"><section><h4>自然・生態</h4><dl>${row('標高',c.elevation.toFixed(3))}${row('気温',`${c.temperature.toFixed(1)}℃`)}${row('雨量',c.rainfall.toFixed(2))}${row('土壌肥沃度',percent(c.soilFertility))}${row('植生 / 森林',`${percent(c.vegetation)} / ${percent(c.forest)}`)}${row('水分 / 河川流量',`${percent(c.water)} / ${c.riverFlow.toFixed(2)}`)}${row('草食 / 捕食',`${c.herbivores.toFixed(1)} / ${c.predators.toFixed(1)}`)}${row('生物多様性',percent(c.biodiversity))}${row('洪水 / 火災リスク',`${percent(c.floodRisk)} / ${percent(c.fireRisk)}`)}</dl></section><section><h4>暮らし・文明</h4><dl>${row('人口 / 収容力',`${count(c.population)} / ${count(c.populationCapacity)}`)}${row('食料生産 / 余剰',`${c.foodProduction.toFixed(2)} / ${c.foodSurplus.toFixed(2)}`)}${row('健康 / 疾病リスク',`${percent(c.health)} / ${percent(c.diseaseRisk)}`)}${row('居住適性',percent(c.habitability))}${row('移住の純増減',`${c.migration>0?'+':''}${c.migration.toFixed(1)}`)}${row('交易 / 市場 / 道路',`${c.trade.toFixed(2)} / ${c.markets} / ${c.roads}`)}${row('富 / 技術',`${c.wealth.toFixed(1)} / ${c.technology.toFixed(1)}`)}${row('文化 / 文明圏',`${c.cultureName} / ${realm?.name||'所属なし'}`)}${row('遺構',String(c.ruins))}</dl></section></div><p class="tile-knowledge">継承された技能：${h(knowledge||'まだ定着していません')}</p>${events.length?`<div class="tile-local-events">${events.map(e=>`<p><time>${e.year}年</time> ${h(e.title)}</p>`).join('')}</div>`:''}`;
}


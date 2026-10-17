import type {HistoryEvent} from './WorldState';
export const escapeHtml=(value:unknown)=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
const important=new Set(['region_transition','mass_migration','arrival','skill_adoption','inheritance','cultural_spread','regional_tradition','realm_formation','realm_collapse','renaissance','zenith','settlement','urbanization','market','trade_route','industry','abandonment','decline','epidemic','shortage','wildfire','flood']);
export function isImportant(e:HistoryEvent):boolean {return important.has(e.type||'')||(e.type==='migration'&&(e.amount||0)>=15);}
export function eventPriority(e:HistoryEvent):number {return ['region_transition','mass_migration','realm_formation','realm_collapse','urbanization','industry','skill_adoption','cultural_spread','renaissance'].includes(e.type||'')?3:['market','decline','regional_tradition','zenith'].includes(e.type||'')?2:1;}
export function notableEvents(events:HistoryEvent[],limit=120):HistoryEvent[]{
 const years=new Map<number,HistoryEvent>();for(const e of events.filter(isImportant)){const old=years.get(e.year);if(!old||eventPriority(e)>eventPriority(old))years.set(e.year,e);}
 const values=[...years.values()];if(values.length<=limit)return values;
 // Preserve the early generations and sample every century rather than only recent history.
 const selected:HistoryEvent[]=[];for(let century=0;century<10;century++){const within=values.filter(e=>Math.floor(e.year/100)===century).sort((a,b)=>eventPriority(b)-eventPriority(a)||a.year-b.year);selected.push(...within.slice(0,Math.floor(limit/10)));}return selected.sort((a,b)=>a.year-b.year);
}

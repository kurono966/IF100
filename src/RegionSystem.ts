import type {Cell,RegionState,WorldState} from './WorldState';
import {combine} from './EventHistory';
import {emit} from './Dynamics';
import {land} from './Intervention';
export const regionNames:Record<RegionState,string>={wilderness:'自然地域',forest_region:'森林地帯',grassland:'草原地帯',agricultural:'農業地帯',trade_hub:'交易地帯',urban_region:'都市圏',degraded:'荒廃地',ruins_region:'廃墟地域'};
export const regionColors:Record<RegionState,number>={wilderness:0xcdd8ad,forest_region:0x7fa177,grassland:0xd6d9a1,agricultural:0xd4c380,trade_hub:0xd4bd97,urban_region:0xb7bbb0,degraded:0xc4ad8a,ruins_region:0xb6b1a2};
export function regionCandidate(c:Cell):RegionState {
 const current=c.regionState;
 if(c.stage>=2&&c.population>(current==='urban_region'?440:650))return 'urban_region';
 if(c.stage>0&&c.markets>0&&c.trade>(current==='trade_hub'?.18:.42))return 'trade_hub';
 if(c.ruins>0&&c.stage===0&&c.population<(current==='ruins_region'?100:60))return 'ruins_region';
 if(c.vegetation<(current==='degraded'?.26:.13)&&c.biodiversity<(current==='degraded'?.4:.28)&&c.soilFertility<.48)return 'degraded';
 if(c.stage>0&&c.population>140&&c.foodProduction>.18&&c.development>(current==='agricultural'?14:22)&&c.forest<(current==='agricultural'?.58:.43))return 'agricultural';
 if(c.forest>(current==='forest_region'?.47:.63)&&c.vegetation>.42)return 'forest_region';
 if(c.forest<.3&&c.vegetation>(current==='grassland'?.24:.38))return 'grassland';
 return 'wilderness';
}
export function updateRegions(w:WorldState):void {
 for(const c of w.cells){if(!land(c))continue;const next=regionCandidate(c);
 for(const state of Object.keys(regionNames) as RegionState[])c.counters[`region:${state}`]=next!==c.regionState&&next===state?(c.counters[`region:${state}`]||0)+1:0;
 const duration=next==='urban_region'||next==='trade_hub'?8:next==='degraded'?12:15;
 if((c.counters[`region:${next}`]||0)<duration)continue;
 const previous=c.regionState;c.regionState=next;c.regionSince=w.year;
 const title=next==='agricultural'?'耕作と定住が続き、農業地域が形成':next==='forest_region'?'大規模な森林回復が定着し、森林地帯が形成':next==='trade_hub'?'市場と道路の往来が定着し、交易圏が形成':next==='urban_region'?'集落と交易が集積し、都市圏が形成':next==='degraded'?'土壌と生態系の損耗が続き、荒廃地域が形成':next==='ruins_region'?'住民が去り、かつての集落が廃墟地域となる':previous==='ruins_region'&&c.stage>0?'廃墟地域に人が戻り再定住が進む':previous==='urban_region'||previous==='trade_hub'?'人口と交易の流出が続き、地域文明が衰退':`${regionNames[next]}への変化が定着`;
 emit(w,c,'region_transition',title,'civilization',combine(w,c.links.civilization,c.links.population,c.links.migration,c.links.food,c.links.life,c.links.vegetation,c.links.animals,c.links.trade));
 }
}

export type RegionState='wilderness'|'forest_region'|'grassland'|'agricultural'|'trade_hub'|'urban_region'|'degraded'|'ruins_region';
export type Terrain = 'sea'|'plain'|'forest'|'mountain'|'river';
export type Biome='ocean'|'coast'|'grassland'|'woodland'|'rainforest'|'steppe'|'desert'|'wetland'|'taiga'|'tundra'|'alpine'|'river'|'savanna'|'dry_forest'|'lake'|'estuary'|'floodplain';
export interface WorldGeography {version:2;seaLevel:number;mountainLevel:number;continentScale:number;oceanFraction:number;moistureBias:number;meanTemperature:number;riverPaths:number[][];drainageOrder:number[]}
export interface Geography {biome:Biome;elevation:number;moisture:number;baseRainfall:number;baseTemperature:number;fertilityPotential:number;drainageTo:number|null;basinRiver:number|null;distanceToWater:number;populationCapacity:number}
export type Kind = 'rain'|'drought'|'lightning'|'plant'|'herbivore'|'predator'|'fire'|'river'|'warmth'|'wind'|'migrant';
export type Phase = 'weather'|'vegetation'|'animals'|'food'|'population'|'civilization'|'life'|'migration'|'trade'|'knowledge'|'culture';
export interface Intervention { id:string; year:number; type:Kind; position:{x:number;y:number};profile?:PersonProfile }
export interface NaturalEffect { intervention:Intervention; event:string; expires:number }
export interface Ecology { rainfall:number;temperature:number;soilFertility:number;vegetation:number;water:number;herbivores:number;predators:number;biodiversity:number;fireRisk:number;food:number }
export type EventType = 'region_transition'|'mass_migration'|'anomaly'|'wildfire'|'flood'|'drought'|'epidemic'|'shortage'|'harvest'|'migration'|'settlement'|'abandonment'|'market'|'trade_route'|'road'|'industry'|'urbanization'|'decline'|'forest_recovery'|'ecosystem_collapse'|'resource_use'|'ecology'|'outcome'|'arrival'|'death'|'skill_adoption'|'inheritance'|'cultural_spread'|'regional_tradition'|'realm_formation'|'realm_collapse'|'renaissance'|'zenith';
export interface Layers {
 riverFlow:number;floodRisk:number;pests:number;diseaseRisk:number;
 foodProduction:number;foodSurplus:number;health:number;resourceAvailability:number;habitability:number;
 migration:number;localDemand:number;settlementAttractiveness:number;
 settlementStage:number;roads:number;markets:number;urbanInfluence:number;
 livelihood:'subsistence'|'farming'|'hunting'|'forestry'|'craft';
 counters:Record<string,number>; floodedUntil:number; epidemicUntil:number;
}
export interface TradeRoute { id:string;from:number;to:number;path:number[];formed:number;roadYear?:number;volume:number;parents:string[];event:string }
export type Skill = 'pottery'|'boats'|'agronomy'|'healing'|'metalwork'|'commerce';
export interface PersonProfile {name:string;age:number;profession:Skill;skills:Skill[];knowledge:Skill[];personality:'慎重'|'社交的'|'探究的';originCulture:string;family:{members:number;description:string};health:number;possessions:string[];reason:string}
export interface Individual {id:string;profile:PersonProfile;cell:number;arrived:number;alive:boolean;died?:number;event:string;legacy?:string}
export interface Tradition {origins:string[];skill:Skill;strength:number;practice:number;generations:number;households:number;apprentices:number;originCell:number;started:number;event:string;lastPracticed:number;adopted:boolean;regional:boolean;industrial:boolean;sourceName:string}
export interface Realm {id:string;name:string;center:number;members:number[];formed:number;active:boolean;vitality:number;event:string;peak:number}
export interface HistoricalTrace {cell:number;name:string;skill?:Skill;year:number;event:string}
export interface LongHistory {cultureId:string;cultureName:string;placeName:string;traditions:Partial<Record<Skill,Tradition>>;ruins:number;exhaustion:number;civicAge:number;realm?:string;prestige:number}
export interface Cell extends Ecology,Layers,LongHistory,Geography { regionState:RegionState;regionSince:number; id:number;x:number;y:number;terrain:Terrain;population:number;wealth:number;development:number;forest:number;infrastructure:number;technology:number;trade:number;stage:number;links:Record<Phase,string[]>;checkpoints:Record<string,number>;burnedUntil:number }
export interface HistoryEvent { id:string;year:number;title:string;cell:number;parents:string[];root?:string;phase?:Phase;type?:EventType;types?:EventType[];destination?:number;amount?:number;roots?:string[];depth?:number;phases?:Phase[] }
export interface Metrics { population:number;economy:number;nature:number;technology:number;happiness:number;stability:number;cities:number;forestRate:number;herbivores:number;predators:number;biodiversity:number;food:number }
export interface WorldState { geography:WorldGeography;seed:number;year:number;cells:Cell[];events:HistoryEvent[];interventions:Intervention[];effects:NaturalEffect[];routes:TradeRoute[];metrics:Metrics;people:Individual[];realms:Realm[];traces:HistoricalTrace[] }


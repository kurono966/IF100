export type Terrain = 'sea'|'plain'|'forest'|'mountain'|'river';
export type Kind = 'rain'|'drought'|'lightning'|'plant'|'herbivore'|'predator';
export type Phase = 'weather'|'vegetation'|'animals'|'food'|'population'|'civilization';
export interface Intervention { id:string; year:number; type:Kind; position:{x:number;y:number} }
export interface NaturalEffect { intervention:Intervention; event:string; expires:number }
export interface Ecology { rainfall:number;temperature:number;soilFertility:number;vegetation:number;water:number;herbivores:number;predators:number;biodiversity:number;fireRisk:number;food:number }
export interface Cell extends Ecology { id:number;x:number;y:number;terrain:Terrain;population:number;wealth:number;development:number;forest:number;infrastructure:number;technology:number;trade:number;stage:number;links:Record<Phase,string[]>;checkpoints:Record<string,number>;burnedUntil:number }
export interface HistoryEvent { id:string;year:number;title:string;cell:number;parents:string[];root?:string;phase?:Phase;roots?:string[];depth?:number;phases?:Phase[] }
export interface Metrics { population:number;economy:number;nature:number;technology:number;happiness:number;stability:number;cities:number;forestRate:number;herbivores:number;predators:number;biodiversity:number;food:number }
export interface WorldState { seed:number;year:number;cells:Cell[];events:HistoryEvent[];interventions:Intervention[];effects:NaturalEffect[];metrics:Metrics }


export type Terrain = 'sea'|'plain'|'forest'|'mountain'|'river';
export type Kind = 'bridge'|'protect'|'road'|'hospital'|'research';
export interface Intervention { id:string; year:number; type:Kind; position:{x:number;y:number}; end?:{x:number;y:number} }
export interface Cell { id:number;x:number;y:number;terrain:Terrain;population:number;wealth:number;development:number;forest:number;infrastructure:number;technology:number;trade:number;protected:boolean;buildings:Kind[];causes:string[];stage:number }
export interface HistoryEvent { id:string;year:number;title:string;cell:number;parents:string[];root?:string }
export interface Metrics { population:number;economy:number;nature:number;technology:number;happiness:number;stability:number;cities:number;forestRate:number }
export interface WorldState { seed:number;year:number;cells:Cell[];events:HistoryEvent[];interventions:Intervention[];metrics:Metrics }

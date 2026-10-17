import type {Cell, HistoryEvent, WorldGeography} from './WorldState';

export const traits = ['sociability','diligence','curiosity','ambition','aggression','empathy','riskTolerance','conformity','independence'] as const;
export const skills = ['farming','hunting','gathering','crafting','construction','trade','leadership','medicine','exploration'] as const;
export type Trait = typeof traits[number];
export type SkillName = typeof skills[number];
export type Occupation = 'farmer'|'hunter'|'gatherer'|'builder'|'craftsperson'|'trader'|'healer'|'leader'|'child';
export type Knowledge = 'agriculture'|'tools'|'medicine'|'commerce';
export interface Relationship {personId:string; familiarity:number; affection:number; trust:number; respect:number; hostility:number; encounterEvent?:string; roles:('family'|'friend'|'mentor'|'student'|'rival')[]}
export interface LifeEvent {eventId:string; year:number; kind:string; text:string}
export interface Person {
 id:string; name:string; age:number; birthYear:number; sex:'female'|'male'; alive:boolean; deathYear?:number;
 cell:number; settlementId:string; familyId:string; parents:string[]; children:string[]; spouse?:string;
 health:number; stamina:number; fertility:number; lifespanTendency:number;
 personality:Record<Trait,number>; skills:Record<SkillName,number>; occupation:Occupation; goal:string;
 wealth:number; possessions:string[]; knowledge:Knowledge[]; knowledgeSources:Partial<Record<Knowledge,string>>;
 habits:string[]; beliefs:{cooperation:number}; relationships:Record<string,Relationship>; lifeEvents:LifeEvent[];
 lastBirth:number; generation:number; homeQuality:number; causes:string[];
}
export interface Settlement {id:string; name:string; cell:number; food:number; houses:number; market:boolean; leaderId?:string; marketEvent?:string; foodSources:string[]}
export interface SocialEvent extends HistoryEvent {personIds?:string[]; kind?:string}
export type TouchKind = 'knowledge'|'tools'|'meeting'|'move'|'training'|'rescue'|'family';
export interface PersonIntervention {id:string; year:number; kind:TouchKind; personId:string; otherId?:string; settlementId?:string; knowledge?:Knowledge; eventId:string}
export interface SocialWorld {
 version:1; seed:number; year:number; geography:WorldGeography; cells:Cell[]; people:Person[]; settlements:Settlement[];
 events:SocialEvent[]; interventions:PersonIntervention[]; nextPersonId:number;
}

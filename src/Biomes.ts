import type {Biome,Cell} from './WorldState';
export interface BiomeProfile {name:string;color:number;vegetation:number;forest:number;fertility:number;water:number;animals:number;diversity:number;pests:number;disease:number;flood:number}
export const biomes:Record<Biome,BiomeProfile>={
 ocean:{name:'海洋',color:0xaacfdc,vegetation:0,forest:0,fertility:0,water:1,animals:0,diversity:.4,pests:0,disease:0,flood:0},
 coast:{name:'海岸',color:0xe7dcb5,vegetation:.24,forest:.05,fertility:.42,water:.48,animals:5,diversity:.4,pests:.1,disease:.12,flood:.14},
 grassland:{name:'草原',color:0xd1dca6,vegetation:.45,forest:.08,fertility:.85,water:.45,animals:21,diversity:.5,pests:.12,disease:.12,flood:.05},
 woodland:{name:'温帯林',color:0x97b88c,vegetation:.77,forest:.72,fertility:.67,water:.58,animals:13,diversity:.7,pests:.15,disease:.16,flood:.05},
 rainforest:{name:'熱帯雨林',color:0x548e77,vegetation:.96,forest:.94,fertility:.38,water:.88,animals:14,diversity:.96,pests:.6,disease:.5,flood:.20},
 steppe:{name:'ステップ',color:0xc8c29b,vegetation:.25,forest:.025,fertility:.57,water:.26,animals:14,diversity:.28,pests:.05,disease:.06,flood:.02},
 desert:{name:'砂漠',color:0xe4c795,vegetation:.045,forest:0,fertility:.27,water:.065,animals:1.5,diversity:.10,pests:.02,disease:.025,flood:.01},
 wetland:{name:'湿地',color:0x91b6a5,vegetation:.72,forest:.22,fertility:.62,water:.96,animals:10,diversity:.9,pests:.62,disease:.52,flood:.5},
 taiga:{name:'タイガ',color:0x779e98,vegetation:.61,forest:.82,fertility:.4,water:.48,animals:9,diversity:.4,pests:.08,disease:.08,flood:.04},
 tundra:{name:'ツンドラ',color:0xd5ded5,vegetation:.13,forest:.015,fertility:.23,water:.30,animals:4,diversity:.2,pests:.025,disease:.04,flood:.05},
 alpine:{name:'高山',color:0xb9c3bf,vegetation:.065,forest:0,fertility:.12,water:.25,animals:1,diversity:.16,pests:.01,disease:.02,flood:0},
 river:{name:'河川',color:0x78afc2,vegetation:0,forest:0,fertility:.75,water:1,animals:0,diversity:.65,pests:.1,disease:.1,flood:.3},
 savanna:{name:'サバンナ',color:0xd1c58d,vegetation:.36,forest:.12,fertility:.6,water:.30,animals:24,diversity:.65,pests:.13,disease:.18,flood:.03},
 dry_forest:{name:'乾燥林',color:0xb0b38a,vegetation:.53,forest:.48,fertility:.53,water:.36,animals:13,diversity:.55,pests:.08,disease:.1,flood:.04},
 lake:{name:'湖',color:0x91bfcc,vegetation:0,forest:0,fertility:.6,water:1,animals:0,diversity:.7,pests:.2,disease:.15,flood:.2},
 estuary:{name:'河口',color:0x9ac3c3,vegetation:0,forest:0,fertility:.8,water:1,animals:0,diversity:.85,pests:.2,disease:.2,flood:.4},
 floodplain:{name:'氾濫原',color:0xb9c9a1,vegetation:.57,forest:.16,fertility:.91,water:.77,animals:19,diversity:.75,pests:.35,disease:.29,flood:.42}
};
export const thermalSuitability=(temperature:number)=>Math.max(.04,Math.min(1,(temperature+5)/22,(48-temperature)/18));
export function agriculture(c:Pick<Cell,'temperature'|'biome'>):number{return thermalSuitability(c.temperature)*(c.biome==='wetland'?.6:1);}
export function chooseBiome(elevation:number,sea:number,mountain:number,moisture:number,temperature:number,nearSea:boolean):Biome {
 if(elevation<sea)return 'ocean';if(elevation>=mountain)return 'alpine';
 if(temperature<0)return 'tundra';if(temperature<9)return moisture>.34?'taiga':'steppe';
 if(nearSea&&elevation<sea+Math.max(.01,(mountain-sea)*.14))return 'coast';
 if(moisture>.82&&elevation<sea+(mountain-sea)*.28)return 'wetland';
 if(moisture<.22)return 'desert';if(moisture<.37)return temperature>23?'savanna':'steppe';
 if(temperature>24)return moisture>.65?'rainforest':moisture>.47?'dry_forest':'savanna';
 return moisture>.55?'woodland':moisture>.44?'grassland':'steppe';
}

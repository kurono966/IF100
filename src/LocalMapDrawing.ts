import type Phaser from 'phaser';
import type {Cell} from './WorldState';
import type {LocalTile,LocalSurface} from './LocalMapGenerator';
const colors:Record<LocalSurface,number>={water:0x8cbeca,sand:0xe1d1a1,grass:0xc7d4a2,forest:0x8fab80,rock:0xadaf9f,snow:0xe4eae1,marsh:0x9ab9a1};
export const localSurfaceNames:Record<LocalSurface,string>={water:'水域',sand:'砂地・岸辺',grass:'草地',forest:'森林',rock:'岩場・山地',snow:'雪地',marsh:'湿地'};
export function paintLocalTiles(g:Phaser.GameObjects.Graphics,tiles:LocalTile[],c:Cell){g.clear();for(const t of tiles){const x=t.x*16,y=t.y*16;g.fillStyle(colors[t.surface]);g.fillRect(x,y,16,16);
 if(t.surface==='water'){g.lineStyle(1,0xe5f2ef,.4);if((t.x+t.y)%3===0)g.lineBetween(x+3,y+9,x+11,y+9);}
 if(t.surface==='forest'){g.fillStyle(c.biome==='rainforest'?0x3f7860:0x507954);for(let i=0;i<3;i++){const a=x+4+i*4,b=y+4+i%2*4;g.fillTriangle(a-3,b+7,a,b,a+3,b+7);}}
 if(t.surface==='rock'){g.fillStyle(0x7e8b80);g.fillTriangle(x+2,y+14,x+8,y+3,x+15,y+14);g.fillStyle(0xe9e9da);g.fillTriangle(x+6,y+6,x+8,y+3,x+10,y+6);}
 if(t.surface==='marsh'){g.lineStyle(1,0x648c79);g.lineBetween(x+3,y+12,x+12,y+12);g.lineBetween(x+7,y+12,x+7,y+5);}
 if(t.field){g.fillStyle(0xd6c583);g.fillRect(x+1,y+1,14,14);g.lineStyle(1,0xa99f64);for(let i=3;i<15;i+=4)g.lineBetween(x+i,y+2,x+i,y+14);}
 if(t.road){g.fillStyle(0xe9ddbe);g.fillRect(x,y+6,16,4);}
 if(t.building){g.fillStyle(0xf3ead3);g.fillRect(x+4,y+6,8,8);g.fillStyle(c.stage>1?0x9c7960:0xae8264);g.fillTriangle(x+2,y+6,x+8,y+2,x+14,y+6);}
 if(t.ruin){g.lineStyle(2,0x897e68);g.strokeRect(x+3,y+5,9,8);}
 }
}

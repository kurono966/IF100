import Phaser from 'phaser';
import type {WorldState,Cell} from './WorldState';
export const palette:Record<string,number>={sea:0xb9dce3,river:0x7fbdcf,plain:0xdce2b4,forest:0x9dbd89,mountain:0xc7c7b9};
export function signature(c:Cell):string{return `${c.terrain}:${c.stage}:${c.forest>.3}:${c.infrastructure>.7}:${Math.round(c.herbivores/5)}:${Math.round(c.predators)}:${Math.round(c.vegetation*5)}:${c.development>16}`;}
export class Renderer {
 private game:Phaser.Game;private scene?:Phaser.Scene;private graphics?:Phaser.GameObjects.Graphics;private state?:WorldState;private other?:WorldState;private diff=false;
 constructor(parent:string,onSelect?:(x:number,y:number)=>void){const owner=this;class MapScene extends Phaser.Scene{create(){owner.scene=this;owner.graphics=this.add.graphics();this.input.on('pointerdown',(p:Phaser.Input.Pointer)=>onSelect?.(Math.min(15,Math.floor(p.x/32)),Math.min(15,Math.floor(p.y/32))));owner.paint();}}
 this.game=new Phaser.Game({type:Phaser.AUTO,width:512,height:512,parent,backgroundColor:'#b9dce3',scene:MapScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},banner:false});}
 draw(w:WorldState,other?:WorldState,diff=false){this.state=w;this.other=other;this.diff=diff;this.paint();}
 private paint(){const g=this.graphics,w=this.state;if(!g||!w)return;g.clear();for(const c of w.cells){const x=c.x*32,y=c.y*32;g.fillStyle(["plain","forest"].includes(c.terrain)?(c.vegetation>.6?0x9dbd89:c.vegetation>.3?0xc5d39e:0xdecfa4):palette[c.terrain]);g.fillRect(x,y,32,32);g.lineStyle(1,0xffffff,.10);g.strokeRect(x,y,32,32);
 if(c.terrain==='sea'){if((c.x+c.y)%3===0){g.lineStyle(1,0xffffff,.35);g.lineBetween(x+8,y+17,x+22,y+17);}continue;}
 if(c.terrain==='mountain'){g.fillStyle(0x8b9789);g.fillTriangle(x+4,y+26,x+16,y+6,x+28,y+26);g.fillStyle(0xf6f5e9);g.fillTriangle(x+11,y+13,x+16,y+6,x+21,y+13);}
 if(c.forest>.3){for(let k=0;k<3;k++){const tx=x+7+k*8,ty=y+8+(k%2)*8;g.fillStyle(0x568262);g.fillTriangle(tx-5,ty+10,tx,ty-2,tx+5,ty+10);}}
 else if(c.development>16&&c.stage===0){g.lineStyle(2,0xc5b471);for(let k=0;k<3;k++)g.lineBetween(x+5,y+8+k*6,x+26,y+8+k*6);}
 if(c.infrastructure>.7){g.lineStyle(3,0xeee8d0);g.lineBetween(x,y+16,x+32,y+16);g.lineStyle(1,0xa89977);g.lineBetween(x,y+16,x+32,y+16);}
 if(c.stage){const count=c.stage===1?2:c.stage===2?4:5;for(let k=0;k<count;k++){const bx=x+5+(k%3)*8,by=y+10+Math.floor(k/3)*10;g.fillStyle(c.stage===3?0x727c77:0xf9f3dc);g.fillRect(bx,by,6,c.stage===1?7:11);g.fillStyle(c.stage===3?0x4f6564:0xb6795c);g.fillTriangle(bx-1,by,bx+3,by-4,bx+7,by);}}
 if(c.herbivores>12){g.fillStyle(0x8b7656);g.fillEllipse(x+7,y+25,6,4);g.fillCircle(x+10,y+23,2);}
 if(c.predators>2){g.fillStyle(0x53515e);g.fillTriangle(x+23,y+24,x+27,y+19,x+30,y+25);}
 if(c.burnedUntil>=w.year){g.fillStyle(0xd48253);g.fillTriangle(x+13,y+27,x+17,y+13,x+22,y+27);}
 for(const e of w.effects){if(Math.hypot(e.intervention.position.x-c.x,e.intervention.position.y-c.y)<=2){g.lineStyle(2,e.intervention.type==='rain'?0x529cbb:0xc69154,.85);g.strokeRect(x+3,y+3,26,26);}}
 if(this.diff&&this.other){const changed=signature(c)!==signature(this.other.cells[c.id]);g.lineStyle(changed?3:1,changed?0xdb8b50:0xffffff,changed?1:.15);g.strokeRect(x+2,y+2,28,28);}
 }}
 destroy(){this.game.destroy(true);}
}

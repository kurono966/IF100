import Phaser from 'phaser';
import type {WorldState,Cell} from './WorldState';
import {generateLocalMap,type LocalSurface} from './LocalMapGenerator';
import {paintLocalTiles} from './LocalMapDrawing';
import {biomes} from './Biomes';
import {escapeHtml as h} from './UiText';
const colors:Record<LocalSurface,number>={water:0x8cbeca,sand:0xe1d1a1,grass:0xc7d4a2,forest:0x8fab80,rock:0xadaf9f,snow:0xe4eae1,marsh:0x9ab9a1};
const names:Record<LocalSurface,string>={water:'水域',sand:'砂地・岸辺',grass:'草地',forest:'森林',rock:'岩場・山地',snow:'雪地',marsh:'湿地'};
export class LocalMap {
 private dialog:HTMLDialogElement;private game?:Phaser.Game;private seed=-1;private year=-1;private cell=-1;
 constructor(){this.dialog=document.createElement('dialog');this.dialog.className='local-map-dialog';document.body.append(this.dialog);}
 open(w:WorldState,c:Cell){this.game?.destroy(true);this.game=undefined;this.seed=w.seed;this.year=w.year;this.cell=c.id;
 this.dialog.innerHTML=`<header><div><small>WORLD (${c.x}, ${c.y}) → LOCAL MAP · ${w.year}年</small><h2>${h(c.placeName)} <small>${biomes[c.biome].name}</small></h2></div><button type="button">← ワールドマップへ</button></header><div class="local-map-canvas"></div><p class="local-map-info">小区画にマウスを重ねるかタップすると情報を表示します。</p><div class="local-map-legend">水域 · 砂地 · 草地 · 森林 · 岩場 · 湿地 · 家屋 · 耕地 · 道路 · 遺構</div><p class="local-map-note">1地域を32×32に細分化した観察図です。地形はシードと周辺地形から、森林・耕地・家屋はこの年代の地域状態から描画します。小区画は個別のシミュレーション単位ではありません。</p>`;
 this.dialog.querySelector('button')!.onclick=()=>this.dialog.close();
 const tiles=generateLocalMap(w,c),host=this.dialog.querySelector<HTMLElement>('.local-map-canvas')!,info=this.dialog.querySelector<HTMLElement>('.local-map-info')!;
 class LocalScene extends Phaser.Scene{create(){const g=this.add.graphics();paintLocalTiles(g,tiles,c);
 const selection=this.add.graphics();const inspect=(p:Phaser.Input.Pointer)=>{const x=Math.floor(p.x/16),y=Math.floor(p.y/16);if(x<0||y<0||x>=32||y>=32)return;const t=tiles[y*32+x];selection.clear().lineStyle(1,0xfffcdf).strokeRect(x*16,y*16,16,16);info.textContent=`小区画 (${x}, ${y}) ｜ ${names[t.surface]} ｜ 標高 ${t.elevation.toFixed(3)}${t.building?' ｜ 家屋':''}${t.field?' ｜ 耕地':''}${t.road?' ｜ 道路':''}${t.ruin?' ｜ 遺構':''}`;};
 this.input.on('pointermove',inspect);this.input.on('pointerdown',inspect);
 }}
 if(!this.dialog.open)this.dialog.showModal();
 this.game=new Phaser.Game({type:Phaser.AUTO,width:512,height:512,parent:host,scene:LocalScene,banner:false,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true}});
 }
 update(w:WorldState){if(this.dialog.open&&(w.seed!==this.seed||w.year!==this.year))this.open(w,w.cells[this.cell]);}
 destroy(){this.game?.destroy(true);this.dialog.remove();}
}

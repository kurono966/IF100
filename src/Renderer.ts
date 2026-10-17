import {regionColors} from './RegionSystem';
import {structuralDifference,causalInfluence,influenceColors} from './WorldComparison';
import {MapViewport,MapGesture,MAX_ZOOM,localDetailOpacity,type Point} from './MapViewport';
import {tileSummary,tileDetails} from './TileInspector';
import {generateLocalMap,type LocalTile} from './LocalMapGenerator';
import {paintLocalTiles,localSurfaceNames} from './LocalMapDrawing';
import {biomes} from './Biomes';
import Phaser from 'phaser';
import type {WorldState,Cell} from './WorldState';
export const palette:Record<string,number>={sea:0xb9dce3,river:0x7fbdcf,plain:0xdce2b4,forest:0x9dbd89,mountain:0xc7c7b9};
export function signature(c:Cell):string{return `${c.regionState}:${c.terrain}:${c.biome}:${c.stage}:${c.forest>.3}:${c.roads>0}:${c.markets}:${c.realm}:${c.cultureId}:${c.ruins}:${Object.values(c.traditions).filter(t=>t?.adopted).map(t=>t!.skill).sort().join()}:${Math.round(c.herbivores/5)}:${Math.round(c.predators)}:${Math.round(c.vegetation*5)}:${c.development>16}`;}
export class Renderer {
 private localLayers=new Map<number,{graphics:Phaser.GameObjects.Graphics;tiles:LocalTile[];key:string}>();
 private influence=false;private overlay?:Phaser.GameObjects.Graphics;
 private zoomTween?:Phaser.Tweens.Tween;
 private host:HTMLElement;private viewport=new MapViewport();private gesture=new MapGesture(this.viewport);private abort=new AbortController();
 private modeKey?:HTMLElement;private toolbar?:HTMLElement;private tooltip?:HTMLElement;private inspector?:HTMLElement;private outline?:Phaser.GameObjects.Graphics;private textPool:Phaser.GameObjects.Text[]=[];private hover?:number;private pinned?:number;private detailKey='';private lastPointer?:Point;
 private game:Phaser.Game;private scene?:Phaser.Scene;private graphics?:Phaser.GameObjects.Graphics;private state?:WorldState;private other?:WorldState;private diff=false;
 constructor(parent:string,private onSelect?:(x:number,y:number)=>void){this.host=document.getElementById(parent)!;const owner=this;class MapScene extends Phaser.Scene{create(){owner.scene=this;owner.graphics=this.add.graphics();owner.outline=this.add.graphics().setDepth(5);owner.overlay=this.add.graphics().setDepth(3);if(parent!=='preview')owner.setupInteraction();owner.paint();}}
 this.game=new Phaser.Game({type:Phaser.AUTO,width:512,height:512,parent,backgroundColor:'#b9dce3',scene:MapScene,scale:{mode:Phaser.Scale.FIT,autoCenter:Phaser.Scale.CENTER_BOTH},render:{antialias:true},banner:false});}
 private setupInteraction(){
 const canvas=this.game.canvas,signal=this.abort.signal;
 this.host.classList.add('interactive-map');this.host.tabIndex=0;this.host.setAttribute('aria-label','世界地図。ホイールまたは＋と−で拡大。拡大中はドラッグまたは矢印キーで移動。0で全体表示。');
 canvas.style.touchAction='none';
 this.toolbar=document.createElement('div');this.toolbar.className='map-zoom-tools';this.toolbar.setAttribute('aria-label','地図の表示倍率');this.toolbar.innerHTML='<button type="button" data-map-zoom="out" aria-label="地図を縮小">−</button><output>WORLD ×1.0</output><button type="button" data-map-zoom="in" aria-label="地図を拡大">＋</button><button type="button" data-map-zoom="reset">全体</button><button type="button" data-map-zoom="influence" aria-pressed="false">介入影響</button>';
 this.tooltip=document.createElement('div');this.tooltip.className='tile-tooltip';this.tooltip.hidden=true;this.tooltip.setAttribute('role','tooltip');
 this.inspector=document.createElement('section');this.inspector.className='tile-inspector';this.inspector.hidden=true;this.inspector.setAttribute('aria-label','選択した地域の詳細');
 this.modeKey=document.createElement('div');this.modeKey.className='map-mode-key';this.modeKey.hidden=true;this.host.append(this.toolbar,this.tooltip,this.modeKey);const detailHost=this.host.id==='map'?document.getElementById('region-details'):null;if(detailHost){detailHost.replaceChildren(this.inspector);}else this.host.insertAdjacentElement('afterend',this.inspector);
 const local=(e:PointerEvent|WheelEvent):Point=>{const r=canvas.getBoundingClientRect();return {x:(e.clientX-r.left)*512/r.width,y:(e.clientY-r.top)*512/r.height};};
 const focus=(p:Point)=>{this.lastPointer=p;const c=this.viewport.cellAt(p);this.hover=c?c.y*16+c.x:undefined;this.updateInspection();};
 canvas.addEventListener('wheel',event=>{event.preventDefault();const p=local(event);const delta=event.deltaY*(event.deltaMode===1?16:event.deltaMode===2?512:1);this.animateZoom(this.viewport.zoom*Math.exp(-Math.max(-300,Math.min(300,delta))*.003),p);focus(p);},{passive:false,signal});
 canvas.addEventListener('pointerdown',event=>{if(event.button!==0&&event.pointerType==='mouse')return;this.zoomTween?.stop();this.host.focus({preventScroll:true});canvas.setPointerCapture(event.pointerId);this.gesture.down(event.pointerId,local(event));if(this.gesture.pointers.size>1)this.hideHover();},{signal});
 canvas.addEventListener('pointermove',event=>{const p=local(event);const dragging=this.gesture.move(event.pointerId,p);if(dragging){this.hideHover();this.applyViewport();canvas.style.cursor='grabbing';}else if(event.pointerType==='mouse')focus(p);},{signal});
 canvas.addEventListener('pointerup',event=>{const p=local(event),cell=this.gesture.up(event.pointerId,p);if(canvas.hasPointerCapture(event.pointerId))canvas.releasePointerCapture(event.pointerId);canvas.style.cursor=this.viewport.zoom>1?'grab':'crosshair';if(cell){this.pinned=cell.y*16+cell.x;this.detailKey='';this.hideHover();this.updateInspection();if(event.pointerType!=='mouse'&&localDetailOpacity(this.viewport.zoom)>.5)focus(p);this.onSelect?.(cell.x,cell.y);}},{signal});
 canvas.addEventListener('pointercancel',event=>{this.gesture.cancel(event.pointerId);this.hideHover();},{signal});
 canvas.addEventListener('lostpointercapture',event=>{if(this.gesture.pointers.has(event.pointerId))this.gesture.cancel(event.pointerId);},{signal});
 canvas.addEventListener('pointerleave',()=>{this.hideHover();},{signal});
 this.toolbar.addEventListener('click',event=>{const action=(event.target as HTMLElement).closest<HTMLButtonElement>('[data-map-zoom]')?.dataset.mapZoom;if(!action)return;if(action==='influence'){this.influence=!this.influence;const b=this.toolbar!.querySelector('[data-map-zoom="influence"]')!;b.setAttribute('aria-pressed',String(this.influence));b.classList.toggle('active',this.influence);this.updateOverlay();return;}this.animateZoom(action==='reset'?1:this.viewport.zoom*(action==='in'?1.5:1/1.5));this.hideHover();},{signal});
 this.host.addEventListener('keydown',event=>{if(event.target!==this.host)return;this.zoomTween?.stop();let handled=true;switch(event.key){case '+':case '=':this.viewport.zoomAt(this.viewport.zoom*1.5);break;case '-':this.viewport.zoomAt(this.viewport.zoom/1.5);break;case '0':this.viewport.reset();break;case 'ArrowLeft':this.viewport.pan(48,0);break;case 'ArrowRight':this.viewport.pan(-48,0);break;case 'ArrowUp':this.viewport.pan(0,48);break;case 'ArrowDown':this.viewport.pan(0,-48);break;case 'Escape':this.pinned=undefined;this.inspector!.hidden=true;break;default:handled=false;}if(handled){event.preventDefault();this.hideHover();this.applyViewport();}},{signal});
 this.inspector.addEventListener('click',event=>{if((event.target as HTMLElement).closest('.open-local-map')&&this.pinned!==undefined){const p=this.viewport.worldToScreen({x:this.pinned%16*32+16,y:Math.floor(this.pinned/16)*32+16});this.animateZoom(16,p,true);}if((event.target as HTMLElement).closest('.tile-inspector-close')){this.pinned=undefined;this.inspector!.hidden=true;this.updateOutline();}},{signal});
 }
 private hideHover(){this.hover=undefined;if(this.tooltip)this.tooltip.hidden=true;this.updateOutline();}
 private updateInspection(){const w=this.state;if(!w)return;
 if(this.tooltip&&this.hover!==undefined&&this.lastPointer){const c=w.cells[this.hover],key=`${w.seed}:${w.year}:${c.id}:${w.interventions.length}:${this.diff}`;if(this.tooltip.dataset.key!==key){this.tooltip.innerHTML=tileSummary(c,w)+(this.diff&&this.other?`<small>構造差：${structuralDifference(c,this.other.cells[c.id]).reasons.join('・')||'大きな差なし'}</small>`:'');this.tooltip.dataset.key=key;}if(localDetailOpacity(this.viewport.zoom)>.5){const p=this.viewport.screenToWorld(this.lastPointer),x=Math.max(0,Math.min(31,Math.floor(p.x-c.x*32))),y=Math.max(0,Math.min(31,Math.floor(p.y-c.y*32))),t=this.localLayers.get(c.id)?.tiles[y*32+x];if(t){this.tooltip.innerHTML=tileSummary(c,w)+`<div class="local-hover">小区画 (${x}, ${y}) · ${localSurfaceNames[t.surface]}<br>標高 ${t.elevation.toFixed(3)}${t.building?' · 家屋':''}${t.field?' · 耕地':''}${t.road?' · 道路':''}${t.ruin?' · 遺構':''}</div>`;this.tooltip.dataset.key='';}}this.tooltip.hidden=false;
 const canvas=this.game.canvas.getBoundingClientRect(),host=this.host.getBoundingClientRect();const x=canvas.left-host.left+this.lastPointer.x/512*canvas.width,y=canvas.top-host.top+this.lastPointer.y/512*canvas.height;
 const width=this.tooltip.offsetWidth,height=this.tooltip.offsetHeight;const left=x+16+width>host.width?x-width-14:x+16,top=y+16+height>host.height?y-height-14:y+16;
 this.tooltip.style.left=`${Math.max(4,Math.min(host.width-width-4,left))}px`;this.tooltip.style.top=`${Math.max(4,Math.min(host.height-height-4,top))}px`;
 }
 if(this.inspector&&this.pinned!==undefined){const key=`${w.seed}:${w.year}:${this.pinned}:${w.interventions.length}`;if(key!==this.detailKey){this.inspector.innerHTML=tileDetails(w.cells[this.pinned],w);this.detailKey=key;}this.inspector.hidden=false;}
 this.updateOutline();
 }
 private updateOutline(){const g=this.outline;if(!g)return;g.clear();g.setScale(this.viewport.zoom).setPosition(this.viewport.offset.x,this.viewport.offset.y);for(const [id,color] of [[this.pinned,0xbf8647],[this.hover,0xffffff]] as const){if(id===undefined)continue;g.lineStyle(2/this.viewport.zoom,color,1);g.strokeRect(id%16*32+1,Math.floor(id/16)*32+1,30,30);}}
 private applyViewport(){if(!this.graphics)return;const v=this.viewport;this.graphics.setScale(v.zoom).setPosition(v.offset.x,v.offset.y);
 if(this.toolbar){this.toolbar.querySelector('output')!.textContent=`${v.zoom>=10?'LOCAL':v.zoom>4?'WORLD → LOCAL':'WORLD'} ×${v.zoom.toFixed(1)}`;this.toolbar.querySelector<HTMLButtonElement>('[data-map-zoom="out"]')!.disabled=v.zoom<=1;this.toolbar.querySelector<HTMLButtonElement>('[data-map-zoom="in"]')!.disabled=v.zoom>=MAX_ZOOM;}
 this.game.canvas.style.cursor=v.zoom>1?'grab':'crosshair';this.updateLocalLayers();this.updateOverlay();this.updateLabels();this.updateOutline();}
 private animateZoom(value:number,anchor:Point={x:256,y:256},center=false){if(!this.scene)return;this.zoomTween?.stop();const v=this.viewport,start={zoom:v.zoom,x:v.offset.x,y:v.offset.y};v.zoomAt(value,anchor);if(center)v.pan(256-anchor.x,256-anchor.y);const end={zoom:v.zoom,x:v.offset.x,y:v.offset.y};v.zoom=start.zoom;v.offset={x:start.x,y:start.y};this.zoomTween=this.scene.tweens.addCounter({from:0,to:1,duration:180,ease:'Sine.easeOut',onUpdate:t=>{const a=t.getValue()??1;v.zoom=start.zoom+(end.zoom-start.zoom)*a;v.offset={x:start.x+(end.x-start.x)*a,y:start.y+(end.y-start.y)*a};this.applyViewport();if(this.lastPointer){const c=v.cellAt(this.lastPointer);this.hover=c?c.y*16+c.x:undefined;this.updateInspection();}}});}
 private updateLocalLayers(){if(!this.scene||!this.state)return;const w=this.state,v=this.viewport,alpha=localDetailOpacity(v.zoom),visible=new Set<number>();if(alpha>0)for(const c of w.cells){if(!v.visible(c.x,c.y))continue;visible.add(c.id);const key=`${w.seed}:${w.year}:${w.interventions.length}:${this.diff}`;let layer=this.localLayers.get(c.id);if(!layer){layer={graphics:this.scene.add.graphics().setDepth(2),tiles:[],key:''};this.localLayers.set(c.id,layer);}if(layer.key!==key){layer.tiles=generateLocalMap(w,c);paintLocalTiles(layer.graphics,layer.tiles,c);layer.key=key;}layer.graphics.setPosition(c.x*32*v.zoom+v.offset.x,c.y*32*v.zoom+v.offset.y).setScale(v.zoom/16).setAlpha(alpha);}
 for(const [id,layer]of this.localLayers)if(!visible.has(id)){layer.graphics.destroy();this.localLayers.delete(id);}}
 private updateOverlay(){if(this.modeKey){this.modeKey.hidden=!this.influence&&!this.diff;this.modeKey.textContent=this.influence?'介入の因果：黄 直接 → 橙 二次 → 赤 長期 → 紫 文明':'構造差：薄黄 小差 ／ 橙 地域差 ／ 紫 複合差';}const g=this.overlay,w=this.state;if(!g||!w)return;g.clear();g.setScale(this.viewport.zoom).setPosition(this.viewport.offset.x,this.viewport.offset.y);
 for(const c of w.cells){const x=c.x*32,y=c.y*32;if(this.diff&&this.other){const d=structuralDifference(c,this.other.cells[c.id]);if(d.score>0){const color=d.score>=6?0x9b6bb1:d.score>=3?0xd77a42:0xd6b873;g.fillStyle(color,Math.min(.38,.04+d.score*.03));g.fillRect(x,y,32,32);g.lineStyle((d.score>=6?3:1.5)/this.viewport.zoom,color,d.score>=3?1:.5);g.strokeRect(x+.4,y+.4,31.2,31.2);}}
 if(this.influence){const impact=causalInfluence(w,c);if(impact.level){g.fillStyle(influenceColors[impact.level],.22+impact.level*.045);g.fillRect(x,y,32,32);g.lineStyle(2/this.viewport.zoom,influenceColors[impact.level]);g.strokeRect(x+.7,y+.7,30.6,30.6);}}}}
 private updateLabels(){if(!this.scene||!this.state)return;const cells=this.viewport.zoom>=2.5&&this.viewport.zoom<6?this.state.cells.filter(c=>this.viewport.visible(c.x,c.y)):[];
 cells.forEach((c,index)=>{let label=this.textPool[index];if(!label){label=this.scene!.add.text(0,0,'',{fontFamily:'sans-serif',fontSize:'15px',color:'#253b31',backgroundColor:'#fffdf0cc',padding:{x:1,y:1}}).setResolution(Math.max(2,Math.min(3,window.devicePixelRatio||1))).setDepth(4);this.textPool.push(label);}const p=this.viewport.worldToScreen({x:c.x*32+2,y:c.y*32+2});label.setPosition(Math.round(p.x),Math.round(p.y)).setScale(1).setFontSize(Math.round(6*this.viewport.zoom)).setPadding(Math.max(1,Math.round(this.viewport.zoom))).setText(`${c.x},${c.y}${c.population>=1?`
人口 ${Math.round(c.population)}`:c.terrain==='river'?`
流量 ${c.riverFlow.toFixed(1)}`:''}`).setVisible(true);});
 for(let i=cells.length;i<this.textPool.length;i++)this.textPool[i].setVisible(false);
 }

 draw(w:WorldState,other?:WorldState,diff=false){this.state=w;this.other=other;this.diff=diff;this.paint();}
 private paint(){const g=this.graphics,w=this.state;if(!g||!w)return;g.clear();for(const c of w.cells){const x=c.x*32,y=c.y*32;g.fillStyle(['sea','river','mountain'].includes(c.terrain)?biomes[c.biome].color:c.regionState==='wilderness'||c.regionState==='grassland'?biomes[c.biome].color:regionColors[c.regionState]);g.fillRect(x,y,32,32);g.lineStyle(1,0xffffff,.10);g.strokeRect(x,y,32,32);
 if(c.terrain==='sea'){if((c.x+c.y)%3===0){g.lineStyle(1,0xffffff,.35);g.lineBetween(x+8,y+17,x+22,y+17);}continue;}
 if(c.regionState==='forest_region'){g.fillStyle(0x517853);for(let k=0;k<7;k++){const a=x+4+k%4*7,b=y+4+Math.floor(k/4)*13;g.fillTriangle(a-3,b+10,a,b,a+3,b+10);}}
 if(c.regionState==='agricultural'){g.fillStyle(0xc8b56d);g.fillRect(x+3,y+3,26,26);g.lineStyle(1,0xf2e6b1);for(let k=0;k<5;k++)g.lineBetween(x+5,y+6+k*5,x+27,y+6+k*5);}
 if(c.regionState==='urban_region'){g.fillStyle(0x778477);for(let k=0;k<9;k++)g.fillRect(x+3+k%3*10,y+3+Math.floor(k/3)*10,6,7);}
 if(c.regionState==='trade_hub'){g.lineStyle(4,0xf8e7bd);g.lineBetween(x,y+16,x+32,y+16);g.lineBetween(x+16,y,x+16,y+32);g.fillStyle(0xc38a47);g.fillRect(x+10,y+10,12,12);}
 if(c.regionState==='degraded'){g.lineStyle(1,0x9e8565);for(let k=0;k<4;k++){g.lineBetween(x+4+k*7,y+8,x+2+k*7,y+19);g.lineBetween(x+2+k*7,y+19,x+6+k*7,y+25);}}
 if(c.regionState==='ruins_region'){g.lineStyle(2,0x827e70);for(let k=0;k<4;k++)g.strokeRect(x+4+k%2*14,y+4+Math.floor(k/2)*14,8,8);}
 if(c.biome==='desert'){g.lineStyle(1,0xc2a779,.65);g.lineBetween(x+5,y+21,x+14,y+18);g.lineBetween(x+14,y+18,x+25,y+21);}
 if(c.biome==='steppe'||c.biome==='savanna'){g.lineStyle(1,0x9e9c6b,.6);g.lineBetween(x+8,y+23,x+8,y+18);g.lineBetween(x+21,y+12,x+23,y+8);}
 if(c.biome==='wetland'||c.biome==='floodplain'){g.lineStyle(1,0x588d90,.55);g.lineBetween(x+4,y+24,x+15,y+24);g.lineBetween(x+18,y+9,x+28,y+9);g.lineBetween(x+12,y+22,x+12,y+15);}
 if(c.biome==='tundra'){g.fillStyle(0xf4f5ee,.8);g.fillCircle(x+8,y+12,2);g.fillCircle(x+24,y+23,2);}
 if(c.biome==='coast'){g.lineStyle(1,0xf7efda,.8);g.lineBetween(x+4,y+25,x+27,y+25);}
 if(c.terrain==='mountain'){g.fillStyle(0x8b9789);g.fillTriangle(x+4,y+26,x+16,y+6,x+28,y+26);g.fillStyle(0xf6f5e9);g.fillTriangle(x+11,y+13,x+16,y+6,x+21,y+13);}
 if(c.regionState!=='degraded'&&c.regionState!=='ruins_region'&&c.forest>.3&&c.terrain!=='mountain'&&c.terrain!=='river'){for(let k=0;k<3;k++){const tx=x+7+k*8,ty=y+8+(k%2)*8;g.fillStyle(c.biome==='rainforest'?0x2d6958:c.biome==='taiga'?0x3d6f6b:0x568262);if(c.biome==='rainforest'){g.fillCircle(tx,ty+4,5);g.fillRect(tx-1,ty+5,2,7);}else g.fillTriangle(tx-5,ty+10,tx,ty-2,tx+5,ty+10);}}
 else if(c.development>16&&c.stage===0){g.lineStyle(2,0xc5b471);for(let k=0;k<3;k++)g.lineBetween(x+5,y+8+k*6,x+26,y+8+k*6);}
 if(c.roads>0){g.lineStyle(3,0xeee8d0);g.lineBetween(x,y+16,x+32,y+16);g.lineStyle(1,0xa89977);g.lineBetween(x,y+16,x+32,y+16);}
 if(c.stage){const count=c.stage===1?2:c.stage===2?4:5;for(let k=0;k<count;k++){const bx=x+5+(k%3)*8,by=y+10+Math.floor(k/3)*10;g.fillStyle(c.stage===3?0x727c77:0xf9f3dc);g.fillRect(bx,by,6,c.stage===1?7:11);g.fillStyle(c.stage===3?0x4f6564:0xb6795c);g.fillTriangle(bx-1,by,bx+3,by-4,bx+7,by);}}
 if(c.ruins>0){g.lineStyle(1,0x8d8175);g.strokeTriangle(x+3,y+27,x+7,y+20,x+11,y+27);}
 if(c.stage>0&&w.year>=100){let hash=0;for(const letter of c.cultureId)hash=(hash*31+letter.charCodeAt(0))>>>0;const colors=[0x9982b2,0xb28b68,0x78a3a1,0xa9ac6e,0xb88185,0x839bba];g.lineStyle(c.realm?2:1,colors[hash%colors.length],c.realm?.85:.45);g.strokeRect(x+1,y+1,30,30);}
 if(c.markets){g.fillStyle(0xd79d54);g.fillRect(x+10,y+24,14,5);g.fillStyle(0xf8e5b6);g.fillTriangle(x+8,y+24,x+17,y+17,x+26,y+24);}
 if(c.floodedUntil>=w.year){g.fillStyle(0x579ec5,.5);g.fillRect(x,y,32,32);}
 if(c.herbivores>12){g.fillStyle(0x8b7656);g.fillEllipse(x+7,y+25,6,4);g.fillCircle(x+10,y+23,2);}
 if(c.predators>2){g.fillStyle(0x53515e);g.fillTriangle(x+23,y+24,x+27,y+19,x+30,y+25);}
 if(c.burnedUntil>=w.year){g.fillStyle(0xd48253);g.fillTriangle(x+13,y+27,x+17,y+13,x+22,y+27);}
 for(const e of w.effects){if(Math.hypot(e.intervention.position.x-c.x,e.intervention.position.y-c.y)<=2){g.lineStyle(2,['rain','river'].includes(e.intervention.type)?0x529cbb:e.intervention.type==='wind'?0x929e96:0xc69154,.85);g.strokeRect(x+3,y+3,26,26);}}

 }
 for(const path of w.geography.riverPaths){g.lineStyle(3,0x5f9fb8,.8);for(let i=1;i<path.length;i++){const a=w.cells[path[i-1]],b=w.cells[path[i]];g.lineBetween(a.x*32+16,a.y*32+16,b.x*32+16,b.y*32+16);}}
 for(const route of w.routes){if(route.volume<.02)continue;g.lineStyle(route.roadYear?2:1,route.roadYear?0x9a7953:0xcaaa72,route.roadYear?.8:.45);for(let i=1;i<route.path.length;i++){const a=w.cells[route.path[i-1]],b=w.cells[route.path[i]];g.lineBetween(a.x*32+16,a.y*32+16,b.x*32+16,b.y*32+16);}}
 if(w.year<1000)for(const e of w.events.filter(e=>(e.type==='migration'||e.type==='mass_migration')&&e.year>=w.year-1&&e.destination!==undefined).slice(-10)){const a=w.cells[e.cell],b=w.cells[e.destination!];g.lineStyle(1,0x587f82,.55);g.lineBetween(a.x*32+16,a.y*32+16,b.x*32+16,b.y*32+16);g.fillStyle(0x587f82);g.fillCircle(b.x*32+16,b.y*32+16,2);}
 this.applyViewport();this.updateInspection();
 }
 destroy(){this.zoomTween?.stop();this.localLayers.clear();this.abort.abort();this.toolbar?.remove();this.modeKey?.remove();this.tooltip?.remove();this.inspector?.remove();this.host.classList.remove('interactive-map');this.host.removeAttribute('tabindex');this.game.destroy(true);}
}

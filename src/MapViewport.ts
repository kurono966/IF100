export interface Point {x:number;y:number}
export const MAP_SIZE=512,TILE_SIZE=32,MAX_ZOOM=32;
export class MapViewport {
 zoom=1;offset:Point={x:0,y:0};
 screenToWorld(p:Point):Point{return {x:(p.x-this.offset.x)/this.zoom,y:(p.y-this.offset.y)/this.zoom};}
 worldToScreen(p:Point):Point{return {x:p.x*this.zoom+this.offset.x,y:p.y*this.zoom+this.offset.y};}
 cellAt(p:Point):Point|undefined {const w=this.screenToWorld(p);if(p.x<0||p.y<0||p.x>=MAP_SIZE||p.y>=MAP_SIZE||w.x<0||w.y<0||w.x>=MAP_SIZE||w.y>=MAP_SIZE)return;return {x:Math.floor(w.x/TILE_SIZE),y:Math.floor(w.y/TILE_SIZE)};}
 zoomAt(value:number,anchor:Point={x:256,y:256}):void {const world=this.screenToWorld(anchor);this.zoom=Math.max(1,Math.min(MAX_ZOOM,value));this.offset={x:anchor.x-world.x*this.zoom,y:anchor.y-world.y*this.zoom};this.constrain();}
 pan(dx:number,dy:number):void {this.offset.x+=dx;this.offset.y+=dy;this.constrain();}
 reset():void{this.zoom=1;this.offset={x:0,y:0};}
 private constrain(){const min=MAP_SIZE*(1-this.zoom);this.offset.x=Math.max(min,Math.min(0,this.offset.x));this.offset.y=Math.max(min,Math.min(0,this.offset.y));}
 visible(x:number,y:number):boolean{const p=this.worldToScreen({x:x*32,y:y*32});return p.x+32*this.zoom>=0&&p.y+32*this.zoom>=0&&p.x<512&&p.y<512;}
}
// Keep tap semantics separate from camera movement, including pinch-to-single-finger transitions.
export class MapGesture {
 pointers=new Map<number,Point>();private origin?:Point;private previous?:Point;private pinch?:{distance:number;center:Point};private moved=false;
 constructor(readonly viewport:MapViewport){}
 down(id:number,p:Point){if(!this.pointers.size){this.origin=p;this.previous=p;this.moved=false;}this.pointers.set(id,p);if(this.pointers.size>=2){this.moved=true;this.pinch=this.measurePinch();}}
 move(id:number,p:Point){if(!this.pointers.has(id))return false;this.pointers.set(id,p);
 if(this.pointers.size>=2){const next=this.measurePinch();if(this.pinch&&next){this.viewport.zoomAt(this.viewport.zoom*next.distance/Math.max(1,this.pinch.distance),this.pinch.center);this.viewport.pan(next.center.x-this.pinch.center.x,next.center.y-this.pinch.center.y);}this.pinch=next;this.moved=true;return true;}
 if(this.origin&&Math.hypot(p.x-this.origin.x,p.y-this.origin.y)>=6)this.moved=true;
 if(this.moved&&this.previous)this.viewport.pan(p.x-this.previous.x,p.y-this.previous.y);this.previous=p;return this.moved;
 }
 up(id:number,p:Point):Point|undefined {if(!this.pointers.has(id))return;this.move(id,p);const tap=!this.moved&&this.pointers.size===1?this.viewport.cellAt(p):undefined;this.pointers.delete(id);this.pinch=undefined;this.previous=[...this.pointers.values()][0];if(!this.pointers.size){this.origin=undefined;this.previous=undefined;}return tap;}
 cancel(id:number){this.moved=true;this.pointers.delete(id);this.pinch=undefined;this.previous=[...this.pointers.values()][0];}
 private measurePinch(){const [a,b]=[...this.pointers.values()];return a&&b?{distance:Math.hypot(a.x-b.x,a.y-b.y),center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2}}:undefined;}
}

export function localDetailOpacity(zoom:number):number {const t=Math.max(0,Math.min(1,(zoom-4)/6));return t*t*(3-2*t);}

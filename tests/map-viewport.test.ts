import test from 'node:test';
import assert from 'node:assert/strict';
import {MapViewport,MapGesture,MAX_ZOOM,localDetailOpacity} from '../src/MapViewport';

test('cursor anchored zoom keeps the same world position and tile',()=>{
 const v=new MapViewport(),p={x:175,y:221};
 const world=v.screenToWorld(p),cell=v.cellAt(p);
 v.zoomAt(4,p);
 assert.deepEqual(v.screenToWorld(p),world);
 assert.deepEqual(v.cellAt(p),cell);
 assert.deepEqual(v.worldToScreen(world),p);
});
test('camera stays within map bounds, zoom is limited, reset restores full map',()=>{
 const v=new MapViewport();v.zoomAt(100);assert.equal(v.zoom,MAX_ZOOM);
 v.pan(-10000,10000);assert.deepEqual(v.offset,{x:-15872,y:0});
 assert.deepEqual(v.cellAt({x:511,y:0}),{x:15,y:0});
 assert.equal(v.cellAt({x:512,y:0}),undefined);
 assert.equal(v.cellAt({x:-1,y:0}),undefined);
 v.reset();assert.equal(v.zoom,1);assert.deepEqual(v.offset,{x:0,y:0});
 v.zoomAt(.1);assert.equal(v.zoom,1);
});
test('zoomed tap selects the displayed tile while drag never selects a tile',()=>{
 const v=new MapViewport();v.zoomAt(3);const g=new MapGesture(v),p={x:180,y:180};
 const expected=v.cellAt(p);g.down(1,p);assert.deepEqual(g.up(1,p),expected);
 g.down(2,p);assert.equal(g.move(2,{x:230,y:200}),true);
 assert.equal(g.up(2,{x:230,y:200}),undefined);
 assert.notDeepEqual(v.offset,{x:-512,y:-512});
});
test('pinch and its remaining finger never select; next independent tap works',()=>{
 const v=new MapViewport(),g=new MapGesture(v);
 g.down(1,{x:180,y:256});g.down(2,{x:330,y:256});
 g.move(2,{x:430,y:256});assert.ok(v.zoom>1);
 assert.equal(g.up(2,{x:430,y:256}),undefined);
 assert.equal(g.up(1,{x:180,y:256}),undefined);
 const p={x:256,y:256};g.down(3,p);assert.deepEqual(g.up(3,p),v.cellAt(p));
 g.down(4,p);g.cancel(4);assert.equal(g.up(4,p),undefined);
});

test('detail fades continuously in both zoom directions without changing selection',()=>{
 assert.equal(localDetailOpacity(1),0);assert.equal(localDetailOpacity(4),0);assert.equal(localDetailOpacity(7),.5);assert.equal(localDetailOpacity(10),1);assert.equal(localDetailOpacity(32),1);
 const v=new MapViewport(),p={x:270,y:215},cell=v.cellAt(p);
 for(const z of [4,7,10,16,32,16,10,7,4,1]){v.zoomAt(z,p);assert.deepEqual(v.cellAt(p),cell);}
});

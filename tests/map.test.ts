import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitMap, projectPoint, screenPoint, unprojectPoint } from '../src/features/workspace/services/mapGeometry.ts';
test('coordinate projection round-trips real and zero coordinates',()=>{
  for(const point of [{lat:0,lng:0},{lat:28.6,lng:77.2},{lat:-33.8,lng:151.2}]){
    const restored=unprojectPoint(projectPoint(point,10),10);
    assert.ok(Math.abs(restored.lat-point.lat)<1e-8); assert.ok(Math.abs(restored.lng-point.lng)<1e-8);
  }
});
test('bounds fitting keeps widely separated devices visible',()=>{
  const points=[{lat:51.5,lng:-0.1},{lat:-33.8,lng:151.2},{lat:37.7,lng:-122.4}];
  const view=fitMap(points,390,600);
  for(const point of points){const screen=screenPoint(point,view.center,view.zoom,390,600);assert.ok(screen.x>=0&&screen.x<=390);assert.ok(screen.y>=0&&screen.y<=600);}
});
test('date-line devices stay close instead of spanning the entire world',()=>{
  const points=[{lat:0,lng:179.8},{lat:0,lng:-179.8}], view=fitMap(points,390,600);
  assert.ok(view.zoom>5);
  for(const point of points){const screen=screenPoint(point,view.center,view.zoom,390,600);assert.ok(screen.x>=0&&screen.x<=390);}
});

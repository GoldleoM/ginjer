import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fitMap, gestureMap, MIN_ZOOM, MAX_ZOOM, projectPoint, screenPoint, unprojectPoint } from '../src/features/workspace/services/mapGeometry.ts';
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

test('pinch zoom follows finger separation and preserves the off-center anchor', () => {
  const start = { center: { lat: 28.6, lng: 77.2 }, zoom: 10 };
  const initial = [{ x: 50, y: 100 }, { x: 150, y: 100 }];
  const current = [{ x: 30, y: 140 }, { x: 230, y: 140 }];
  const origin = projectPoint(start.center, start.zoom);
  const anchor = unprojectPoint({ x: origin.x + 100 - 200, y: origin.y + 100 - 150 }, start.zoom);
  const result = gestureMap(start, initial, current, 400, 300);
  assert.equal(result.zoom, 11);
  const position = screenPoint(anchor, result.center, result.zoom, 400, 300);
  assert.ok(Math.abs(position.x - 130) < 1e-7); assert.ok(Math.abs(position.y - 140) < 1e-7);
  const reverse = gestureMap(result, current, initial, 400, 300);
  assert.equal(reverse.zoom, 10);
  assert.ok(Math.abs(reverse.center.lat - start.center.lat) < 1e-7);
  assert.ok(Math.abs(reverse.center.lng - start.center.lng) < 1e-7);
});
test('pinching supports fractional zoom and respects both zoom limits', () => {
  const points = [{ x: 100, y: 100 }, { x: 200, y: 100 }];
  const wide = [{ x: 50, y: 100 }, { x: 250, y: 100 }];
  const start = { center: { lat: 0, lng: 0 }, zoom: 10 };
  const fractional = gestureMap(start, points, [{ x: 75, y: 100 }, { x: 225, y: 100 }], 400, 300);
  assert.ok(fractional.zoom > 10 && fractional.zoom < 11);
  assert.equal(gestureMap({ ...start, zoom: MAX_ZOOM }, points, wide, 400, 300).zoom, MAX_ZOOM);
  assert.equal(gestureMap({ ...start, zoom: MIN_ZOOM }, wide, points, 400, 300).zoom, MIN_ZOOM);
});
test('single-finger dragging retains zoom and finger-count changes require a new baseline', () => {
  const start = { center: { lat: 0, lng: 0 }, zoom: 10 };
  const initial = [{ x: 100, y: 100 }], current = [{ x: 130, y: 120 }];
  const result = gestureMap(start, initial, current, 400, 300);
  assert.equal(result.zoom, 10);
  const position = screenPoint(start.center, result.center, result.zoom, 400, 300);
  assert.ok(Math.abs(position.x - 230) < 1e-7); assert.ok(Math.abs(position.y - 170) < 1e-7);
  assert.equal(gestureMap(start, initial, [...current, { x: 200, y: 120 }], 400, 300), start);
  assert.equal(gestureMap(start, [], [], 400, 300), start);
});

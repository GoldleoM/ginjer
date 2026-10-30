import type { Coordinates } from '../types';
export const TILE_SIZE = 256;
export const MIN_ZOOM = 0;
export const MAX_ZOOM = 18;
export function projectPoint(point: Coordinates, zoom: number) {
  const size = TILE_SIZE * 2 ** zoom, lat = Math.max(-85.05112878, Math.min(85.05112878, point.lat)) * Math.PI / 180;
  return { x: (point.lng + 180) / 360 * size, y: (1 - Math.log(Math.tan(lat) + 1 / Math.cos(lat)) / Math.PI) / 2 * size };
}
export function unprojectPoint(point: { x: number; y: number }, zoom: number): Coordinates {
  const size = TILE_SIZE * 2 ** zoom, x = ((point.x % size) + size) % size, y = Math.max(0, Math.min(size, point.y));
  return { lng: x / size * 360 - 180, lat: Math.atan(Math.sinh(Math.PI * (1 - 2 * y / size))) * 180 / Math.PI };
}
export function fitMap(points: Coordinates[], width: number, height: number) {
  if (!points.length) return { center: { lat: 0, lng: 0 }, zoom: MIN_ZOOM };
  const xs = points.map(point => projectPoint(point, 0).x / TILE_SIZE).sort((a, b) => a - b);
  let largestGap = -1, start = xs[0];
  xs.forEach((x, index) => { const next = index === xs.length - 1 ? xs[0] + 1 : xs[index + 1]; if (next - x > largestGap) { largestGap = next - x; start = next % 1; } });
  const spanX = points.length === 1 ? 0 : 1 - largestGap;
  const ys = points.map(point => projectPoint(point, 0).y / TILE_SIZE), minY = Math.min(...ys), maxY = Math.max(...ys);
  const zoomX = spanX > 0 ? Math.log2(Math.max(1, width - 120) / (TILE_SIZE * spanX)) : 15;
  const zoomY = maxY > minY ? Math.log2(Math.max(1, height - 180) / (TILE_SIZE * (maxY - minY))) : 15;
  return { center: unprojectPoint({ x: (start + spanX / 2) * TILE_SIZE, y: (minY + maxY) / 2 * TILE_SIZE }, 0),
    zoom: Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.floor(Math.min(zoomX, zoomY, 15)))) };
}
export function screenPoint(point: Coordinates, center: Coordinates, zoom: number, width: number, height: number) {
  const target = projectPoint(point, zoom), origin = projectPoint(center, zoom), size = TILE_SIZE * 2 ** zoom;
  let dx = target.x - origin.x;
  if (dx > size / 2) dx -= size;
  if (dx < -size / 2) dx += size;
  return { x: width / 2 + dx, y: height / 2 + target.y - origin.y };
}

export interface MapViewState { center: Coordinates; zoom: number; }
export interface MapTouch { x: number; y: number; }
// Keep the world point beneath the initial midpoint under the moving fingers.
export function gestureMap(start: MapViewState, initial: MapTouch[], current: MapTouch[], width: number, height: number): MapViewState {
  if (!initial.length || initial.length !== current.length) return start;
  const midpoint = (points: MapTouch[]) => points.length > 1 ? { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 } : points[0];
  const from = midpoint(initial), to = midpoint(current);
  const distance = (points: MapTouch[]) => Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y);
  const scale = initial.length > 1 && distance(initial) > 0 ? Math.max(0.001, distance(current)) / distance(initial) : 1;
  const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, start.zoom + Math.log2(scale)));
  const ratio = 2 ** (zoom - start.zoom), origin = projectPoint(start.center, start.zoom);
  return { zoom, center: unprojectPoint({
    x: (origin.x + from.x - width / 2) * ratio - to.x + width / 2,
    y: (origin.y + from.y - height / 2) * ratio - to.y + height / 2,
  }, zoom) };
}

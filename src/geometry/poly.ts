import { PxPoint } from '@/types';

export function area(poly: PxPoint[]): number {
  let s = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i+1)%poly.length];
    s += a.x*b.y - b.x*a.y;
  }
  return 0.5 * s;
}
export function isClockwise(poly: PxPoint[]): boolean {
  return area(poly) < 0; // экранная Y вниз -> cw будет отриц
}
export function clockwiseSort(quad: [PxPoint, PxPoint, PxPoint, PxPoint]) {
  // Простейшая нормализация: сортируем по центру+углу
  const cx = quad.reduce((s,p)=>s+p.x,0)/4;
  const cy = quad.reduce((s,p)=>s+p.y,0)/4;
  const withAng = quad.map(p => ({ p, a: Math.atan2(p.y-cy, p.x-cx) }));
  withAng.sort((u,v)=>u.a - v.a);
  const arr = withAng.map(w => w.p) as [PxPoint, PxPoint, PxPoint, PxPoint];
  // перевод в clockwise (для экранных координат)
  return isClockwise(arr) ? arr : ([arr[0], arr[3], arr[2], arr[1]] as any);
}

export function movePoint(p: PxPoint, dx: number, dy: number): PxPoint {
  return { x: p.x + dx, y: p.y + dy };
}

export function nearestVertex(poly: PxPoint[], x: number, y: number, hit = 8) {
  let idx = -1, best = hit*hit+1;
  for (let i=0;i<poly.length;i++){
    const dx = poly[i].x - x, dy = poly[i].y - y; const d = dx*dx+dy*dy;
    if (d < best) { best = d; idx = i; }
  }
  return idx;
}

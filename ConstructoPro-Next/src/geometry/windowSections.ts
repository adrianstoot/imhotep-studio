import { ShapeUtils, Vector2 } from 'three';
import type { SceneEntity } from '../domain/types';
import { localToWorld } from '../domain/construction';
import { windowPartEdges, windowPartVertices, type WindowAssemblyPart } from '../domain/windowAssembly';
import type { SectionPoint } from './sectionResolver';

const EPS = .001;
type P3 = [number, number, number];

function convexCut(vertices: P3[], edges: [number, number][], axis: number, offset: number): SectionPoint[] {
  const points: SectionPoint[] = [];
  const add = (p: P3) => {
    const point = { u: p[2], v: p[axis === 0 ? 1 : 0] };
    if (!points.some((other) => Math.hypot(other.u - point.u, other.v - point.v) < EPS)) points.push(point);
  };
  edges.forEach(([i, j]) => {
    const a = vertices[i], b = vertices[j], da = a[axis] - offset, db = b[axis] - offset;
    if (Math.abs(da) < EPS) add(a);
    if (Math.abs(db) < EPS) add(b);
    if (da * db < -EPS * EPS) {
      const t = da / (da - db);
      add(a.map((value, k) => value + t * (b[k] - value)) as P3);
    }
  });
  if (points.length < 3) return [];
  const centre = points.reduce((s, p) => ({ u: s.u + p.u / points.length, v: s.v + p.v / points.length }), { u: 0, v: 0 });
  return points.sort((a, b) => Math.atan2(a.v - centre.v, a.u - centre.u) - Math.atan2(b.v - centre.v, b.u - centre.u));
}

/** Actual folded profiles, including concave sill/drip and hollow rail wall fragments. */
export function intersectWindowPart(part: WindowAssemblyPart, entity: SceneEntity, axis: 'x' | 'y', offset: number): SectionPoint[][] {
  const vertices = windowPartVertices(part).map((point) => localToWorld(point, entity.transform));
  const n = part.profile.length, coordinate = axis === 'x' ? 0 : 1;
  const a = vertices.slice(0, n), b = vertices.slice(n);
  const capA = a[0][coordinate], capB = b[0][coordinate];
  // A normal cut of an extrusion is the original profile, preserving concave folds.
  if (a.every((p) => Math.abs(p[coordinate] - capA) < EPS) && b.every((p) => Math.abs(p[coordinate] - capB) < EPS)) {
    if (Math.abs(capB - capA) < EPS || offset < Math.min(capA, capB) - EPS || offset > Math.max(capA, capB) + EPS) return [];
    const t = (offset - capA) / (capB - capA);
    return [a.map((point, i) => ({ u: point[2] + t * (b[i][2] - point[2]), v: point[coordinate === 0 ? 1 : 0] + t * (b[i][coordinate === 0 ? 1 : 0] - point[coordinate === 0 ? 1 : 0]) }))];
  }
  const turns = part.profile.map(([x, y], i) => {
    const next = part.profile[(i + 1) % n], after = part.profile[(i + 2) % n];
    return (next[0] - x) * (after[1] - next[1]) - (next[1] - y) * (after[0] - next[0]);
  }).filter((turn) => Math.abs(turn) > EPS);
  if (turns.every((turn) => turn > 0) || turns.every((turn) => turn < 0)) {
    const polygon = convexCut(vertices, windowPartEdges(part), coordinate, offset);
    return polygon.length ? [polygon] : [];
  }
  // Oblique cuts through a concave folded sheet are decomposed into exact triangular prisms.
  const triangles = ShapeUtils.triangulateShape(part.profile.map(([x, y]) => new Vector2(x, y)), []);
  const edges: [number, number][] = [[0, 1], [1, 2], [2, 0], [3, 4], [4, 5], [5, 3], [0, 3], [1, 4], [2, 5]];
  return triangles.map((tri) => convexCut([...tri.map((i) => vertices[i]), ...tri.map((i) => vertices[i + n])], edges, coordinate, offset)).filter((polygon) => polygon.length >= 3);
}

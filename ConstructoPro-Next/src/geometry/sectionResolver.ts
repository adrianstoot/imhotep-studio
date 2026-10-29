import { PRODUCT_BY_ID } from '../data/catalog';
import type { GeometryKind, ProductCategory, ProjectDocument, SceneEntity } from '../domain/types';
import { entityLocalEnvelopeMm } from './sceneResolver';
import { openingCutouts } from '../domain/openingDimensions';
import { resolveWindowAssembly, windowPartVertices } from '../domain/windowAssembly';
import { intersectWindowPart } from './windowSections';

/** Millimetres on a cut plane: Z horizontally, Y/X vertically. */
export interface SectionPoint { u: number; v: number }
export interface SectionVoid { openingId: string; y0: number; y1: number }
export interface PrimitiveMetadata {
  id: string; entity: SceneEntity; label: string; manufacturer: string;
  category: ProductCategory; kind: GeometryKind; color: string; polygon: SectionPoint[];
  nominalThicknessMm: number;
  lineWeight: 'cut' | 'projection'; representation: 'commercial-volume' | 'commercial-envelope';
}
export interface SectionPrimitive extends PrimitiveMetadata { y0: number; y1: number; z0: number; z1: number; voids: SectionVoid[] }
export interface ResolvedSection { offsetMm: number; primitives: SectionPrimitive[]; minY: number; maxY: number; minZ: number; maxZ: number; overallDepthMm: number }
export interface JambSectionPrimitive extends PrimitiveMetadata { x0: number; x1: number; z0: number; z1: number }
export interface ResolvedJambSection { openingEntity: SceneEntity | null; cutY: number; jambX: number; primitives: JambSectionPrimitive[]; minX: number; maxX: number; minZ: number; maxZ: number; overallDepthMm: number }

type Point3 = [number, number, number];
const EPS = 0.001;
const BOX_EDGES = [[0, 1], [0, 2], [0, 4], [1, 3], [1, 5], [2, 3], [2, 6], [3, 7], [4, 5], [4, 6], [5, 7], [6, 7]];

/** Same intrinsic XYZ Euler convention as THREE.Object3D.rotation. */
function worldPoint(local: Point3, entity: SceneEntity): Point3 {
  const [x, y, z] = local;
  const [rx, ry, rz] = entity.transform.rotation;
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  return [
    c * e * x - c * f * y + d * z + entity.transform.position[0],
    (a * f + b * e * d) * x + (a * e - b * f * d) * y - b * c * z + entity.transform.position[1],
    (b * f - a * e * d) * x + (b * e + a * f * d) * y + a * c * z + entity.transform.position[2],
  ];
}

function cornersFor(entity: SceneEntity, depthInterval?: readonly [number, number]): Point3[] {
  const envelope = entityLocalEnvelopeMm(entity);
  if (!envelope) return [];
  const corners: Point3[] = [];
  for (const x of [envelope.minX, envelope.maxX]) for (const y of [envelope.minY, envelope.maxY]) for (const z of depthInterval ?? [envelope.minZ, envelope.maxZ]) corners.push(worldPoint([x, y, z], entity));
  return corners;
}

/** Orthogonal elevation of the commercial volume, preserving rotations and scale. */
export function projectEntityElevation(entity: SceneEntity): SectionPoint[] {
  const points = cornersFor(entity).map(([x, y]) => ({ u: x, v: y }))
    .filter((point, index, all) => all.findIndex((entry) => Math.hypot(entry.u - point.u, entry.v - point.v) < EPS) === index)
    .sort((a, b) => a.u - b.u || a.v - b.v);
  const cross = (a: SectionPoint, b: SectionPoint, c: SectionPoint) => (b.u - a.u) * (c.v - a.v) - (b.v - a.v) * (c.u - a.u);
  const lower: SectionPoint[] = [], upper: SectionPoint[] = [];
  points.forEach((point) => { while (lower.length >= 2 && cross(lower[lower.length - 2], lower[lower.length - 1], point) <= EPS) lower.pop(); lower.push(point); });
  [...points].reverse().forEach((point) => { while (upper.length >= 2 && cross(upper[upper.length - 2], upper[upper.length - 1], point) <= EPS) upper.pop(); upper.push(point); });
  return [...lower.slice(0, -1), ...upper.slice(0, -1)];
}

/** Exact plane intersection of the oriented commercial prism, not its AABB. */
export function intersectEntitySection(entity: SceneEntity, axis: 'x' | 'y', offsetMm: number, depthInterval?: readonly [number, number]): SectionPoint[] {
  const corners = cornersFor(entity, depthInterval);
  if (!corners.length) return [];
  const axisIndex = axis === 'x' ? 0 : 1;
  const points: SectionPoint[] = [];
  const add = (p: Point3) => {
    const point = { u: p[2], v: p[axis === 'x' ? 1 : 0] };
    if (!points.some((entry) => Math.hypot(entry.u - point.u, entry.v - point.v) < EPS)) points.push(point);
  };
  BOX_EDGES.forEach(([first, second]) => {
    const a = corners[first], b = corners[second];
    const da = a[axisIndex] - offsetMm, db = b[axisIndex] - offsetMm;
    if (Math.abs(da) < EPS) add(a);
    if (Math.abs(db) < EPS) add(b);
    if (da * db < -EPS * EPS) {
      const t = da / (da - db);
      add([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t]);
    }
  });
  if (points.length < 3) return [];
  const centre = points.reduce((sum, point) => ({ u: sum.u + point.u / points.length, v: sum.v + point.v / points.length }), { u: 0, v: 0 });
  return points.sort((a, b) => Math.atan2(a.v - centre.v, a.u - centre.u) - Math.atan2(b.v - centre.v, b.u - centre.u));
}

export function clipSectionPolygon(polygon: SectionPoint[], coordinate: 'u' | 'v', boundary: number, keepGreater: boolean): SectionPoint[] {
  if (!polygon.length) return [];
  const output: SectionPoint[] = [];
  polygon.forEach((a, index) => {
    const b = polygon[(index + 1) % polygon.length];
    const da = a[coordinate] - boundary, db = b[coordinate] - boundary;
    const insideA = keepGreater ? da >= -EPS : da <= EPS;
    const insideB = keepGreater ? db >= -EPS : db <= EPS;
    if (insideA) output.push(a);
    if (insideA !== insideB) { const t = da / (da - db); output.push({ u: a.u + (b.u - a.u) * t, v: a.v + (b.v - a.v) * t }); }
  });
  return output.length >= 3 ? output : [];
}

function polygonArea(points: SectionPoint[]): number {
  return Math.abs(points.reduce((sum, point, index) => { const next = points[(index + 1) % points.length]; return sum + point.u * next.v - next.u * point.v; }, 0)) / 2;
}

function subtractRectangle(polygon: SectionPoint[], rect: { u0: number; u1: number; v0: number; v1: number }): SectionPoint[][] {
  const middle = clipSectionPolygon(clipSectionPolygon(polygon, 'u', rect.u0, true), 'u', rect.u1, false);
  return [clipSectionPolygon(polygon, 'u', rect.u0, false), clipSectionPolygon(polygon, 'u', rect.u1, true), clipSectionPolygon(middle, 'v', rect.v0, false), clipSectionPolygon(middle, 'v', rect.v1, true)]
    .filter((points) => points.length >= 3 && polygonArea(points) > EPS);
}

function cutEntity(entity: SceneEntity, project: ProjectDocument, axis: 'x' | 'y', offset: number, depthInterval?: readonly [number, number]): SectionPoint[][] {
  const polygon = intersectEntitySection(entity, axis, offset, depthInterval);
  if (!polygon.length) return [];
  let fragments = [polygon];
  project.entities.forEach((openingEntity) => {
    if (!openingEntity.visible || !openingEntity.opening) return;
    const opening = openingEntity.opening;
    const relation = opening.affectedEntities.find((entry) => entry.entityId === entity.id);
    if (!relation) return;
    const [x, y, z] = openingEntity.transform.position;
    openingCutouts(openingEntity, PRODUCT_BY_ID.get(entity.productId)?.geometryKind).forEach((cutout) => {
      const halfAlongPlane = axis === 'x' ? cutout.widthMm / 2 : cutout.heightMm / 2;
      const planeCentre = axis === 'x' ? x + cutout.xMm : y + cutout.yMm;
      if (offset < planeCentre - halfAlongPlane - EPS || offset > planeCentre + halfAlongPlane + EPS) return;
      if (relation.behavior === 'suppress-unit') { fragments = []; return; }
      if (relation.behavior !== 'cut-coverage' && relation.behavior !== 'split-linear') return;
      // Persisted host voids retain the existing orthogonal facade convention.
      const centreV = axis === 'x' ? y + cutout.yMm : x + cutout.xMm;
      const halfV = axis === 'x' ? cutout.heightMm / 2 : cutout.widthMm / 2;
      const rectangle = { u0: z - opening.depthMm / 2, u1: z + opening.depthMm / 2, v0: centreV - halfV, v1: centreV + halfV };
      fragments = fragments.flatMap((fragment) => subtractRectangle(fragment, rectangle));
    });
  });
  return fragments;
}

function metadata(entity: SceneEntity, polygon: SectionPoint[], suffix: string): PrimitiveMetadata {
  const product = PRODUCT_BY_ID.get(entity.productId)!;
  const variant = product.variants.find((entry) => entry.id === entity.variantId) ?? product.variants[0];
  const envelope = ['window', 'profile', 'bracket', 'fastener', 'coping', 'drain'].includes(product.geometryKind);
  return { id: `${entity.id}${suffix}`, entity, label: entity.name, manufacturer: product.manufacturer, category: product.category, kind: product.geometryKind, color: product.color, polygon,
    nominalThicknessMm: variant.depthMm, lineWeight: envelope ? 'projection' : 'cut', representation: envelope ? 'commercial-envelope' : 'commercial-volume' };
}

function sectionParts(entity: SceneEntity, project: ProjectDocument, axis: 'x' | 'y', offset: number): PrimitiveMetadata[] {
  const product = PRODUCT_BY_ID.get(entity.productId)!;
  if (entity.opening?.installation) return resolveWindowAssembly(entity).flatMap((part) =>
    intersectWindowPart(part, entity, axis, offset).map((polygon, index) => ({
      ...metadata(entity, polygon, `-${part.id}-${index}`), label: part.label, kind: part.kind, color: part.color,
      nominalThicknessMm: part.nominalThicknessMm, lineWeight: 'cut' as const, representation: 'commercial-volume' as const,
    })),
  );
  const variant = product.variants.find((entry) => entry.id === entity.variantId) ?? product.variants[0];
  // Same documented composite build-up and local-Z split used by danolosaCoverage.
  const concreteDepth = Math.min(35, variant.depthMm * .7);
  const layers: { interval?: readonly [number, number]; label?: string; kind?: GeometryKind }[] = product.name.startsWith('DANOLOSA')
    ? [{ interval: [-variant.depthMm / 2, variant.depthMm / 2 - concreteDepth], label: `XPS drenante · ${Math.round(variant.depthMm - concreteDepth)} mm`, kind: 'insulation' },
      { interval: [variant.depthMm / 2 - concreteDepth, variant.depthMm / 2], label: `Hormigón poroso · ${Math.round(concreteDepth)} mm`, kind: 'solid' }]
    : [{}];
  return layers.flatMap((layer, layerIndex) => cutEntity(entity, project, axis, offset, layer.interval).map((polygon, index) => ({
    ...metadata(entity, polygon, `-${axis}${layerIndex}-${index}`), label: layer.label ?? entity.name, kind: layer.kind ?? product.geometryKind,
    nominalThicknessMm: layer.interval ? layer.interval[1] - layer.interval[0] : variant.depthMm,
  })));
}

export function resolveSection(project: ProjectDocument): ResolvedSection {
  const primitives = project.entities.filter((entity) => entity.visible && PRODUCT_BY_ID.has(entity.productId)).flatMap<SectionPrimitive>((entity) =>
    sectionParts(entity, project, 'x', project.section.offsetMm).map((part) => ({ ...part,
      z0: Math.min(...part.polygon.map((point) => point.u)), z1: Math.max(...part.polygon.map((point) => point.u)), y0: Math.min(...part.polygon.map((point) => point.v)), y1: Math.max(...part.polygon.map((point) => point.v)), voids: [] })),
  );
  const minY = primitives.length ? Math.min(...primitives.map((primitive) => primitive.y0)) : 0;
  const maxY = primitives.length ? Math.max(...primitives.map((primitive) => primitive.y1)) : 1000;
  const minZ = primitives.length ? Math.min(...primitives.map((primitive) => primitive.z0)) : 0;
  const maxZ = primitives.length ? Math.max(...primitives.map((primitive) => primitive.z1)) : 800;
  return { offsetMm: project.section.offsetMm, primitives, minY, maxY, minZ, maxZ, overallDepthMm: maxZ - minZ };
}

/** Plan section at the centre of the selected or first visible opening. */
export function resolveJambSection(project: ProjectDocument, preferredOpeningId?: string): ResolvedJambSection {
  const openings = project.entities.filter((entity) => entity.visible && entity.opening);
  const openingEntity = openings.find((entity) => entity.id === preferredOpeningId) ?? openings[0] ?? null;
  if (!openingEntity?.opening) return { openingEntity: null, cutY: 0, jambX: 0, primitives: [], minX: -700, maxX: 500, minZ: -200, maxZ: 600, overallDepthMm: 800 };
  const opening = openingEntity.opening;
  const jambX = openingEntity.transform.position[0] - opening.widthMm / 2;
  const cutY = openingEntity.transform.position[1];
  const minX = jambX - 550, maxX = jambX + Math.min(420, opening.widthMm / 2);
  const primitives = project.entities.filter((entity) => entity.visible && PRODUCT_BY_ID.has(entity.productId)).flatMap<JambSectionPrimitive>((entity) =>
    sectionParts(entity, project, 'y', cutY).map((part) => ({ ...part, polygon: clipSectionPolygon(clipSectionPolygon(part.polygon, 'v', minX, true), 'v', maxX, false) }))
      .filter((part) => part.polygon.length >= 3 && polygonArea(part.polygon) > EPS)
      .map((part) => ({ ...part, z0: Math.min(...part.polygon.map((point) => point.u)), z1: Math.max(...part.polygon.map((point) => point.u)), x0: Math.min(...part.polygon.map((point) => point.v)), x1: Math.max(...part.polygon.map((point) => point.v)) })),
  );
  const minZ = primitives.length ? Math.min(...primitives.map((primitive) => primitive.z0)) : 0;
  const maxZ = primitives.length ? Math.max(...primitives.map((primitive) => primitive.z1)) : 800;
  return { openingEntity, cutY, jambX, primitives: primitives.sort((a, b) => a.z0 - b.z0 || a.x0 - b.x0), minX, maxX, minZ, maxZ, overallDepthMm: maxZ - minZ };
}

export type WindowDetailView = 'sill' | 'head' | 'fixing' | 'support';
export function resolveWindowDetail(project: ProjectDocument, mode: WindowDetailView, preferredOpeningId?: string) {
  const openings = project.entities.filter((entity) => entity.visible && entity.opening);
  const entity = openings.find((entry) => entry.id === preferredOpeningId) ?? openings[0];
  if (!entity?.opening) return null;
  const opening = entity.opening, [x, y] = entity.transform.position;
  const margin = (opening.installation?.jointMm ?? 0) + (opening.installation?.preframeFaceMm ?? 0);
  const axis = mode === 'fixing' ? 'y' : 'x';
  const offset = mode === 'fixing' ? y : mode === 'support' ? x : x - opening.widthMm / 4;
  const centre = mode === 'head' ? y + opening.heightMm / 2 : mode === 'fixing' ? x - opening.widthMm / 2 : y - opening.heightMm / 2;
  const minV = centre - (mode === 'head' ? 120 : margin + 135);
  const maxV = centre + (mode === 'head' ? margin + (opening.installation?.lintelHeightMm ?? 150) + 40 : mode === 'support' ? 70 : 165);
  const primitives = project.entities.filter((entry) => entry.visible && PRODUCT_BY_ID.has(entry.productId))
    .flatMap((entry) => sectionParts(entry, project, axis, offset))
    .map((part) => ({ ...part, polygon: clipSectionPolygon(clipSectionPolygon(part.polygon, 'v', minV, true), 'v', maxV, false) }))
    .filter((part) => part.polygon.length >= 3 && polygonArea(part.polygon) > EPS);
  return { entity, axis, offset, primitives, minV, maxV,
    minU: primitives.length ? Math.min(...primitives.flatMap((part) => part.polygon.map((p) => p.u))) : -100,
    maxU: primitives.length ? Math.max(...primitives.flatMap((part) => part.polygon.map((p) => p.u))) : 300 };
}

export function resolveWindowElevation(entity: SceneEntity) {
  return resolveWindowAssembly(entity).map((part) => {
    const points = windowPartVertices(part).map((point) => worldPoint(point, entity));
    const minX = Math.min(...points.map((p) => p[0])), maxX = Math.max(...points.map((p) => p[0]));
    const minY = Math.min(...points.map((p) => p[1])), maxY = Math.max(...points.map((p) => p[1]));
    return { ...metadata(entity, [{ u: minX, v: minY }, { u: maxX, v: minY }, { u: maxX, v: maxY }, { u: minX, v: maxY }], part.id), label: part.label, kind: part.kind, color: part.color,
      nominalThicknessMm: part.nominalThicknessMm, representation: 'commercial-volume' as const, depth: Math.max(...points.map((p) => p[2])) };
  }).sort((a, b) => a.depth - b.depth);
}

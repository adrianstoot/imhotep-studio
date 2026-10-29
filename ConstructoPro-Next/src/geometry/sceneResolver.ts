import { PRODUCT_BY_ID } from '../data/catalog';
import type {
  OpeningAffectedEntity,
  OpeningBehavior,
  ProductDefinition,
  ProductVariant,
  ProjectDocument,
  SceneEntity,
} from '../domain/types';
import type { OpeningRect } from './layout';
import { roofTileInstallationTilt } from '../domain/construction';
import { openingCutouts } from '../domain/openingDimensions';
import { resolveWindowAssembly, windowPartVertices } from '../domain/windowAssembly';

const EPSILON = 0.01;

export interface Bounds3Mm {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  minZ: number;
  maxZ: number;
}

export interface OpeningRelation extends OpeningAffectedEntity {
  openingId: string;
}

export interface LinearSegment {
  key: string;
  centerMm: number;
  lengthMm: number;
}

function variantFor(entity: SceneEntity, product: ProductDefinition): ProductVariant {
  return product.variants.find((variant) => variant.id === entity.variantId) ?? product.variants[0];
}

function localDimensions(entity: SceneEntity, product: ProductDefinition): [number, number, number] {
  const variant = variantFor(entity, product);
  if (entity.coverage) return [entity.coverage.widthMm, entity.coverage.heightMm, variant.depthMm];
  if (product.placementKind === 'linear') {
    const length = clampCommercialCutLength(product, variant, entity.cutLengthMm ?? variant.stockLengthMm ?? variant.heightMm);
    return [variant.widthMm, length, variant.depthMm];
  }
  return [variant.widthMm, variant.heightMm, variant.depthMm];
}

function rotatePoint(
  point: [number, number, number],
  rotation: [number, number, number],
): [number, number, number] {
  let [x, y, z] = point;
  const [rx, ry, rz] = rotation;
  const cx = Math.cos(rx); const sx = Math.sin(rx);
  const cy = Math.cos(ry); const sy = Math.sin(ry);
  const cz = Math.cos(rz); const sz = Math.sin(rz);
  [x, y] = [x * cz - y * sz, x * sz + y * cz];
  [x, z] = [x * cy + z * sy, -x * sy + z * cy];
  [y, z] = [y * cx - z * sx, y * sx + z * cx];
  return [x, y, z];
}

export function entityLocalEnvelopeMm(entity: SceneEntity): Bounds3Mm | null {
  const product = PRODUCT_BY_ID.get(entity.productId);
  if (!product) return null;
  const [width, height, depth] = localDimensions(entity, product);
  if (entity.opening?.installation) {
    const vertices = resolveWindowAssembly(entity).flatMap(windowPartVertices);
    return { minX: Math.min(...vertices.map((p) => p[0])), maxX: Math.max(...vertices.map((p) => p[0])),
      minY: Math.min(...vertices.map((p) => p[1])), maxY: Math.max(...vertices.map((p) => p[1])),
      minZ: Math.min(...vertices.map((p) => p[2])), maxZ: Math.max(...vertices.map((p) => p[2])) };
  }
  if (product.geometryKind === 'fastener') {
    const variant = variantFor(entity, product);
    return { minX: -variant.widthMm / 2, maxX: variant.widthMm / 2, minY: -variant.widthMm / 2, maxY: variant.widthMm / 2, minZ: -Math.max(variant.heightMm, 40) - Math.max(variant.depthMm / 2, 3) * 3.2, maxZ: 10.5 };
  }
  if (product.geometryKind === 'coping' && product.name.includes('Canalón')) {
    return { minX: -width / 2, maxX: width / 2, minY: -height / 2, maxY: height / 2, minZ: -width / 2, maxZ: 0 };
  }
  if (product.geometryKind === 'roof-tile' && entity.coverage) {
    const variant = variantFor(entity, product);
    const tilt = Math.abs(roofTileInstallationTilt(product, variant, entity.coverage));
    return { minX: -width / 2, maxX: width / 2, minY: -height / 2, maxY: height / 2,
      minZ: -depth / 2, maxZ: variant.heightMm * Math.sin(tilt) + depth * Math.cos(tilt) - depth / 2 };
  }
  const half: [number, number, number] = [width / 2, height / 2, depth / 2];
  return { minX: -half[0], maxX: half[0], minY: -half[1], maxY: half[1], minZ: -half[2], maxZ: half[2] };
}

export function entityBoundsMm(entity: SceneEntity): Bounds3Mm | null {
  const envelope = entityLocalEnvelopeMm(entity);
  if (!envelope) return null;
  const points: [number, number, number][] = [];
  for (const x of [envelope.minX, envelope.maxX]) {
    for (const y of [envelope.minY, envelope.maxY]) {
      for (const z of [envelope.minZ, envelope.maxZ]) {
        const rotated = rotatePoint([x, y, z], entity.transform.rotation);
        points.push([
          rotated[0] + entity.transform.position[0],
          rotated[1] + entity.transform.position[1],
          rotated[2] + entity.transform.position[2],
        ]);
      }
    }
  }
  return {
    minX: Math.min(...points.map((point) => point[0])),
    maxX: Math.max(...points.map((point) => point[0])),
    minY: Math.min(...points.map((point) => point[1])),
    maxY: Math.max(...points.map((point) => point[1])),
    minZ: Math.min(...points.map((point) => point[2])),
    maxZ: Math.max(...points.map((point) => point[2])),
  };
}

function openingBounds(entity: SceneEntity): Bounds3Mm | null {
  if (!entity.opening) return null;
  const cutout = openingCutouts(entity)[0];
  const halfWidth = cutout.widthMm / 2;
  const halfHeight = cutout.heightMm / 2;
  const halfDepth = entity.opening.depthMm / 2;
  return {
    minX: entity.transform.position[0] - halfWidth,
    maxX: entity.transform.position[0] + halfWidth,
    minY: entity.transform.position[1] - halfHeight,
    maxY: entity.transform.position[1] + halfHeight,
    minZ: entity.transform.position[2] - halfDepth,
    maxZ: entity.transform.position[2] + halfDepth,
  };
}

function overlaps3d(a: Bounds3Mm, b: Bounds3Mm): boolean {
  return a.minX < b.maxX - EPSILON
    && a.maxX > b.minX + EPSILON
    && a.minY < b.maxY - EPSILON
    && a.maxY > b.minY + EPSILON
    && a.minZ < b.maxZ - EPSILON
    && a.maxZ > b.minZ + EPSILON;
}

function interactionFor(entity: SceneEntity): OpeningBehavior {
  const product = PRODUCT_BY_ID.get(entity.productId);
  if (!product) return 'ignore';
  return product.openingBehavior;
}

/**
 * Resolves opening participation from geometry, not from a manually curated host
 * list. This is deliberately recalculated after every command so moving a window
 * cannot leave rails, panels, fasteners or backing layers inside the void.
 */
export function resolveOpeningRelations(project: ProjectDocument): Map<string, OpeningRelation[]> {
  const relations = new Map<string, OpeningRelation[]>();
  const candidates = project.entities.filter((entity) => entity.visible && !entity.opening);
  project.entities.filter((entity) => entity.visible && entity.opening).forEach((openingEntity) => {
    const voidBounds = openingBounds(openingEntity);
    if (!voidBounds) return;
    const affected = candidates.flatMap<OpeningRelation>((entity) => {
      const behavior = interactionFor(entity);
      if (behavior === 'ignore') return [];
      const bounds = entityBoundsMm(entity);
      if (!bounds || !overlaps3d(voidBounds, bounds)) return [];
      return [{ openingId: openingEntity.id, entityId: entity.id, behavior }];
    });
    relations.set(openingEntity.id, affected);
  });
  return relations;
}

export function synchronizeOpeningRelations(project: ProjectDocument): ProjectDocument {
  const relations = resolveOpeningRelations(project);
  let changed = false;
  const entities = project.entities.map((entity) => {
    if (!entity.opening) return entity;
    const affectedEntities = (relations.get(entity.id) ?? []).map(({ entityId, behavior }) => ({ entityId, behavior }));
    const hostIds = affectedEntities.map((entry) => entry.entityId);
    const same = entity.opening.affectedEntities.length === affectedEntities.length
      && entity.opening.affectedEntities.every((entry, index) => (
        entry.entityId === affectedEntities[index]?.entityId && entry.behavior === affectedEntities[index]?.behavior
      ));
    if (same) return entity;
    changed = true;
    return { ...entity, opening: { ...entity.opening, affectedEntities, hostIds } };
  });
  return changed ? { ...project, entities } : project;
}

function worldOpeningToLocal(openingEntity: SceneEntity, host: SceneEntity, cutout = openingCutouts(openingEntity)[0]): OpeningRect {
  const shifted = rotatePoint([cutout.xMm, cutout.yMm, 0], openingEntity.transform.rotation);
  const dx = openingEntity.transform.position[0] + shifted[0] - host.transform.position[0];
  const dy = openingEntity.transform.position[1] + shifted[1] - host.transform.position[1];
  const angle = -host.transform.rotation[2];
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const xMm = dx * cos - dy * sin;
  const yMm = dx * sin + dy * cos;
  const halfWidth = cutout.widthMm / 2;
  const halfHeight = cutout.heightMm / 2;
  return {
    id: openingEntity.id,
    xMm,
    yMm,
    widthMm: 2 * (Math.abs(cos) * halfWidth + Math.abs(sin) * halfHeight),
    heightMm: 2 * (Math.abs(sin) * halfWidth + Math.abs(cos) * halfHeight),
  };
}

export function openingsForEntity(
  entity: SceneEntity,
  entities: SceneEntity[],
  behavior?: Exclude<OpeningBehavior, 'ignore'>,
): OpeningRect[] {
  return entities.flatMap((candidate) => {
    if (!candidate.opening) return [];
    const relation = candidate.opening.affectedEntities.find((entry) => entry.entityId === entity.id);
    if (!relation || (behavior && relation.behavior !== behavior)) return [];
    const kind = PRODUCT_BY_ID.get(entity.productId)?.geometryKind;
    return openingCutouts(candidate, kind).map((cutout) => worldOpeningToLocal(candidate, entity, cutout));
  });
}

function subtractInterval(segments: [number, number][], cutStart: number, cutEnd: number): [number, number][] {
  return segments.flatMap(([start, end]) => {
    if (cutEnd <= start + EPSILON || cutStart >= end - EPSILON) return [[start, end]];
    const next: [number, number][] = [];
    if (cutStart > start + EPSILON) next.push([start, Math.min(cutStart, end)]);
    if (cutEnd < end - EPSILON) next.push([Math.max(cutEnd, start), end]);
    return next;
  });
}

export function resolveLinearSegments(
  entity: SceneEntity,
  product: ProductDefinition,
  openings: OpeningRect[],
): LinearSegment[] {
  const variant = variantFor(entity, product);
  const length = clampCommercialCutLength(product, variant, entity.cutLengthMm ?? variant.stockLengthMm ?? variant.heightMm);
  const halfWidth = variant.widthMm / 2;
  let segments: [number, number][] = [[-length / 2, length / 2]];
  openings.forEach((opening) => {
    const crossesProfile = opening.xMm - opening.widthMm / 2 < halfWidth - EPSILON
      && opening.xMm + opening.widthMm / 2 > -halfWidth + EPSILON;
    if (!crossesProfile) return;
    segments = subtractInterval(
      segments,
      opening.yMm - opening.heightMm / 2,
      opening.yMm + opening.heightMm / 2,
    );
  });
  return segments.filter(([start, end]) => end - start > EPSILON).map(([start, end], index) => ({
    key: `${entity.id}-segment-${index}`,
    centerMm: (start + end) / 2,
    lengthMm: end - start,
  }));
}

export function isSuppressedByOpening(entity: SceneEntity, openings: OpeningRect[]): boolean {
  const product = PRODUCT_BY_ID.get(entity.productId);
  if (!product || !openings.length) return false;
  const envelope = entityLocalEnvelopeMm(entity)!;
  return openings.some((opening) => (
    opening.xMm - opening.widthMm / 2 < envelope.maxX - EPSILON
    && opening.xMm + opening.widthMm / 2 > envelope.minX + EPSILON
    && opening.yMm - opening.heightMm / 2 < envelope.maxY - EPSILON
    && opening.yMm + opening.heightMm / 2 > envelope.minY + EPSILON
  ));
}

export function clampCommercialCutLength(product: ProductDefinition, variant: ProductVariant, requestedMm: number): number {
  if (product.placementKind !== 'linear') return variant.heightMm;
  const minimum = variant.minCutLengthMm ?? 1;
  const maximum = variant.stockLengthMm ?? variant.heightMm;
  const increment = Math.max(0.001, variant.cutIncrementMm ?? 1);
  const clamped = Math.max(minimum, Math.min(maximum, requestedMm));
  return Math.round(clamped / increment) * increment;
}

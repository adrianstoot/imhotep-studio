import type { CoverageSpec, DetailType, ProductDefinition, ProductVariant, ProjectDocument, SceneEntity, Transform3D } from './types';
import { PRODUCT_BY_ID } from '../data/catalog';

export const PITCHED_ROOF_SLOPE = 0.35;
export const FLAT_ROOF_SLOPE = 0.02;

/** Installation pitch allows the upper course to pass over the lower tile's head. */
export function roofTileInstallationTilt(product: ProductDefinition, variant: ProductVariant, coverage: CoverageSpec): number {
  const step = Math.max(1, variant.heightMm - coverage.overlapMm + (coverage.bedJointMm ?? coverage.jointMm));
  const clearance = product.name.includes('Pizarra') ? variant.depthMm * 1.1
    : product.name.startsWith('Planum') ? variant.depthMm * 0.65 : Math.max(2, variant.depthMm * 0.28);
  return -Math.atan(clearance / step);
}

export function detailSurfaceRotation(detailType: DetailType): Transform3D['rotation'] {
  if (detailType === 'cubierta-inclinada') return [-Math.PI / 2 + Math.atan(PITCHED_ROOF_SLOPE), 0, 0];
  if (detailType === 'cubierta-plana' || detailType === 'terraza') return [-Math.PI / 2 + Math.atan(FLAT_ROOF_SLOPE), 0, 0];
  return detailType === 'pavimento' ? [-Math.PI / 2, 0, 0] : [0, 0, 0];
}

export function isRoofOrFloor(detailType: DetailType): boolean {
  return ['cubierta-inclinada', 'cubierta-plana', 'terraza', 'pavimento'].includes(detailType);
}

/** Euler XYZ, identical to Three.js Object3D.rotation's default order. */
export function localToWorld(point: [number, number, number], transform: Transform3D): [number, number, number] {
  let [x, y, z] = point;
  const [rx, ry, rz] = transform.rotation;
  [x, y] = [x * Math.cos(rz) - y * Math.sin(rz), x * Math.sin(rz) + y * Math.cos(rz)];
  [x, z] = [x * Math.cos(ry) + z * Math.sin(ry), -x * Math.sin(ry) + z * Math.cos(ry)];
  [y, z] = [y * Math.cos(rx) - z * Math.sin(rx), y * Math.sin(rx) + z * Math.cos(rx)];
  return [x + transform.position[0], y + transform.position[1], z + transform.position[2]];
}

export function surfaceNormal(rotation: Transform3D['rotation']): [number, number, number] {
  return localToWorld([0, 0, 1], { position: [0, 0, 0], rotation });
}

function dot(a: number[], b: number[]): number { return a.reduce((sum, value, index) => sum + value * b[index], 0); }

/** Contact surface for insertion: use the outermost parallel layer, not a free floating plane. */
export function placementSurface(project: ProjectDocument): { origin: [number, number, number]; normal: [number, number, number]; rotation: Transform3D['rotation'] } {
  const rotation = detailSurfaceRotation(project.detailType);
  const normal = surfaceNormal(rotation);
  const layers = project.entities.filter((entity) => entity.visible && entity.coverage && dot(surfaceNormal(entity.transform.rotation), normal) > 0.99);
  let outer: SceneEntity | undefined;
  let extent = -Infinity;
  layers.forEach((entity) => {
    const variant = PRODUCT_BY_ID.get(entity.productId)?.variants.find((candidate) => candidate.id === entity.variantId);
    if (!variant) return;
    const product = PRODUCT_BY_ID.get(entity.productId)!;
    const tilt = product.geometryKind === 'roof-tile' && entity.coverage ? Math.abs(roofTileInstallationTilt(product, variant, entity.coverage)) : 0;
    const front = tilt ? variant.heightMm * Math.sin(tilt) + variant.depthMm * Math.cos(tilt) - variant.depthMm / 2 : variant.depthMm / 2;
    const candidate = dot(entity.transform.position, normal) + front;
    if (candidate > extent) { extent = candidate; outer = entity; }
  });
  const origin = outer ? outer.transform.position.map((value, index) => value + normal[index] * (extent - dot(outer!.transform.position, normal))) as [number, number, number]
    : isRoofOrFloor(project.detailType) ? [0, 0, 0] as [number, number, number] : [0, 1500, 0] as [number, number, number];
  return { origin, normal, rotation };
}

/** The insertion pivot follows the physical role of a component, not always the outer face. */
export function attachmentFrame(project: ProjectDocument, product: ProductDefinition): ReturnType<typeof placementSurface> {
  const frame = placementSurface(project);
  const variant = product.variants[0];
  const layers = project.entities.filter((entity) => entity.visible && entity.coverage);
  const layer = (category: ProductDefinition['category']) => layers.find((entity) => PRODUCT_BY_ID.get(entity.productId)?.category === category);
  const coordinate = (entity: SceneEntity, face: 'center' | 'front' | 'back' = 'center') => {
    const entry = PRODUCT_BY_ID.get(entity.productId)!;
    const v = entry.variants.find((candidate) => candidate.id === entity.variantId) ?? entry.variants[0];
    return dot(entity.transform.position, frame.normal) + (face === 'front' ? v.depthMm / 2 : face === 'back' ? -v.depthMm / 2 : 0);
  };
  let center = dot(frame.origin, frame.normal) + (product.placementKind === 'coverage' || product.placementKind === 'linear' ? variant.depthMm / 2 : 0);
  let rotation: Transform3D['rotation'] = product.placementKind === 'coverage' || product.placementKind === 'linear' ? frame.rotation : [0, 0, 0];
  if (!isRoofOrFloor(project.detailType)) {
    const insulation = layer('Aislamientos');
    const support = layer('Morteros y sellantes') ?? layer('Soportes y fábrica');
    const finish = layer('Revestimientos de fachada');
    if (product.createsOpening && (insulation || support)) center = coordinate((insulation ?? support)!);
    else if (product.geometryKind === 'fastener' && insulation) center = coordinate(insulation, 'front');
    else if (product.geometryKind === 'bracket' && support) center = coordinate(support, 'front') + variant.depthMm / 2;
    else if (product.geometryKind === 'profile' && finish) center = coordinate(finish, 'back') - variant.depthMm / 2;
    if (product.id === 'edu-partition-stud-70' && insulation) center = coordinate(insulation);
  } else if (product.name.startsWith('Pedestal BUZON')) {
    center = dot(frame.origin, frame.normal) + variant.heightMm / 2;
    rotation = [frame.rotation[0] + Math.PI / 2, 0, 0];
  }
  const delta = center - dot(frame.origin, frame.normal);
  return { ...frame, rotation, origin: frame.origin.map((value, index) => value + frame.normal[index] * delta) as [number, number, number] };
}

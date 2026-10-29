import { PRODUCT_BY_ID } from '../data/catalog';
import type { SceneEntity } from '../domain/types';

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a.reduce((sum, value, i) => sum + value * b[i], 0);

/** Columns of the same intrinsic XYZ Euler matrix used by Three.js. */
export function surfaceAxes(rotation: V3): [V3, V3, V3] {
  const [x, y, z] = rotation;
  const a = Math.cos(x), b = Math.sin(x), c = Math.cos(y), d = Math.sin(y), e = Math.cos(z), f = Math.sin(z);
  return [[c * e, a * f + b * e * d, b * f - a * e * d], [-c * f, a * e - b * f * d, b * e + a * f * d], [d, -b * c, a * c]];
}

export function surfaceNormal(entity: SceneEntity): V3 {
  return surfaceAxes(entity.transform.rotation)[2];
}

export function surfaceSlopePct(entity: SceneEntity): number {
  const vertical = Math.min(1, Math.abs(surfaceNormal(entity)[1]));
  if (vertical < 0.00001) return Number.POSITIVE_INFINITY;
  return Math.sqrt(Math.max(0, 1 - vertical * vertical)) / vertical * 100;
}

/** Select parallel layers crossed by one normal ray, rather than adding every object in the scene. */
export function layersOnNormalRay(entities: SceneEntity[], reference: SceneEntity): SceneEntity[] {
  const direction = surfaceNormal(reference);
  const origin = reference.transform.position;
  return entities.filter((entity) => {
    if (!entity.visible || !entity.coverage) return false;
    const [u, v, n] = surfaceAxes(entity.transform.rotation);
    if (Math.abs(dot(n, direction)) < 0.999) return false;
    const delta = origin.map((value, i) => value - entity.transform.position[i]) as V3;
    const localX = dot(delta, u), localY = dot(delta, v);
    return Math.abs(localX) <= entity.coverage.widthMm / 2 && Math.abs(localY) <= entity.coverage.heightMm / 2;
  });
}

export function layerIntervals(entities: SceneEntity[], reference: SceneEntity) {
  const n = surfaceNormal(reference);
  return entities.flatMap((entity) => {
    const product = PRODUCT_BY_ID.get(entity.productId);
    const variant = product?.variants.find((item) => item.id === entity.variantId);
    if (!product || !variant) return [];
    const center = dot(entity.transform.position, n);
    return [{ entity, product, variant, min: center - variant.depthMm / 2, max: center + variant.depthMm / 2 }];
  }).sort((a, b) => a.min - b.min);
}

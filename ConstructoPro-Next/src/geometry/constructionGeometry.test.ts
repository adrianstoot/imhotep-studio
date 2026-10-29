import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PRODUCT_BY_ID } from '../data/catalog';
import { createProject, entityFromProduct } from '../domain/projectFactory';
import { DETAIL_LABELS, type DetailType } from '../domain/types';
import { localToWorld, surfaceNormal } from '../domain/construction';
import { entityBoundsMm, entityLocalEnvelopeMm } from './sceneResolver';
import { computeCoverageLayout } from './layout';
import { buildEntityObject } from './proceduralGeometry';

vi.mock('./proceduralMaterials', async () => {
  const { MeshPhysicalMaterial } = await import('three');
  return { createPbrMaterial: () => new MeshPhysicalMaterial({ color: '#ffffff' }) };
});

describe('coherencia constructiva de ejemplos', () => {
  it('mantiene el aislamiento dentro de su espesor y evita perforar la membrana contigua', () => {
    const project = createProject(true);
    const entity = project.entities.find((entry) => PRODUCT_BY_ID.get(entry.productId)?.geometryKind === 'insulation')!;
    const product = PRODUCT_BY_ID.get(entity.productId)!;
    const layout = computeCoverageLayout(entity.coverage!, product.variants[0]);
    const object = buildEntityObject({ ...entity, transform: { position: [0, 0, 0], rotation: [0, 0, 0] } }, product, [], layout);
    const bounds = new THREE.Box3().setFromObject(object);
    expect(bounds.max.z).toBeLessThanOrEqual(product.variants[0].depthMm / 2000 + 0.000001);
    expect(bounds.min.z).toBeGreaterThanOrEqual(-product.variants[0].depthMm / 2000 - 0.000001);
  });
  it('crea sistemas correspondientes a los ocho tipos con fuentes y dimensiones resolubles', () => {
    (Object.keys(DETAIL_LABELS) as DetailType[]).forEach((type) => {
      const project = createProject(true, type);
      expect(project.title).toContain(DETAIL_LABELS[type]);
      expect(project.entities.length).toBeGreaterThan(3);
      expect(project.entities.every((entity) => PRODUCT_BY_ID.get(entity.productId)?.variants.some((v) => v.id === entity.variantId))).toBe(true);
      expect(project.entities.every((entity) => entityBoundsMm(entity))).toBe(true);
    });
  });

  it('mantiene contacto entre hoja, regularización, aislamiento y membrana de fachada', () => {
    const layers = createProject(true).entities.filter((entity) => /^0[1-4] ·/.test(entity.name));
    expect(layers).toHaveLength(4);
    for (let i = 1; i < layers.length; i += 1) {
      expect(entityBoundsMm(layers[i])!.minZ).toBeCloseTo(entityBoundsMm(layers[i - 1])!.maxZ, 6);
    }
    const project = createProject(true);
    const insulation = project.entities.find((entity) => entity.name.startsWith('03 ·'))!;
    const panel = project.entities.find((entity) => entity.name.startsWith('05 ·'))!;
    expect(entityBoundsMm(panel)!.minZ - entityBoundsMm(insulation)!.maxZ).toBeCloseTo(60.4, 6);
  });

  it('define faldón al 35 % y cubierta plana al 2 % con normal hacia arriba', () => {
    for (const [type, slope] of [['cubierta-inclinada', 0.35], ['cubierta-plana', 0.02]] as const) {
      const first = createProject(true, type).entities[0];
      const a = localToWorld([0, -1000, 0], first.transform);
      const b = localToWorld([0, 1000, 0], first.transform);
      expect((b[1] - a[1]) / -(b[2] - a[2])).toBeCloseTo(slope, 8);
      expect(surfaceNormal(first.transform.rotation)[1]).toBeGreaterThan(0.9);
    }
  });

  it('hace que la teja de la hilada superior pase sobre la inferior sin caras coplanares', () => {
    const entity = createProject(true, 'cubierta-inclinada').entities.find((item) => PRODUCT_BY_ID.get(item.productId)?.geometryKind === 'roof-tile')!;
    const product = PRODUCT_BY_ID.get(entity.productId)!;
    const variant = product.variants[0];
    const layout = computeCoverageLayout(entity.coverage!, variant);
    const object = buildEntityObject(entity, product, [], layout);
    let instances: THREE.InstancedMesh | undefined;
    object.traverse((child) => { if (!instances && child instanceof THREE.InstancedMesh) instances = child; });
    expect(instances).toBeDefined();
    const lowerIndex = layout.pieces.findIndex((piece) => piece.row === 0 && piece.column === 1 && !piece.cut);
    const upperIndex = layout.pieces.findIndex((piece) => piece.row === 1 && piece.column === 1 && !piece.cut);
    const lower = layout.pieces[lowerIndex];
    const upper = layout.pieces[upperIndex];
    const y = ((lower.yMm + lower.heightMm / 2) + (upper.yMm - upper.heightMm / 2)) / 2 * 0.001;
    const surfaceHeights = (index: number, x: number) => {
      const matrix = new THREE.Matrix4();
      instances!.getMatrixAt(index, matrix);
      const material = new THREE.MeshBasicMaterial({ side: THREE.DoubleSide });
      const mesh = new THREE.Mesh(instances!.geometry, material);
      mesh.applyMatrix4(matrix);
      mesh.updateMatrixWorld(true);
      const ray = new THREE.Raycaster(new THREE.Vector3(x, y, 10), new THREE.Vector3(0, 0, -1));
      return ray.intersectObject(mesh).map((hit) => hit.point.z);
    };
    [-0.16, 0, 0.16].forEach((fraction) => {
      const x = (lower.xMm + fraction * variant.widthMm) * 0.001;
      const lowerHeights = surfaceHeights(lowerIndex, x);
      const upperHeights = surfaceHeights(upperIndex, x);
      expect(lowerHeights.length).toBeGreaterThan(1);
      expect(upperHeights.length).toBeGreaterThan(1);
      expect(Math.min(...upperHeights) - Math.max(...lowerHeights)).toBeGreaterThan(0.001);
    });
  });

  it('usa Euler XYZ idéntico al render para límites con giros combinados', () => {
    const support = createProject(true, 'cubierta-inclinada').entities[0];
    const entity = { ...support, transform: { position: [50, 120, -40] as [number, number, number], rotation: [0.37, 0.26, -0.59] as [number, number, number] } };
    const local = entityLocalEnvelopeMm(entity)!;
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(local.maxX - local.minX, local.maxY - local.minY, local.maxZ - local.minZ));
    mesh.position.set(...entity.transform.position);
    mesh.rotation.set(...entity.transform.rotation);
    const expected = new THREE.Box3().setFromObject(mesh);
    const actual = entityBoundsMm(entity)!;
    expect(actual.minX).toBeCloseTo(expected.min.x, 7);
    expect(actual.maxY).toBeCloseTo(expected.max.y, 7);
    expect(actual.maxZ).toBeCloseTo(expected.max.z, 7);
  });

  it('representa pedestal en su eje vertical y canalón abierto por arriba', () => {
    const project = createProject(true, 'cubierta-plana');
    const pedestalEntity = project.entities.find((entity) => entity.name.startsWith('06 ·'))!;
    const pedestal = PRODUCT_BY_ID.get(pedestalEntity.productId)!;
    const object = buildEntityObject({ ...pedestalEntity, transform: { position: [0, 0, 0], rotation: [0, 0, 0] } }, pedestal, []);
    const bounds = new THREE.Box3().setFromObject(object);
    expect(bounds.max.y - bounds.min.y).toBeCloseTo(0.08, 6);
    const gutterEntity = project.entities.find((entity) => entity.name.startsWith('08 ·'))!;
    const gutter = PRODUCT_BY_ID.get(gutterEntity.productId)!;
    const trough = buildEntityObject(entityFromProduct(gutter, { position: [0, 0, 0], rotation: [0, 0, 0] }), gutter, []);
    const gutterBounds = new THREE.Box3().setFromObject(trough);
    expect(gutterBounds.max.z).toBeCloseTo(0, 6);
    expect(gutterBounds.min.z).toBeCloseTo(-0.333 / 2, 6);
  });
});

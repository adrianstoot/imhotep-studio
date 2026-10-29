import { describe, expect, it } from 'vitest';
import { Box3, BoxGeometry, Mesh, MeshBasicMaterial } from 'three';
import { PRODUCT_CATALOG } from '../data/catalog';
import { createProject, entityFromProduct } from '../domain/projectFactory';
import { clipSectionPolygon, intersectEntitySection, projectEntityElevation, resolveJambSection, resolveSection, type SectionPoint } from './sectionResolver';

const area = (polygon: SectionPoint[]) => Math.abs(polygon.reduce((sum, point, index) => {
  const next = polygon[(index + 1) % polygon.length];
  return sum + point.u * next.v - next.u * point.v;
}, 0)) / 2;

describe('dibujo técnico proporcional al modelo', () => {
  it('intersecta un faldón inclinado como polígono real, sin rellenar su caja global', () => {
    const product = PRODUCT_CATALOG.find((entry) => entry.geometryKind === 'solid' && entry.defaultCoverageMm)!;
    const entity = entityFromProduct(product, { position: [0, 1000, 0], rotation: [-Math.PI / 2 + Math.atan(.35), 0, 0] });
    entity.coverage = { ...entity.coverage!, widthMm: 4000, heightMm: 3400 };
    const polygon = intersectEntitySection(entity, 'x', 0);
    expect(polygon).toHaveLength(4);
    expect(area(polygon)).toBeCloseTo(3400 * product.variants[0].depthMm, 4);
    const boxArea = (Math.max(...polygon.map((p) => p.u)) - Math.min(...polygon.map((p) => p.u)))
      * (Math.max(...polygon.map((p) => p.v)) - Math.min(...polygon.map((p) => p.v)));
    expect(boxArea).toBeGreaterThan(area(polygon) * 2);
    const longEdge = polygon.map((point, index) => ({ from: point, to: polygon[(index + 1) % polygon.length] })).find(({ from, to }) => Math.hypot(to.u - from.u, to.v - from.v) > 3000)!;
    expect(Math.abs((longEdge.to.v - longEdge.from.v) / (longEdge.to.u - longEdge.from.u))).toBeCloseTo(.35, 6);
  });

  it('no produce una sección cuando el plano queda fuera del sólido', () => {
    const product = PRODUCT_CATALOG.find((entry) => entry.geometryKind === 'solid')!;
    const entity = entityFromProduct(product, { position: [0, 0, 0], rotation: [.3, .2, .1] });
    expect(intersectEntitySection(entity, 'x', 100_000)).toEqual([]);
  });

  it('usa la misma convención de rotación combinada XYZ que el renderizador Three.js', () => {
    const product = PRODUCT_CATALOG.find((entry) => entry.geometryKind === 'solid' && entry.defaultCoverageMm)!;
    const entity = entityFromProduct(product, { position: [500, 1200, 100], rotation: [.2, .3, .5] });
    entity.coverage = { ...entity.coverage!, widthMm: 2000, heightMm: 1000 };
    const mesh = new Mesh(new BoxGeometry(2000, 1000, product.variants[0].depthMm), new MeshBasicMaterial());
    mesh.position.set(...entity.transform.position); mesh.rotation.set(...entity.transform.rotation); mesh.updateMatrixWorld(true);
    const bounds = new Box3().setFromObject(mesh);
    const polygon = projectEntityElevation(entity);
    expect(Math.min(...polygon.map((point) => point.u))).toBeCloseTo(bounds.min.x, 5);
    expect(Math.max(...polygon.map((point) => point.v))).toBeCloseTo(bounds.max.y, 5);
    mesh.geometry.dispose(); (mesh.material as MeshBasicMaterial).dispose();
  });

  it('recorta las capas que atraviesan el hueco con la misma relación del documento', () => {
    const project = createProject(true);
    const window = project.entities.find((entry) => entry.opening)!;
    project.section.offsetMm = window.transform.position[0];
    const opening = window.opening!;
    const affected = new Set(opening.affectedEntities.filter((entry) => entry.behavior === 'cut-coverage').map((entry) => entry.entityId));
    const section = resolveSection(project);
    section.primitives.filter((primitive) => affected.has(primitive.entity.id)).forEach((primitive) => {
      const inVoid = clipSectionPolygon(clipSectionPolygon(primitive.polygon, 'v', window.transform.position[1] - opening.heightMm / 2 + .01, true), 'v', window.transform.position[1] + opening.heightMm / 2 - .01, false);
      expect(area(inVoid)).toBeLessThan(.01);
    });
  });

  it('conserva la proporción comercial de cada ventana en el alzado', () => {
    const windows = PRODUCT_CATALOG.filter((entry) => entry.geometryKind === 'window');
    [windows[0], windows[windows.length - 1]].forEach((product) => {
      const entity = entityFromProduct(product, { position: [250, 900, 300], rotation: [0, 0, 0] });
      const polygon = projectEntityElevation(entity);
      expect(Math.max(...polygon.map((p) => p.u)) - Math.min(...polygon.map((p) => p.u))).toBeCloseTo(product.variants[0].widthMm, 6);
      expect(Math.max(...polygon.map((p) => p.v)) - Math.min(...polygon.map((p) => p.v))).toBeCloseTo(product.variants[0].heightMm, 6);
    });
  });

  it('vincula la jamba al hueco elegido y detalla su montaje definido en el documento', () => {
    const project = createProject(true);
    const original = project.entities.find((entry) => entry.opening)!;
    const second = { ...original, id: 'second-opening', transform: { ...original.transform, position: [-900, 1650, 390] as [number, number, number] } };
    project.entities.push(second);
    const jamb = resolveJambSection(project, second.id);
    expect(jamb.openingEntity?.id).toBe(second.id);
    const windowParts = jamb.primitives.filter((primitive) => primitive.entity.id === second.id);
    expect(windowParts.every((primitive) => primitive.representation === 'commercial-volume')).toBe(true);
    for (const label of [/Premarco/, /Sellado exterior/, /Retorno aislante/, /Telar lateral/]) {
      expect(windowParts.some((primitive) => label.test(primitive.label))).toBe(true);
    }
    expect(windowParts.every((primitive) => primitive.x0 >= jamb.minX - .001 && primitive.x1 <= jamb.maxX + .001)).toBe(true);
  });
});

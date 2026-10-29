import { describe, expect, it, vi } from 'vitest';
import * as THREE from 'three';
import { PRODUCT_BY_ID } from '../data/catalog';
import { createProject } from '../domain/projectFactory';
import { openingCutouts } from '../domain/openingDimensions';
import type { SceneEntity } from '../domain/types';
import { resolveWindowAssembly, windowPartVertices, type WindowAssemblyPart } from '../domain/windowAssembly';
import { buildEntityObject } from './proceduralGeometry';
import { openingsForEntity, synchronizeOpeningRelations } from './sceneResolver';
import { clipSectionPolygon, resolveJambSection, resolveSection, type SectionPoint } from './sectionResolver';
import { windowPartGeometry } from './windowAssemblyMesh';

vi.mock('./proceduralMaterials', async () => {
  const { MeshPhysicalMaterial } = await import('three');
  return { createPbrMaterial: () => new MeshPhysicalMaterial({ color: '#ffffff' }) };
});

const assemblyExample = () => {
  const project = createProject(true);
  const window = project.entities.find((entity) => entity.opening?.installation)!;
  return { project, window, parts: resolveWindowAssembly(window) };
};
function bounds(part: WindowAssemblyPart) {
  return new THREE.Box3().setFromPoints(windowPartVertices(part).map((p) => new THREE.Vector3(...p)));
}
function positiveOverlap(a: THREE.Box3, b: THREE.Box3) {
  return ['x', 'y', 'z'].every((axis) => {
    const key = axis as 'x' | 'y' | 'z';
    return Math.min(a.max[key], b.max[key]) - Math.max(a.min[key], b.min[key]) > .001;
  });
}
const area = (points: SectionPoint[]) => Math.abs(points.reduce((sum, point, i) => {
  const next = points[(i + 1) % points.length];
  return sum + point.u * next.v - next.u * point.v;
}, 0)) / 2;

describe('montaje físico de ventana y sus cortes', () => {
  it('retira geometría real de ménsulas y tacos que invaden el hueco, incluso con el centro fuera', () => {
    const { project, window } = assemblyExample();
    const raw = openingCutouts(window)[0];
    for (const kind of ['bracket', 'fastener'] as const) {
      const original = project.entities.find((entity) => PRODUCT_BY_ID.get(entity.productId)?.geometryKind === kind)!;
      const product = PRODUCT_BY_ID.get(original.productId)!;
      const variant = product.variants[0];
      for (const x of [window.transform.position[0], window.transform.position[0] + raw.widthMm / 2 + variant.widthMm / 2 - 1]) {
        const entity: SceneEntity = { ...original, id: `invasive-${kind}`, transform: { position: [x, window.transform.position[1], 145.5], rotation: [0, 0, 0] } };
        const synchronized = synchronizeOpeningRelations({ ...project, entities: [...project.entities, entity] });
        const object = buildEntityObject(entity, product, openingsForEntity(entity, synchronized.entities));
        let triangles = 0;
        object.traverse((child) => { if (child instanceof THREE.Mesh) triangles += child.geometry.getAttribute('position').count / 3; });
        expect(triangles, `${kind} invade con centro X=${x}`).toBe(0);
      }
    }
  });

  it('mantiene libres las dos luces de vidrio, sin herrajes de fachada o remates delante', () => {
    const { parts } = assemblyExample();
    const panes = parts.filter((part) => part.role === 'glass' && bounds(part).min.z > 0);
    expect(panes).toHaveLength(2);
    panes.forEach((pane) => {
      const glass = bounds(pane);
      const protectedVision = new THREE.Box3(
        new THREE.Vector3(glass.min.x + 12, glass.min.y + 12, glass.max.z),
        new THREE.Vector3(glass.max.x - 12, glass.max.y - 12, 350),
      );
      parts.filter((part) => part.role !== 'glass').forEach((part) => {
        expect(positiveOverlap(bounds(part), protectedVision), `${part.label} tapa el centro del vidrio`).toBe(false);
      });
    });
  });

  it('corta los perfiles reales en el hueco bruto y deja libres nueve rayos por cada vidrio', () => {
    const { project, window, parts } = assemblyExample();
    const profiles = project.entities.filter((entity) => PRODUCT_BY_ID.get(entity.productId)?.geometryKind === 'profile');
    const objects = profiles.map((entity) => {
      const object = buildEntityObject(entity, PRODUCT_BY_ID.get(entity.productId)!, openingsForEntity(entity, project.entities));
      object.updateMatrixWorld(true);
      return object;
    });
    const glasses = parts.filter((part) => part.role === 'glass' && bounds(part).min.z > 0);
    glasses.forEach((part) => {
      const pane = bounds(part);
      for (const fx of [.15, .5, .85]) for (const fy of [.15, .5, .85]) {
        const x = pane.min.x + (pane.max.x - pane.min.x) * fx + window.transform.position[0];
        const y = pane.min.y + (pane.max.y - pane.min.y) * fy + window.transform.position[1];
        const originZ = window.transform.position[2] + window.opening!.installation!.facadeFaceOffsetMm + 1000;
        const ray = new THREE.Raycaster(new THREE.Vector3(x / 1000, y / 1000, originZ / 1000), new THREE.Vector3(0, 0, -1), 0, (originZ - window.transform.position[2] - pane.max.z) / 1000);
        expect(ray.intersectObjects(objects, true), `Perfil atraviesa luz en X=${x},Y=${y}`).toHaveLength(0);
      }
    });
  });

  it('transmite el marco a los tres calzos, al tubo inferior y a la fábrica, sin apoyar en lana', () => {
    const { project, window, parts } = assemblyExample();
    const frameBottom = Math.min(...parts.filter((part) => part.role === 'frame').map((part) => bounds(part).min.y));
    const preframeBottom = parts.filter((part) => part.role === 'preframe' && bounds(part).max.y < frameBottom);
    const tubeTop = Math.max(...preframeBottom.map((part) => bounds(part).max.y));
    const tubeBottom = Math.min(...preframeBottom.map((part) => bounds(part).min.y));
    const blocks = parts.filter((part) => part.role === 'setting-block');
    expect(blocks).toHaveLength(3);
    blocks.forEach((part) => {
      const block = bounds(part);
      expect(block.min.y).toBeCloseTo(tubeTop, 6);
      expect(block.max.y).toBeCloseTo(frameBottom, 6);
      expect(preframeBottom.some((tube) => {
        const support = bounds(tube);
        return Math.abs(support.max.y - block.min.y) < .001 && support.min.x <= block.min.x && support.max.x >= block.max.x;
      })).toBe(true);
    });
    project.section.offsetMm = window.transform.position[0];
    const masonry = resolveSection(project).primitives.filter((part) => part.kind === 'masonry' && part.y1 <= window.transform.position[1]);
    expect(Math.max(...masonry.map((part) => part.y1))).toBeCloseTo(tubeBottom + window.transform.position[1], 6);
    const loadPathDepth = bounds(blocks[1]);
    const leaf = project.entities.find((entity) => PRODUCT_BY_ID.get(entity.productId)?.geometryKind === 'masonry')!;
    const leafDepth = PRODUCT_BY_ID.get(leaf.productId)!.variants[0].depthMm;
    expect(loadPathDepth.min.z + window.transform.position[2]).toBeGreaterThanOrEqual(leaf.transform.position[2] - leafDepth / 2);
    expect(loadPathDepth.max.z + window.transform.position[2]).toBeLessThanOrEqual(leaf.transform.position[2] + leafDepth / 2);
  });

  it('reserva dos apoyos de 200 mm para el dintel y sustituye el ladrillo en su volumen', () => {
    const { project, window, parts } = assemblyExample();
    const lintel = bounds(parts.find((part) => part.role === 'lintel')!);
    const rough = openingCutouts(window)[0];
    expect(lintel.min.y).toBeCloseTo(rough.heightMm / 2, 6);
    expect(lintel.max.x - rough.widthMm / 2).toBeCloseTo(200, 6);
    expect(-rough.widthMm / 2 - lintel.min.x).toBeCloseTo(200, 6);
    // Section through the right bearing, outside the window void: brick must stop at the lintel soffit.
    project.section.offsetMm = window.transform.position[0] + rough.widthMm / 2 + 100;
    const masonry = resolveSection(project).primitives.filter((part) => part.kind === 'masonry');
    const bottom = lintel.min.y + window.transform.position[1], top = lintel.max.y + window.transform.position[1];
    masonry.forEach((part) => {
      const overlap = clipSectionPolygon(clipSectionPolygon(part.polygon, 'v', bottom + .01, true), 'v', top - .01, false);
      expect(area(overlap)).toBeLessThan(.01);
    });
    expect(masonry.some((part) => Math.abs(part.y1 - bottom) < .001)).toBe(true);
  });

  it('forma un vierteaguas con 10°, goterón separado ≥20 mm y entrega lateral ≥20 mm', () => {
    const { window, parts } = assemblyExample();
    const installation = window.opening!.installation!;
    const sill = parts.find((part) => part.role === 'sill')!;
    const edges = sill.profile.map((from, i) => ({ from, to: sill.profile[(i + 1) % sill.profile.length] }));
    const sloped = edges.find(({ from, to }) => to[1] - from[1] > 100 && to[0] < from[0])!;
    const angle = Math.atan2(sloped.from[0] - sloped.to[0], sloped.to[1] - sloped.from[1]) * 180 / Math.PI;
    expect(angle).toBeCloseTo(10, 6);
    const maxZ = Math.max(...sill.profile.map((p) => p[1]));
    const drip = sill.profile.filter(([y, z]) => z >= maxZ - 5 && y <= Math.min(...sill.profile.map((p) => p[0])) + 2);
    expect(Math.min(...drip.map((point) => point[1])) - installation.facadeFaceOffsetMm).toBeGreaterThanOrEqual(20);
    const roughW = openingCutouts(window)[0].widthMm / 2;
    const dams = parts.filter((part) => part.role === 'sill-end-dam').map(bounds);
    expect(dams).toHaveLength(2);
    expect(-roughW - Math.min(...dams.map((part) => part.min.x))).toBeGreaterThanOrEqual(20);
    expect(Math.max(...dams.map((part) => part.max.x)) - roughW).toBeGreaterThanOrEqual(20);
    const waterproofing = parts.filter((part) => part.role === 'sill-waterproofing');
    expect(waterproofing.some((part) => part.axis === 'x' && part.toMm - part.fromMm >= roughW * 2 + 40)).toBe(true);
    expect(waterproofing.filter((part) => part.toMm - part.fromMm < 2)).toHaveLength(2);
  });

  it('extruye todas las caras con volumen positivo y límites idénticos a los sólidos milimétricos', () => {
    const { parts } = assemblyExample();
    parts.forEach((part) => {
      const geometry = windowPartGeometry(part), vertices = geometry.getAttribute('position');
      const actual = geometry.boundingBox!, expected = bounds(part);
      for (const axis of ['x', 'y', 'z'] as const) {
        expect(actual.min[axis] * 1000, part.label).toBeCloseTo(expected.min[axis], 3);
        expect(actual.max[axis] * 1000, part.label).toBeCloseTo(expected.max[axis], 3);
      }
      let signedVolume = 0;
      const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
      for (let i = 0; i < vertices.count; i += 3) {
        a.fromBufferAttribute(vertices, i); b.fromBufferAttribute(vertices, i + 1); c.fromBufferAttribute(vertices, i + 2);
        signedVolume += a.dot(b.cross(c)) / 6;
      }
      expect(signedVolume, `${part.label}: caras invertidas o sólido degenerado`).toBeGreaterThan(0);
      geometry.dispose();
    });
  });

  it('arrastra todos los remates y apoyos al trasladar o girar la ventana', () => {
    const { window } = assemblyExample();
    const moved: SceneEntity = { ...window, transform: { position: [-450, 2300, -150], rotation: [.13, -.22, .31] } };
    const product = PRODUCT_BY_ID.get(moved.productId)!;
    const mesh = buildEntityObject(moved, product, []);
    const actual = new THREE.Box3().setFromObject(mesh, true);
    const matrix = new THREE.Matrix4().compose(new THREE.Vector3(...moved.transform.position).multiplyScalar(.001), new THREE.Quaternion().setFromEuler(new THREE.Euler(...moved.transform.rotation)), new THREE.Vector3(1, 1, 1));
    const expected = new THREE.Box3().setFromPoints(resolveWindowAssembly(moved).flatMap(windowPartVertices).map((p) => new THREE.Vector3(...p).multiplyScalar(.001).applyMatrix4(matrix)));
    for (const axis of ['x', 'y', 'z'] as const) {
      expect(actual.min[axis]).toBeCloseTo(expected.min[axis], 5);
      expect(actual.max[axis]).toBeCloseTo(expected.max[axis], 5);
    }
  });

  it('incluye piezas de carga, fijación y estanqueidad en los cortes vinculados al mismo montaje', () => {
    const { project, window } = assemblyExample();
    project.section.offsetMm = window.transform.position[0];
    const vertical = resolveSection(project).primitives.filter((part) => part.entity.id === window.id);
    const jamb = resolveJambSection(project, window.id).primitives.filter((part) => part.entity.id === window.id);
    for (const label of [/Dintel portante/, /Calzo portante de instalación/, /Premarco galvanizado/, /^Vierteaguas/, /Bandeja impermeable/]) {
      expect(vertical.some((part) => label.test(part.label)), `Falta ${label} en sección de ventana`).toBe(true);
    }
    for (const label of [/Premarco galvanizado/, /Anclaje premarco/, /Tornillo marco/, /Sellado interior/, /Sellado exterior/, /Retorno aislante/, /Telar lateral/]) {
      expect(jamb.some((part) => label.test(part.label)), `Falta ${label} en jamba`).toBe(true);
    }
    expect([...vertical, ...jamb].every((part) => part.representation === 'commercial-volume')).toBe(true);
  });
});

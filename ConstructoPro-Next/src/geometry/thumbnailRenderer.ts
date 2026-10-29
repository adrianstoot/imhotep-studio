import * as THREE from 'three';
import type { CoverageSpec, ProductDefinition, SceneEntity } from '../domain/types';
import { computeCoverageLayout } from './layout';
import { buildEntityObject } from './proceduralGeometry';
import { disposeObjectResources } from './proceduralMaterials';

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();
let queue = Promise.resolve();
let renderer: THREE.WebGLRenderer | null = null;

function coverageFor(product: ProductDefinition): CoverageSpec | undefined {
  if (product.placementKind !== 'coverage') return undefined;
  const variant = product.variants[0];
  const joint = product.jointMm ?? 0;
  const columns = product.geometryKind === 'masonry' ? 3 : product.geometryKind === 'roof-tile' ? 4 : 2;
  const rows = product.geometryKind === 'masonry' ? 4 : product.geometryKind === 'roof-tile' ? 3 : 2;
  return {
    widthMm: variant.widthMm * columns + joint * Math.max(0, columns - 1),
    heightMm: Math.max(variant.heightMm * rows + joint * Math.max(0, rows - 1), variant.heightMm),
    jointMm: joint,
    bedJointMm: joint,
    headJointMm: joint,
    mortarRecessMm: product.geometryKind === 'masonry' ? 3 : 0,
    stagger: product.stagger ?? false,
    overlapMm: product.overlapMm ?? 0,
    sideOverlapMm: product.sideOverlapMm ?? 0,
    pieceExceptions: [],
  };
}

function previewEntity(product: ProductDefinition): SceneEntity {
  const variant = product.variants[0];
  return {
    id: `preview-${product.id}`,
    productId: product.id,
    variantId: variant.id,
    name: product.name,
    transform: { position: [0, 0, 0], rotation: [0, 0, 0] },
    cutLengthMm: product.placementKind === 'linear'
      ? Math.min(1200, variant.stockLengthMm ?? variant.heightMm)
      : undefined,
    coverage: coverageFor(product),
    visible: true,
    locked: true,
  };
}

function getRenderer(): THREE.WebGLRenderer {
  if (renderer) return renderer;
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: true, powerPreference: 'low-power' });
  renderer.setSize(320, 220, false);
  renderer.setPixelRatio(1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.08;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  return renderer;
}

function renderNow(product: ProductDefinition): string {
  const currentRenderer = getRenderer();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f7f8fa');
  const camera = new THREE.PerspectiveCamera(34, 320 / 220, 0.01, 50);
  const entity = previewEntity(product);
  const variant = product.variants[0];
  const layout = entity.coverage ? computeCoverageLayout(entity.coverage, variant) : undefined;
  const object = buildEntityObject(entity, product, [], layout);
  object.rotation.x = product.geometryKind === 'roof-tile' || product.geometryKind === 'paver' ? -0.58 : -0.08;
  object.rotation.y = product.geometryKind === 'profile' ? 0.58 : -0.48;
  object.rotation.z = product.geometryKind === 'profile' ? -0.28 : 0;
  scene.add(object);

  const bounds = new THREE.Box3().setFromObject(object);
  const center = bounds.getCenter(new THREE.Vector3());
  const size = bounds.getSize(new THREE.Vector3());
  object.position.sub(center);
  const radius = Math.max(size.x, size.y, size.z, 0.1);
  camera.position.set(radius * 1.45, radius * 1.05, radius * 1.75);
  camera.lookAt(0, 0, 0);

  scene.add(new THREE.HemisphereLight('#ffffff', '#ccd2da', 2.15));
  const key = new THREE.DirectionalLight('#fff7ec', 4.2);
  key.position.set(3, 5, 4);
  key.castShadow = true;
  scene.add(key);
  const rim = new THREE.DirectionalLight('#bad5ff', 2.1);
  rim.position.set(-4, 2, -3);
  scene.add(rim);

  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(radius * 7, radius * 7),
    new THREE.ShadowMaterial({ color: '#647084', opacity: 0.16 }),
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -size.y / 2 - radius * 0.08;
  floor.receiveShadow = true;
  scene.add(floor);

  currentRenderer.render(scene, camera);
  const dataUrl = currentRenderer.domElement.toDataURL('image/webp', 0.88);
  disposeObjectResources(object);
  floor.geometry.dispose();
  (floor.material as THREE.Material).dispose();
  cache.set(product.id, dataUrl);
  return dataUrl;
}

export function requestProductThumbnail(product: ProductDefinition): Promise<string> {
  const cached = cache.get(product.id);
  if (cached) return Promise.resolve(cached);
  const active = pending.get(product.id);
  if (active) return active;
  const task = queue.then(() => renderNow(product));
  queue = task.then(() => undefined, () => undefined);
  pending.set(product.id, task);
  task.finally(() => pending.delete(product.id));
  return task;
}

import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import {
  BoxSelect,
  Camera,
  Copy,
  Crosshair,
  Focus,
  Grid3X3,
  Maximize,
  MousePointer2,
  Move3D,
  Orbit,
  Rotate3D,
  RotateCcw,
  RefreshCw,
  Ruler,
  Scissors,
  Trash2,
} from 'lucide-react';
import { PRODUCT_BY_ID } from '../data/catalog';
import type { Measurement } from '../domain/types';
import { useEditor } from '../state/EditorStore';
import type { CoverageLayout } from './layout';
import { requestCoverageLayout } from './layoutClient';
import { buildEntityObject, buildGhost } from './proceduralGeometry';
import { disposeObjectResources } from './proceduralMaterials';
import { entityBoundsMm, openingsForEntity } from './sceneResolver';
import { attachmentFrame, placementSurface } from '../domain/construction';

const MM = 0.001;

function isHorizontalDetail(detailType: string): boolean {
  return ['cubierta-plana', 'cubierta-inclinada', 'terraza', 'pavimento'].includes(detailType);
}

interface CameraCommands {
  reset: () => void;
  front: () => void;
  side: () => void;
  iso: () => void;
  fit: () => void;
  toggleProjection: () => void;
}

interface ViewStats {
  fps: number;
  drawCalls: number;
  triangles: number;
  instances: number;
}

function measurementDistance(measurement: Measurement | null): string | null {
  if (!measurement?.b) return null;
  const dx = measurement.b[0] - measurement.a[0];
  const dy = measurement.b[1] - measurement.a[1];
  const dz = measurement.b[2] - measurement.a[2];
  const mm = Math.sqrt(dx * dx + dy * dy + dz * dz);
  return mm >= 1000 ? `${(mm / 1000).toFixed(3)} m` : `${mm.toFixed(1)} mm`;
}

function ToolButton({ active = false, title, onClick, disabled = false, children }: {
  active?: boolean;
  title: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return <button className={`viewport-tool ${active ? 'is-active' : ''}`} title={title} aria-label={title} onClick={onClick} disabled={disabled}>{children}</button>;
}

export function ThreeViewport() {
  const { project, ui, actions, past, future } = useEditor();
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const perspectiveRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orthographicRef = useRef<THREE.OrthographicCamera | null>(null);
  const activeCameraRef = useRef<THREE.Camera | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const transformHelperRef = useRef<THREE.Object3D | null>(null);
  const contentRef = useRef(new THREE.Group());
  const objectMapRef = useRef(new Map<string, THREE.Object3D>());
  const highlightRef = useRef(new THREE.Group());
  const measurementRef = useRef(new THREE.Group());
  const ghostRef = useRef<THREE.Object3D | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const actionRef = useRef(actions);
  const uiRef = useRef(ui);
  const entitiesRef = useRef(project.entities);
  const projectRef = useRef(project);
  const detailTypeRef = useRef(project.detailType);
  const cameraCommandsRef = useRef<CameraCommands | null>(null);
  const buildGeneration = useRef(0);
  const [projection, setProjection] = useState<'perspective' | 'orthographic'>('perspective');
  const [building, setBuilding] = useState(false);
  const [stats, setStats] = useState<ViewStats>({ fps: 0, drawCalls: 0, triangles: 0, instances: 0 });
  const [webglError, setWebglError] = useState<string | null>(null);
  const distance = useMemo(() => measurementDistance(ui.measurement), [ui.measurement]);
  const isolationKey = ui.isolation ? ui.selectedIds.join('|') : '';

  useEffect(() => { actionRef.current = actions; }, [actions]);
  useEffect(() => { uiRef.current = ui; }, [ui]);
  useEffect(() => { entitiesRef.current = project.entities; }, [project.entities]);
  useEffect(() => { projectRef.current = project; }, [project]);
  useEffect(() => { detailTypeRef.current = project.detailType; }, [project.detailType]);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance', preserveDrawingBuffer: true });
    } catch {
      setWebglError('No se ha podido iniciar WebGL. Activa la aceleración gráfica del navegador.');
      return;
    }
    rendererRef.current = renderer;
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    // Neutral tone mapping preserves manufacturer colours and still retains
    // highlight detail on anodised aluminium and glass edges.
    renderer.toneMapping = THREE.NeutralToneMapping;
    renderer.toneMappingExposure = 0.94;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFShadowMap;
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#f2f3f1');
    sceneRef.current = scene;

    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentTarget = pmrem.fromScene(new RoomEnvironment(), 0.04);
    scene.environment = environmentTarget.texture;
    scene.environmentIntensity = 0.65;
    pmrem.dispose();

    const perspective = new THREE.PerspectiveCamera(42, 1, 0.01, 100);
    perspective.position.set(...project.camera.position.map((value) => value * MM) as [number, number, number]);
    perspectiveRef.current = perspective;
    const orthographic = new THREE.OrthographicCamera(-5, 5, 4, -4, -50, 100);
    orthographic.position.copy(perspective.position);
    orthographic.zoom = 1;
    orthographicRef.current = orthographic;
    activeCameraRef.current = perspective;

    const target = new THREE.Vector3(...project.camera.target.map((value) => value * MM) as [number, number, number]);
    const makeOrbit = (camera: THREE.Camera) => {
      orbitRef.current?.dispose();
      const orbit = new OrbitControls(camera, renderer.domElement);
      orbit.enableDamping = true;
      orbit.dampingFactor = 0.075;
      orbit.target.copy(target);
      orbit.minDistance = 0.5;
      orbit.maxDistance = 35;
      orbit.maxPolarAngle = Math.PI * 0.96;
      orbit.screenSpacePanning = true;
      orbit.update();
      orbitRef.current = orbit;
      return orbit;
    };
    makeOrbit(perspective);

    const transform = new TransformControls(perspective, renderer.domElement);
    const transformHelper = transform.getHelper();
    scene.add(transformHelper);
    transformRef.current = transform;
    transformHelperRef.current = transformHelper;
    transform.addEventListener('dragging-changed', (event) => {
      if (orbitRef.current) orbitRef.current.enabled = !event.value;
      if (event.value || !transform.object) return;
      const object = transform.object;
      const entityId = object.userData.entityId as string | undefined;
      const entity = entitiesRef.current.find((entry) => entry.id === entityId);
      if (!entityId || !entity) return;
      actionRef.current.updateTransform(entityId, {
        position: [object.position.x / MM, object.position.y / MM, object.position.z / MM],
        rotation: [object.rotation.x, object.rotation.y, object.rotation.z],
      });
    });

    scene.add(contentRef.current, highlightRef.current, measurementRef.current);

    // This is a reference grid, independent of the active placement plane.
    // A dense grid on the exterior attachment plane drew across the exposed
    // cutaway layers even though their own depth testing was correct.
    const grid = new THREE.GridHelper(12, 24, '#99a4a1', '#c3cbc7');
    grid.rotation.x = Math.PI / 2;
    grid.position.z = -0.42;
    (grid.material as THREE.Material).transparent = true;
    (grid.material as THREE.Material).opacity = 0.22;
    (grid.material as THREE.Material).depthWrite = false;
    (grid.material as THREE.Material).depthTest = true;
    gridRef.current = grid;
    scene.add(grid);

    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(30, 30),
      new THREE.ShadowMaterial({ color: '#526178', opacity: 0.11 }),
    );
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.34;
    floor.receiveShadow = true;
    scene.add(floor);

    scene.add(new THREE.HemisphereLight('#ffffff', '#aeb8c5', 0.75));
    const key = new THREE.DirectionalLight('#fffdfa', 2.1);
    key.position.set(5.5, 8.5, 7.5);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.left = -8;
    key.shadow.camera.right = 8;
    key.shadow.camera.top = 8;
    key.shadow.camera.bottom = -8;
    key.shadow.bias = -0.00008;
    key.shadow.normalBias = 0.012;
    key.shadow.radius = 3;
    scene.add(key);
    const fill = new THREE.DirectionalLight('#e8eff8', 0.55);
    fill.position.set(-6, 3, 5);
    scene.add(fill);
    const rim = new THREE.DirectionalLight('#fff6ec', 0.35);
    rim.position.set(4, 5, -6);
    scene.add(rim);

    const resize = () => {
      const width = Math.max(1, mount.clientWidth);
      const height = Math.max(1, mount.clientHeight);
      renderer.setSize(width, height, false);
      perspective.aspect = width / height;
      perspective.updateProjectionMatrix();
      const viewHeight = 7.6;
      orthographic.left = -viewHeight * width / height / 2;
      orthographic.right = viewHeight * width / height / 2;
      orthographic.top = viewHeight / 2;
      orthographic.bottom = -viewHeight / 2;
      orthographic.updateProjectionMatrix();
    };
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(mount);
    resize();

    const moveCamera = (position: [number, number, number], nextTarget: [number, number, number] = [0, 1.55, 0]) => {
      const camera = activeCameraRef.current;
      const orbit = orbitRef.current;
      if (!camera || !orbit) return;
      camera.position.set(...position);
      orbit.target.set(...nextTarget);
      orbit.update();
    };
    const fit = () => {
      const selected = uiRef.current.selectedIds.map((id) => objectMapRef.current.get(id)).filter(Boolean) as THREE.Object3D[];
      const source = selected.length ? selected : [...objectMapRef.current.values()];
      if (!source.length) return;
      const bounds = new THREE.Box3();
      source.forEach((object) => bounds.expandByObject(object));
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3());
      const radius = Math.max(size.length(), 1);
      moveCamera([center.x + radius * 0.75, center.y + radius * 0.45, center.z + radius * 0.9], [center.x, center.y, center.z]);
    };
    const toggleProjection = () => {
      const from = activeCameraRef.current;
      if (!from) return;
      const nextProjection = from === perspective ? 'orthographic' : 'perspective';
      const next = nextProjection === 'perspective' ? perspective : orthographic;
      next.position.copy(from.position);
      next.quaternion.copy(from.quaternion);
      activeCameraRef.current = next;
      const orbit = makeOrbit(next);
      orbit.target.copy(target);
      transform.camera = next;
      transform.detach();
      setProjection(nextProjection);
    };
    cameraCommandsRef.current = {
      reset: () => moveCamera(projectRef.current.camera.position.map((v) => v * MM) as [number, number, number], projectRef.current.camera.target.map((v) => v * MM) as [number, number, number]),
      front: () => {
        const center = projectRef.current.camera.target.map((v) => v * MM) as [number, number, number];
        const surface = placementSurface(projectRef.current);
        moveCamera(center.map((v, i) => v + surface.normal[i] * 9.5) as [number, number, number], center);
      },
      side: () => {
        const center = projectRef.current.camera.target.map((v) => v * MM) as [number, number, number];
        moveCamera([center[0] + 9.5, center[1], center[2]], center);
      },
      iso: () => moveCamera(projectRef.current.camera.position.map((v) => v * MM) as [number, number, number], projectRef.current.camera.target.map((v) => v * MM) as [number, number, number]),
      fit,
      toggleProjection,
    };

    const raycaster = new THREE.Raycaster();
    const pointer = new THREE.Vector2();
    const workPlane = new THREE.Plane();
    const activeWorkPlane = () => {
      const pending = uiRef.current.pendingProductId ? PRODUCT_BY_ID.get(uiRef.current.pendingProductId) : undefined;
      const surface = pending ? attachmentFrame(projectRef.current, pending) : placementSurface(projectRef.current);
      return workPlane.setFromNormalAndCoplanarPoint(new THREE.Vector3(...surface.normal), new THREE.Vector3(...surface.origin.map((v) => v * MM) as [number, number, number]));
    };
    const planeHit = new THREE.Vector3();
    const updatePointer = (event: PointerEvent) => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.set(((event.clientX - rect.left) / rect.width) * 2 - 1, -((event.clientY - rect.top) / rect.height) * 2 + 1);
      raycaster.setFromCamera(pointer, activeCameraRef.current!);
    };
    const onPointerMove = (event: PointerEvent) => {
      updatePointer(event);
      if (!ghostRef.current) return;
      if (raycaster.ray.intersectPlane(activeWorkPlane(), planeHit)) {
        ghostRef.current.position.copy(planeHit);
        if (uiRef.current.snapping) {
          ghostRef.current.position.x = Math.round(ghostRef.current.position.x / 0.05) * 0.05;
          if (isHorizontalDetail(detailTypeRef.current)) ghostRef.current.position.z = Math.round(ghostRef.current.position.z / 0.05) * 0.05;
          else ghostRef.current.position.y = Math.round(ghostRef.current.position.y / 0.05) * 0.05;
        }
        activeWorkPlane().projectPoint(ghostRef.current.position, ghostRef.current.position);
      }
    };
    const onPointerDown = (event: PointerEvent) => {
      if (event.button !== 0 || transform.dragging || transform.axis) return;
      updatePointer(event);
      const currentUi = uiRef.current;
      if (currentUi.pendingProductId && raycaster.ray.intersectPlane(activeWorkPlane(), planeHit)) {
        actionRef.current.placePending([planeHit.x / MM, planeHit.y / MM, planeHit.z / MM]);
        return;
      }
      if (currentUi.measuring && raycaster.ray.intersectPlane(activeWorkPlane(), planeHit)) {
        const point: [number, number, number] = [planeHit.x / MM, planeHit.y / MM, planeHit.z / MM];
        if (!currentUi.measurement || currentUi.measurement.b) actionRef.current.setUi({ measurement: { a: point } });
        else actionRef.current.setUi({ measurement: { ...currentUi.measurement, b: point } });
        return;
      }
      const hits = raycaster.intersectObjects(contentRef.current.children, true);
      const hit = hits.find((entry) => entry.object.userData.entityId);
      if (!hit) {
        actionRef.current.select(null);
        return;
      }
      const entityId = hit.object.userData.entityId as string;
      if (currentUi.pieceMode && hit.object instanceof THREE.InstancedMesh && hit.instanceId !== undefined) {
        const pieceKey = (hit.object.userData.pieceKeys as string[] | undefined)?.[hit.instanceId];
        if (pieceKey) actionRef.current.togglePiece(entityId, pieceKey);
        return;
      }
      actionRef.current.select(entityId, event.shiftKey || event.ctrlKey);
    };
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerdown', onPointerDown);

    let previous = performance.now();
    let frames = 0;
    let lastStats = previous;
    const render = () => {
      // Use one clock for setup and sampling. Some headless/integrated-GPU
      // drivers expose a rAF timestamp on a different timeline, which could
      // otherwise round a healthy renderer down to a misleading 0 FPS.
      const now = performance.now();
      const orbit = orbitRef.current;
      if (orbit) {
        orbit.autoRotate = uiRef.current.autoRotate;
        orbit.autoRotateSpeed = 0.65;
        orbit.update(Math.min((now - previous) / 1000, 0.1));
      }
      previous = now;
      renderer.render(scene, activeCameraRef.current!);
      frames += 1;
      if (now - lastStats > 600) {
        const elapsed = now - lastStats;
        const measuredFps = Math.round(frames * 1000 / elapsed);
        setStats((current) => ({
          ...current,
          fps: measuredFps,
          drawCalls: renderer.info.render.calls,
          triangles: renderer.info.render.triangles,
        }));
        frames = 0;
        lastStats = now;
      }
    };
    renderer.setAnimationLoop(render);

    return () => {
      renderer.setAnimationLoop(null);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      orbitRef.current?.dispose();
      transform.dispose();
      disposeObjectResources(contentRef.current);
      environmentTarget.dispose();
      renderer.dispose();
      renderer.domElement.remove();
      sceneRef.current = null;
      rendererRef.current = null;
    };
  // The Three.js runtime is intentionally created once. React data enters through refs/effects below.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const renderer = rendererRef.current;
    if (!renderer) return;
    const ratio = ui.quality === 'performance' ? 1 : ui.quality === 'high' ? Math.min(window.devicePixelRatio, 2.25) : Math.min(window.devicePixelRatio, 1.75);
    renderer.setPixelRatio(ratio);
    renderer.shadowMap.enabled = ui.quality !== 'performance';
  }, [ui.quality]);

  useEffect(() => {
    const perspective = perspectiveRef.current;
    const orthographic = orthographicRef.current;
    const orbit = orbitRef.current;
    if (!perspective || !orthographic || !orbit) return;
    const position = project.camera.position.map((value) => value * MM) as [number, number, number];
    const target = project.camera.target.map((value) => value * MM) as [number, number, number];
    perspective.position.set(...position);
    orthographic.position.set(...position);
    orbit.target.set(...target);
    orbit.update();
  }, [project.camera]);

  useEffect(() => {
    if (gridRef.current) gridRef.current.visible = ui.gridVisible;
  }, [ui.gridVisible]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    const generation = ++buildGeneration.current;
    setBuilding(true);
    const entities = project.entities.filter((entity) => entity.visible && (!ui.isolation || ui.selectedIds.includes(entity.id)));

    Promise.all(entities.map(async (entity) => {
      const product = PRODUCT_BY_ID.get(entity.productId);
      if (!product) return null;
      const variant = product.variants.find((entry) => entry.id === entity.variantId) ?? product.variants[0];
      const openings = openingsForEntity(entity, project.entities);
      let layout: CoverageLayout | undefined;
      const repeated = ['masonry', 'insulation', 'membrane', 'cladding', 'board', 'paver', 'roof-tile'].includes(product.geometryKind);
      if (entity.coverage && repeated) layout = await requestCoverageLayout(entity.coverage, variant, openings);
      return { entity, object: buildEntityObject(entity, product, openings, layout), instances: (layout?.pieces.length ?? 1) + (layout?.joints.length ?? 0) };
    })).then((built) => {
      if (generation !== buildGeneration.current || !sceneRef.current) {
        built.forEach((entry) => entry && disposeObjectResources(entry.object));
        return;
      }
      const nextContent = new THREE.Group();
      const nextMap = new Map<string, THREE.Object3D>();
      let instances = 0;
      built.forEach((entry) => {
        if (!entry) return;
        nextContent.add(entry.object);
        nextMap.set(entry.entity.id, entry.object);
        instances += entry.instances;
      });
      scene.remove(contentRef.current);
      disposeObjectResources(contentRef.current);
      contentRef.current = nextContent;
      objectMapRef.current = nextMap;
      scene.add(nextContent);
      setStats((current) => ({ ...current, instances }));
      setBuilding(false);
    }).catch((error: unknown) => {
      console.error(error);
      setBuilding(false);
      setWebglError(error instanceof Error ? error.message : 'Error al generar la geometría.');
    });
  }, [project.entities, ui.isolation, isolationKey]);

  useEffect(() => {
    const scene = sceneRef.current;
    const transform = transformRef.current;
    if (!scene || !transform) return;
    highlightRef.current.clear();
    transform.detach();
    ui.selectedIds.forEach((id) => {
      const object = objectMapRef.current.get(id);
      if (!object) return;
      const helper = new THREE.BoxHelper(object, '#4de6ff');
      helper.material.depthTest = false;
      helper.renderOrder = 100;
      highlightRef.current.add(helper);
    });
    if (ui.selectedIds.length === 1) {
      const entity = project.entities.find((entry) => entry.id === ui.selectedIds[0]);
      const object = objectMapRef.current.get(ui.selectedIds[0]);
      if (object && entity && !entity.locked) transform.attach(object);
    }
  }, [project.entities, ui.selectedIds, isolationKey, building]);

  useEffect(() => {
    const transform = transformRef.current;
    if (!transform) return;
    transform.setMode(ui.transformMode);
    transform.setSpace(ui.coordinateSpace);
    transform.setTranslationSnap(ui.snapping ? 0.05 : null);
    transform.setRotationSnap(ui.snapping ? THREE.MathUtils.degToRad(5) : null);
  }, [ui.coordinateSpace, ui.snapping, ui.transformMode]);

  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;
    if (ghostRef.current) {
      scene.remove(ghostRef.current);
      disposeObjectResources(ghostRef.current);
      ghostRef.current = null;
    }
    if (!ui.pendingProductId) return;
    const product = PRODUCT_BY_ID.get(ui.pendingProductId);
    if (!product) return;
    const ghost = buildGhost(product);
    const surface = attachmentFrame(project, product);
    ghost.rotation.set(...surface.rotation);
    ghost.position.set(...surface.origin.map((value) => value * MM) as [number, number, number]);
    ghost.renderOrder = 90;
    ghostRef.current = ghost;
    scene.add(ghost);
    return () => {
      if (ghostRef.current === ghost) {
        scene.remove(ghost);
        disposeObjectResources(ghost);
        ghostRef.current = null;
      }
    };
  }, [project.detailType, project.entities, ui.pendingProductId]);

  useEffect(() => {
    const grid = gridRef.current;
    if (!grid) return;
    const surface = placementSurface(project);
    const normal = new THREE.Vector3(...surface.normal).normalize();
    const bounds = project.entities.filter((entity) => entity.visible).flatMap((entity) => entityBoundsMm(entity) ?? []);
    let minimumDepth = Number.POSITIVE_INFINITY;
    bounds.forEach((box) => {
      for (const x of [box.minX, box.maxX]) for (const y of [box.minY, box.maxY]) for (const z of [box.minZ, box.maxZ]) {
        minimumDepth = Math.min(minimumDepth, x * normal.x + y * normal.y + z * normal.z);
      }
    });
    const origin = new THREE.Vector3(...surface.origin);
    const backgroundDepth = Number.isFinite(minimumDepth) ? minimumDepth - 150 : origin.dot(normal) - 150;
    origin.addScaledVector(normal, backgroundDepth - origin.dot(normal));
    grid.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);
    grid.position.copy(origin.multiplyScalar(MM));
  }, [project.detailType, project.entities]);

  useEffect(() => {
    measurementRef.current.clear();
    const measurement = ui.measurement;
    if (!measurement) return;
    const points = [measurement.a, measurement.b ?? measurement.a].map((point) => new THREE.Vector3(point[0] * MM, point[1] * MM, point[2] * MM + 0.018));
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    measurementRef.current.add(new THREE.Line(geometry, new THREE.LineBasicMaterial({ color: '#ffb657', depthTest: false })));
    points.forEach((point) => {
      const marker = new THREE.Mesh(new THREE.SphereGeometry(0.018, 16, 10), new THREE.MeshBasicMaterial({ color: '#ffb657', depthTest: false }));
      marker.position.copy(point);
      measurementRef.current.add(marker);
    });
  }, [ui.measurement]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const editing = event.target instanceof HTMLElement && event.target.matches('input, textarea, select, [contenteditable="true"]');
      if (editing && event.key !== 'Escape') return;
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) actions.redo(); else actions.undo();
      } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'd') {
        event.preventDefault();
        actions.duplicateSelected();
      } else if (event.key === 'Delete' || event.key === 'Backspace') {
        const target = event.target as HTMLElement | null;
        if (target?.matches('input, textarea, [contenteditable="true"]')) return;
        actions.deleteSelected();
      } else if (event.key === 'Escape') {
        actions.setUi({ pendingProductId: null, measuring: false, pieceMode: false });
      } else if (event.key.toLowerCase() === 'w') actions.setUi({ transformMode: 'translate' });
      else if (event.key.toLowerCase() === 'e') actions.setUi({ transformMode: 'rotate' });
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [actions]);

  const selectedCount = ui.selectedIds.length;
  return (
    <section className={`viewport-shell ${ui.pendingProductId ? 'is-placing' : ''}`} aria-label="Editor tridimensional">
      <div ref={mountRef} className="viewport-canvas" />

      <div className="viewport-toolbar viewport-toolbar--left">
        <div className="tool-group">
          <ToolButton active={!ui.measuring && !ui.pieceMode} title="Seleccionar (Esc)" onClick={() => actions.setUi({ measuring: false, pieceMode: false, pendingProductId: null })}><MousePointer2 size={16} /></ToolButton>
          <ToolButton active={ui.transformMode === 'translate'} title="Mover (W)" onClick={() => actions.setUi({ transformMode: 'translate', measuring: false })}><Move3D size={16} /></ToolButton>
          <ToolButton active={ui.transformMode === 'rotate'} title="Rotar (E)" onClick={() => actions.setUi({ transformMode: 'rotate', measuring: false })}><Rotate3D size={16} /></ToolButton>
          <ToolButton active={ui.measuring} title="Medir" onClick={() => actions.setUi({ measuring: !ui.measuring, pieceMode: false, measurement: ui.measuring ? null : ui.measurement })}><Ruler size={16} /></ToolButton>
          <ToolButton active={ui.pieceMode} title="Editar piezas del patrón" onClick={() => actions.setUi({ pieceMode: !ui.pieceMode, measuring: false })}><Scissors size={16} /></ToolButton>
        </div>
        <div className="tool-group">
          <ToolButton title="Duplicar (Ctrl+D)" disabled={!selectedCount} onClick={actions.duplicateSelected}><Copy size={16} /></ToolButton>
          <ToolButton title="Eliminar (Supr)" disabled={!selectedCount} onClick={actions.deleteSelected}><Trash2 size={16} /></ToolButton>
          <ToolButton active={ui.isolation} title="Aislar selección" disabled={!selectedCount} onClick={() => actions.setUi({ isolation: !ui.isolation })}><Focus size={16} /></ToolButton>
        </div>
        <div className="tool-group">
          <ToolButton active={ui.snapping} title="Snapping 50 mm / 5°" onClick={() => actions.setUi({ snapping: !ui.snapping })}><Crosshair size={16} /></ToolButton>
          <ToolButton active={ui.gridVisible} title="Cuadrícula" onClick={() => actions.setUi({ gridVisible: !ui.gridVisible })}><Grid3X3 size={16} /></ToolButton>
          <button className="space-toggle" onClick={() => actions.setUi({ coordinateSpace: ui.coordinateSpace === 'world' ? 'local' : 'world' })}>{ui.coordinateSpace === 'world' ? 'GLOBAL' : 'LOCAL'}</button>
        </div>
      </div>

      <div className="viewport-toolbar viewport-toolbar--camera">
        <ToolButton title="Vista frontal" onClick={() => cameraCommandsRef.current?.front()}><BoxSelect size={16} /></ToolButton>
        <ToolButton title="Vista lateral" onClick={() => cameraCommandsRef.current?.side()}><Camera size={16} /></ToolButton>
        <ToolButton title="Vista isométrica" onClick={() => cameraCommandsRef.current?.iso()}><Orbit size={16} /></ToolButton>
        <ToolButton title="Restablecer cámara" onClick={() => cameraCommandsRef.current?.reset()}><RotateCcw size={16} /></ToolButton>
        <ToolButton active={ui.autoRotate} title="Rotación automática" onClick={() => actions.setUi({ autoRotate: !ui.autoRotate })}><RefreshCw size={16} /></ToolButton>
        <ToolButton title="Encajar escena o selección" onClick={() => cameraCommandsRef.current?.fit()}><Maximize size={16} /></ToolButton>
        <button className="projection-toggle" onClick={() => cameraCommandsRef.current?.toggleProjection()}>{projection === 'perspective' ? 'PERS' : 'ORTO'}</button>
      </div>

      <div className="viewport-status">
        <span className={`status-dot ${stats.fps === 0 ? 'is-idle' : stats.fps >= 45 ? 'is-good' : stats.fps >= 28 ? 'is-warn' : 'is-bad'}`} />
        <span>{stats.fps === 0 ? 'rAF pausa' : `${stats.fps} FPS`}</span>
        <span>{stats.instances.toLocaleString('es-ES')} piezas</span>
        <span>{stats.drawCalls} llamadas</span>
        <span>{Math.round(stats.triangles / 1000)}k tris</span>
      </div>

      {building && <div className="geometry-progress"><span /> Regenerando geometría procedural…</div>}
      {ui.pendingProductId && <div className="placement-hint">Haz clic sobre el plano de trabajo para colocar · Esc cancela</div>}
      {ui.pieceMode && <div className="placement-hint placement-hint--amber">Modo pieza · haz clic en una unidad para retirarla</div>}
      {ui.measuring && <div className="placement-hint placement-hint--amber">Medición · marca dos puntos</div>}
      {distance && <div className="measurement-readout"><Ruler size={14} /> {distance}</div>}
      {webglError && <div className="viewport-error">{webglError}</div>}
      <div className="viewport-axis" aria-hidden="true"><i className="axis-x">X</i><i className="axis-y">Y</i><i className="axis-z">Z</i></div>
      <div className="history-badge">{past.length} <span>undo</span> · {future.length} <span>redo</span></div>
    </section>
  );
}

import type { ProjectDocument } from '../domain/types';
import { DETAIL_LABELS } from '../domain/types';
import { PRODUCT_BY_ID } from '../data/catalog';
import { APP_VERSION } from '../domain/projectFactory';
import { synchronizeOpeningRelations } from '../geometry/sceneResolver';

const DATABASE = 'constructopro-next';
const STORE = 'projects';
const CURRENT_KEY = 'current-project';

function openDatabase(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 2);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE)) database.createObjectStore(STORE);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function loadCurrentProject(): Promise<ProjectDocument | null> {
  if (typeof indexedDB === 'undefined') return null;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readonly');
    const request = transaction.objectStore(STORE).get(CURRENT_KEY);
    request.onsuccess = () => resolve(request.result ? migrateProject(request.result) : null);
    request.onerror = () => reject(request.error);
    transaction.oncomplete = () => database.close();
  });
}

export async function saveCurrentProject(project: ProjectDocument): Promise<void> {
  if (typeof indexedDB === 'undefined') return;
  const database = await openDatabase();
  return new Promise((resolve, reject) => {
    const transaction = database.transaction(STORE, 'readwrite');
    transaction.objectStore(STORE).put(project, CURRENT_KEY);
    transaction.oncomplete = () => {
      database.close();
      resolve();
    };
    transaction.onerror = () => reject(transaction.error);
  });
}

export function migrateProject(value: unknown): ProjectDocument {
  if (!value || typeof value !== 'object') throw new Error('El archivo no contiene un proyecto válido.');
  const project = structuredClone(value) as Record<string, unknown> & {
    schemaVersion?: number;
    appVersion?: string;
    entities?: Array<Record<string, unknown>>;
    section?: Record<string, unknown>;
    context?: Record<string, unknown>;
    budget?: Record<string, unknown>;
  };
  if (project.schemaVersion !== undefined && ![1, 2, 3, 4].includes(project.schemaVersion)) {
    throw new Error(`Versión de proyecto no compatible: ${String(project.schemaVersion)}`);
  }

  project.schemaVersion = 4;
  project.appVersion = APP_VERSION;
  const previousContext = project.context ?? {};
  project.context = {
    municipality: 'Sin definir',
    province: String(previousContext.province ?? previousContext.municipality ?? ''),
    altitudeM: null,
    climateZone: '',
    climateZoneSource: 'unresolved',
    use: 'Docente',
    exposure: 'Normal',
    orientation: 'N',
    interiorTemperatureC: 20,
    exteriorTemperatureC: 5,
    interiorHumidityPct: 55,
    exteriorHumidityPct: 75,
    ...previousContext,
  };
  if (!('climateZoneSource' in previousContext)) {
    project.context.climateZoneSource = previousContext.climateZone ? 'manual' : 'unresolved';
  }
  project.section = {
    open: true,
    expanded: false,
    offsetMm: 0,
    direction: 'vertical-x',
    scale: 10,
    ...(project.section ?? {}),
  };
  project.budget = {
    areaM2: 1,
    wastePct: 5,
    vatPct: 21,
    rateOverrides: {},
    ...(project.budget ?? {}),
  };
  project.entities = Array.isArray(project.entities) ? project.entities.map((entity) => {
    const coverage = entity.coverage && typeof entity.coverage === 'object'
      ? entity.coverage as Record<string, unknown>
      : undefined;
    const opening = entity.opening && typeof entity.opening === 'object'
      ? entity.opening as Record<string, unknown>
      : undefined;
    return {
      ...entity,
      locked: entity.locked ?? false,
      visible: entity.visible ?? true,
      coverage: coverage ? {
        ...coverage,
        jointMm: coverage.jointMm ?? 0,
        overlapMm: coverage.overlapMm ?? 0,
        stagger: coverage.stagger ?? false,
        pieceExceptions: coverage.pieceExceptions ?? [],
        bedJointMm: coverage.bedJointMm ?? coverage.jointMm ?? 0,
        headJointMm: coverage.headJointMm ?? coverage.jointMm ?? 0,
        sideOverlapMm: coverage.sideOverlapMm ?? 0,
        mortarRecessMm: coverage.mortarRecessMm ?? ((Number(coverage.jointMm) || 0) > 0 ? 3 : 0),
      } : undefined,
      opening: opening ? {
        ...opening,
        depthMm: opening.depthMm ?? 1000,
        affectedEntities: opening.affectedEntities ?? (Array.isArray(opening.hostIds)
          ? opening.hostIds.map((entityId) => ({ entityId, behavior: 'cut-coverage' }))
          : []),
        hostIds: opening.hostIds ?? [],
      } : undefined,
    };
  }) : [];
  const document = project as unknown as ProjectDocument;
  validateProject(document);
  return synchronizeOpeningRelations(document);
}

function validateProject(project: ProjectDocument): void {
  const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
  const vector = (value: unknown) => Array.isArray(value) && value.length === 3 && value.every(finite);
  const invalid = (message: string): never => { throw new Error(`Proyecto inválido: ${message}`); };
  if (!Object.hasOwn(DETAIL_LABELS, project.detailType)) invalid('sistema constructivo desconocido.');
  if (typeof project.id !== 'string' || typeof project.title !== 'string') invalid('faltan el identificador o el título.');
  if (!project.camera || !vector(project.camera.position) || !vector(project.camera.target)) invalid('cámara no válida.');
  if (!finite(project.section.offsetMm) || ![5, 10, 20].includes(project.section.scale)) invalid('plano de sección no válido.');
  const ids = new Set<string>();
  project.entities.forEach((entity, index) => {
    const label = `objeto ${index + 1}`;
    if (typeof entity.id !== 'string' || ids.has(entity.id)) invalid(`${label} tiene un identificador ausente o duplicado.`);
    ids.add(entity.id);
    const product = PRODUCT_BY_ID.get(entity.productId);
    if (!product || !product.variants.some((variant) => variant.id === entity.variantId)) invalid(`${label} referencia un producto o variante desconocidos.`);
    if (!entity.transform || !vector(entity.transform.position) || !vector(entity.transform.rotation)) invalid(`${label} contiene coordenadas no válidas.`);
    if (entity.coverage) {
      const c = entity.coverage;
      if (![c.widthMm, c.heightMm].every((n) => finite(n) && n > 0)) invalid(`${label} tiene un paño sin dimensiones positivas.`);
      if (![c.jointMm, c.overlapMm, c.sideOverlapMm ?? 0, c.bedJointMm ?? 0, c.headJointMm ?? 0].every((n) => finite(n) && n >= 0)) invalid(`${label} tiene juntas o solapes no válidos.`);
      if (!Array.isArray(c.pieceExceptions) || c.pieceExceptions.some((item) => typeof item.key !== 'string' || (item.offset !== undefined && !vector(item.offset)))) invalid(`${label} tiene excepciones de pieza no válidas.`);
    }
    if (entity.opening && ![entity.opening.widthMm, entity.opening.heightMm, entity.opening.depthMm].every((n) => finite(n) && n > 0)) invalid(`${label} tiene un hueco sin dimensiones positivas.`);
    const installation = entity.opening?.installation;
    if (installation) {
      const positive = [installation.jointMm, installation.preframeFaceMm, installation.preframeDepthMm, installation.revealInsulationMm,
        installation.facadeFaceOffsetMm, installation.insulationFaceOffsetMm, installation.sillSlopeDeg, installation.sillProjectionMm,
        installation.lintelHeightMm, installation.lintelBearingMm, installation.supportDepthMm];
      if (!positive.every((n) => finite(n) && n > 0) || !finite(installation.supportCenterOffsetMm)) invalid(`${label} tiene un montaje de ventana sin cotas válidas.`);
      if (installation.preframeFaceMm < 5 || installation.preframeDepthMm < 6 || installation.sillSlopeDeg >= 45
        || installation.insulationFaceOffsetMm <= 42 || installation.facadeFaceOffsetMm <= installation.insulationFaceOffsetMm
        || installation.revealInsulationMm > installation.jointMm + installation.preframeFaceMm - 5) invalid(`${label} tiene un montaje de ventana incompatible.`);
      const drop = (installation.facadeFaceOffsetMm - 42.5) * Math.tan(installation.sillSlopeDeg * Math.PI / 180);
      if (drop > installation.jointMm + installation.preframeFaceMm - 13) invalid(`${label} deja el vierteaguas sin altura de apoyo.`);
    }
  });
}

export function downloadProject(project: ProjectDocument): void {
  const payload = JSON.stringify({
    format: 'constructopro',
    exportedAt: new Date().toISOString(),
    project,
  }, null, 2);
  const blob = new Blob([payload], { type: 'application/vnd.constructopro+json' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `${project.title.replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/(^-|-$)/g, '') || 'proyecto'}.constructopro`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(link.href), 1000);
}

export async function readProjectFile(file: File): Promise<ProjectDocument> {
  const raw = JSON.parse(await file.text()) as unknown;
  if (raw && typeof raw === 'object' && 'format' in raw && 'project' in raw) {
    if ((raw as { format?: string }).format !== 'constructopro') throw new Error('Formato de archivo incorrecto.');
    return migrateProject((raw as { project: unknown }).project);
  }
  return migrateProject(raw);
}

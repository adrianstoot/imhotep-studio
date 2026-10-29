import {
  createContext,
  type Dispatch,
  type PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { PRODUCT_BY_ID } from '../data/catalog';
import { APP_VERSION, createDetailSampleEntities, createPerformanceProject, createProject, entityFromProduct } from '../domain/projectFactory';
import { attachmentFrame, isRoofOrFloor, placementSurface } from '../domain/construction';
import type {
  EditorUiState,
  ProductCategory,
  ProjectBudget,
  ProjectContextData,
  ProjectDocument,
  DetailType,
  SceneEntity,
  Transform3D,
} from '../domain/types';
import { loadCurrentProject, saveCurrentProject } from './persistence';
import { synchronizeOpeningRelations } from '../geometry/sceneResolver';
import { DETAIL_LABELS } from '../domain/types';

type SaveState = 'loading' | 'saved' | 'saving' | 'error';

interface EditorState {
  project: ProjectDocument;
  ui: EditorUiState;
  past: ProjectDocument[];
  future: ProjectDocument[];
  hydrated: boolean;
  qaMode: boolean;
  saveState: SaveState;
}

type Action =
  | { type: 'hydrate'; project: ProjectDocument | null; qaMode?: boolean }
  | { type: 'save-state'; value: SaveState }
  | { type: 'ui'; patch: Partial<EditorUiState> }
  | { type: 'select'; id: string | null; additive?: boolean }
  | { type: 'command'; project: ProjectDocument; selection?: string[]; toast?: string }
  | { type: 'replace-project'; project: ProjectDocument; toast?: string }
  | { type: 'undo' }
  | { type: 'redo' };

const initialUi: EditorUiState = {
  selectedIds: [],
  pendingProductId: null,
  activeCategory: 'Todos',
  search: '',
  snapping: true,
  transformMode: 'translate',
  coordinateSpace: 'world',
  isolation: false,
  measuring: false,
  pieceMode: false,
  gridVisible: true,
  autoRotate: false,
  quality: 'balanced',
  measurement: null,
  inspectorTab: 'properties',
  catalogDetailId: null,
  toast: null,
};

const initialState: EditorState = {
  project: createProject(true),
  ui: initialUi,
  past: [],
  future: [],
  hydrated: false,
  qaMode: false,
  saveState: 'loading',
};

function projectDefaultSelection(project: ProjectDocument): string[] {
  const first = project.entities.find((entity) => entity.visible);
  return first ? [first.id] : [];
}

function updated(project: ProjectDocument): ProjectDocument {
  return { ...project, updatedAt: new Date().toISOString() };
}

function reducer(state: EditorState, action: Action): EditorState {
  switch (action.type) {
    case 'hydrate':
      return {
        ...state,
        project: action.project ?? state.project,
        ui: {
          ...state.ui,
          selectedIds: projectDefaultSelection(action.project ?? state.project),
        },
        hydrated: true,
        qaMode: action.qaMode ?? false,
        saveState: 'saved',
        past: [],
        future: [],
      };
    case 'save-state':
      return { ...state, saveState: action.value };
    case 'ui':
      return { ...state, ui: { ...state.ui, ...action.patch } };
    case 'select': {
      if (!action.id) return { ...state, ui: { ...state.ui, selectedIds: [] } };
      const exists = state.ui.selectedIds.includes(action.id);
      const selectedIds = action.additive
        ? (exists ? state.ui.selectedIds.filter((id) => id !== action.id) : [...state.ui.selectedIds, action.id])
        : [action.id];
      return { ...state, ui: { ...state.ui, selectedIds } };
    }
    case 'command':
      return {
        ...state,
        project: updated(action.project),
        past: [...state.past.slice(-79), state.project],
        future: [],
        ui: {
          ...state.ui,
          selectedIds: action.selection ?? state.ui.selectedIds,
          toast: action.toast ?? null,
        },
      };
    case 'replace-project':
      return {
        ...state,
        project: updated(action.project),
        past: [],
        future: [],
        ui: { ...initialUi, selectedIds: projectDefaultSelection(action.project), toast: action.toast ?? null },
      };
    case 'undo': {
      const previous = state.past.at(-1);
      if (!previous) return state;
      return {
        ...state,
        project: previous,
        past: state.past.slice(0, -1),
        future: [state.project, ...state.future].slice(0, 80),
        ui: { ...state.ui, selectedIds: [], toast: 'Acción deshecha' },
      };
    }
    case 'redo': {
      const next = state.future[0];
      if (!next) return state;
      return {
        ...state,
        project: next,
        past: [...state.past, state.project].slice(-80),
        future: state.future.slice(1),
        ui: { ...state.ui, selectedIds: [], toast: 'Acción rehecha' },
      };
    }
  }
}

export interface EditorActions {
  setUi: (patch: Partial<EditorUiState>) => void;
  select: (id: string | null, additive?: boolean) => void;
  queueProduct: (productId: string | null) => void;
  placePending: (position: [number, number, number]) => void;
  addProductAtOrigin: (productId: string) => void;
  updateEntity: (entityId: string, patch: Partial<SceneEntity>, label?: string) => void;
  updateTransform: (entityId: string, transform: Transform3D) => void;
  updateContext: (patch: Partial<ProjectContextData>) => void;
  updateBudget: (patch: Partial<ProjectBudget>) => void;
  updateProjectMeta: (patch: Pick<Partial<ProjectDocument>, 'title' | 'detailType'>) => void;
  updateSection: (patch: Partial<ProjectDocument['section']>) => void;
  duplicateSelected: () => void;
  deleteSelected: () => void;
  clearScene: (sampleOnly?: boolean) => void;
  toggleVisibility: (entityId: string) => void;
  toggleLock: (entityId: string) => void;
  togglePiece: (entityId: string, pieceKey: string) => void;
  undo: () => void;
  redo: () => void;
  newProject: (withSample: boolean) => void;
  loadDetailExample: (detailType?: DetailType) => void;
  importProject: (project: ProjectDocument) => void;
}

interface EditorContextValue extends EditorState {
  actions: EditorActions;
}

const EditorContext = createContext<EditorContextValue | null>(null);

function projectWithEntity(project: ProjectDocument, entity: SceneEntity): ProjectDocument {
  return { ...project, entities: [...project.entities, entity] };
}

function isHorizontalAssembly(detailType: ProjectDocument['detailType']): boolean {
  return isRoofOrFloor(detailType);
}

function isPristineExample(project: ProjectDocument): boolean {
  const canonical = createDetailSampleEntities(project.detailType);
  const geometrySignature = (entity: SceneEntity) => JSON.stringify({
    productId: entity.productId, variantId: entity.variantId, name: entity.name,
    transform: entity.transform, cutLengthMm: entity.cutLengthMm, coverage: entity.coverage,
    visible: entity.visible, locked: entity.locked,
    opening: entity.opening && { widthMm: entity.opening.widthMm, heightMm: entity.opening.heightMm, sillMm: entity.opening.sillMm, depthMm: entity.opening.depthMm },
  });
  return project.entities.length === canonical.length && project.entities.every((entity, index) => entity.sample && geometrySignature(entity) === geometrySignature(canonical[index]));
}

function createActions(state: EditorState, dispatch: Dispatch<Action>): EditorActions {
  const command = (project: ProjectDocument, selection?: string[], toast?: string) =>
    dispatch({ type: 'command', project: synchronizeOpeningRelations(project), selection, toast });

  const loadExample = (detailType = state.project.detailType) => {
    const example = createProject(true, detailType);
    command({ ...state.project, appVersion: APP_VERSION, title: example.title, detailType, entities: example.entities, camera: example.camera, section: example.section, budget: { ...state.project.budget, areaM2: example.budget.areaM2 } }, projectDefaultSelection(example), 'Ejemplo constructivo cargado · puedes deshacer');
  };

  const place = (productId: string, position: [number, number, number]) => {
    const item = PRODUCT_BY_ID.get(productId);
    if (!item) return;
    const variant = item.variants[0];
    const snapped: [number, number, number] = state.ui.snapping
      ? position.map((value) => Math.round(value / 50) * 50) as [number, number, number]
      : position;
    const surface = attachmentFrame(state.project, item);
    const horizontalSurface = isHorizontalAssembly(state.project.detailType) && item.placementKind === 'coverage';
    // Snap tangential coordinates, then project back onto the actual support.
    // Snapping all world axes independently used to move roofs off their slope.
    const distance = snapped.reduce((sum, value, index) => sum + (value - surface.origin[index]) * surface.normal[index], 0);
    const attachedPosition = snapped.map((value, index) => value - surface.normal[index] * distance) as [number, number, number];
    const base = entityFromProduct(item, {
      position: attachedPosition,
      rotation: surface.rotation,
    });
    const entity: SceneEntity = item.createsOpening ? {
      ...base,
      opening: {
        widthMm: variant.widthMm,
        heightMm: variant.heightMm,
        sillMm: Math.max(0, snapped[1] - variant.heightMm / 2),
        depthMm: 1000,
        affectedEntities: [],
        hostIds: [],
      },
    } : base;
    const projectWithPlacement = projectWithEntity(state.project, entity);
    const nextProject = synchronizeOpeningRelations(horizontalSurface ? {
      ...projectWithPlacement,
      section: { ...projectWithPlacement.section, offsetMm: snapped[0] },
    } : projectWithPlacement);
    const affected = nextProject.entities.find((candidate) => candidate.id === entity.id)?.opening?.affectedEntities.length ?? 0;
    command(nextProject, [entity.id], item.createsOpening
      ? `Hueco real regenerado en ${affected} elementos`
      : `${item.name} añadido`);
    dispatch({ type: 'ui', patch: { pendingProductId: null } });
  };

  return {
    setUi: (patch) => dispatch({ type: 'ui', patch }),
    select: (id, additive) => dispatch({ type: 'select', id, additive }),
    queueProduct: (productId) => dispatch({ type: 'ui', patch: { pendingProductId: productId, measuring: false } }),
    placePending: (position) => {
      if (state.ui.pendingProductId) place(state.ui.pendingProductId, position);
    },
    addProductAtOrigin: (productId) => place(productId, placementSurface(state.project).origin),
    updateEntity: (entityId, patch, label = 'Propiedades actualizadas') => {
      const entities = state.project.entities.map((entity) => entity.id === entityId ? { ...entity, ...patch } : entity);
      command({ ...state.project, entities }, state.ui.selectedIds, label);
    },
    updateTransform: (entityId, transform) => {
      const entities = state.project.entities.map((entity) => entity.id === entityId ? { ...entity, transform } : entity);
      command({ ...state.project, entities }, state.ui.selectedIds, 'Transformación aplicada');
    },
    updateContext: (patch) => command({
      ...state.project,
      context: { ...state.project.context, ...patch },
    }, state.ui.selectedIds, 'Contexto de proyecto actualizado'),
    updateBudget: (patch) => command({
      ...state.project,
      budget: { ...state.project.budget, ...patch },
    }, state.ui.selectedIds, 'Presupuesto recalculado'),
    updateProjectMeta: (patch) => {
      const changedDetail = patch.detailType && patch.detailType !== state.project.detailType;
      if (changedDetail && isPristineExample(state.project)) {
        loadExample(patch.detailType);
        return;
      }
      const horizontal = changedDetail && isHorizontalAssembly(patch.detailType!);
      const camera = changedDetail ? (horizontal ? {
        ...state.project.camera,
        position: [4300, 3200, 4300] as [number, number, number],
        target: [0, 0, 0] as [number, number, number],
      } : {
        ...state.project.camera,
        position: [4450, 3350, 4550] as [number, number, number],
        target: [220, 1580, 60] as [number, number, number],
      }) : state.project.camera;
      command({ ...state.project, ...patch, camera }, state.ui.selectedIds);
    },
    updateSection: (patch) => command({
      ...state.project,
      section: { ...state.project.section, ...patch },
    }, state.ui.selectedIds),
    duplicateSelected: () => {
      const selected = state.project.entities.filter((entity) => state.ui.selectedIds.includes(entity.id));
      if (!selected.length) return;
      const copies = selected.map((entity) => ({
        ...structuredClone(entity),
        id: `${entity.id}-copy-${Math.random().toString(36).slice(2, 7)}`,
        name: `${entity.name} · copia`,
        transform: {
          ...entity.transform,
          position: [entity.transform.position[0] + 100, entity.transform.position[1] + 100, entity.transform.position[2] + 40] as [number, number, number],
        },
        sample: false,
      }));
      command({ ...state.project, entities: [...state.project.entities, ...copies] }, copies.map((copy) => copy.id), `${copies.length} elemento(s) duplicado(s)`);
    },
    deleteSelected: () => {
      if (!state.ui.selectedIds.length) return;
      const selected = new Set(state.ui.selectedIds);
      const entities = state.project.entities
        .filter((entity) => !selected.has(entity.id))
        .map((entity) => entity.opening
          ? { ...entity, opening: { ...entity.opening, hostIds: entity.opening.hostIds.filter((id) => !selected.has(id)) } }
          : entity);
      command({ ...state.project, entities }, [], `${selected.size} elemento(s) eliminado(s)`);
    },
    clearScene: (sampleOnly = false) => {
      const entities = sampleOnly ? state.project.entities.filter((entity) => !entity.sample) : [];
      command({ ...state.project, entities }, [], sampleOnly ? 'Elementos de ejemplo eliminados' : 'Escena vaciada');
    },
    toggleVisibility: (entityId) => {
      const entities = state.project.entities.map((entity) => entity.id === entityId ? { ...entity, visible: !entity.visible } : entity);
      command({ ...state.project, entities }, state.ui.selectedIds);
    },
    toggleLock: (entityId) => {
      const entities = state.project.entities.map((entity) => entity.id === entityId ? { ...entity, locked: !entity.locked } : entity);
      command({ ...state.project, entities }, state.ui.selectedIds);
    },
    togglePiece: (entityId, pieceKey) => {
      const entities = state.project.entities.map((entity) => {
        if (entity.id !== entityId || !entity.coverage) return entity;
        const exceptions = entity.coverage.pieceExceptions;
        const existing = exceptions.find((entry) => entry.key === pieceKey);
        const pieceExceptions = existing
          ? exceptions.filter((entry) => entry.key !== pieceKey)
          : [...exceptions, { key: pieceKey, hidden: true }];
        return { ...entity, coverage: { ...entity.coverage, pieceExceptions } };
      });
      command({ ...state.project, entities }, state.ui.selectedIds, `Pieza ${pieceKey} actualizada`);
    },
    undo: () => dispatch({ type: 'undo' }),
    redo: () => dispatch({ type: 'redo' }),
    newProject: (withSample) => dispatch({ type: 'replace-project', project: createProject(withSample, state.project.detailType), toast: withSample ? 'Ejemplo restaurado' : 'Proyecto vacío creado' }),
    loadDetailExample: loadExample,
    importProject: (project) => dispatch({ type: 'replace-project', project, toast: 'Proyecto importado correctamente' }),
  };
}

export function EditorProvider({ children }: PropsWithChildren) {
  const [state, dispatch] = useReducer(reducer, initialState);
  const hydrationStarted = useRef(false);

  useEffect(() => {
    if (hydrationStarted.current) return;
    hydrationStarted.current = true;
    const params = new URLSearchParams(window.location.search);
    const demo = params.get('demo');
    if (demo && Object.prototype.hasOwnProperty.call(DETAIL_LABELS, demo)) {
      dispatch({ type: 'hydrate', project: createProject(true, demo as DetailType), qaMode: true });
      return;
    }
    const qa = params.get('qa');
    if (qa === 'performance') {
      dispatch({ type: 'hydrate', project: createPerformanceProject(), qaMode: true });
      return;
    }
    if (qa === 'reference') {
      dispatch({ type: 'hydrate', project: createProject(true), qaMode: true });
      return;
    }
    loadCurrentProject()
      .then((project) => dispatch({ type: 'hydrate', project }))
      .catch(() => dispatch({ type: 'hydrate', project: null }));
  }, []);

  useEffect(() => {
    if (!state.hydrated || state.qaMode) return;
    dispatch({ type: 'save-state', value: 'saving' });
    const timer = window.setTimeout(() => {
      saveCurrentProject(state.project)
        .then(() => dispatch({ type: 'save-state', value: 'saved' }))
        .catch(() => dispatch({ type: 'save-state', value: 'error' }));
    }, 450);
    return () => window.clearTimeout(timer);
  }, [state.hydrated, state.project, state.qaMode]);

  useEffect(() => {
    if (!state.ui.toast) return;
    const timer = window.setTimeout(() => dispatch({ type: 'ui', patch: { toast: null } }), 2600);
    return () => window.clearTimeout(timer);
  }, [state.ui.toast]);

  const actions = useMemo(() => createActions(state, dispatch), [state]);
  const value = useMemo(() => ({ ...state, actions }), [state, actions]);
  return <EditorContext.Provider value={value}>{children}</EditorContext.Provider>;
}

export function useEditor(): EditorContextValue {
  const value = useContext(EditorContext);
  if (!value) throw new Error('useEditor debe utilizarse dentro de EditorProvider.');
  return value;
}

export function useSelectedEntities(): SceneEntity[] {
  const { project, ui } = useEditor();
  return useMemo(
    () => project.entities.filter((entity) => ui.selectedIds.includes(entity.id)),
    [project.entities, ui.selectedIds],
  );
}

export function useFilteredCatalog() {
  const { project, ui } = useEditor();
  return useMemo(() => {
    const queryTokens = ui.search.trim().toLowerCase().split(/\s+/).filter(Boolean);
    const matches = [...PRODUCT_BY_ID.values()].filter((product) => {
      const categoryMatch = ui.activeCategory === 'Todos' || product.category === ui.activeCategory;
      const scopeMatch = product.scopes.includes(project.detailType);
      const haystack = `${product.name} ${product.manufacturer} ${product.sku} ${product.category}`.toLowerCase();
      const textMatch = queryTokens.every((token) => haystack.includes(token));
      return categoryMatch && scopeMatch && textMatch;
    });
    if (ui.activeCategory !== 'Todos' || queryTokens.length) return matches;
    const contextualOrder: ProductCategory[] = [
      'Aislamientos',
      'Soportes y fábrica',
      'Subestructuras y fijaciones',
      'Revestimientos de fachada',
      'Carpinterías y huecos',
      'Impermeabilización',
      'Morteros y sellantes',
      'Remates y evacuación',
      'Cubierta inclinada',
      'Cubierta plana y terraza',
      'Pavimentos',
      'Particiones y trasdosados',
    ];
    const groups = contextualOrder.map((category) => matches.filter((product) => product.category === category));
    const interleaved: typeof matches = [];
    for (let index = 0; interleaved.length < matches.length; index += 1) {
      let added = false;
      groups.forEach((group) => {
        if (group[index]) {
          interleaved.push(group[index]);
          added = true;
        }
      });
      if (!added) break;
    }
    return interleaved;
  }, [project.detailType, ui.activeCategory, ui.search]);
}

export type CatalogCategoryFilter = ProductCategory | 'Todos';

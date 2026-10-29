/** Core, versioned contracts for the standalone ConstructoPro Next application. */
export type DetailType =
  | 'fachada-ventilada'
  | 'fachada-sate'
  | 'hueco-fachada'
  | 'cubierta-inclinada'
  | 'cubierta-plana'
  | 'terraza'
  | 'pavimento'
  | 'particion';

export type ProductCategory =
  | 'Soportes y fábrica'
  | 'Aislamientos'
  | 'Impermeabilización'
  | 'Morteros y sellantes'
  | 'Revestimientos de fachada'
  | 'Subestructuras y fijaciones'
  | 'Carpinterías y huecos'
  | 'Cubierta inclinada'
  | 'Cubierta plana y terraza'
  | 'Pavimentos'
  | 'Particiones y trasdosados'
  | 'Remates y evacuación';

export type GeometryKind =
  | 'masonry'
  | 'solid'
  | 'insulation'
  | 'membrane'
  | 'finish'
  | 'cladding'
  | 'profile'
  | 'bracket'
  | 'fastener'
  | 'window'
  | 'glass'
  | 'roof-tile'
  | 'paver'
  | 'board'
  | 'drain'
  | 'coping';

export type PlacementKind = 'coverage' | 'linear' | 'unit';

export type OpeningBehavior = 'cut-coverage' | 'split-linear' | 'suppress-unit' | 'ignore';

export type ProductMediaKind = 'official-photo' | 'manufacturer-render' | 'procedural-render';

export interface ProductMediaAsset {
  id: string;
  kind: ProductMediaKind;
  alt: string;
  /** Local assets are only populated after redistribution permission is verified. */
  url?: string;
  sourceUrl: string;
  licenseStatus: 'cleared' | 'linked-only' | 'internal-render';
  attribution: string;
  reviewedAt: string;
}

export interface ProductVariant {
  id: string;
  label: string;
  widthMm: number;
  heightMm: number;
  depthMm: number;
  unitWeightKg?: number;
  commercialCode?: string;
  /** Commercial stock length. The product may be cut, never stretched. */
  stockLengthMm?: number;
  minCutLengthMm?: number;
  cutIncrementMm?: number;
}

export interface ProductProperties {
  lambdaWmK?: number;
  densityKgM3?: number;
  vaporMu?: number;
  fireClass?: string;
  acousticRwDb?: number;
  waterAbsorption?: string;
  recycledContentPct?: number;
  co2KgPerKg?: number;
}

export interface ProductSource {
  url: string;
  documentTitle: string;
  documentDate?: string;
  reviewedAt: string;
  quality: 'documented' | 'source-linked';
}

export interface ModelEvidence {
  geometry: 'verified-dimensions' | 'procedural-approximation';
  texture: 'procedural-pbr' | 'licensed-reference';
  restored: string[];
  speculation: string[];
}

export interface ProductDefinition {
  id: string;
  sku: string;
  name: string;
  manufacturer: string;
  manufacturerUrl: string;
  category: ProductCategory;
  scopes: DetailType[];
  geometryKind: GeometryKind;
  placementKind: PlacementKind;
  color: string;
  accent: string;
  roughness: number;
  metalness: number;
  texturePath?: string;
  media: ProductMediaAsset[];
  variants: ProductVariant[];
  defaultVariantId: string;
  defaultCoverageMm?: { width: number; height: number };
  jointMm?: number;
  stagger?: boolean;
  overlapMm?: number;
  /** Horizontal interlock/overlap; commercial unit width remains immutable. */
  sideOverlapMm?: number;
  canHostOpenings?: boolean;
  createsOpening?: boolean;
  openingBehavior: OpeningBehavior;
  properties: ProductProperties;
  source: ProductSource;
  evidence: ModelEvidence;
}

export interface Transform3D {
  position: [number, number, number];
  rotation: [number, number, number];
}

export interface PieceException {
  key: string;
  hidden?: boolean;
  offset?: [number, number, number];
}

export interface CoverageSpec {
  widthMm: number;
  heightMm: number;
  jointMm: number;
  /** Separate bed/head joints keep masonry construction explicit. */
  bedJointMm?: number;
  headJointMm?: number;
  mortarRecessMm?: number;
  stagger: boolean;
  overlapMm: number;
  /** Horizontal interlock used by roof tiles and overlapping sheets. */
  sideOverlapMm?: number;
  pieceExceptions: PieceException[];
}

/** Explicit generic installation, in the window's local millimetre frame. */
export interface WindowInstallation {
  jointMm: number;
  preframeFaceMm: number;
  preframeDepthMm: number;
  revealInsulationMm: number;
  facadeFaceOffsetMm: number;
  insulationFaceOffsetMm: number;
  sillSlopeDeg: number;
  sillProjectionMm: number;
  lintelHeightMm: number;
  lintelBearingMm: number;
  supportDepthMm: number;
  supportCenterOffsetMm: number;
}

export interface OpeningSpec {
  widthMm: number;
  heightMm: number;
  sillMm: number;
  depthMm: number;
  installation?: WindowInstallation;
  affectedEntities: OpeningAffectedEntity[];
  /** Kept as a derived compatibility field for v1/v2 projects. */
  hostIds: string[];
}

export interface OpeningAffectedEntity {
  entityId: string;
  behavior: Exclude<OpeningBehavior, 'ignore'>;
}

export interface SceneEntity {
  id: string;
  productId: string;
  variantId: string;
  name: string;
  transform: Transform3D;
  cutLengthMm?: number;
  coverage?: CoverageSpec;
  opening?: OpeningSpec;
  visible: boolean;
  locked: boolean;
  sample?: boolean;
}

export interface ProjectContextData {
  municipality: string;
  province: string;
  altitudeM: number | null;
  climateZone: string;
  climateZoneSource: 'cte-anejob' | 'manual' | 'unresolved';
  use: 'Residencial' | 'Docente' | 'Terciario';
  exposure: 'Protegida' | 'Normal' | 'Expuesta';
  orientation: 'N' | 'NE' | 'E' | 'SE' | 'S' | 'SO' | 'O' | 'NO';
  interiorTemperatureC: number;
  exteriorTemperatureC: number;
  interiorHumidityPct: number;
  exteriorHumidityPct: number;
}

export interface ProjectBudget {
  /** Surface used to scale the estimate without modifying the 3D assembly. */
  areaM2: number;
  wastePct: number;
  vatPct: number;
  /** Editable educational rates keyed by product id. */
  rateOverrides: Record<string, number>;
}

export interface ProjectDocument {
  schemaVersion: 4;
  appVersion: string;
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  detailType: DetailType;
  context: ProjectContextData;
  budget: ProjectBudget;
  entities: SceneEntity[];
  camera: {
    mode: 'perspective' | 'orthographic';
    position: [number, number, number];
    target: [number, number, number];
  };
  section: {
    open: boolean;
    expanded: boolean;
    offsetMm: number;
    direction: 'vertical-x';
    scale: 5 | 10 | 20;
  };
}

export interface RuleResult {
  id: string;
  title: string;
  severity: 'pass' | 'warning' | 'error' | 'info';
  message: string;
  sourceLabel: string;
  sourceUrl: string;
  inputs?: Record<string, string | number>;
}

export interface RuleDefinition {
  id: string;
  title: string;
  cteDocument: 'DB-HE' | 'DB-HS' | 'DB-SI' | 'DB-HR' | 'CTE';
  section: string;
  sourceUrl: string;
  version: string;
  publishedAt: string;
  reviewedAt: string;
  appliesTo: DetailType[];
}

export interface RulePack {
  id: string;
  title: string;
  version: string;
  reviewedAt: string;
  educationalOnly: true;
  rules: RuleDefinition[];
}

export interface Measurement {
  a: [number, number, number];
  b?: [number, number, number];
}

export interface EditorUiState {
  selectedIds: string[];
  pendingProductId: string | null;
  activeCategory: ProductCategory | 'Todos';
  search: string;
  snapping: boolean;
  transformMode: 'translate' | 'rotate';
  coordinateSpace: 'local' | 'world';
  isolation: boolean;
  measuring: boolean;
  pieceMode: boolean;
  gridVisible: boolean;
  autoRotate: boolean;
  quality: 'performance' | 'balanced' | 'high';
  measurement: Measurement | null;
  inspectorTab: 'properties' | 'scene' | 'budget' | 'cte';
  catalogDetailId: string | null;
  toast: string | null;
}

export const DETAIL_LABELS: Record<DetailType, string> = {
  'fachada-ventilada': 'Fachada ventilada',
  'fachada-sate': 'Fachada SATE',
  'hueco-fachada': 'Hueco de fachada',
  'cubierta-inclinada': 'Cubierta inclinada',
  'cubierta-plana': 'Cubierta plana',
  terraza: 'Terraza y balcón',
  pavimento: 'Pavimento y solera',
  particion: 'Partición y trasdosado',
};

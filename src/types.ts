export interface Material {
  id: string;
  Categoria: string;
  Nombre: string;
  Empresa: string;
  EspesorRaw: string;
  EspesorVirtualMM: number;
  PrecioNum: number;
  lambda: number;
  density: number;
  color: string;
  icon: string;
  type: string;
  textureClass: string;
  textureId?: string;
  image?: string;
  imageReal?: string;       // v13: photorealistic texture path
  co2PerKg?: number;        // v13: kgCO₂/kg from DAP
  iveCode?: string;         // v13: IVE price database code
  budgetChapter?: string;   // v13: budget chapter assignment
  mu?: number;              // v13: vapor diffusion resistance factor (μ)
  orientationType?: 'vertical' | 'horizontal' | 'ambos'; // v14: orientation filter
}

export interface Layer extends Material {
  instanceId: string;
}

export interface ConstructionSystem {
  name: string;
  description: string;
  allowedTypes: string[];
  requiredLayers: string[];
  requiredOrder: string[];
  normRef: string;
  orientation?: 'vertical' | 'horizontal';
}

export interface Mission {
  id: string;
  name: string;
  description: string;
  systemKey: string;
  requiredOrder: string[];
  xpReward: number;
  badge: string;
  badgeIcon: string;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Experto';
  evolvesToId?: string;
}

export interface Badge {
  id: string;
  name: string;
  icon: string;
  description: string;
  unlockedAt?: number;
}

export interface GamificationState {
  xp: number;
  level: number;
  levelName: string;
  completedMissions: string[];
  badges: Badge[];
  streak: number;
  totalConfigurations: number;
}

// ═══ v13: BUDGET TYPES ═══
export interface BudgetLine {
  chapter: string;
  chapterName: string;
  iveCode: string;
  description: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  amount: number;
}

export interface BudgetSummary {
  lines: BudgetLine[];
  pem: number;              // Presupuesto Ejecución Material
  gg: number;               // Gastos Generales (13%)
  bi: number;               // Beneficio Industrial (6%)
  pec: number;              // Presupuesto Ejecución Contrata
  iva: number;              // IVA (21%)
  total: number;
  chapterBreakdown: { chapter: string; name: string; amount: number; pct: number }[];
}

// ═══ v13: GLASER CONDENSATION TYPES ═══
export interface GlaserPoint {
  position: number;       // distance from exterior [mm]
  layerName: string;
  temperature: number;    // °C
  pSat: number;           // saturated vapor pressure [Pa]
  pVapor: number;         // actual vapor pressure [Pa]
  condensation: boolean;
}

// ═══ v13: EXAM TYPES ═══
export interface ExamChallenge {
  id: string;
  title: string;
  description: string;
  systemKey: string;
  targetU: number;
  timeMinutes: number;
  difficulty: 'Principiante' | 'Intermedio' | 'Avanzado' | 'Experto';
  rubric: { criterion: string; maxPoints: number }[];
  xpReward: number;
  evolvesToId?: string;
}

export interface ExamResult {
  challengeId: string;
  score: number;
  maxScore: number;
  grade: string;
  timestamp: number;
  details: { criterion: string; points: number; maxPoints: number; comment: string }[];
}

// ═══ v13: SAVED COMPARISONS ═══
export interface SavedConfig {
  id: string;
  name: string;
  systemKey: string;
  layers: Layer[];
  uValue: number;
  mass: number;
  pem: number;
  co2: number;
  timestamp: number;
}

export interface AppState {
  catalog: Material[];
  layers: Layer[];
  selectedId: string | null;
  searchTerm: string;
  activeSystem: string;
  area: number;
  isCertified: boolean;
  isEngineOnline: boolean;
  uValue: number;
  mass: number;
  pem: number;
  gamification: GamificationState;
  normativeErrors: string[];
  normativeScore: number;
}

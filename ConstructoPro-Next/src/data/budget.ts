import { PRODUCT_BY_ID } from './catalog';
import type { ProductDefinition, ProjectDocument, SceneEntity } from '../domain/types';
import { computeCoverageLayout } from '../geometry/layout';
import { openingsForEntity } from '../geometry/sceneResolver';

export type BudgetUnit = 'm²' | 'm' | 'ud';

export interface BudgetLine {
  product: ProductDefinition;
  entityIds: string[];
  unit: BudgetUnit;
  modelQuantity: number;
  quantityPerM2: number;
  projectedQuantity: number;
  rateEur: number;
  baseCostEur: number;
  wasteCostEur: number;
  totalCostEur: number;
}

export interface BudgetSummary {
  referenceAreaM2: number;
  targetAreaM2: number;
  lines: BudgetLine[];
  baseCostEur: number;
  wasteCostEur: number;
  subtotalEur: number;
  vatEur: number;
  totalEur: number;
  totalPerM2Eur: number;
}

const COVERAGE_RATE: Partial<Record<ProductDefinition['geometryKind'], number>> = {
  masonry: 48,
  solid: 62,
  insulation: 27,
  membrane: 11,
  finish: 18,
  cladding: 76,
  glass: 185,
  'roof-tile': 41,
  paver: 54,
  board: 25,
};

const LINEAR_RATE: Partial<Record<ProductDefinition['geometryKind'], number>> = {
  profile: 16,
  drain: 49,
  coping: 28,
  solid: 22,
};

const UNIT_RATE: Partial<Record<ProductDefinition['geometryKind'], number>> = {
  bracket: 8.5,
  fastener: 1.15,
  window: 720,
  glass: 190,
  solid: 35,
  drain: 65,
};

export function budgetUnit(product: ProductDefinition): BudgetUnit {
  if (product.placementKind === 'coverage') return 'm²';
  if (product.placementKind === 'linear') return 'm';
  return 'ud';
}

/**
 * Editable educational starting rates. They are deliberately not presented as
 * manufacturer tariffs: the product source remains linked separately and the
 * user can replace every rate in the project budget.
 */
export function defaultBudgetRate(product: ProductDefinition): number {
  if (product.placementKind === 'coverage') return COVERAGE_RATE[product.geometryKind] ?? 30;
  if (product.placementKind === 'linear') return LINEAR_RATE[product.geometryKind] ?? 18;
  return UNIT_RATE[product.geometryKind] ?? 12;
}

function quantityForEntity(entity: SceneEntity, project: ProjectDocument, product: ProductDefinition): number {
  const variant = product.variants.find((candidate) => candidate.id === entity.variantId) ?? product.variants[0];
  if (product.placementKind === 'coverage' && entity.coverage) {
    return computeCoverageLayout(entity.coverage, variant, openingsForEntity(entity, project.entities)).requestedAreaM2;
  }
  if (product.placementKind === 'linear') return Math.max(0, entity.cutLengthMm ?? variant.stockLengthMm ?? variant.heightMm) / 1000;
  return 1;
}

export function calculateProjectBudget(project: ProjectDocument): BudgetSummary {
  const referenceAreaM2 = Math.max(1, ...project.entities.map((entity) => {
    if (!entity.coverage) return 0;
    return entity.coverage.widthMm * entity.coverage.heightMm / 1_000_000;
  }));
  const targetAreaM2 = Math.max(0.01, project.budget?.areaM2 ?? referenceAreaM2);
  const wastePct = Math.max(0, project.budget?.wastePct ?? 5);
  const vatPct = Math.max(0, project.budget?.vatPct ?? 21);
  const rateOverrides = project.budget?.rateOverrides ?? {};
  const grouped = new Map<string, { product: ProductDefinition; entityIds: string[]; modelQuantity: number }>();

  project.entities.forEach((entity) => {
    const product = PRODUCT_BY_ID.get(entity.productId);
    if (!product) return;
    const current = grouped.get(product.id) ?? { product, entityIds: [], modelQuantity: 0 };
    current.entityIds.push(entity.id);
    current.modelQuantity += quantityForEntity(entity, project, product);
    grouped.set(product.id, current);
  });

  const lines = [...grouped.values()].map<BudgetLine>(({ product, entityIds, modelQuantity }) => {
    const quantityPerM2 = modelQuantity / referenceAreaM2;
    const projectedQuantity = quantityPerM2 * targetAreaM2;
    const rateEur = Math.max(0, rateOverrides[product.id] ?? defaultBudgetRate(product));
    const baseCostEur = projectedQuantity * rateEur;
    const wasteCostEur = product.placementKind === 'coverage' ? baseCostEur * wastePct / 100 : 0;
    return {
      product,
      entityIds,
      unit: budgetUnit(product),
      modelQuantity,
      quantityPerM2,
      projectedQuantity,
      rateEur,
      baseCostEur,
      wasteCostEur,
      totalCostEur: baseCostEur + wasteCostEur,
    };
  }).sort((a, b) => b.totalCostEur - a.totalCostEur);

  const baseCostEur = lines.reduce((sum, line) => sum + line.baseCostEur, 0);
  const wasteCostEur = lines.reduce((sum, line) => sum + line.wasteCostEur, 0);
  const subtotalEur = baseCostEur + wasteCostEur;
  const vatEur = subtotalEur * vatPct / 100;
  const totalEur = subtotalEur + vatEur;
  return {
    referenceAreaM2,
    targetAreaM2,
    lines,
    baseCostEur,
    wasteCostEur,
    subtotalEur,
    vatEur,
    totalEur,
    totalPerM2Eur: totalEur / targetAreaM2,
  };
}

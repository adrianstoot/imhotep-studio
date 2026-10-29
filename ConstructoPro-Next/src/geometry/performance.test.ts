import { describe, expect, it } from 'vitest';
import { PRODUCT_BY_ID } from '../data/catalog';
import { createPerformanceProject } from '../domain/projectFactory';
import { computeCoverageLayout } from './layout';

describe('escena máxima representativa', () => {
  it('genera más de veinte mil unidades de una escena 12×12 m en tiempo interactivo de CPU', () => {
    const project = createPerformanceProject();
    const started = performance.now();
    const layouts = project.entities.flatMap((entity) => {
      const product = PRODUCT_BY_ID.get(entity.productId);
      const variant = product?.variants.find((item) => item.id === entity.variantId);
      return entity.coverage && variant ? [computeCoverageLayout(entity.coverage, variant)] : [];
    });
    const elapsed = performance.now() - started;
    const pieces = layouts.reduce((sum, layout) => sum + layout.pieces.length, 0);
    expect(pieces).toBeGreaterThan(20_000);
    expect(project.entities.every((entity) => !entity.coverage || (entity.coverage.widthMm === 12000 && entity.coverage.heightMm === 12000))).toBe(true);
    expect(elapsed).toBeLessThan(1_000);
  });
});

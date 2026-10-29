import { describe, expect, it } from 'vitest';
import fc from 'fast-check';
import type { CoverageSpec, ProductVariant } from '../domain/types';
import { computeCoverageLayout, coverageUnitDimensionsRemainImmutable } from './layout';

const brick: ProductVariant = { id: 'brick', label: '240×100×115', widthMm: 240, heightMm: 100, depthMm: 115 };

function coverage(widthMm: number, heightMm: number, overrides: Partial<CoverageSpec> = {}): CoverageSpec {
  return { widthMm, heightMm, jointMm: 10, stagger: true, overlapMm: 0, pieceExceptions: [], ...overrides };
}

describe('motor de paños', () => {
  it('mantiene las piezas comerciales al pasar de 1×1 a 3×4 m', () => {
    const one = computeCoverageLayout(coverage(1000, 1000), brick);
    const twelve = computeCoverageLayout(coverage(3000, 4000), brick);
    expect(coverageUnitDimensionsRemainImmutable(one, brick)).toBe(true);
    expect(coverageUnitDimensionsRemainImmutable(twelve, brick)).toBe(true);
    expect(twelve.fullUnits).toBeGreaterThan(one.fullUnits);
    expect(twelve.requestedAreaM2).toBe(12);
  });

  it('conserva paso y solape de una teja al ampliar el área', () => {
    const tile: ProductVariant = { id: 'tile', label: 'TB-10', widthMm: 289, heightMm: 474, depthMm: 78 };
    const two = computeCoverageLayout(coverage(2000, 1000, { jointMm: 2, stagger: false, overlapMm: 80 }), tile);
    const five = computeCoverageLayout(coverage(2500, 2000, { jointMm: 2, stagger: false, overlapMm: 80 }), tile);
    expect(coverageUnitDimensionsRemainImmutable(two, tile)).toBe(true);
    expect(coverageUnitDimensionsRemainImmutable(five, tile)).toBe(true);
    expect(five.fullUnits).toBeGreaterThan(two.fullUnits);
  });

  it('recorta todas las unidades alrededor de un hueco sin invadirlo', () => {
    const opening = { id: 'window', xMm: 0, yMm: 0, widthMm: 1000, heightMm: 1200 };
    const result = computeCoverageLayout(coverage(4800, 3200), brick, [opening]);
    const openingX0 = -500;
    const openingX1 = 500;
    const openingY0 = -600;
    const openingY1 = 600;
    result.pieces.forEach((piece) => {
      const x0 = piece.xMm - piece.widthMm / 2;
      const x1 = piece.xMm + piece.widthMm / 2;
      const y0 = piece.yMm - piece.heightMm / 2;
      const y1 = piece.yMm + piece.heightMm / 2;
      const invades = x0 < openingX1 && x1 > openingX0 && y0 < openingY1 && y1 > openingY0;
      expect(invades).toBe(false);
    });
    result.joints.forEach((joint) => {
      const x0 = joint.xMm - joint.widthMm / 2;
      const x1 = joint.xMm + joint.widthMm / 2;
      const y0 = joint.yMm - joint.heightMm / 2;
      const y1 = joint.yMm + joint.heightMm / 2;
      const invades = x0 < openingX1 && x1 > openingX0 && y0 < openingY1 && y1 > openingY0;
      expect(invades).toBe(false);
    });
    expect(result.cutUnits).toBeGreaterThan(0);
    expect(result.mortarAreaM2).toBeGreaterThan(0);
  });

  it('permite retirar una unidad sin destruir el patrón', () => {
    const base = computeCoverageLayout(coverage(1000, 1000), brick);
    const key = base.pieces.find((piece) => !piece.cut)!.key;
    const edited = computeCoverageLayout(coverage(1000, 1000, { pieceExceptions: [{ key, hidden: true }] }), brick);
    expect(edited.hiddenUnits).toBe(1);
    expect(edited.pieces.some((piece) => piece.key === key)).toBe(false);
  });

  it('respeta los límites para superficies aleatorias', () => {
    fc.assert(fc.property(
      fc.integer({ min: 250, max: 12_000 }),
      fc.integer({ min: 120, max: 12_000 }),
      fc.integer({ min: 0, max: 20 }),
      (widthMm, heightMm, jointMm) => {
        const result = computeCoverageLayout(coverage(widthMm, heightMm, { jointMm }), brick);
        const minX = -widthMm / 2 - 0.02;
        const maxX = widthMm / 2 + 0.02;
        const minY = -heightMm / 2 - 0.02;
        const maxY = heightMm / 2 + 0.02;
        return result.pieces.every((piece) =>
          piece.xMm - piece.widthMm / 2 >= minX
          && piece.xMm + piece.widthMm / 2 <= maxX
          && piece.yMm - piece.heightMm / 2 >= minY
          && piece.yMm + piece.heightMm / 2 <= maxY,
        );
      },
    ), { numRuns: 120 });
  });
});

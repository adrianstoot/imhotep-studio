import { describe, expect, it } from 'vitest';
import { createProject } from '../domain/projectFactory';
import { calculateProjectBudget } from './budget';

describe('presupuesto vivo', () => {
  it('agrupa todos los productos colocados y conserva sus fuentes', () => {
    const project = createProject(true);
    const result = calculateProjectBudget(project);
    expect(result.lines.length).toBeGreaterThan(8);
    expect(result.lines.every((line) => line.entityIds.length > 0)).toBe(true);
    expect(result.lines.every((line) => line.product.source.url.startsWith('https://'))).toBe(true);
  });

  it('recalcula cantidades e importe al cambiar la superficie objetivo', () => {
    const project = createProject(true);
    project.budget.vatPct = 0;
    project.budget.wastePct = 0;
    project.budget.areaM2 = 10;
    const ten = calculateProjectBudget(project);
    project.budget.areaM2 = 20;
    const twenty = calculateProjectBudget(project);
    expect(twenty.totalEur).toBeCloseTo(ten.totalEur * 2, 8);
    expect(twenty.lines[0].projectedQuantity).toBeCloseTo(ten.lines[0].projectedQuantity * 2, 8);
  });

  it('aplica una tarifa editable al producto sin alterar el modelo 3D', () => {
    const project = createProject(true);
    project.budget.vatPct = 0;
    project.budget.wastePct = 0;
    const initial = calculateProjectBudget(project);
    const target = initial.lines[0];
    project.budget.rateOverrides[target.product.id] = target.rateEur * 2;
    const edited = calculateProjectBudget(project);
    const editedLine = edited.lines.find((line) => line.product.id === target.product.id)!;
    expect(editedLine.totalCostEur).toBeCloseTo(target.totalCostEur * 2, 8);
    expect(project.entities).toHaveLength(createProject(true).entities.length);
  });
});

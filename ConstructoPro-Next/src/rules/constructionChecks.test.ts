import { describe, expect, it } from 'vitest';
import { Euler, Vector3 } from 'three';
import { PRODUCT_CATALOG } from '../data/catalog';
import { createProject, entityFromProduct } from '../domain/projectFactory';
import { evaluateProject } from './cte';
import { layersOnNormalRay, surfaceAxes, surfaceSlopePct } from './constructionChecks';

const insulation = PRODUCT_CATALOG.find((product) => product.geometryKind === 'insulation')!;
const make = (x = 0) => entityFromProduct(insulation, { position: [x, 1000, 0], rotation: [0, 0, 0] });

describe('comprobaciones constructivas y alcance normativo', () => {
  it('detecta pendiente y goterón insuficientes sin confundir geometría con validación completa', () => {
    const project = createProject(true);
    const window = project.entities.find((entity) => entity.opening)!;
    const rule = () => evaluateProject(project).find((entry) => entry.id === `sill-${window.id}`)!;
    expect(rule().severity).toBe('pass');
    expect(rule().message).toMatch(/parcial/);
    window.opening!.installation!.sillSlopeDeg = 4.5;
    expect(rule().severity).toBe('error');
    window.opening!.installation!.sillSlopeDeg = 10;
    window.opening!.installation!.sillProjectionMm = 20;
    expect(rule().severity).toBe('error');
  });
  it('usa el mismo sistema XYZ que el render con varias rotaciones simultáneas', () => {
    const rotation: [number, number, number] = [0.37, -0.62, 0.24];
    const actual = surfaceAxes(rotation);
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((axis, index) => {
      const expected = new Vector3(...axis as [number, number, number]).applyEuler(new Euler(...rotation, 'XYZ'));
      actual[index].forEach((value, component) => expect(value).toBeCloseTo(expected.toArray()[component], 10));
    });
  });

  it('distingue faldón horizontal, pendiente del 35% y tejas verticales', () => {
    const entity = make();
    expect(surfaceSlopePct(entity)).toBe(Number.POSITIVE_INFINITY);
    entity.transform.rotation = [-Math.PI / 2, 0, 0];
    expect(surfaceSlopePct(entity)).toBeCloseTo(0);
    entity.transform.rotation = [-Math.PI / 2 + Math.atan(0.35), 0, 0];
    expect(surfaceSlopePct(entity)).toBeCloseTo(35);
  });

  it('no suma dos paños separados como capas térmicas en serie', () => {
    const reference = make();
    const distant = make(10000);
    const crossed = layersOnNormalRay([reference, distant], reference);
    expect(crossed.map((entity) => entity.id)).toEqual([reference.id]);
  });

  it('el dato de reacción al fuego nunca equivale a cumplimiento de SI2', () => {
    const project = createProject(false);
    project.entities = [make()];
    const fire = evaluateProject(project).find((entry) => entry.id === 'fire')!;
    expect(fire.severity).not.toBe('pass');
  });

  it('detecta tejas verticales aunque sus solapes sean positivos', () => {
    const project = createProject(false, 'cubierta-inclinada');
    const product = PRODUCT_CATALOG.find((entry) => entry.geometryKind === 'roof-tile')!;
    project.entities = [entityFromProduct(product, { position: [0, 0, 0], rotation: [0, 0, 0] })];
    const results = evaluateProject(project);
    expect(results.find((entry) => entry.id === 'roof-slope')?.severity).toBe('error');
    expect(results.find((entry) => entry.id === 'roof-overlaps')?.severity).toBe('error');
  });

  it('SATE no exige subestructura de fachada ventilada', () => {
    const project = createProject(false, 'fachada-sate');
    const result = evaluateProject(project).find((entry) => entry.id === 'layer-order')!;
    expect(result.message).not.toContain('Subestructuras');
  });
});

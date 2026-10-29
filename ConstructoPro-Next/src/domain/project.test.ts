import { describe, expect, it } from 'vitest';
import { BASE_PRODUCT_CATALOG, CATEGORY_TARGETS, PRODUCT_CATALOG } from '../data/catalog';
import { PREMIUM_CATALOG } from '../data/catalogPresentation';
import { computeCoverageLayout, coverageUnitDimensionsRemainImmutable } from '../geometry/layout';
import { resolveSection } from '../geometry/sectionResolver';
import { evaluateProject } from '../rules/cte';
import { migrateProject } from '../state/persistence';
import { createProject, defaultCoverageFor, entityFromProduct } from './projectFactory';

describe('documento ConstructoPro', () => {
  it('conserva las 200 referencias de fabricante y añade componentes docentes sin duplicar IDs', () => {
    expect(BASE_PRODUCT_CATALOG).toHaveLength(200);
    expect(PRODUCT_CATALOG.length).toBeGreaterThan(200);
    expect(new Set(PRODUCT_CATALOG.map((product) => product.id)).size).toBe(PRODUCT_CATALOG.length);
    Object.entries(CATEGORY_TARGETS).forEach(([category, target]) => {
      expect(PRODUCT_CATALOG.filter((product) => product.category === category)).toHaveLength(target);
    });
  });

  it('mantiene vacíos los datos técnicos de fuentes no verificadas', () => {
    PRODUCT_CATALOG.filter((product) => product.source.quality === 'source-linked').forEach((product) => {
      expect(Object.keys(product.properties)).toHaveLength(0);
    });
  });

  it('publica 50 cartas premium únicas con imagen y producto real enlazado', () => {
    expect(PREMIUM_CATALOG).toHaveLength(50);
    expect(new Set(PREMIUM_CATALOG.map((item) => item.product.id)).size).toBe(50);
    expect(new Set(PREMIUM_CATALOG.map((item) => item.artwork)).size).toBe(50);
    PREMIUM_CATALOG.forEach((item) => {
      expect(item.artwork).toMatch(/^\/catalog\/card-\d{2}-.+\.webp$/);
      expect(item.product.source.url).toMatch(/^https:\/\//);
    });
  });

  it('inicia cada producto superficial premium como un paño editable exacto de 1 m²', () => {
    PREMIUM_CATALOG.filter((item) => item.product.placementKind === 'coverage').forEach(({ product }) => {
      const coverage = defaultCoverageFor(product);
      expect(coverage?.widthMm).toBe(1000);
      expect(coverage?.heightMm).toBe(1000);
      const layout = computeCoverageLayout(coverage!, product.variants[0]);
      expect(layout.requestedAreaM2).toBe(1);
      expect(coverageUnitDimensionsRemainImmutable(layout, product.variants[0])).toBe(true);
    });
  });

  it('mantiene la baldosa Bottega en 596 × 596 × 20 mm y cierra el paño con junta de 3 mm', () => {
    const item = PREMIUM_CATALOG.find((entry) => entry.product.name.startsWith('Pavimento Porcelanosa'))!;
    const variant = item.product.variants[0];
    const coverage = defaultCoverageFor(item.product)!;
    const layout = computeCoverageLayout(coverage, variant);
    expect([variant.widthMm, variant.heightMm, variant.depthMm]).toEqual([596, 596, 20]);
    expect(coverage.headJointMm).toBe(3);
    expect(coverage.bedJointMm).toBe(3);
    expect(layout.joints.length).toBeGreaterThan(0);
    expect(layout.coveredAreaM2 + layout.mortarAreaM2).toBeGreaterThanOrEqual(0.999);
  });

  it('conserva las dimensiones oficiales corregidas de Planum y DANOLOSA', () => {
    const planumProduct = PREMIUM_CATALOG.find((entry) => entry.product.name === 'Planum · Blackstone')!.product;
    const planum = planumProduct.variants[0];
    const danolosa = PREMIUM_CATALOG.find((entry) => entry.product.name === 'DANOLOSA · Gris 75 mm')!.product.variants[0];
    expect([planum.widthMm, planum.heightMm, planum.depthMm, planum.unitWeightKg]).toEqual([278, 441, 32, 3.5]);
    expect([danolosa.widthMm, danolosa.heightMm, danolosa.depthMm, danolosa.unitWeightKg]).toEqual([500, 500, 75, 15]);
    const coverage = defaultCoverageFor(planumProduct)!;
    const layout = computeCoverageLayout(coverage, planum);
    const firstRowX = layout.pieces.filter((piece) => piece.row === 0).map((piece) => piece.xMm).sort((a, b) => a - b);
    expect(coverage.jointMm).toBe(0);
    expect(coverage.overlapMm).toBe(71);
    expect(coverage.sideOverlapMm).toBe(41);
    expect(firstRowX[1] - firstRowX[0]).toBe(237);
  });

  it('modula TB-10 Class con sus pasos útiles sin estirar la teja comercial', () => {
    const product = PREMIUM_CATALOG.find((entry) => entry.product.name === 'TB-10 Class · Roja')!.product;
    const variant = product.variants[0];
    const coverage = defaultCoverageFor(product)!;
    expect([variant.widthMm, variant.heightMm, variant.depthMm, variant.unitWeightKg]).toEqual([289, 474, 78, 3.7]);
    expect(coverage.overlapMm).toBe(64);
    expect(coverage.sideOverlapMm).toBe(53);
    expect(coverageUnitDimensionsRemainImmutable(computeCoverageLayout(coverage, variant), variant)).toBe(true);
  });

  it('serializa e importa el proyecto sin pérdida', () => {
    const project = createProject(true);
    const roundTrip = migrateProject(JSON.parse(JSON.stringify(project)));
    expect(roundTrip).toEqual(project);
  });

  it('migra un contexto anterior sin atribuirle una zona automática inventada', () => {
    const legacy = structuredClone(createProject(true)) as unknown as Record<string, unknown> & {
      schemaVersion: number;
      context: Record<string, unknown>;
    };
    legacy.schemaVersion = 3;
    delete legacy.context.province;
    delete legacy.context.altitudeM;
    delete legacy.context.climateZoneSource;
    const migrated = migrateProject(legacy);
    expect(migrated.schemaVersion).toBe(4);
    expect(migrated.context.climateZone).toBe(legacy.context.climateZone);
    expect(migrated.context.climateZoneSource).toBe('manual');
    expect(migrated.context.altitudeM).toBeNull();
  });

  it('crea el detalle de 4,8 × 3,2 m por objetos independientes y cutaway escalonado', () => {
    const project = createProject(true);
    const wall = project.entities.find((entity) => entity.name.includes('Hoja cerámica'));
    const slab = project.entities.find((entity) => entity.name.includes('Forjado superior'));
    const opening = project.entities.find((entity) => entity.opening);
    expect(wall?.coverage?.widthMm).toBe(4200);
    expect(wall?.coverage?.heightMm).toBe(3200);
    expect(slab?.coverage?.widthMm).toBe(4800);
    expect(opening?.opening?.hostIds.length).toBeGreaterThanOrEqual(4);
    expect(opening?.opening?.installation).toMatchObject({ jointMm: 20, preframeFaceMm: 30, sillSlopeDeg: 10, lintelBearingMm: 200 });
    // The complete installation now belongs to the opening and follows its transform.
    expect(project.entities.some((entity) => /independiente/.test(entity.name))).toBe(false);
    expect(project.entities.every((entity) => Boolean(entity.productId))).toBe(true);
  });

  it('descompone DANOLOSA en sus dos capas físicas en la sección horizontal', () => {
    const product = PRODUCT_CATALOG.find((entry) => entry.name.startsWith('DANOLOSA'))!;
    const project = createProject(false);
    project.entities = [entityFromProduct(product, {
      position: [0, 0, 0],
      rotation: [-Math.PI / 2, 0, 0],
    })];
    project.section.offsetMm = 0;
    const section = resolveSection(project);
    expect(section.primitives.map((primitive) => primitive.label)).toEqual([
      'XPS drenante · 40 mm',
      'Hormigón poroso · 35 mm',
    ]);
    expect(section.primitives.reduce((sum, primitive) => sum + primitive.y1 - primitive.y0, 0)).toBeCloseTo(75);
  });

  it('cada regla devuelve fuente, explicación y versión trazable', () => {
    const results = evaluateProject(createProject(true));
    expect(results.length).toBeGreaterThan(4);
    results.forEach((result) => {
      expect(result.message.length).toBeGreaterThan(15);
      expect(result.sourceLabel).toContain('CTE');
      expect(result.sourceUrl).toMatch(/^https:\/\//);
    });
  });
});

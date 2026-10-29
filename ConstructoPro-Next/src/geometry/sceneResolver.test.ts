import { describe, expect, it } from 'vitest';
import { PRODUCT_BY_ID } from '../data/catalog';
import { createProject } from '../domain/projectFactory';
import { resolveJambSection } from './sectionResolver';
import {
  clampCommercialCutLength,
  openingsForEntity,
  resolveLinearSegments,
  synchronizeOpeningRelations,
} from './sceneResolver';

describe('resolver geométrico de huecos', () => {
  it('corta capas, divide perfiles y suprime fijaciones con una sola abertura', () => {
    const project = createProject(true);
    const opening = project.entities.find((entity) => entity.opening)!;
    const behaviors = new Set(opening.opening!.affectedEntities.map((entry) => entry.behavior));

    expect(behaviors).toContain('cut-coverage');
    expect(behaviors).toContain('split-linear');
    expect(behaviors).toContain('suppress-unit');

    const affectedNames = opening.opening!.affectedEntities.map((relation) => (
      project.entities.find((entity) => entity.id === relation.entityId)?.name ?? ''
    ));
    expect(affectedNames.some((name) => name.includes('Hoja cerámica'))).toBe(true);
    expect(affectedNames.some((name) => name.includes('Regularización'))).toBe(true);
    expect(affectedNames.some((name) => name.includes('Aislamiento'))).toBe(true);
    expect(affectedNames.some((name) => name.includes('Membrana'))).toBe(true);
    expect(affectedNames.some((name) => name.includes('Perfil'))).toBe(true);
    expect(affectedNames.some((name) => name.includes('Ménsula') || name.includes('Fijación'))).toBe(true);
  });

  it('genera tramos de perfil que nunca atraviesan el hueco', () => {
    const project = createProject(true);
    const profileEntity = project.entities.find((entity) => entity.name.includes('Perfil horizontal 3.2'))!;
    const product = PRODUCT_BY_ID.get(profileEntity.productId)!;
    const openings = openingsForEntity(profileEntity, project.entities, 'split-linear');
    const segments = resolveLinearSegments(profileEntity, product, openings);

    expect(openings).toHaveLength(1);
    expect(segments.length).toBeGreaterThanOrEqual(1);
    const opening = openings[0];
    const cutStart = opening.yMm - opening.heightMm / 2;
    const cutEnd = opening.yMm + opening.heightMm / 2;
    segments.forEach((segment) => {
      const start = segment.centerMm - segment.lengthMm / 2;
      const end = segment.centerMm + segment.lengthMm / 2;
      expect(end <= cutStart + 0.01 || start >= cutEnd - 0.01).toBe(true);
    });
  });

  it('considera la profundidad y deja de afectar objetos fuera del volumen del hueco', () => {
    const project = createProject(true);
    const opening = project.entities.find((entity) => entity.opening)!;
    const bracket = project.entities.find((entity) => entity.name.includes('Ménsula')
      && entity.transform.position[0] === 450
      && entity.transform.position[1] === 1650)!;
    expect(opening.opening!.affectedEntities.some((entry) => entry.entityId === bracket.id)).toBe(true);

    const moved = {
      ...project,
      entities: project.entities.map((entity) => entity.id === bracket.id
        ? { ...entity, transform: { ...entity.transform, position: [450, 1650, 5000] as [number, number, number] } }
        : entity),
    };
    const synchronized = synchronizeOpeningRelations(moved);
    const nextOpening = synchronized.entities.find((entity) => entity.id === opening.id)!;
    expect(nextOpening.opening!.affectedEntities.some((entry) => entry.entityId === bracket.id)).toBe(false);
  });

  it('respeta stock, longitud mínima e incremento comercial', () => {
    const project = createProject(true);
    const profileEntity = project.entities.find((entity) => entity.name.includes('Perfil vertical'))!;
    const product = PRODUCT_BY_ID.get(profileEntity.productId)!;
    const variant = product.variants[0];

    expect(clampCommercialCutLength(product, variant, 9000)).toBe(variant.stockLengthMm);
    expect(clampCommercialCutLength(product, variant, 5)).toBe(variant.minCutLengthMm);
    expect(clampCommercialCutLength(product, variant, 123.4)).toBe(123);
  });

  it('deriva la jamba 2D del mismo vacío sin dibujar capas detrás', () => {
    const project = createProject(true);
    const jamb = resolveJambSection(project);
    const openingId = jamb.openingEntity!.id;
    const affected = new Set(jamb.openingEntity!.opening!.affectedEntities.map((entry) => entry.entityId));

    jamb.primitives
      .filter((primitive) => primitive.entity.id !== openingId && affected.has(primitive.entity.id))
      .forEach((primitive) => {
        expect(primitive.x1 <= jamb.jambX + 0.01).toBe(true);
      });
  });
});

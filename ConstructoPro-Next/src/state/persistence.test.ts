import { describe, expect, it } from 'vitest';
import { createProject } from '../domain/projectFactory';
import { migrateProject } from './persistence';

describe('validación de importaciones', () => {
  it('rechaza coordenadas no finitas antes de llegar al motor 3D', () => {
    const project = createProject(true);
    project.entities[0].transform.position[0] = Number.NaN;
    expect(() => migrateProject(project)).toThrow(/coordenadas/);
  });
  it('rechaza identificadores duplicados que romperían selección e historial', () => {
    const project = createProject(true);
    project.entities[1].id = project.entities[0].id;
    expect(() => migrateProject(project)).toThrow(/duplicado/);
  });
  it('rechaza referencias de producto que esta versión no conoce', () => {
    const project = createProject(true);
    project.entities[0].productId = 'producto-inexistente';
    expect(() => migrateProject(project)).toThrow(/desconocidos/);
  });
  it('conserva el montaje al exportar e importar y rechaza una cuña invertida', () => {
    const project = createProject(true);
    const opening = project.entities.find((entity) => entity.opening)!.opening!;
    expect(migrateProject(JSON.parse(JSON.stringify(project))).entities.find((entity) => entity.opening)!.opening!.installation).toEqual(opening.installation);
    opening.installation!.sillSlopeDeg = 30;
    expect(() => migrateProject(project)).toThrow(/altura de apoyo/);
  });
});

import { describe, expect, it } from 'vitest';
import {
  canonicalProvince,
  CTE_PROVINCES,
  PROVINCE_CLIMATE_RANGES,
  resolveCteClimateZone,
} from './climateZone';

describe('tabla climática oficial DB-HE Anejo B', () => {
  it('contiene las 52 filas territoriales de la tabla oficial', () => {
    expect(CTE_PROVINCES).toHaveLength(52);
    expect(Object.keys(PROVINCE_CLIMATE_RANGES)).toHaveLength(52);
  });

  it('respeta todos los cambios de tramo de Madrid', () => {
    expect(resolveCteClimateZone('Madrid', 0)?.zone).toBe('C3');
    expect(resolveCteClimateZone('Madrid', 500)?.zone).toBe('C3');
    expect(resolveCteClimateZone('Madrid', 501)?.zone).toBe('D3');
    expect(resolveCteClimateZone('Madrid', 950)?.zone).toBe('D3');
    expect(resolveCteClimateZone('Madrid', 951)?.zone).toBe('D2');
    expect(resolveCteClimateZone('Madrid', 1000)?.zone).toBe('D2');
    expect(resolveCteClimateZone('Madrid', 1001)?.zone).toBe('E1');
  });

  it('incluye los casos extremos peninsulares e insulares', () => {
    expect(resolveCteClimateZone('León', 25)?.zone).toBe('E1');
    expect(resolveCteClimateZone('Granada', 25)?.zone).toBe('A4');
    expect(resolveCteClimateZone('Granada', 1301)?.zone).toBe('E1');
    expect(resolveCteClimateZone('Palmas, Las', 300)?.zone).toBe('α3');
    expect(resolveCteClimateZone('Santa Cruz de Tenerife', 1001)?.zone).toBe('C2');
  });

  it('normaliza acentos pero nunca deduce una zona a partir del municipio', () => {
    expect(canonicalProvince('almeria')).toBe('Almería');
    expect(resolveCteClimateZone('Bilbao', 20)).toBeNull();
    expect(resolveCteClimateZone('Bizkaia', null)).toBeNull();
    expect(resolveCteClimateZone('Bizkaia', -1)).toBeNull();
  });
});

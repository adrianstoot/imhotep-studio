export const CTE_DB_HE_URL = 'https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf';
export const CTE_CLIMATE_SOURCE = 'CTE DB-HE · Anejo B · tabla a';
export const CTE_CLIMATE_VERSION = 'DB-HE consolidado · RD 450/2022 + corrección BOE 02/02/2023';

type ClimateRange = readonly [maxAltitudeM: number, zone: string];

// Extracted from the vector cell boundaries of table a-Anejo B on page 46.
// `*` is the final unbounded altitude interval for a province.
const RAW_TABLE = `
Albacete|450:C3,950:D3,*:E1
Alicante/Alacant|250:B4,700:C3,*:D3
Almería|100:A4,250:B4,400:B3,800:C3,*:D3
Araba/Álava|600:D1,*:E1
Asturias|50:C1,550:D1,*:E1
Ávila|550:D2,850:D1,*:E1
Badajoz|400:C4,450:C3,*:D3
Balears, Illes|250:B3,*:C3
Barcelona|250:C2,450:D2,750:D1,*:E1
Bizkaia|250:C1,*:D1
Burgos|600:D1,*:E1
Cáceres|600:C4,1050:D3,*:E1
Cádiz|150:A3,450:B3,600:C3,850:C2,*:D2
Cantabria|150:C1,650:D1,*:E1
Castellón/Castelló|100:B3,500:C3,600:D3,1000:D2,*:E1
Ceuta|*:B3
Ciudad Real|450:C4,500:C3,*:D3
Córdoba|150:B4,550:C4,*:D3
Coruña, A|200:C1,*:D1
Cuenca|800:D3,1050:D2,*:E1
Gipuzkoa|400:D1,*:E1
Girona|100:C2,600:D2,*:E1
Granada|50:A4,350:B4,600:C4,800:C3,1300:D3,*:E1
Guadalajara|950:D3,1000:D2,*:E1
Huelva|50:A4,150:B4,350:B3,800:C3,*:D3
Huesca|200:C3,400:D3,700:D2,*:E1
Jaén|350:B4,750:C4,1250:D3,*:E1
León|*:E1
Lleida|100:C3,600:D3,*:E1
Lugo|500:D1,*:E1
Madrid|500:C3,950:D3,1000:D2,*:E1
Málaga|100:A3,300:B3,700:C3,*:D3
Melilla|*:A3
Murcia|100:B3,550:C3,*:D3
Navarra|100:C2,350:D2,600:D1,*:E1
Ourense|150:C3,300:C2,800:D2,*:E1
Palencia|800:D1,*:E1
Palmas, Las|350:α3,750:A2,1000:B2,*:C2
Pontevedra|350:C1,*:D1
Rioja, La|200:C2,700:D2,*:E1
Salamanca|850:D2,*:E1
Santa Cruz de Tenerife|350:α3,750:A2,1000:B2,*:C2
Segovia|1050:D2,*:E1
Sevilla|200:B4,*:C4
Soria|750:D2,800:D1,*:E1
Tarragona|100:B3,500:C3,*:D3
Teruel|450:C3,500:C2,1000:D2,*:E1
Toledo|500:C4,*:D3
Valencia/València|50:B3,500:C3,950:D2,*:E1
Valladolid|800:D2,*:E1
Zamora|800:D2,*:E1
Zaragoza|200:C3,650:D3,*:E1
`.trim();

export const PROVINCE_CLIMATE_RANGES: Readonly<Record<string, readonly ClimateRange[]>> = Object.freeze(
  Object.fromEntries(RAW_TABLE.split('\n').map((line) => {
    const [province, encodedRanges] = line.split('|');
    const ranges = encodedRanges.split(',').map((encoded) => {
      const [max, zone] = encoded.split(':');
      return [max === '*' ? Number.POSITIVE_INFINITY : Number(max), zone] as const;
    });
    return [province, Object.freeze(ranges)];
  })),
);

export const CTE_PROVINCES = Object.freeze(Object.keys(PROVINCE_CLIMATE_RANGES));

function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLocaleLowerCase('es-ES');
}

export interface ClimateZoneResolution {
  province: string;
  altitudeM: number;
  zone: string;
  sourceLabel: typeof CTE_CLIMATE_SOURCE;
  sourceUrl: typeof CTE_DB_HE_URL;
}

export function canonicalProvince(value: string): string | null {
  const key = normalized(value);
  return CTE_PROVINCES.find((province) => normalized(province) === key) ?? null;
}

export function resolveCteClimateZone(provinceInput: string, altitudeM: number | null): ClimateZoneResolution | null {
  const province = canonicalProvince(provinceInput);
  if (!province || altitudeM === null || !Number.isFinite(altitudeM) || altitudeM < 0) return null;
  const match = PROVINCE_CLIMATE_RANGES[province].find(([max]) => altitudeM <= max);
  if (!match) return null;
  return {
    province,
    altitudeM,
    zone: match[1],
    sourceLabel: CTE_CLIMATE_SOURCE,
    sourceUrl: CTE_DB_HE_URL,
  };
}

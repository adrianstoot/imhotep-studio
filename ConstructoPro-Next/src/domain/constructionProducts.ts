import type { ProductDefinition } from './types';

/** Generic teaching components. Dimensions define the example, never a certified branded system. */
const reference = (id: string, name: string, kind: ProductDefinition['geometryKind'], placement: ProductDefinition['placementKind'], width: number, height: number, depth: number, color: string): ProductDefinition => ({
  id, sku: id.toUpperCase(), name, manufacturer: 'Referencia constructiva', manufacturerUrl: 'https://www.codigotecnico.org/DocumentosCTE/Salubridad.html',
  category: kind === 'profile' || kind === 'bracket' ? 'Subestructuras y fijaciones' : 'Impermeabilización',
  scopes: ['cubierta-inclinada', 'cubierta-plana', 'terraza', 'pavimento'], geometryKind: kind, placementKind: placement,
  color, accent: color, roughness: 0.86, metalness: 0,
  variants: [{ id: `${id}-variant`, label: `${width} × ${height} × ${depth} mm · dimensión de ejemplo`, widthMm: width, heightMm: height, depthMm: depth, ...(placement === 'linear' ? { stockLengthMm: height, minCutLengthMm: 50, cutIncrementMm: 1 } : {}) }],
  defaultVariantId: `${id}-variant`, ...(placement === 'coverage' ? { defaultCoverageMm: { width: 1000, height: 1000 } } : {}),
  jointMm: 0, overlapMm: kind === 'membrane' ? 100 : 0,
  openingBehavior: placement === 'coverage' ? 'cut-coverage' : placement === 'linear' ? 'split-linear' : ['bracket', 'fastener'].includes(kind) ? 'suppress-unit' : 'ignore', properties: {},
  media: [], source: { url: 'https://www.codigotecnico.org/pdf/Documentos/HS/DBHS.pdf', documentTitle: 'CTE DB-HS · principios de envolvente; componente docente sin ficha de fabricante', reviewedAt: '2026-10-28', quality: 'source-linked' },
  evidence: { geometry: 'procedural-approximation', texture: 'procedural-pbr', restored: ['Sección rectangular y longitud de corte', 'Dimensiones explícitas del ejemplo'], speculation: ['Referencia docente genérica; seleccionar producto y verificar solución de proyecto', 'Sin prestaciones térmicas, mecánicas o higrotérmicas declaradas'] },
});

export const CONSTRUCTION_PRODUCTS: ProductDefinition[] = [
  reference('edu-timber-batten-50x30', 'Rastrel de madera · 50×30 mm · 4 m', 'profile', 'linear', 50, 4000, 30, '#ad7b46'),
  reference('edu-geotextile-separator', 'Capa separadora geotextil · 2 mm', 'membrane', 'coverage', 10000, 2000, 2, '#e3e1d7'),
  reference('edu-vapour-control', 'Capa de control de vapor · 0,2 mm', 'membrane', 'coverage', 10000, 2000, 0.2, '#d1a86c'),
  { ...reference('edu-facade-bracket', 'Ménsula de fachada · salida 160 mm', 'bracket', 'unit', 80, 160, 160, '#acb2b5'), scopes: ['fachada-ventilada'], metalness: 0.65, roughness: 0.3 },
  { ...reference('edu-etics-insulation-80', 'Aislante SATE · ejemplo 80 mm', 'insulation', 'coverage', 1200, 600, 80, '#d6cfaa'), category: 'Aislamientos', scopes: ['fachada-sate'] },
  { ...reference('edu-etics-mesh', 'Malla de refuerzo SATE · ejemplo 0,5 mm', 'membrane', 'coverage', 10000, 1000, 0.5, '#d8e3dd'), category: 'Morteros y sellantes', scopes: ['fachada-sate'] },
  { ...reference('edu-etics-finish', 'Acabado SATE · ejemplo 2 mm', 'finish', 'coverage', 1000, 1000, 2, '#e7e3d8'), category: 'Morteros y sellantes', scopes: ['fachada-sate'] },
  { ...reference('edu-partition-stud-70', 'Montante C · ejemplo 70 mm · 3 m', 'profile', 'linear', 40, 3000, 70, '#aeb6b9'), scopes: ['particion'], metalness: 0.68, roughness: 0.33 },
];

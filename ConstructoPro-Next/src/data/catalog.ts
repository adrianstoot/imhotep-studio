/** Built-in, source-traceable catalogue. Unknown technical values remain undefined. */
import type {
  DetailType,
  GeometryKind,
  PlacementKind,
  ProductCategory,
  ProductDefinition,
  ProductProperties,
  ProductVariant,
} from '../domain/types';
import { CONSTRUCTION_PRODUCTS } from '../domain/constructionProducts';

type VariantInput = {
  label: string;
  width: number;
  height: number;
  depth: number;
  weight?: number;
  code?: string;
  color?: string;
};

type SeriesInput = {
  manufacturer: string;
  manufacturerUrl: string;
  sourceUrl: string;
  sourceTitle: string;
  name: string;
  category: ProductCategory;
  scopes: DetailType[];
  geometry: GeometryKind;
  placement: PlacementKind;
  color: string;
  accent?: string;
  texture?: string;
  roughness?: number;
  metalness?: number;
  properties?: ProductProperties;
  variants: VariantInput[];
  coverage?: boolean;
  joint?: number;
  stagger?: boolean;
  overlap?: number;
  sideOverlap?: number;
  hostsOpenings?: boolean;
  createsOpening?: boolean;
  openingBehavior?: ProductDefinition['openingBehavior'];
  documented?: boolean;
  speculation?: string[];
};

const facadeScopes: DetailType[] = ['fachada-ventilada', 'fachada-sate', 'hueco-fachada'];
const roofScopes: DetailType[] = ['cubierta-inclinada', 'cubierta-plana', 'terraza'];
const allEnvelope: DetailType[] = [...facadeScopes, ...roofScopes, 'pavimento', 'particion'];

const v = (label: string, width: number, height: number, depth: number, weight?: number, code?: string): VariantInput => ({
  label, width, height, depth, weight, code,
});

const commonEvidence = (documented: boolean, speculation: string[] = []) => ({
  geometry: documented ? ('verified-dimensions' as const) : ('procedural-approximation' as const),
  texture: 'procedural-pbr' as const,
  restored: ['Contorno comercial', 'Espesor', 'Modulación', 'Diferencias de material'],
  speculation: speculation.length ? speculation : ['Geometría posterior no publicada', 'Microtextura recreada proceduralmente'],
});

function slug(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function expandSeries(series: SeriesInput[]): ProductDefinition[] {
  const products: ProductDefinition[] = [];
  series.forEach((s) => {
    s.variants.forEach((variant, index) => {
      const base = `${slug(s.manufacturer)}-${slug(s.name)}-${slug(variant.label)}`;
      const variantId = `${base}-variant`;
      const productVariant: ProductVariant = {
        id: variantId,
        label: variant.label,
        widthMm: variant.width,
        heightMm: variant.height,
        depthMm: variant.depth,
        unitWeightKg: variant.weight,
        commercialCode: variant.code,
        stockLengthMm: s.placement === 'linear' ? variant.height : undefined,
        minCutLengthMm: s.placement === 'linear' ? Math.min(100, variant.height) : undefined,
        cutIncrementMm: s.placement === 'linear' ? 1 : undefined,
      };
      products.push({
        id: base,
        sku: variant.code || `CP-${slug(s.manufacturer).slice(0, 4).toUpperCase()}-${slug(s.name).slice(0, 8).toUpperCase()}-${String(index + 1).padStart(2, '0')}`,
        name: `${s.name} · ${variant.label}`,
        manufacturer: s.manufacturer,
        manufacturerUrl: s.manufacturerUrl,
        category: s.category,
        scopes: s.scopes,
        geometryKind: s.geometry,
        placementKind: s.placement,
        color: variant.color ?? s.color,
        accent: s.accent || variant.color || s.color,
        roughness: s.roughness ?? 0.72,
        metalness: s.metalness ?? 0,
        texturePath: s.texture,
        media: [{
          id: `${base}-procedural-render`,
          kind: 'procedural-render',
          alt: `Render propio del producto ${s.name} de ${s.manufacturer}`,
          sourceUrl: s.sourceUrl,
          licenseStatus: 'internal-render',
          attribution: `Modelo procedural propio basado en documentación oficial de ${s.manufacturer}`,
          reviewedAt: '2026-08-12',
        }],
        variants: [productVariant],
        defaultVariantId: variantId,
        defaultCoverageMm: s.coverage ? { width: 1000, height: 1000 } : undefined,
        jointMm: s.joint ?? 5,
        stagger: s.stagger ?? false,
        overlapMm: s.overlap ?? 0,
        sideOverlapMm: s.sideOverlap ?? 0,
        canHostOpenings: s.hostsOpenings,
        createsOpening: s.createsOpening,
        openingBehavior: s.openingBehavior
          ?? (s.coverage ? 'cut-coverage'
            : s.geometry === 'profile' ? 'split-linear'
              : s.geometry === 'bracket' || s.geometry === 'fastener' ? 'suppress-unit'
                : 'ignore'),
        // Technical values only enter calculations when the exact series has
        // been checked against an official product document. Source-linked
        // catalogue rows deliberately keep unknown properties empty.
        properties: s.documented ? (s.properties || {}) : {},
        source: {
          url: s.sourceUrl,
          documentTitle: s.sourceTitle,
          reviewedAt: '2026-08-12',
          quality: s.documented ? 'documented' : 'source-linked',
        },
        evidence: commonEvidence(!!s.documented, s.speculation),
      });
    });
  });
  return products;
}

const SERIES: SeriesInput[] = [
  // 18 · soportes y fábrica
  {
    manufacturer: 'HISPALYT', manufacturerUrl: 'https://www.hispalyt.es/', sourceUrl: 'https://www.hispalyt.es/es/productos-ceramicos/tabiques-y-muros/productos', sourceTitle: 'Formatos habituales de ladrillos y bloques cerámicos',
    name: 'Ladrillo perforado métrico', category: 'Soportes y fábrica', scopes: [...facadeScopes, 'particion'], geometry: 'masonry', placement: 'coverage', color: '#b6532f', texture: '/texturas/brick_gero_real.png', coverage: true, joint: 10, stagger: true, hostsOpenings: true, documented: true,
    properties: { lambdaWmK: 0.5, densityKgM3: 1800, vaporMu: 10, fireClass: 'A1' },
    variants: [v('24×11,5×5 cm', 240, 50, 115), v('24×11,5×7 cm', 240, 70, 115), v('24×11,5×9 cm', 240, 90, 115), v('24×11,5×10 cm', 240, 100, 115)],
  },
  {
    manufacturer: 'HISPALYT', manufacturerUrl: 'https://www.hispalyt.es/', sourceUrl: 'https://www.hispalyt.es/es/productos-ceramicos/tabiques-y-muros/productos', sourceTitle: 'Formatos habituales de ladrillos huecos',
    name: 'Ladrillo hueco gran formato', category: 'Soportes y fábrica', scopes: [...facadeScopes, 'particion'], geometry: 'masonry', placement: 'coverage', color: '#d06537', texture: '/texturas/brick_hueco_real.png', coverage: true, joint: 10, stagger: true, hostsOpenings: true, documented: true,
    properties: { lambdaWmK: 0.44, densityKgM3: 1200, vaporMu: 10, fireClass: 'A1' },
    variants: [v('50×50×4 cm', 500, 500, 40), v('50×50×5 cm', 500, 500, 50), v('50×50×7 cm', 500, 500, 70), v('50×50×10 cm', 500, 500, 100)],
  },
  {
    manufacturer: 'Consorcio Termoarcilla', manufacturerUrl: 'https://www.termoarcilla.com/', sourceUrl: 'https://www.termoarcilla.com/', sourceTitle: 'Catálogo de bloque cerámico Termoarcilla',
    name: 'Bloque Termoarcilla', category: 'Soportes y fábrica', scopes: facadeScopes, geometry: 'masonry', placement: 'coverage', color: '#c96a2b', texture: '/texturas/termoarcilla_real.png', coverage: true, joint: 10, stagger: true, hostsOpenings: true,
    properties: { lambdaWmK: 0.28, densityKgM3: 900, vaporMu: 10, fireClass: 'A1' },
    variants: [v('14 cm', 300, 190, 140), v('19 cm', 300, 190, 190), v('24 cm', 300, 190, 240), v('29 cm', 300, 190, 290)],
  },
  {
    manufacturer: 'Holcim España', manufacturerUrl: 'https://www.holcim.es/', sourceUrl: 'https://www.holcim.es/', sourceTitle: 'Hormigones para edificación Holcim',
    name: 'Hormigón estructural', category: 'Soportes y fábrica', scopes: allEnvelope, geometry: 'solid', placement: 'coverage', color: '#737b82', texture: '/texturas/hormigon_real.png', coverage: true, hostsOpenings: true,
    properties: { lambdaWmK: 2.3, densityKgM3: 2400, vaporMu: 80, fireClass: 'A1' },
    variants: [v('C25/30 · 200 mm', 1000, 1000, 200), v('C30/37 · 250 mm', 1000, 1000, 250)],
  },
  {
    manufacturer: 'Xella Ytong', manufacturerUrl: 'https://www.xella.es/', sourceUrl: 'https://www.xella.es/', sourceTitle: 'Bloques de hormigón celular Ytong',
    name: 'Bloque de hormigón celular', category: 'Soportes y fábrica', scopes: [...facadeScopes, 'particion'], geometry: 'masonry', placement: 'coverage', color: '#d8d5ca', coverage: true, joint: 3, stagger: true, hostsOpenings: true,
    properties: { lambdaWmK: 0.12, densityKgM3: 500, vaporMu: 8, fireClass: 'A1' },
    variants: [v('20 cm', 625, 250, 200), v('25 cm', 625, 250, 250)], documented: true,
  },
  {
    manufacturer: 'EGOIN', manufacturerUrl: 'https://egoin.com/', sourceUrl: 'https://egoin.com/', sourceTitle: 'Panel estructural de madera contralaminada',
    name: 'Panel CLT', category: 'Soportes y fábrica', scopes: allEnvelope, geometry: 'board', placement: 'coverage', color: '#a76d36', texture: '/texturas/madera_clt_real.png', coverage: true, hostsOpenings: true,
    properties: { lambdaWmK: 0.13, densityKgM3: 500, vaporMu: 50, fireClass: 'D-s2,d0' },
    variants: [v('100 mm', 1000, 3000, 100), v('140 mm', 1000, 3000, 140)], documented: true,
  },

  // 18 · aislamientos
  {
    manufacturer: 'ROCKWOOL', manufacturerUrl: 'https://www.rockwool.com/es/', sourceUrl: 'https://www.rockwool.com/es/productos/ventirock-duo/', sourceTitle: 'Ficha técnica Ventirock Duo',
    name: 'Ventirock Duo', category: 'Aislamientos', scopes: facadeScopes, geometry: 'insulation', placement: 'coverage', color: '#9b8445', accent: '#c5a95a', texture: '/texturas/lana_roca_real.png', coverage: true, joint: 2, stagger: true, hostsOpenings: true, documented: true,
    properties: { lambdaWmK: 0.034, densityKgM3: 40, vaporMu: 1, fireClass: 'A1' },
    variants: [v('50 mm', 1350, 600, 50), v('60 mm', 1350, 600, 60), v('80 mm', 1350, 600, 80), v('100 mm', 1350, 600, 100), v('120 mm', 1350, 600, 120), v('140 mm', 1350, 600, 140), v('160 mm', 1350, 600, 160)],
  },
  {
    manufacturer: 'ISOVER', manufacturerUrl: 'https://www.isover.es/', sourceUrl: 'https://www.isover.es/', sourceTitle: 'Catálogo de productos ISOVER España',
    name: 'Arena', category: 'Aislamientos', scopes: [...facadeScopes, 'particion'], geometry: 'insulation', placement: 'coverage', color: '#f1d34d', texture: '/texturas/lana_vidrio_real.png', coverage: true, joint: 2, stagger: true, hostsOpenings: true,
    properties: { lambdaWmK: 0.036, densityKgM3: 18, vaporMu: 1, fireClass: 'A1' },
    variants: [v('45 mm', 1350, 600, 45), v('60 mm', 1350, 600, 60), v('80 mm', 1350, 600, 80), v('100 mm', 1350, 600, 100)],
  },
  {
    manufacturer: 'DANOSA', manufacturerUrl: 'https://www.danosa.com/', sourceUrl: 'https://www.danosa.com/', sourceTitle: 'Catálogo DANOPREN',
    name: 'DANOPREN', category: 'Aislamientos', scopes: roofScopes, geometry: 'insulation', placement: 'coverage', color: '#67c7d9', texture: '/texturas/xps_insulation_real.png', coverage: true, joint: 2, hostsOpenings: true,
    properties: { lambdaWmK: 0.034, densityKgM3: 35, vaporMu: 150, fireClass: 'E' },
    variants: [v('TR 40 mm', 1250, 600, 40), v('TR 60 mm', 1250, 600, 60), v('TR 80 mm', 1250, 600, 80), v('TR 100 mm', 1250, 600, 100)],
  },
  {
    manufacturer: 'Knauf Insulation', manufacturerUrl: 'https://www.knaufinsulation.es/', sourceUrl: 'https://www.knaufinsulation.es/', sourceTitle: 'Catálogo de aislamiento Knauf Insulation',
    name: 'Ultracoustic', category: 'Aislamientos', scopes: ['particion', 'hueco-fachada'], geometry: 'insulation', placement: 'coverage', color: '#8b6a38', texture: '/texturas/lana_roca_real.png', coverage: true, joint: 2, hostsOpenings: true,
    properties: { lambdaWmK: 0.037, densityKgM3: 22, vaporMu: 1, fireClass: 'A1' },
    variants: [v('45 mm', 1250, 600, 45), v('70 mm', 1250, 600, 70), v('90 mm', 1250, 600, 90)], documented: true,
  },

  // 18 · impermeabilización
  {
    manufacturer: 'DANOSA', manufacturerUrl: 'https://www.danosa.com/', sourceUrl: 'https://www.danosa.com/', sourceTitle: 'Catálogo de impermeabilización DANOSA',
    name: 'ESTERDAN', category: 'Impermeabilización', scopes: roofScopes, geometry: 'membrane', placement: 'coverage', color: '#26272b', texture: '/texturas/danosa_real.png', coverage: true, joint: 0, overlap: 100, roughness: 0.58,
    properties: { lambdaWmK: 0.19, densityKgM3: 1050, vaporMu: 50000, fireClass: 'E' },
    variants: [v('30 P ELAST', 10000, 1000, 3), v('40 P ELAST', 10000, 1000, 4), v('40 GP ELAST', 10000, 1000, 4)],
  },
  {
    manufacturer: 'DANOSA', manufacturerUrl: 'https://www.danosa.com/', sourceUrl: 'https://www.danosa.com/', sourceTitle: 'Catálogo DANOPOL',
    name: 'DANOPOL', category: 'Impermeabilización', scopes: roofScopes, geometry: 'membrane', placement: 'coverage', color: '#59636d', coverage: true, overlap: 80, roughness: 0.52,
    properties: { lambdaWmK: 0.16, densityKgM3: 1300, vaporMu: 20000, fireClass: 'E' },
    variants: [v('HS 1,2', 20000, 1800, 1.2), v('HS 1,5', 20000, 1800, 1.5), v('FV 1,2', 20000, 1800, 1.2)],
  },
  {
    manufacturer: 'ChovA', manufacturerUrl: 'https://www.chova.com/', sourceUrl: 'https://www.chova.com/', sourceTitle: 'Catálogo de láminas ChovA',
    name: 'ChovAPLAST', category: 'Impermeabilización', scopes: roofScopes, geometry: 'membrane', placement: 'coverage', color: '#27272a', texture: '/texturas/lamina_asfaltica_real.png', coverage: true, overlap: 100,
    properties: { lambdaWmK: 0.2, densityKgM3: 1100, vaporMu: 50000, fireClass: 'E' },
    variants: [v('Pol PY 30', 10000, 1000, 3), v('Pol PY 40', 10000, 1000, 4), v('Extra Mineral', 10000, 1000, 4.5)], documented: true,
  },
  {
    manufacturer: 'SOPREMA', manufacturerUrl: 'https://www.soprema.es/', sourceUrl: 'https://www.soprema.es/', sourceTitle: 'Sistemas de impermeabilización SOPREMA',
    name: 'Sopralene', category: 'Impermeabilización', scopes: roofScopes, geometry: 'membrane', placement: 'coverage', color: '#30343a', coverage: true, overlap: 100,
    properties: { lambdaWmK: 0.2, densityKgM3: 1100, vaporMu: 50000, fireClass: 'E' },
    variants: [v('Elite FP 4', 10000, 1000, 4), v('Flam 180', 10000, 1000, 4), v('Optima 4', 10000, 1000, 4)],
  },
  {
    manufacturer: 'Sika', manufacturerUrl: 'https://esp.sika.com/', sourceUrl: 'https://esp.sika.com/', sourceTitle: 'Membranas Sika Sarnafil',
    name: 'Sarnafil', category: 'Impermeabilización', scopes: roofScopes, geometry: 'membrane', placement: 'coverage', color: '#6f7b80', coverage: true, overlap: 80,
    properties: { lambdaWmK: 0.16, densityKgM3: 1250, vaporMu: 18000, fireClass: 'E' },
    variants: [v('TG 66-15', 20000, 2000, 1.5), v('TS 77-15', 20000, 2000, 1.5), v('S 327-15', 20000, 2000, 1.5)],
  },
  {
    manufacturer: 'DuPont', manufacturerUrl: 'https://www.dupont.es/', sourceUrl: 'https://www.dupont.es/building/tyvek.html', sourceTitle: 'Membranas Tyvek para envolvente',
    name: 'Tyvek', category: 'Impermeabilización', scopes: facadeScopes, geometry: 'membrane', placement: 'coverage', color: '#e5e7e9', coverage: true, overlap: 100, hostsOpenings: true,
    variants: [v('Housewrap', 50000, 1500, 0.2), v('FireCurb Housewrap', 50000, 1500, 0.2), { ...v('UV Facade', 50000, 1500, 0.4), color: '#30383f' }],
  },

  // 16 · morteros, adhesivos y sellantes
  {
    manufacturer: 'Saint-Gobain Weber', manufacturerUrl: 'https://www.es.weber/', sourceUrl: 'https://www.es.weber/', sourceTitle: 'Catálogo Weber España',
    name: 'webertherm base', category: 'Morteros y sellantes', scopes: facadeScopes, geometry: 'finish', placement: 'coverage', color: '#b7b2a9', texture: '/texturas/hormigon_real.png', coverage: true, hostsOpenings: true,
    properties: { lambdaWmK: 0.45, densityKgM3: 1500, vaporMu: 15, fireClass: 'A1' },
    variants: [v('Capa 5 mm', 1000, 1000, 5), v('Capa 8 mm', 1000, 1000, 8)],
  },
  {
    manufacturer: 'Saint-Gobain Weber', manufacturerUrl: 'https://www.es.weber/', sourceUrl: 'https://www.es.weber/', sourceTitle: 'Catálogo de revestimientos Weber',
    name: 'weberpral', category: 'Morteros y sellantes', scopes: facadeScopes, geometry: 'finish', placement: 'coverage', color: '#d5cab7', texture: '/texturas/monocapa_real.png', coverage: true, hostsOpenings: true,
    properties: { lambdaWmK: 0.8, densityKgM3: 1700, vaporMu: 15, fireClass: 'A1' },
    variants: [v('Classic 15 mm', 1000, 1000, 15), v('Prisma 15 mm', 1000, 1000, 15)], documented: true,
  },
  {
    manufacturer: 'Mapei', manufacturerUrl: 'https://www.mapei.com/es/es-es', sourceUrl: 'https://www.mapei.com/es/es-es', sourceTitle: 'Catálogo Mapei España',
    name: 'Keraflex', category: 'Morteros y sellantes', scopes: [...roofScopes, 'pavimento'], geometry: 'finish', placement: 'coverage', color: '#a9a69f', coverage: true,
    properties: { lambdaWmK: 0.9, densityKgM3: 1600, vaporMu: 20, fireClass: 'A1' },
    variants: [v('Maxi S1 · 5 mm', 1000, 1000, 5), v('Extra S1 · 8 mm', 1000, 1000, 8)],
  },
  {
    manufacturer: 'Mapei', manufacturerUrl: 'https://www.mapei.com/es/es-es', sourceUrl: 'https://www.mapei.com/es/es-es', sourceTitle: 'Impermeabilizantes cementosos Mapei',
    name: 'Mapelastic', category: 'Morteros y sellantes', scopes: roofScopes, geometry: 'finish', placement: 'coverage', color: '#7d8585', coverage: true,
    properties: { lambdaWmK: 0.8, densityKgM3: 1700, vaporMu: 100 },
    variants: [v('Smart · 2 mm', 1000, 1000, 2), v('Turbo · 2 mm', 1000, 1000, 2)],
  },
  {
    manufacturer: 'Sika', manufacturerUrl: 'https://esp.sika.com/', sourceUrl: 'https://esp.sika.com/', sourceTitle: 'Morteros y sellantes Sika',
    name: 'Sikaflex', category: 'Morteros y sellantes', scopes: allEnvelope, geometry: 'finish', placement: 'linear', color: '#3b3d42', roughness: 0.45,
    properties: { densityKgM3: 1300, vaporMu: 1000 },
    variants: [v('11 FC Purform', 600, 12, 12), v('Construction+', 600, 15, 15), v('PRO-3 Purform', 600, 15, 15)],
  },
  {
    manufacturer: 'Molins', manufacturerUrl: 'https://www.molins.es/', sourceUrl: 'https://www.molins.es/', sourceTitle: 'Morteros técnicos Molins',
    name: 'PROPAM', category: 'Morteros y sellantes', scopes: allEnvelope, geometry: 'finish', placement: 'coverage', color: '#b6b0a4', coverage: true,
    properties: { lambdaWmK: 0.8, densityKgM3: 1750, vaporMu: 15, fireClass: 'A1' },
    variants: [v('EcoGel Flex · 5 mm', 1000, 1000, 5), v('Repar Techno · 10 mm', 1000, 1000, 10), v('Revoco · 15 mm', 1000, 1000, 15)],
  },
  {
    manufacturer: 'GECOL', manufacturerUrl: 'https://www.gecol.com/', sourceUrl: 'https://www.gecol.com/', sourceTitle: 'Catálogo de morteros GECOL',
    name: 'GECOL', category: 'Morteros y sellantes', scopes: allEnvelope, geometry: 'finish', placement: 'coverage', color: '#c3b9a6', coverage: true,
    properties: { lambdaWmK: 0.8, densityKgM3: 1700, vaporMu: 15, fireClass: 'A1' },
    variants: [v('Monocapa Premium · 15 mm', 1000, 1000, 15), v('Imper-G · 3 mm', 1000, 1000, 3)],
  },

  // 20 · revestimientos de fachada
  {
    manufacturer: 'Rockpanel', manufacturerUrl: 'https://www.rockpanel.com/es/', sourceUrl: 'https://www.rockpanel.com/es/productos/rockpanel-colours/', sourceTitle: 'Ficha técnica Rockpanel Colours',
    name: 'Rockpanel Colours A2', category: 'Revestimientos de fachada', scopes: facadeScopes, geometry: 'cladding', placement: 'coverage', color: '#d9d3bd', coverage: true, joint: 10, hostsOpenings: true, documented: true,
    properties: { densityKgM3: 1175, fireClass: 'A2-s1,d0' },
    variants: [v('8 mm · 2500×1200', 1200, 2500, 8), v('8 mm · 3050×1250', 1250, 3050, 8), v('9 mm · 2500×1200', 1200, 2500, 9), v('9 mm · 3050×1250', 1250, 3050, 9)],
  },
  {
    manufacturer: 'Rockpanel', manufacturerUrl: 'https://www.rockpanel.com/es/', sourceUrl: 'https://www.rockpanel.com/es/productos/', sourceTitle: 'Gama de revestimientos Rockpanel',
    name: 'Rockpanel', category: 'Revestimientos de fachada', scopes: facadeScopes, geometry: 'cladding', placement: 'coverage', color: '#9b8976', coverage: true, joint: 10, hostsOpenings: true,
    properties: { densityKgM3: 1150, fireClass: 'A2-s1,d0' },
    variants: [v('Metals 8 mm', 1200, 3050, 8), v('Woods 8 mm', 1200, 3050, 8), v('Stones 8 mm', 1200, 3050, 8), v('Chameleon 8 mm', 1200, 3050, 8)],
  },
  {
    manufacturer: 'FAVETON', manufacturerUrl: 'https://www.faveton.com/', sourceUrl: 'https://www.faveton.com/', sourceTitle: 'Sistemas cerámicos para fachada ventilada FAVETON',
    name: 'Panel cerámico FAVETON', category: 'Revestimientos de fachada', scopes: facadeScopes, geometry: 'cladding', placement: 'coverage', color: '#9d5a3d', coverage: true, joint: 8, hostsOpenings: true,
    properties: { densityKgM3: 2100, fireClass: 'A1' },
    variants: [v('Bersal 300', 1200, 300, 24), v('Bersal 400', 1200, 400, 24), v('Ceram 500', 1200, 500, 24), v('GAV 600', 1200, 600, 30)],
  },
  {
    manufacturer: 'TEMPIO', manufacturerUrl: 'https://www.tempio.es/', sourceUrl: 'https://www.tempio.es/', sourceTitle: 'Piezas cerámicas para fachada TEMPIO',
    name: 'Panel cerámico TEMPIO', category: 'Revestimientos de fachada', scopes: facadeScopes, geometry: 'cladding', placement: 'coverage', color: '#b25f3a', coverage: true, joint: 8, hostsOpenings: true,
    properties: { densityKgM3: 2050, fireClass: 'A1' },
    variants: [v('FK-L 2/16', 1200, 300, 16), v('FK-L 3/16', 1200, 400, 16), v('FS-20', 1200, 500, 20)],
  },
  {
    manufacturer: 'ULMA Architectural', manufacturerUrl: 'https://www.ulmaarchitectural.com/', sourceUrl: 'https://www.ulmaarchitectural.com/', sourceTitle: 'Fachadas ventiladas ULMA Stoneo',
    name: 'ULMA Stoneo', category: 'Revestimientos de fachada', scopes: facadeScopes, geometry: 'cladding', placement: 'coverage', color: '#b7b2a9', coverage: true, joint: 10, hostsOpenings: true,
    properties: { densityKgM3: 2200, fireClass: 'A2-s1,d0' },
    variants: [v('Pure 14 mm', 1800, 900, 14), v('Feel 14 mm', 1800, 900, 14), v('Look 14 mm', 1800, 900, 14)],
  },
  {
    manufacturer: 'EQUITONE', manufacturerUrl: 'https://www.equitone.com/es-es/', sourceUrl: 'https://www.equitone.com/es-es/', sourceTitle: 'Paneles de fibrocemento EQUITONE',
    name: 'EQUITONE', category: 'Revestimientos de fachada', scopes: facadeScopes, geometry: 'cladding', placement: 'coverage', color: '#8f9490', texture: '/texturas/fibrocemento_real.png', coverage: true, joint: 10, hostsOpenings: true,
    properties: { densityKgM3: 1650, fireClass: 'A2-s1,d0' },
    variants: [v('tectiva 8 mm', 1220, 3050, 8), v('natura 8 mm', 1250, 3100, 8)], documented: true,
  },

  // 18 · subestructuras y fijaciones
  {
    manufacturer: 'Hilti', manufacturerUrl: 'https://www.hilti.es/', sourceUrl: 'https://www.hilti.es/', sourceTitle: 'Sistemas de fachada ventilada Hilti',
    name: 'Ménsula Hilti MFT', category: 'Subestructuras y fijaciones', scopes: facadeScopes, geometry: 'bracket', placement: 'unit', color: '#c7cdd1', metalness: 0.66, roughness: 0.27,
    properties: { densityKgM3: 2700, fireClass: 'A1' },
    variants: [v('MFT-S2S 80', 80, 160, 70), v('MFT-S2S 120', 120, 160, 70), v('MFT-FOX VT 100', 100, 180, 80), v('MFT-FOX VT 160', 160, 180, 80)],
  },
  {
    manufacturer: 'Hilti', manufacturerUrl: 'https://www.hilti.es/', sourceUrl: 'https://www.hilti.es/', sourceTitle: 'Perfiles de fachada Hilti',
    name: 'Perfil Hilti MFT', category: 'Subestructuras y fijaciones', scopes: facadeScopes, geometry: 'profile', placement: 'linear', color: '#c8ced2', metalness: 0.62, roughness: 0.24,
    properties: { densityKgM3: 2700, fireClass: 'A1' },
    variants: [v('T 60×40 · 3 m', 60, 3000, 40), v('L 50×50 · 3 m', 50, 3000, 50), v('Omega 60 · 3 m', 60, 3000, 30)],
  },
  {
    manufacturer: 'EJOT', manufacturerUrl: 'https://www.ejot.es/', sourceUrl: 'https://www.ejot.es/', sourceTitle: 'Subestructuras CROSSFIX y fijaciones EJOT',
    name: 'EJOT CROSSFIX', category: 'Subestructuras y fijaciones', scopes: facadeScopes, geometry: 'bracket', placement: 'unit', color: '#c3c7c9', metalness: 0.8, roughness: 0.26,
    properties: { densityKgM3: 2700, fireClass: 'A1' },
    variants: [v('CF 80', 80, 140, 60), v('CF 120', 120, 140, 60), v('CF 160', 160, 140, 60)], documented: true,
  },
  {
    manufacturer: 'EJOT', manufacturerUrl: 'https://www.ejot.es/', sourceUrl: 'https://www.ejot.es/', sourceTitle: 'Fijaciones de aislamiento EJOT',
    name: 'Fijación EJOT', category: 'Subestructuras y fijaciones', scopes: facadeScopes, geometry: 'fastener', placement: 'unit', color: '#dedbd2', metalness: 0.2, roughness: 0.48,
    variants: [v('DH 100', 60, 100, 8), v('DH 140', 60, 140, 8), v('STR H 160', 60, 160, 6), v('SDF 10V', 18, 120, 10)], documented: true,
  },
  {
    manufacturer: 'fischer', manufacturerUrl: 'https://www.fischer.es/', sourceUrl: 'https://www.fischer.es/', sourceTitle: 'Sistemas de fachada fischer',
    name: 'fischer BWM', category: 'Subestructuras y fijaciones', scopes: facadeScopes, geometry: 'bracket', placement: 'unit', color: '#b8bcc0', metalness: 0.82, roughness: 0.25,
    variants: [v('ATK 100', 100, 160, 80), v('ATK 140', 140, 160, 80)],
  },
  {
    manufacturer: 'SFS', manufacturerUrl: 'https://www.sfs.com/es/', sourceUrl: 'https://www.sfs.com/es/', sourceTitle: 'Subestructuras NVF2F SFS',
    name: 'SFS Nvelope', category: 'Subestructuras y fijaciones', scopes: facadeScopes, geometry: 'profile', placement: 'linear', color: '#aab1b8', metalness: 0.85, roughness: 0.24,
    variants: [v('NV1 T · 3 m', 60, 3000, 50), v('NV3 L · 3 m', 50, 3000, 50)],
  },

  // 18 · carpinterías y huecos
  {
    manufacturer: 'CORTIZO', manufacturerUrl: 'https://www.cortizo.com/', sourceUrl: 'https://www.cortizo.com/', sourceTitle: 'Sistemas de ventanas CORTIZO',
    name: 'Ventana CORTIZO', category: 'Carpinterías y huecos', scopes: ['hueco-fachada', 'fachada-ventilada', 'fachada-sate'], geometry: 'window', placement: 'unit', color: '#363b40', metalness: 0.72, roughness: 0.24, createsOpening: true,
    properties: { lambdaWmK: 1.3, fireClass: 'A1' },
    variants: [v('COR 70 Industrial · 1200×1200', 1200, 1200, 70), v('COR 70 Industrial · 1500×1200', 1500, 1200, 70), v('COR 80 Industrial · 1200×1400', 1200, 1400, 80), v('COR 80 Hoja Oculta · 1500×1400', 1500, 1400, 80), v('COR Vision Plus · 2400×2200', 2400, 2200, 120)],
  },
  {
    manufacturer: 'STRUGAL', manufacturerUrl: 'https://www.strugal.com/', sourceUrl: 'https://www.strugal.com/', sourceTitle: 'Sistemas de carpintería STRUGAL',
    name: 'Ventana STRUGAL', category: 'Carpinterías y huecos', scopes: ['hueco-fachada', 'fachada-ventilada', 'fachada-sate'], geometry: 'window', placement: 'unit', color: '#4a4f54', metalness: 0.7, roughness: 0.25, createsOpening: true,
    properties: {},
    variants: [v('S74RP · 1200×1200', 1200, 1200, 74), v('S82RP · 1500×1400', 1500, 1400, 82), v('S140RP · 2400×2200', 2400, 2200, 140)], documented: true,
  },
  {
    manufacturer: 'KÖMMERLING', manufacturerUrl: 'https://www.kommerling.es/', sourceUrl: 'https://www.kommerling.es/', sourceTitle: 'Sistemas de ventanas KÖMMERLING',
    name: 'Ventana KÖMMERLING', category: 'Carpinterías y huecos', scopes: ['hueco-fachada', 'fachada-ventilada', 'fachada-sate'], geometry: 'window', placement: 'unit', color: '#eceae2', roughness: 0.32, createsOpening: true,
    properties: { lambdaWmK: 1.1, densityKgM3: 1400, fireClass: 'E' },
    variants: [v('Kömmerling76 AD · 1200×1200', 1200, 1200, 76), v('Kömmerling76 MD · 1500×1400', 1500, 1400, 76), v('PremiDoor 76 · 2400×2200', 2400, 2200, 179)],
  },
  {
    manufacturer: 'TECHNAL', manufacturerUrl: 'https://www.technal.com/es/es/', sourceUrl: 'https://www.technal.com/es/es/', sourceTitle: 'Carpinterías TECHNAL',
    name: 'Ventana TECHNAL', category: 'Carpinterías y huecos', scopes: ['hueco-fachada', 'fachada-ventilada'], geometry: 'window', placement: 'unit', color: '#3d4449', metalness: 0.72, roughness: 0.24, createsOpening: true,
    properties: { lambdaWmK: 1.3, fireClass: 'A1' },
    variants: [v('SOLEAL Next 75 · 1200×1400', 1200, 1400, 75), v('TIGAL · 1800×1400', 1800, 1400, 70)],
  },
  {
    manufacturer: 'Saint-Gobain Glass', manufacturerUrl: 'https://es.saint-gobain-building-glass.com/', sourceUrl: 'https://es.saint-gobain-building-glass.com/', sourceTitle: 'Vidrios CLIMALIT PLUS',
    name: 'CLIMALIT PLUS', category: 'Carpinterías y huecos', scopes: facadeScopes, geometry: 'glass', placement: 'unit', color: '#9dd9e8', metalness: 0.05, roughness: 0.08,
    properties: { densityKgM3: 2500, fireClass: 'A1' },
    variants: [v('4/16/4', 1000, 1000, 24), v('4/16/4 bajo emisivo', 1000, 1000, 24), v('44.2/16/6 seguridad', 1000, 1000, 31)], documented: true,
  },
  {
    manufacturer: 'PERSAX', manufacturerUrl: 'https://www.persax.com/', sourceUrl: 'https://www.persax.com/', sourceTitle: 'Cajones y persianas PERSAX',
    name: 'Cajón de persiana', category: 'Carpinterías y huecos', scopes: ['hueco-fachada'], geometry: 'solid', placement: 'linear', color: '#d8d9d6', roughness: 0.38,
    properties: { lambdaWmK: 0.3, densityKgM3: 450, fireClass: 'E' },
    variants: [v('Energy 185', 185, 1000, 185), v('Energy 220', 220, 1000, 220)],
  },

  // 20 · cubierta inclinada
  {
    manufacturer: 'Tejas Borja', manufacturerUrl: 'https://tejasborja.com/', sourceUrl: 'https://tejasborja.com/teja/tb-10-class/', sourceTitle: 'Ficha técnica TB-10 Class',
    name: 'TB-10 Class', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#9d3f25', texture: '/texturas/teja_ceramica_real.png', coverage: true, joint: 0, stagger: true, overlap: 64, sideOverlap: 53, documented: true,
    properties: { densityKgM3: 2000, fireClass: 'A1' }, variants: [v('Roja', 289, 474, 78, 3.7), v('Graphite', 289, 474, 78, 3.7), v('Moss Red', 289, 474, 78, 3.7)],
  },
  {
    manufacturer: 'Tejas Borja', manufacturerUrl: 'https://tejasborja.com/', sourceUrl: 'https://tejasborja.com/teja/tb-12/', sourceTitle: 'Ficha técnica TB-12',
    name: 'TB-12', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#a64a2d', texture: '/texturas/teja_ceramica_real.png', coverage: true, overlap: 63, documented: true,
    properties: { densityKgM3: 2000, fireClass: 'A1' }, variants: [v('Roja', 260, 439, 70, 3.15), v('Manoir', 260, 439, 70, 3.15)],
  },
  {
    manufacturer: 'Tejas Borja', manufacturerUrl: 'https://tejasborja.com/', sourceUrl: 'https://tejasborja.com/teja/technica-10/', sourceTitle: 'Ficha técnica TECHNICA-10',
    name: 'TECHNICA-10', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#74372c', texture: '/texturas/teja_ceramica_real.png', coverage: true, stagger: true, overlap: 75, documented: true,
    properties: { densityKgM3: 2000, fireClass: 'A1' }, variants: [v('Graphite', 262, 475, 45, 3.05), v('Leon Matte', 262, 475, 45, 3.05), v('Red', 262, 475, 45, 3.05)],
  },
  {
    manufacturer: 'La Escandella', manufacturerUrl: 'https://www.laescandella.com/', sourceUrl: 'https://www.laescandella.com/es/productos/h-selection-planum-blackstone/', sourceTitle: 'Ficha técnica Planum',
    name: 'Planum', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#4b4240', texture: '/texturas/teja_ceramica_real.png', coverage: true, joint: 0, stagger: true, overlap: 71, sideOverlap: 41, documented: true,
    properties: { densityKgM3: 2000, fireClass: 'A1' }, variants: [v('Blackstone', 278, 441, 32, 3.5), v('Roja', 278, 441, 32, 3.5), v('Paja', 278, 441, 32, 3.5)],
  },
  {
    manufacturer: 'La Escandella', manufacturerUrl: 'https://www.laescandella.com/', sourceUrl: 'https://www.laescandella.com/es/productos/tradicional-teja-plana-roja/', sourceTitle: 'Ficha técnica Tradicional Plana',
    name: 'Tradicional Plana', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#a34f31', texture: '/texturas/teja_ceramica_real.png', coverage: true, stagger: true, overlap: 63, documented: true,
    properties: { densityKgM3: 2000, fireClass: 'A1' }, variants: [v('Roja', 260, 466, 55, 3.6), v('Jaspeada', 260, 466, 55, 3.6)],
  },
  {
    manufacturer: 'La Escandella', manufacturerUrl: 'https://www.laescandella.com/', sourceUrl: 'https://www.laescandella.com/es/productos/tradicional-curva-t5-lucentum/', sourceTitle: 'Ficha técnica teja curva Lucentum',
    name: 'Teja Curva T5', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#a85a37', texture: '/texturas/teja_ceramica_real.png', coverage: true, overlap: 90, documented: true,
    properties: { densityKgM3: 2000, fireClass: 'A1' }, variants: [v('Lucentum', 210, 500, 170, 2.55), v('Roja', 210, 500, 170, 2.55), v('Paja', 220, 500, 170, 2.1)],
  },
  {
    manufacturer: 'CUPA PIZARRAS', manufacturerUrl: 'https://www.cupapizarras.com/es/', sourceUrl: 'https://www.cupapizarras.com/es/', sourceTitle: 'Pizarra natural CUPA',
    name: 'Pizarra CUPA', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'roof-tile', placement: 'coverage', color: '#30353b', texture: '/texturas/pizarra_real.png', coverage: true, stagger: true, overlap: 90,
    properties: { densityKgM3: 2700, fireClass: 'A1' }, variants: [v('CUPA 12 · 32×22', 220, 320, 5), v('CUPA 18 · 40×25', 250, 400, 5)],
  },
  {
    manufacturer: 'Onduline', manufacturerUrl: 'https://es.onduline.com/', sourceUrl: 'https://es.onduline.com/', sourceTitle: 'Placas bajo teja Onduline',
    name: 'Onduline Bajo Teja', category: 'Cubierta inclinada', scopes: ['cubierta-inclinada'], geometry: 'cladding', placement: 'coverage', color: '#453832', texture: '/texturas/onduline_real.png', coverage: true, overlap: 100,
    properties: { lambdaWmK: 0.15, densityKgM3: 950, fireClass: 'E' }, variants: [v('BT-150 Plus', 2000, 1050, 3), v('BT-235', 2000, 1050, 3)],
  },

  // 14 · cubierta plana y terraza
  {
    manufacturer: 'DANOSA', manufacturerUrl: 'https://www.danosa.com/', sourceUrl: 'https://www.danosa.com/es-es/wp-content/uploads/sites/2/2021/09/descDetalle_DESC_ARCHIVOcatalogoalmdanolosaL11.pdf', sourceTitle: 'Ficha técnica DANOLOSA · losa aislante y drenante',
    name: 'DANOLOSA', category: 'Cubierta plana y terraza', scopes: ['cubierta-plana', 'terraza'], geometry: 'paver', placement: 'coverage', color: '#b7b4ad', coverage: true, joint: 4,
    properties: {}, variants: [v('Blanca 75 mm', 500, 500, 75, 15), v('Gris 75 mm', 500, 500, 75, 15)], documented: true,
  },
  {
    manufacturer: 'Buzon Pedestals', manufacturerUrl: 'https://www.buzon-world.com/', sourceUrl: 'https://www.buzon-world.com/', sourceTitle: 'Pedestales regulables Buzon',
    name: 'Pedestal BUZON PB', category: 'Cubierta plana y terraza', scopes: ['cubierta-plana', 'terraza'], geometry: 'bracket', placement: 'unit', color: '#33383c', roughness: 0.55,
    properties: { densityKgM3: 950, fireClass: 'E' }, variants: [v('PB-2', 170, 80, 170), v('PB-3', 170, 120, 170), v('PB-4', 170, 180, 170)],
  },
  {
    manufacturer: 'Schlüter-Systems', manufacturerUrl: 'https://eu.schluter.com/es-ES/', sourceUrl: 'https://eu.schluter.com/es-ES/', sourceTitle: 'Sistemas de terraza Schlüter',
    name: 'Schlüter TROBA', category: 'Cubierta plana y terraza', scopes: ['cubierta-plana', 'terraza'], geometry: 'membrane', placement: 'coverage', color: '#3f4750', coverage: true, overlap: 50,
    properties: { densityKgM3: 900, fireClass: 'E' }, variants: [v('TROBA-PLUS', 1000, 1000, 8), v('DITRA-DRAIN 4', 1000, 1000, 4)],
  },
  {
    manufacturer: 'ACO', manufacturerUrl: 'https://www.aco.es/', sourceUrl: 'https://www.aco.es/', sourceTitle: 'Drenaje de terrazas y cubiertas ACO',
    name: 'Canal ACO', category: 'Cubierta plana y terraza', scopes: ['cubierta-plana', 'terraza'], geometry: 'drain', placement: 'linear', color: '#8f969b', metalness: 0.75, roughness: 0.3,
    properties: { densityKgM3: 7800, fireClass: 'A1' }, variants: [v('Slimline 1000', 60, 1000, 80), v('Profiline 1000', 100, 1000, 100)],
  },
  {
    manufacturer: 'Rosa Gres', manufacturerUrl: 'https://www.rosagres.com/', sourceUrl: 'https://www.rosagres.com/', sourceTitle: 'Pavimentos técnicos Rosa Gres',
    name: 'Baldosa técnica Rosa Gres', category: 'Cubierta plana y terraza', scopes: ['terraza', 'cubierta-plana'], geometry: 'paver', placement: 'coverage', color: '#a69b8b', texture: '/texturas/gres_tile_real.png', coverage: true, joint: 4,
    properties: { lambdaWmK: 1, densityKgM3: 2300, fireClass: 'A1' }, variants: [v('Serena 60×60', 600, 600, 20), v('Lovely 60×60', 600, 600, 20), v('Trésor 40×60', 600, 400, 20)],
  },
  {
    manufacturer: 'ULMA Architectural', manufacturerUrl: 'https://www.ulmaarchitectural.com/', sourceUrl: 'https://www.ulmaarchitectural.com/', sourceTitle: 'Canales de drenaje ULMA',
    name: 'Canal ULMA', category: 'Cubierta plana y terraza', scopes: ['terraza', 'pavimento'], geometry: 'drain', placement: 'linear', color: '#777f84', metalness: 0.4, roughness: 0.38,
    properties: { densityKgM3: 2100, fireClass: 'A1' }, variants: [v('SELF 100', 130, 1000, 100), v('EUROSELF 150', 180, 1000, 150)],
  },

  // 18 · pavimentos
  {
    manufacturer: 'Porcelanosa', manufacturerUrl: 'https://www.porcelanosa.com/', sourceUrl: 'https://www.porcelanosa.com/', sourceTitle: 'Catálogo de pavimentos Porcelanosa',
    name: 'Pavimento Porcelanosa', category: 'Pavimentos', scopes: ['pavimento', 'terraza'], geometry: 'paver', placement: 'coverage', color: '#b8b0a2', texture: '/texturas/gres_tile_real.png', coverage: true, joint: 3,
    properties: { densityKgM3: 2300, fireClass: 'A1' }, variants: [v('Bottega Caliza Ant. 59,6×59,6 · 20 mm', 596, 596, 20), v('Harlem Acero 59,6', 596, 596, 10), v('Dover Arena 59,6', 596, 596, 10), v('Durango Bone 120', 1200, 600, 10)], documented: true,
  },
  {
    manufacturer: 'Pamesa', manufacturerUrl: 'https://www.pamesa.com/', sourceUrl: 'https://www.pamesa.com/', sourceTitle: 'Catálogo de pavimentos Pamesa',
    name: 'Pavimento Pamesa', category: 'Pavimentos', scopes: ['pavimento', 'terraza'], geometry: 'paver', placement: 'coverage', color: '#9f978a', texture: '/texturas/gres_tile_real.png', coverage: true, joint: 3,
    properties: { lambdaWmK: 1, densityKgM3: 2300, fireClass: 'A1' }, variants: [v('At. Alpha 60', 600, 600, 10), v('Cr. Wells 60', 600, 600, 10), v('Koncept 120×60', 1200, 600, 10)],
  },
  {
    manufacturer: 'Gres Aragón', manufacturerUrl: 'https://gresaragon.com/', sourceUrl: 'https://gresaragon.com/', sourceTitle: 'Catálogo Gres Aragón',
    name: 'Gres Aragón', category: 'Pavimentos', scopes: ['pavimento', 'terraza'], geometry: 'paver', placement: 'coverage', color: '#a66b43', texture: '/texturas/gres_tile_real.png', coverage: true, joint: 5,
    properties: { lambdaWmK: 1, densityKgM3: 2300, fireClass: 'A1' }, variants: [v('Natural 33×33', 330, 330, 12), v('Urban 60×60', 600, 600, 10), v('Mytho 60×60', 600, 600, 10)],
  },
  {
    manufacturer: 'Keraben', manufacturerUrl: 'https://www.keraben.com/', sourceUrl: 'https://www.keraben.com/', sourceTitle: 'Catálogo Keraben',
    name: 'Pavimento Keraben', category: 'Pavimentos', scopes: ['pavimento', 'terraza'], geometry: 'paver', placement: 'coverage', color: '#aaa49a', texture: '/texturas/gres_tile_real.png', coverage: true, joint: 3,
    properties: { lambdaWmK: 1, densityKgM3: 2300, fireClass: 'A1' }, variants: [v('Nature 60×60', 600, 600, 10), v('Verse 90×90', 900, 900, 10), v('Rue 120×60', 1200, 600, 10)],
  },
  {
    manufacturer: 'FINfloor', manufacturerUrl: 'https://www.finfloor.com/', sourceUrl: 'https://www.finfloor.com/', sourceTitle: 'Suelos laminados FINfloor',
    name: 'FINfloor', category: 'Pavimentos', scopes: ['pavimento'], geometry: 'paver', placement: 'coverage', color: '#8b5f3d', texture: '/texturas/tarima_real.png', coverage: true, joint: 1, stagger: true,
    properties: { lambdaWmK: 0.17, densityKgM3: 700, fireClass: 'Cfl-s1' }, variants: [v('Original Roble', 1331, 194, 8), v('Supreme Roble', 1310, 240, 10), v('Evolve Roble', 1331, 194, 12)],
  },
  {
    manufacturer: 'Levantina', manufacturerUrl: 'https://www.levantina.com/', sourceUrl: 'https://www.levantina.com/', sourceTitle: 'Piedra natural Levantina',
    name: 'Piedra natural', category: 'Pavimentos', scopes: ['pavimento', 'terraza', 'fachada-ventilada'], geometry: 'paver', placement: 'coverage', color: '#d1c6ad', texture: '/texturas/piedra_caliza_real.png', coverage: true, joint: 5,
    properties: { lambdaWmK: 1.7, densityKgM3: 2300, fireClass: 'A1' }, variants: [v('Crema Marfil 60×60', 600, 600, 20), v('Capri 60×40', 600, 400, 20)],
  },

  // 12 · particiones y trasdosados
  {
    manufacturer: 'Placo', manufacturerUrl: 'https://www.placo.es/', sourceUrl: 'https://www.placo.es/', sourceTitle: 'Placas de yeso laminado Placo',
    name: 'Placa Placo', category: 'Particiones y trasdosados', scopes: ['particion', 'hueco-fachada'], geometry: 'board', placement: 'coverage', color: '#e5e3dc', texture: '/texturas/yeso_plaster_real.png', coverage: true, joint: 2, hostsOpenings: true,
    properties: { lambdaWmK: 0.25, densityKgM3: 800, vaporMu: 8, fireClass: 'A2-s1,d0' }, variants: [v('BA 13', 1200, 2500, 12.5), v('Hábito 13', 1200, 2500, 12.5), v('Placoflam PPF 15', 1200, 2500, 15), v('Glasroc X 12,5', 1200, 2500, 12.5)], documented: true,
  },
  {
    manufacturer: 'Knauf', manufacturerUrl: 'https://www.knauf.es/', sourceUrl: 'https://www.knauf.es/', sourceTitle: 'Placas y sistemas Knauf',
    name: 'Placa Knauf', category: 'Particiones y trasdosados', scopes: ['particion', 'hueco-fachada'], geometry: 'board', placement: 'coverage', color: '#dddcd7', texture: '/texturas/yeso_plaster_real.png', coverage: true, joint: 2, hostsOpenings: true,
    properties: { lambdaWmK: 0.25, densityKgM3: 850, vaporMu: 8, fireClass: 'A2-s1,d0' }, variants: [v('Standard A 12,5', 1200, 2500, 12.5), v('Diamant 15', 1200, 2500, 15), v('Silentboard 12,5', 625, 2000, 12.5), v('Aquapanel Outdoor 12,5', 1200, 2400, 12.5)],
  },
  {
    manufacturer: 'Pladur', manufacturerUrl: 'https://corporativo.pladur.com/', sourceUrl: 'https://corporativo.pladur.com/', sourceTitle: 'Catálogo de placas Pladur',
    name: 'Placa Pladur', category: 'Particiones y trasdosados', scopes: ['particion', 'hueco-fachada'], geometry: 'board', placement: 'coverage', color: '#efede6', texture: '/texturas/yeso_plaster_real.png', coverage: true, joint: 2, hostsOpenings: true,
    properties: { lambdaWmK: 0.25, densityKgM3: 800, vaporMu: 8, fireClass: 'A2-s1,d0' }, variants: [v('N 13', 1200, 2500, 12.5), v('H1 13', 1200, 2500, 12.5), v('F 15', 1200, 2500, 15), v('I 15', 1200, 2500, 15)],
  },

  // 10 · remates y evacuación
  {
    manufacturer: 'RHEINZINK', manufacturerUrl: 'https://www.rheinzink.es/', sourceUrl: 'https://www.rheinzink.es/', sourceTitle: 'Remates y canalones RHEINZINK',
    name: 'Remate RHEINZINK', category: 'Remates y evacuación', scopes: [...facadeScopes, ...roofScopes], geometry: 'coping', placement: 'linear', color: '#8b969b', metalness: 0.78, roughness: 0.3,
    properties: { densityKgM3: 7200, fireClass: 'A1' }, variants: [v('Albardilla 300', 300, 3000, 15), v('Vierteaguas 250', 250, 3000, 12), v('Canalón 333', 333, 3000, 12)], documented: true,
  },
  {
    manufacturer: 'VMZINC', manufacturerUrl: 'https://www.vmzinc.com/es-es/', sourceUrl: 'https://www.vmzinc.com/es-es/', sourceTitle: 'Remates VMZINC',
    name: 'Remate VMZINC', category: 'Remates y evacuación', scopes: [...facadeScopes, ...roofScopes], geometry: 'coping', placement: 'linear', color: '#68747a', metalness: 0.8, roughness: 0.29,
    properties: { densityKgM3: 7200, fireClass: 'A1' }, variants: [v('Albardilla Quartz 400', 400, 3000, 15), v('Vierteaguas Anthra 300', 300, 3000, 12), v('Canalón 250', 250, 3000, 12)],
  },
  {
    manufacturer: 'Schlüter-Systems', manufacturerUrl: 'https://eu.schluter.com/es-ES/', sourceUrl: 'https://eu.schluter.com/es-ES/', sourceTitle: 'Perfiles de borde Schlüter BARA',
    name: 'Schlüter BARA', category: 'Remates y evacuación', scopes: ['terraza', 'cubierta-plana', 'pavimento'], geometry: 'profile', placement: 'linear', color: '#9ba2a6', metalness: 0.75, roughness: 0.3,
    properties: { densityKgM3: 2700, fireClass: 'A1' }, variants: [v('RK 100', 100, 2500, 25), v('RTK 120', 120, 2500, 30)],
  },
  {
    manufacturer: 'ULMA Architectural', manufacturerUrl: 'https://www.ulmaarchitectural.com/', sourceUrl: 'https://www.ulmaarchitectural.com/', sourceTitle: 'Vierteaguas y albardillas ULMA',
    name: 'Remate ULMA Stoneo', category: 'Remates y evacuación', scopes: facadeScopes, geometry: 'coping', placement: 'linear', color: '#b9b1a4', roughness: 0.6,
    properties: { densityKgM3: 2100, fireClass: 'A2-s1,d0' }, variants: [v('Vierteaguas 250', 250, 1800, 30), v('Albardilla 300', 300, 1800, 35)],
  },
];

export const BASE_PRODUCT_CATALOG: ProductDefinition[] = expandSeries(SERIES);
export const PRODUCT_CATALOG: ProductDefinition[] = [...BASE_PRODUCT_CATALOG, ...CONSTRUCTION_PRODUCTS];

export const BASE_CATEGORY_TARGETS: Record<ProductCategory, number> = {
  'Soportes y fábrica': 18,
  Aislamientos: 18,
  Impermeabilización: 18,
  'Morteros y sellantes': 16,
  'Revestimientos de fachada': 20,
  'Subestructuras y fijaciones': 18,
  'Carpinterías y huecos': 18,
  'Cubierta inclinada': 20,
  'Cubierta plana y terraza': 14,
  Pavimentos: 18,
  'Particiones y trasdosados': 12,
  'Remates y evacuación': 10,
};

export const CATEGORY_TARGETS = CONSTRUCTION_PRODUCTS.reduce((counts, product) => {
  counts[product.category] += 1;
  return counts;
}, { ...BASE_CATEGORY_TARGETS });

const categoryCount = PRODUCT_CATALOG.reduce<Record<string, number>>((acc, product) => {
  acc[product.category] = (acc[product.category] || 0) + 1;
  return acc;
}, {});

Object.entries(CATEGORY_TARGETS).forEach(([category, target]) => {
  const actual = categoryCount[category] || 0;
  if (actual !== target) {
    throw new Error(`Catálogo inválido: ${category} contiene ${actual} referencias; se esperaban ${target}.`);
  }
});

if (BASE_PRODUCT_CATALOG.length !== 200 || new Set(PRODUCT_CATALOG.map((product) => product.id)).size !== PRODUCT_CATALOG.length) {
  throw new Error('Catálogo inválido: revisa las 200 referencias base y la unicidad de los identificadores.');
}

export const PRODUCT_BY_ID = new Map(PRODUCT_CATALOG.map((product) => [product.id, product]));

export const PRODUCT_CATEGORIES = Object.keys(CATEGORY_TARGETS) as ProductCategory[];

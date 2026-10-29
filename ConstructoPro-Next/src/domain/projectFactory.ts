import { PRODUCT_CATALOG } from '../data/catalog';
import type {
  CoverageSpec,
  DetailType,
  ProductDefinition,
  ProjectDocument,
  SceneEntity,
  Transform3D,
} from './types';
import { clampCommercialCutLength, synchronizeOpeningRelations } from '../geometry/sceneResolver';
import { DETAIL_LABELS } from './types';
import { detailSurfaceRotation, localToWorld } from './construction';

export const APP_VERSION = '0.5.0';

export function createId(prefix: string): string {
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  return `${prefix}-${random}`;
}

function product(manufacturer: string, nameIncludes: string, variantIncludes = ''): ProductDefinition {
  const match = PRODUCT_CATALOG.find((entry) =>
    entry.manufacturer.toLowerCase().includes(manufacturer.toLowerCase())
    && entry.name.toLowerCase().includes(nameIncludes.toLowerCase())
    && entry.name.toLowerCase().includes(variantIncludes.toLowerCase()),
  );
  if (!match) throw new Error(`No se encontró el producto de muestra ${manufacturer} ${nameIncludes} ${variantIncludes}`);
  return match;
}

export function defaultCoverageFor(item: ProductDefinition): CoverageSpec | undefined {
  if (!item.defaultCoverageMm) return undefined;
  const jointMm = item.jointMm ?? 0;
  return {
    widthMm: item.defaultCoverageMm.width,
    heightMm: item.defaultCoverageMm.height,
    jointMm,
    // Every modulated product reserves its declared joint on both axes. The
    // joint is then filled by mortar, grout or a dark backing strip in 3D, so
    // a 1 m² starter surface never contains visual holes.
    bedJointMm: jointMm,
    headJointMm: jointMm,
    mortarRecessMm: item.geometryKind === 'masonry' ? 3 : Math.min(1, jointMm),
    stagger: item.stagger ?? false,
    overlapMm: item.overlapMm ?? 0,
    sideOverlapMm: item.sideOverlapMm ?? 0,
    pieceExceptions: [],
  };
}

export function entityFromProduct(
  item: ProductDefinition,
  transform: Transform3D,
  options: Partial<SceneEntity> = {},
): SceneEntity {
  const variant = item.variants.find((entry) => entry.id === item.defaultVariantId) ?? item.variants[0];
  return {
    id: createId('entity'),
    productId: item.id,
    variantId: variant.id,
    name: options.name ?? item.name,
    transform,
    cutLengthMm: item.placementKind === 'linear'
      ? clampCommercialCutLength(item, variant, options.cutLengthMm ?? variant.stockLengthMm ?? variant.heightMm)
      : undefined,
    coverage: options.coverage ?? defaultCoverageFor(item),
    opening: options.opening,
    visible: options.visible ?? true,
    locked: options.locked ?? false,
    sample: options.sample,
  };
}

function coverage(widthMm: number, heightMm: number, jointMm = 0, stagger = false, overlapMm = 0): CoverageSpec {
  return {
    widthMm,
    heightMm,
    jointMm,
    bedJointMm: jointMm,
    headJointMm: jointMm,
    mortarRecessMm: jointMm > 0 ? 3 : 0,
    stagger,
    overlapMm,
    sideOverlapMm: 0,
    pieceExceptions: [],
  };
}

export function createFacadeSampleEntities(): SceneEntity[] {
  const concrete = product('Holcim', 'Hormigón estructural', '200 mm');
  const brick = product('HISPALYT', 'Ladrillo perforado', '24×11,5×10');
  const mortar = product('Weber', 'webertherm base', '8 mm');
  const insulation = product('ROCKWOOL', 'Ventirock Duo', '100 mm');
  const membrane = product('DuPont', 'Tyvek', 'UV Facade');
  const bracket = product('Referencia constructiva', 'Ménsula de fachada');
  const profile = product('Hilti', 'Perfil Hilti MFT', 'T 60×40');
  const fastener = product('EJOT', 'Fijación EJOT', 'DH 140');
  const cladding = product('Rockpanel', 'Colours A2', '2500×1200');
  const window = product('CORTIZO', 'Ventana CORTIZO', '1200×1400');

  const entities: SceneEntity[] = [];
  const sample = (entry: SceneEntity) => ({ ...entry, sample: true });

  const masonry = sample(entityFromProduct(brick, { position: [-300, 1600, 0], rotation: [0, 0, 0] }, {
    name: '01 · Hoja cerámica principal · 115 mm',
    coverage: coverage(4200, 3200, 10, true),
  }));
  entities.push(masonry);

  const support = sample(entityFromProduct(mortar, { position: [-175, 1600, 61.5], rotation: [0, 0, 0] }, {
    name: '02 · Regularización continua',
    coverage: coverage(3850, 3200, 0),
  }));
  entities.push(support);

  const insulationLayer = sample(entityFromProduct(insulation, { position: [100, 1600, 115.5], rotation: [0, 0, 0] }, {
    name: '03 · Aislamiento semirrígido',
    coverage: coverage(3300, 3200, 0, true),
  }));
  entities.push(insulationLayer);

  const membraneLayer = sample(entityFromProduct(membrane, { position: [350, 1600, 165.7], rotation: [0, 0, 0] }, {
    name: '04 · Membrana exterior',
    coverage: coverage(2800, 3200, 0),
  }));
  entities.push(membraneLayer);

  const slabTop = sample(entityFromProduct(concrete, { position: [0, 3300, -120], rotation: [Math.PI / 2, 0, 0] }, {
    name: 'Forjado superior · reconstrucción parcial',
    coverage: coverage(4800, 900, 0),
  }));
  const slabBottom = sample(entityFromProduct(concrete, { position: [0, -100, -120], rotation: [Math.PI / 2, 0, 0] }, {
    name: 'Forjado inferior · reconstrucción parcial',
    coverage: coverage(4800, 900, 0),
  }));
  entities.push(slabTop, slabBottom);

  const profileXs = [-1800, -1050, -300, 450, 1200, 1950];
  profileXs.forEach((x, index) => {
    entities.push(sample(entityFromProduct(profile, {
      position: [x, 1600, 205.9], rotation: [0, 0, 0],
    }, { name: `Perfil vertical ${index + 1}` })));
  });

  // Cada barra conserva su sección comercial. Si cruza el hueco, el resolver
  // genera tramos de corte independientes a ambos lados de la carpintería.
  [350, 950, 1650, 2350, 2950].forEach((y, row) => {
    [-1200, 1200].forEach((x, segment) => {
      entities.push(sample(entityFromProduct(profile, {
        position: [x, y, 205.9], rotation: [0, 0, Math.PI / 2],
      }, { name: `Perfil horizontal ${row + 1}.${segment + 1} · resuelto contra hueco`, cutLengthMm: 2400 })));
    });
  });

  [350, 950, 1650, 2350, 2950].forEach((y, row) => {
    profileXs.forEach((x, column) => {
      entities.push(sample(entityFromProduct(bracket, {
        position: [x, y, 145.5], rotation: [0, 0, 0],
      }, { name: `Ménsula ${row + 1}.${column + 1}` })));
    });
  });

  [-1850, -1250, -650, -50, 550, 1150, 1750].forEach((x, index) => {
    entities.push(sample(entityFromProduct(fastener, {
      position: [x, index % 2 ? 1100 : 2200, 165.5], rotation: [0, 0, 0],
    }, { name: `Fijación de aislamiento ${index + 1}` })));
  });

  const exterior = sample(entityFromProduct(cladding, { position: [825, 1600, 229.9], rotation: [0, 0, 0] }, {
    name: '05 · Revestimiento ventilado · cutaway',
    coverage: coverage(1850, 2880, 10),
  }));
  entities.push(exterior);

  const hostIds = [masonry.id, support.id, insulationLayer.id, membraneLayer.id];
  entities.push(sample(entityFromProduct(window, { position: [900, 1650, 20], rotation: [0, 0, 0] }, {
    name: 'Ventana · montaje completo sobre premarco',
    opening: {
      widthMm: 1200,
      heightMm: 1400,
      sillMm: 950,
      depthMm: 1000,
      installation: {
        jointMm: 20, preframeFaceMm: 30, preframeDepthMm: 80,
        revealInsulationMm: 25, facadeFaceOffsetMm: 213.9,
        insulationFaceOffsetMm: 145.5, sillSlopeDeg: 10, sillProjectionMm: 40,
        lintelHeightMm: 150, lintelBearingMm: 200,
        supportDepthMm: 115, supportCenterOffsetMm: -20,
      },
      affectedEntities: hostIds.map((entityId) => ({ entityId, behavior: 'cut-coverage' as const })),
      hostIds,
    },
  })));

  return entities;
}

/** All sample layers share a physical support plane; the stepped right edge is a cutaway. */
function sampleLayer(item: ProductDefinition, name: string, widthMm: number, heightMm: number, normalCenterMm: number, frame: Transform3D, joint = 0): SceneEntity {
  return entityFromProduct(item, {
    position: localToWorld([-2000 + widthMm / 2, 0, normalCenterMm], frame), rotation: [...frame.rotation],
  }, { name, sample: true, coverage: { ...defaultCoverageFor(item)!, widthMm, heightMm, jointMm: joint, bedJointMm: joint, headJointMm: joint } });
}

export function createPitchedRoofSampleEntities(): SceneEntity[] {
  const frame: Transform3D = { position: [0, 1000, 0], rotation: detailSurfaceRotation('cubierta-inclinada') };
  const entities = [
    sampleLayer(product('EGOIN', 'Panel CLT', '140 mm'), '01 · Soporte CLT · 140 mm · faldón 35 %', 4000, 3400, 0, frame),
    sampleLayer(product('Referencia constructiva', 'Capa de control de vapor'), '02 · Control de vapor · comprobar necesidad higrotérmica', 3750, 3400, 70.1, frame),
    sampleLayer(product('DANOSA', 'DANOPREN', 'TR 100 mm'), '03 · Aislamiento continuo XPS · 100 mm', 3500, 3400, 120.2, frame),
    sampleLayer(product('Referencia constructiva', 'Capa separadora'), '04 · Separación y protección de materiales · 2 mm', 3250, 3400, 171.2, frame),
    sampleLayer(product('ChovA', 'ChovAPLAST', 'Pol PY 40'), '05 · Impermeabilización bajo teja · solape 100 mm', 3250, 3400, 174.2, frame),
  ];
  const timber = product('Referencia constructiva', 'Rastrel de madera');
  const band = product('ChovA', 'ChovAPLAST', 'Pol PY 40');
  [-1900, -1300, -700, -100, 500, 950].forEach((x, index) => {
    entities.push(entityFromProduct(band, { position: localToWorld([x, 0, 178.2], frame), rotation: [...frame.rotation] }, {
      name: `06 · Banda estanca de apoyo ${index + 1}`, sample: true,
      coverage: { ...defaultCoverageFor(band)!, widthMm: 50, heightMm: 3400, jointMm: 0, bedJointMm: 0, headJointMm: 0 },
    }));
    entities.push(entityFromProduct(timber, { position: localToWorld([x, 0, 195.2], frame), rotation: [...frame.rotation] }, {
      name: `07 · Contrarastrel ${index + 1} · cámara ventilada de 30 mm`, cutLengthMm: 3400, sample: true,
    }));
  });
  for (let row = 0; row < 9; row += 1) {
    const alongSlope = -1700 + 430 + row * 410;
    if (alongSlope > 1690) continue;
    entities.push(entityFromProduct(timber, {
      position: localToWorld([-500, alongSlope, 225.2], frame), rotation: [frame.rotation[0], 0, Math.PI / 2],
    }, { name: `08 · Rastrel portateja ${row + 1} · paso 410 mm de ejemplo`, cutLengthMm: 3000, sample: true }));
  }
  const tiles = product('Tejas Borja', 'TB-10 Class', 'Roja');
  const tileLayer = sampleLayer(tiles, '09 · Teja cerámica · faldón 35 % · paso y solape comerciales', 3000, 3400, 279.2, frame);
  tileLayer.coverage!.stagger = false;
  entities.push(tileLayer);
  entities.push(entityFromProduct(product('RHEINZINK', 'Remate RHEINZINK', 'Canalón 333'), {
    position: localToWorld([-500, -1780, 176.2], frame), rotation: [-Math.PI / 2, 0, Math.PI / 2],
  }, { name: '10 · Canalón de alero · evacuación a dimensionar', cutLengthMm: 3000, sample: true }));
  return entities;
}

export function createFlatRoofSampleEntities(): SceneEntity[] {
  const frame: Transform3D = { position: [0, 750, 0], rotation: detailSurfaceRotation('cubierta-plana') };
  const entities = [
    sampleLayer(product('Holcim', 'Hormigón estructural', '200 mm'), '01 · Soporte portante con pendiente de ejemplo 2 %', 4000, 3400, 0, frame),
    sampleLayer(product('ChovA', 'ChovAPLAST', 'Pol PY 40'), '02 · Impermeabilización continua · 4 mm · solape 100 mm', 3800, 3400, 102, frame),
    sampleLayer(product('Referencia constructiva', 'Capa separadora'), '03 · Capa separadora inferior · 2 mm', 3600, 3400, 105, frame),
    sampleLayer(product('DANOSA', 'DANOPREN', 'TR 80 mm'), '04 · Aislamiento XPS sobre impermeabilización · 80 mm', 3400, 3400, 146, frame),
    sampleLayer(product('Referencia constructiva', 'Capa separadora'), '05 · Capa separadora superior · 2 mm', 3200, 3400, 187, frame),
  ];
  const pedestal = product('BUZON', 'Pedestal BUZON', 'PB-2');
  const supportXs = [-1915, -1400, -800, -200, 400, 715];
  const supportYs = [-1615, -1100, -500, 100, 700, 1300, 1615];
  supportXs.forEach((x, column) => supportYs.forEach((y, row) => {
    entities.push(entityFromProduct(pedestal, {
      position: localToWorld([x, y, 228], frame), rotation: [Math.atan(0.02), 0, 0],
    }, { name: `06 · Soporte regulable ${column + 1}.${row + 1} · altura 80 mm`, sample: true }));
  }));
  entities.push(sampleLayer(product('Rosa Gres', 'Baldosa técnica', 'Serena'), '07 · Protección transitable · porcelánico 20 mm sobre soportes', 2800, 3400, 278, frame, 4));
  entities.push(entityFromProduct(product('RHEINZINK', 'Remate RHEINZINK', 'Canalón 333'), {
    position: localToWorld([-500, -1780, 104], frame), rotation: [-Math.PI / 2, 0, Math.PI / 2],
  }, { name: '08 · Canalón de borde · comprobar caudal y rebosadero', cutLengthMm: 3000, sample: true }));
  return entities;
}

function createSateSampleEntities(): SceneEntity[] {
  const frame: Transform3D = { position: [0, 1600, 0], rotation: [0, 0, 0] };
  return [
    sampleLayer(product('HISPALYT', 'Ladrillo perforado', '24×11,5×10'), '01 · Hoja principal de fábrica · 115 mm', 4000, 3200, 0, frame, 10),
    sampleLayer(product('Weber', 'webertherm base', '8 mm'), '02 · Adhesivo de sistema · 8 mm · ejemplo', 3750, 3200, 61.5, frame),
    sampleLayer(product('Referencia constructiva', 'Aislante SATE'), '03 · Aislante SATE · 80 mm · seleccionar sistema evaluado', 3500, 3200, 105.5, frame),
    sampleLayer(product('Weber', 'webertherm base', '5 mm'), '04 · Capa base de armado · primera pasada 5 mm', 3250, 3200, 148, frame),
    sampleLayer(product('Referencia constructiva', 'Malla de refuerzo'), '05 · Malla de refuerzo · embebida en capa base', 3000, 3200, 149.75, frame),
    sampleLayer(product('Referencia constructiva', 'Acabado SATE'), '06 · Acabado SATE · 2 mm · compatibilidad pendiente', 2750, 3200, 151.5, frame),
  ];
}

function createPartitionSampleEntities(): SceneEntity[] {
  const stud = product('Referencia constructiva', 'Montante C');
  const board = product('Placo', 'Placa Placo', 'BA 13');
  const wool = product('Knauf Insulation', 'Ultracoustic', '70 mm');
  const entities: SceneEntity[] = [
    entityFromProduct(board, { position: [0, 1400, -41.25], rotation: [0, 0, 0] }, { name: '01 · Placa posterior de yeso laminado · 12,5 mm', coverage: coverage(3000, 2800, 0), sample: true }),
    entityFromProduct(wool, { position: [-250, 1400, 0], rotation: [0, 0, 0] }, { name: '03 · Lana mineral entre montantes · 70 mm', coverage: coverage(2500, 2800, 0), sample: true }),
    entityFromProduct(board, { position: [-700, 1400, 41.25], rotation: [0, 0, 0] }, { name: '04 · Placa delantera de yeso laminado · 12,5 mm', coverage: coverage(1600, 2800, 0), sample: true }),
  ];
  [-1480, -900, -300, 300, 900, 1480].forEach((x, index) => entities.push(entityFromProduct(stud, { position: [x, 1400, 0], rotation: [0, 0, 0] }, { name: `02 · Montante ${index + 1} · modulación 600 mm`, cutLengthMm: 2800, sample: true })));
  return entities;
}

function createFloorSampleEntities(): SceneEntity[] {
  const frame: Transform3D = { position: [0, 650, 0], rotation: detailSurfaceRotation('pavimento') };
  return [
    sampleLayer(product('Holcim', 'Hormigón estructural', '200 mm'), '01 · Soporte de hormigón · 200 mm', 4000, 3000, 0, frame),
    sampleLayer(product('GECOL', 'GECOL', 'Imper-G'), '02 · Impermeabilización adherida · ejemplo 3 mm', 3750, 3000, 101.5, frame),
    sampleLayer(product('Mapei', 'Keraflex', '5 mm'), '03 · Adhesivo cementoso · 5 mm', 3500, 3000, 105.5, frame),
    sampleLayer(product('Porcelanosa', 'Pavimento Porcelanosa', '20 mm'), '04 · Pavimento porcelánico · 20 mm', 3250, 3000, 118, frame, 4),
  ];
}

export function createDetailSampleEntities(detailType: DetailType): SceneEntity[] {
  if (detailType === 'cubierta-inclinada') return createPitchedRoofSampleEntities();
  if (detailType === 'cubierta-plana' || detailType === 'terraza') return createFlatRoofSampleEntities();
  if (detailType === 'fachada-sate') return createSateSampleEntities();
  if (detailType === 'particion') return createPartitionSampleEntities();
  if (detailType === 'pavimento') return createFloorSampleEntities();
  return createFacadeSampleEntities();
}

export function createProject(withSample = true, detailType: DetailType = 'fachada-ventilada'): ProjectDocument {
  const now = new Date().toISOString();
  const project: ProjectDocument = {
    schemaVersion: 4,
    appVersion: APP_VERSION,
    id: createId('project'),
    title: withSample ? `${DETAIL_LABELS[detailType]} · estudio constructivo` : 'Detalle sin título',
    createdAt: now,
    updatedAt: now,
    detailType,
    context: {
      municipality: 'València',
      province: 'Valencia/València',
      altitudeM: 15,
      climateZone: 'B3',
      climateZoneSource: 'cte-anejob',
      use: 'Docente',
      exposure: 'Normal',
      orientation: 'N',
      interiorTemperatureC: 20,
      exteriorTemperatureC: 5,
      interiorHumidityPct: 55,
      exteriorHumidityPct: 75,
    },
    budget: {
      areaM2: withSample ? 15.36 : 1,
      wastePct: 5,
      vatPct: 21,
      rateOverrides: {},
    },
    entities: withSample ? createDetailSampleEntities(detailType) : [],
    camera: {
      mode: 'perspective',
      position: [4450, 3350, 4550],
      target: [220, 1580, 60],
    },
    section: { open: true, expanded: false, offsetMm: ['cubierta-inclinada', 'cubierta-plana', 'terraza', 'pavimento'].includes(detailType) ? 0 : -1500, direction: 'vertical-x', scale: 10 },
  };
  if (['cubierta-inclinada', 'cubierta-plana', 'terraza', 'pavimento'].includes(detailType)) {
    project.camera = { mode: 'perspective', position: [4600, 3900, 4900], target: [0, detailType === 'cubierta-inclinada' ? 1100 : 850, 0] };
  }
  return synchronizeOpeningRelations(project);
}

/** Internal, non-persistent acceptance scene for the 12 × 12 m performance route. */
export function createPerformanceProject(): ProjectDocument {
  const project = createProject(false, 'fachada-ventilada');
  const brick = product('HISPALYT', 'Ladrillo perforado', '24×11,5×5');
  const insulation = product('ROCKWOOL', 'Ventirock Duo', '100 mm');
  const cladding = product('Rockpanel', 'Colours A2', '2500×1200');
  const firstLeaf = entityFromProduct(brick, { position: [0, 6000, 0], rotation: [0, 0, 0] }, {
    name: 'QA 12×12 · hoja cerámica exterior',
    coverage: coverage(12000, 12000, 1, true),
  });
  const secondLeaf = entityFromProduct(brick, { position: [0, 6000, -145], rotation: [0, 0, 0] }, {
    name: 'QA 12×12 · hoja cerámica interior',
    coverage: coverage(12000, 12000, 1, true),
  });
  const thermal = entityFromProduct(insulation, { position: [0, 6000, 120], rotation: [0, 0, 0] }, {
    name: 'QA 12×12 · aislamiento',
    coverage: coverage(12000, 12000, 2, true),
  });
  const skin = entityFromProduct(cladding, { position: [0, 6000, 320], rotation: [0, 0, 0] }, {
    name: 'QA 12×12 · revestimiento',
    coverage: coverage(12000, 12000, 10),
  });
  return {
    ...project,
    title: 'QA rendimiento · escena 12×12 m',
    entities: [firstLeaf, secondLeaf, thermal, skin],
    camera: { mode: 'perspective', position: [14500, 11000, 17500], target: [0, 6000, 0] },
    section: { ...project.section, open: false },
  };
}

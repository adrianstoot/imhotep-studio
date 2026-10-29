import { PRODUCT_BY_ID } from '../data/catalog';
import type { ProjectDocument, RuleDefinition, RulePack, RuleResult } from '../domain/types';
import { resolveCteClimateZone } from './climateZone';
import { layerIntervals, layersOnNormalRay, surfaceSlopePct } from './constructionChecks';

const SOURCES = {
  he: {
    url: 'https://www.codigotecnico.org/pdf/Documentos/HE/DBHE.pdf',
    version: 'DB-HE consolidado · RD 450/2022 + corrección BOE 02/02/2023',
    publishedAt: '2023-02-02',
  },
  hs: {
    url: 'https://www.codigotecnico.org/pdf/Documentos/HS/DBHS.pdf',
    version: 'DB-HS consolidado · RD 450/2022',
    publishedAt: '2022-06-15',
  },
  si: {
    url: 'https://www.codigotecnico.org/pdf/Documentos/SI/DBSI.pdf',
    version: 'DB-SI consolidado · RD 164/2025',
    publishedAt: '2025-04-10',
  },
  hr: {
    url: 'https://www.codigotecnico.org/pdf/Documentos/HR/DBHR.pdf',
    version: 'DB-HR consolidado · RD 732/2019',
    publishedAt: '2019-12-27',
  },
} as const;

const REVIEWED_AT = '2026-10-28';

function rule(
  id: string,
  title: string,
  document: RuleDefinition['cteDocument'],
  section: string,
  source: (typeof SOURCES)[keyof typeof SOURCES],
  appliesTo: RuleDefinition['appliesTo'],
): RuleDefinition {
  return {
    id,
    title,
    cteDocument: document,
    section,
    sourceUrl: source.url,
    version: source.version,
    publishedAt: source.publishedAt,
    reviewedAt: REVIEWED_AT,
    appliesTo,
  };
}

const facadeScopes: RuleDefinition['appliesTo'] = ['fachada-ventilada', 'fachada-sate', 'hueco-fachada'];
const envelopeScopes: RuleDefinition['appliesTo'] = ['fachada-ventilada', 'fachada-sate', 'hueco-fachada', 'cubierta-inclinada', 'cubierta-plana', 'terraza', 'pavimento', 'particion'];
const definitions: RuleDefinition[] = [
  rule('climate-context', 'Zona climática del emplazamiento', 'DB-HE', 'Anejo B · tabla a', SOURCES.he, envelopeScopes),
  rule('layer-order', 'Orden y continuidad de capas', 'DB-HS', 'HS 1 · 2.3 Fachadas', SOURCES.hs, facadeScopes),
  rule('masonry-joints', 'Fábrica y juntas de mortero', 'DB-HS', 'HS 1 · 5.1 Ejecución', SOURCES.hs, facadeScopes),
  rule('ventilated-cavity', 'Cámara exterior geométrica', 'DB-HS', 'HS 1 · 2.3.2 y 2.3.3.5', SOURCES.hs, ['fachada-ventilada']),
  rule('thermal', 'Resistencia térmica disponible', 'DB-HE', 'HE 1 · 3.1.1', SOURCES.he, ['fachada-ventilada', 'fachada-sate', 'hueco-fachada', 'cubierta-inclinada', 'cubierta-plana']),
  rule('opening', 'Encuentro de fachada con carpintería', 'DB-HS', 'HS 1 · 2.3.3.6', SOURCES.hs, facadeScopes),
  rule('fire', 'Reacción al fuego de fachada', 'DB-SI', 'SI 2 · 1 Propagación exterior', SOURCES.si, ['fachada-ventilada', 'fachada-sate', 'cubierta-inclinada', 'cubierta-plana']),
  rule('acoustic', 'Datos acústicos del cerramiento', 'DB-HR', 'HR · 2.1', SOURCES.hr, [...facadeScopes, 'cubierta-inclinada', 'cubierta-plana']),
  rule('thermal-bridge', 'Puentes térmicos', 'DB-HE', 'HE 1 · Envolvente térmica', SOURCES.he, facadeScopes),
  rule('roof-components', 'Composición de la cubierta', 'DB-HS', 'HS 1 · 2.4.2', SOURCES.hs, ['cubierta-inclinada', 'cubierta-plana', 'terraza']),
  rule('roof-slope', 'Pendiente del plano de agua', 'DB-HS', 'HS 1 · 2.4.3.1 · tablas 2.9 y 2.10', SOURCES.hs, ['cubierta-inclinada', 'cubierta-plana', 'terraza']),
  rule('roof-overlaps', 'Solapes y orientación de tejas', 'DB-HS', 'HS 1 · 2.4.3.5 y 2.4.4.2', SOURCES.hs, ['cubierta-inclinada']),
  rule('roof-drainage', 'Evacuación y puntos singulares', 'DB-HS', 'HS 1 · 2.4.4 · HS 5', SOURCES.hs, ['cubierta-inclinada', 'cubierta-plana', 'terraza']),
  rule('data-evidence', 'Procedencia de los datos y geometrías', 'CTE', 'Parte I · artículo 7 · documentación de productos', SOURCES.hs, envelopeScopes),
];

export const CTE_RULE_PACK: RulePack = {
  id: 'cte-educativo-es-2026-10-v4',
  title: 'CTE educativo · envolvente y acabados',
  version: '2026.10.4',
  reviewedAt: REVIEWED_AT,
  educationalOnly: true,
  rules: definitions,
};

function result(definition: RuleDefinition, severity: RuleResult['severity'], message: string, inputs?: RuleResult['inputs']): RuleResult {
  return {
    id: definition.id,
    title: definition.title,
    severity,
    message,
    sourceLabel: `CTE · ${definition.cteDocument} · ${definition.section} · ${definition.version}`,
    sourceUrl: definition.sourceUrl,
    inputs: {
      ...inputs,
      publicación: definition.publishedAt,
      revisiónLocal: definition.reviewedAt,
    },
  };
}

function definition(id: string): RuleDefinition {
  const match = definitions.find((entry) => entry.id === id);
  if (!match) throw new Error(`Regla ${id} no encontrada.`);
  return match;
}

export function evaluateProject(project: ProjectDocument): RuleResult[] {
  const applicable = new Set(definitions.filter((entry) => entry.appliesTo.includes(project.detailType)).map((entry) => entry.id));
  const visible = project.entities.filter((entity) => entity.visible);
  const byCategory = new Map<string, typeof visible>();
  visible.forEach((entity) => {
    const product = PRODUCT_BY_ID.get(entity.productId);
    if (!product) return;
    byCategory.set(product.category, [...(byCategory.get(product.category) ?? []), entity]);
  });
  const output: RuleResult[] = [];

  if (applicable.has('climate-context')) {
    const climate = resolveCteClimateZone(project.context.province, project.context.altitudeM);
    const traceable = climate
      && project.context.climateZoneSource === 'cte-anejob'
      && project.context.climateZone === climate.zone;
    output.push(result(
      definition('climate-context'),
      !climate ? 'error' : traceable ? 'pass' : 'warning',
      !climate
        ? 'Faltan una provincia CTE y una altitud válidas. No se asigna ninguna zona por el nombre del municipio.'
        : traceable
          ? `Zona ${climate.zone} obtenida de la provincia ${climate.province} y una altitud de ${climate.altitudeM} m.`
          : `La tabla oficial devuelve ${climate.zone}; la zona almacenada (${project.context.climateZone || 'vacía'}) no conserva una procedencia automática coincidente.`,
      {
        provincia: project.context.province || 'No definida',
        altitudM: project.context.altitudeM ?? 'No definida',
        zonaCalculada: climate?.zone ?? 'No calculable',
        zonaAlmacenada: project.context.climateZone || 'No definida',
        método: project.context.climateZoneSource,
      },
    ));
  }

  if (applicable.has('layer-order')) {
    const required = project.detailType === 'fachada-sate'
      ? ['Soportes y fábrica', 'Aislamientos', 'Morteros y sellantes']
      : ['Soportes y fábrica', 'Aislamientos', 'Subestructuras y fijaciones', 'Revestimientos de fachada'];
    const missing = required.filter((category) => !(byCategory.get(category)?.length));
    const zByCategory = required.flatMap((category) => {
      const entity = byCategory.get(category)?.[0];
      return entity ? [{ category, z: entity.transform.position[2] }] : [];
    });
    const ordered = zByCategory.every((entry, index) => index === 0 || entry.z >= zByCategory[index - 1].z);
    output.push(result(
      definition('layer-order'),
      missing.length ? 'warning' : ordered ? 'info' : 'warning',
      missing.length
        ? `Faltan familias funcionales: ${missing.join(', ')}.`
        : ordered
          ? 'Están presentes las familias del sistema y sus centros siguen el orden del eje Z. Revisa continuidad, uniones y encuentros en la sección; esta prueba no valida un sistema completo.'
          : 'Las familias existen, pero su orden geométrico interior–exterior debe revisarse.',
      { entidadesVisibles: visible.length, familiasAusentes: missing.length, ordenGeométrico: ordered ? 'coherente' : 'revisar' },
    ));
  }

  if (applicable.has('masonry-joints')) {
    const leaves = visible.filter((entity) => PRODUCT_BY_ID.get(entity.productId)?.geometryKind === 'masonry' && entity.coverage);
    const withoutMortar = leaves.filter((entity) => (entity.coverage?.bedJointMm ?? entity.coverage?.jointMm ?? 0) <= 0
      || (entity.coverage?.headJointMm ?? entity.coverage?.jointMm ?? 0) <= 0);
    output.push(result(
      definition('masonry-joints'),
      !leaves.length ? 'info' : withoutMortar.length ? 'warning' : 'pass',
      !leaves.length
        ? 'No hay una fábrica cerámica visible que comprobar.'
        : withoutMortar.length
          ? `${withoutMortar.length} hoja(s) de fábrica no tienen tendeles y llagas completos modelados.`
          : 'Tendeles y llagas se modelan como volumen de mortero independiente, con espesor y retranqueo explícitos.',
      { hojasDeFábrica: leaves.length, hojasSinMorteroCompleto: withoutMortar.length },
    ));
  }

  if (applicable.has('ventilated-cavity')) {
    const insulation = (byCategory.get('Aislamientos') ?? [])[0];
    const cladding = (byCategory.get('Revestimientos de fachada') ?? [])[0];
    if (!insulation || !cladding) {
      output.push(result(definition('ventilated-cavity'), 'error', 'No se puede comprobar la cámara sin aislamiento y revestimiento exterior.'));
    } else {
      const insulationProduct = PRODUCT_BY_ID.get(insulation.productId)!;
      const claddingProduct = PRODUCT_BY_ID.get(cladding.productId)!;
      const insulationVariant = insulationProduct.variants.find((entry) => entry.id === insulation.variantId)!;
      const claddingVariant = claddingProduct.variants.find((entry) => entry.id === cladding.variantId)!;
      const clearGap = cladding.transform.position[2] - claddingVariant.depthMm / 2
        - (insulation.transform.position[2] + insulationVariant.depthMm / 2);
      output.push(result(
        definition('ventilated-cavity'),
        clearGap > 0 ? 'info' : 'error',
        clearGap > 0
          ? `La geometría contiene ${clearGap.toFixed(0)} mm libres. Esta comprobación no certifica ventilación, drenaje ni barreras cortafuego.`
          : 'El revestimiento invade el aislamiento: no existe una cámara geométrica libre.',
        { cámaraLibreMm: Number(clearGap.toFixed(1)), criterio: 'existencia geométrica; sin umbral normativo automático' },
      ));
    }
  }

  if (applicable.has('thermal')) {
    const reference = visible.find((entity) => entity.coverage && PRODUCT_BY_ID.get(entity.productId)?.geometryKind === 'insulation')
      ?? visible.find((entity) => entity.coverage);
    const onRay = reference ? layersOnNormalRay(visible, reference).filter((entity) => {
      const product = PRODUCT_BY_ID.get(entity.productId);
      return product && ['masonry', 'solid', 'insulation', 'finish', 'board', 'membrane'].includes(product.geometryKind);
    }) : [];
    const intervals = reference ? layerIntervals(onRay, reference) : [];
    const collisions = intervals.filter((entry, i) => i > 0 && entry.min < intervals[i - 1].max - 0.5).length;
    const thermalLayers = intervals.flatMap(({ product, variant }) => {
      const lambda = product.source.quality === 'documented' ? product.properties.lambdaWmK : undefined;
      return lambda && lambda > 0 ? [{ name: product.name, resistance: (variant.depthMm / 1000) / lambda }] : [];
    });
    if (!thermalLayers.length) {
      output.push(result(definition('thermal'), 'warning', 'No hay conductividades verificadas suficientes. Los campos desconocidos se excluyen del cálculo.'));
    } else {
      const resistance = thermalLayers.reduce((sum, layer) => sum + layer.resistance, 0);
      output.push(result(
        definition('thermal'),
        collisions ? 'warning' : 'info',
        `ΣR de sólidos documentados = ${resistance.toFixed(3)} m²K/W en un recorrido normal al centro del aislamiento. ${collisions ? 'Hay capas que se solapan en este recorrido. ' : ''}Faltan ${intervals.length - thermalLayers.length} dato(s) de conductividad. No se calcula U global sin completar cámaras, resistencias superficiales y puentes térmicos.`,
        { fórmula: 'R de cada sólido = e / λ', zonaClimática: project.context.climateZone, capasEnRecorrido: intervals.length, capasDocumentadas: thermalLayers.length, solapes: collisions, RSolidosM2K_W: Number(resistance.toFixed(3)), referencia: reference?.name ?? 'Sin recorrido' },
      ));
    }
  }

  if (applicable.has('opening')) {
    const openings = visible.filter((entity) => entity.opening);
    const remates = byCategory.get('Remates y evacuación') ?? [];
    openings.forEach((opening, index) => {
      const affected = opening.opening?.affectedEntities ?? [];
      const cut = affected.filter((entry) => entry.behavior === 'cut-coverage').length;
      const split = affected.filter((entry) => entry.behavior === 'split-linear').length;
      const suppressed = affected.filter((entry) => entry.behavior === 'suppress-unit').length;
      const installation = opening.opening?.installation;
      output.push(result(
        { ...definition('opening'), id: `opening-${opening.id}`, title: `Hueco ${index + 1} · encuentro pendiente` },
        'warning',
        `El vacío regenera ${cut} capa(s), divide ${split} perfil(es) y retira ${suppressed} fijación(es). ${installation ? 'Montaje vinculado con premarco, calzos, anclajes, tres niveles de sellado, retornos aislantes, telares, bandejas impermeables y drenaje. El dintel y los anclajes están representados, pendientes de cálculo y especificación del sistema.' : `Faltan decisiones de dintel, jambas, precerco, impermeabilización y sellado. ${remates.length ? 'Hay remates independientes; comprueba su relación espacial.' : 'No hay remates independientes.'}`}`,
        { capasRecortadas: cut, perfilesDivididos: split, unidadesRetiradas: suppressed, rematesIndependientes: remates.length },
      ));
      if (installation) {
        const slopeOk = installation.sillSlopeDeg >= 10;
        const dripDistance = installation.sillProjectionMm - 5;
        output.push(result(
          { ...definition('opening'), id: `sill-${opening.id}`, title: `Hueco ${index + 1} · geometría del vierteaguas` },
          slopeOk && dripDistance >= 20 ? 'pass' : 'error',
          `Pendiente exterior ${installation.sillSlopeDeg}° (mínimo 10°); goterón a ${dripDistance} mm del paramento (mínimo 20 mm); entrega lateral modelada 20 mm. Hay bandeja inferior con retornos. Comprobación geométrica parcial de HS 1, sin validar la instalación completa.`,
          { pendienteGrados: installation.sillSlopeDeg, separacionGoteronMm: dripDistance, entregaLateralMm: 20 },
        ));
      }
    });
    if (!openings.length) output.push(result(definition('opening'), 'info', 'No hay huecos en la escena activa.'));
  }

  if (applicable.has('fire')) {
    const uniqueProducts = [...new Map(
      visible.map((entity) => PRODUCT_BY_ID.get(entity.productId)).filter(Boolean).map((product) => [product!.id, product!]),
    ).values()];
    const documented = uniqueProducts.filter((product) => product.source.quality === 'documented' && product.properties.fireClass);
    const unknown = uniqueProducts.length - documented.length;
    output.push(result(
      definition('fire'),
      unknown ? 'warning' : 'info',
      unknown
        ? `${unknown} producto(s) carecen de clasificación de reacción al fuego verificada; no participan en una comprobación de SI 2.`
        : 'Todos los productos visibles declaran clase. Aún deben introducirse altura de fachada, uso y posición para evaluar SI 2.',
      { productosConClase: documented.length, productosSinDato: unknown, versiónSI: 'RD 164/2025' },
    ));
  }

  if (applicable.has('acoustic')) {
    const products = visible.map((entity) => PRODUCT_BY_ID.get(entity.productId)).filter(Boolean);
    const withAcousticData = products.filter((product) => product?.source.quality === 'documented' && product.properties.acousticRwDb);
    output.push(result(
      definition('acoustic'),
      'info',
      withAcousticData.length
        ? `${withAcousticData.length} producto(s) aportan dato acústico individual. DB-HR exige valorar el elemento terminado y sus uniones.`
        : 'No hay datos acústicos suficientes para evaluar el cerramiento terminado.',
      { productosConDatoAcústico: withAcousticData.length, uso: project.context.use },
    ));
  }

  if (applicable.has('thermal-bridge')) {
    output.push(result(
      definition('thermal-bridge'),
      'info',
      'Cantos de forjado, anclajes y contornos de hueco requieren análisis 2D/3D específico. El programa no inventa un valor ψ.',
      { valorPsi: 'No calculado' },
    ));
  }

  const roofing = visible.flatMap((entity) => {
    const product = PRODUCT_BY_ID.get(entity.productId);
    return product ? [{ entity, product }] : [];
  });
  const waterproofing = roofing.filter(({ product, entity }) => entity.coverage
    && product.geometryKind === 'membrane' && product.category === 'Impermeabilización'
    && !/vapor|geotextil|separador/i.test(product.name));
  const tiles = roofing.filter(({ product }) => product.geometryKind === 'roof-tile');

  if (applicable.has('roof-components')) {
    const missing = [
      !roofing.some(({ product }) => product.category === 'Soportes y fábrica') && 'soporte',
      !roofing.some(({ product }) => product.geometryKind === 'insulation') && 'aislamiento de la envolvente',
      !waterproofing.length && 'impermeabilización',
      !(project.detailType === 'cubierta-inclinada' ? tiles.length : roofing.some(({ product }) => product.geometryKind === 'paver')) && 'protección o tejado',
    ].filter(Boolean);
    output.push(result(definition('roof-components'), missing.length ? 'warning' : 'info',
      missing.length ? `Revisa la composición: no se han identificado ${missing.join(', ')}. La necesidad de cada capa depende del uso y del sistema elegido.`
        : 'Se identifican soporte, aislamiento, impermeabilización y protección. Comprueba compatibilidad, separadoras, juntas y continuidad de cada capa en los encuentros.',
      { familiasPendientes: missing.length, sistema: project.detailType }));
  }

  if (applicable.has('roof-slope')) {
    const carrier = waterproofing[0]?.entity ?? tiles[0]?.entity;
    if (!carrier) output.push(result(definition('roof-slope'), 'warning', 'Falta un plano de impermeabilización o tejado sobre el que medir la pendiente.'));
    else {
      const slope = surfaceSlopePct(carrier);
      const isPitched = project.detailType === 'cubierta-inclinada';
      const isVertical = !Number.isFinite(slope) || slope > 1000;
      const isFlat = slope < 0.1;
      const outsideFlatRange = !isPitched && (slope < 1 - 0.001 || slope > 5 + 0.001);
      output.push(result(definition('roof-slope'), isVertical || isFlat ? 'error' : outsideFlatRange ? 'warning' : 'info',
        isVertical ? 'El plano de agua es prácticamente vertical. Revisa la orientación del faldón y sus capas.'
          : isFlat ? 'El plano de agua no tiene pendiente geométrica. Debes resolver su formación y dirigirla a la evacuación.'
            : `Pendiente geométrica ${slope.toFixed(1)} %. ${isPitched ? 'Debe contrastarse con la ficha del tejado, las condiciones de exposición y las notas de la tabla 2.10; la impermeabilización no elimina esa revisión.' : 'Para protecciones habituales con solado o grava, la tabla 2.9 utiliza 1–5 %, con las excepciones indicadas en el documento. La pendiente se mide en la impermeabilización, no en el pavimento sobre soportes.'}`,
        { planoMedido: carrier.name, pendientePct: Number.isFinite(slope) ? Number(slope.toFixed(2)) : 'Vertical', criterio: 'orientación geométrica; no certifica sistema' }));
    }
  }

  if (applicable.has('roof-overlaps')) {
    const invalid = tiles.filter(({ entity, product }) => {
      const variant = product.variants.find((item) => item.id === entity.variantId) ?? product.variants[0];
      return !entity.coverage || entity.coverage.overlapMm <= 0 || entity.coverage.overlapMm >= variant.heightMm
        || (entity.coverage.sideOverlapMm ?? 0) >= variant.widthMm || surfaceSlopePct(entity) > 1000;
    });
    output.push(result(definition('roof-overlaps'), !tiles.length ? 'warning' : invalid.length ? 'error' : 'info',
      !tiles.length ? 'No hay tejas o piezas de tejado en la escena.'
        : invalid.length ? `${invalid.length} paño(s) tienen tejas verticales, sin solape longitudinal o con solape mayor que la pieza.`
          : 'Las piezas conservan su dimensión y tienen solape longitudinal positivo. Verifica paso útil y encajes con la ficha exacta, sentido de vertido, fijaciones y piezas especiales de borde.',
      { pañosDeTeja: tiles.length, pañosConError: invalid.length }));
  }

  if (applicable.has('roof-drainage')) {
    const drains = roofing.filter(({ product, entity }) => product.geometryKind === 'drain' || /sumidero|canalón|canalon|rebosadero/i.test(entity.name));
    output.push(result(definition('roof-drainage'), drains.length ? 'info' : 'warning',
      drains.length ? 'Hay elementos de evacuación. Su presencia no verifica cota de entrada, continuidad de la lámina, caudal, rebosaderos ni dimensionado de HS 5.'
        : 'Falta representar la salida del agua: sumidero o canalón, y rebosadero cuando corresponda. Resuelve su conexión con la impermeabilización y su dimensionado según HS 5.',
      { elementosDeEvacuación: drains.length, caudalDeCálculo: 'No definido' }));
  }

  if (applicable.has('data-evidence')) {
    const products = [...new Map(roofing.map(({ product }) => [product.id, product])).values()];
    const approximated = products.filter((product) => product.evidence.geometry === 'procedural-approximation').length;
    const linked = products.filter((product) => product.source.quality !== 'documented').length;
    output.push(result(definition('data-evidence'), 'info',
      `${products.length} referencias utilizadas; ${linked} con fuente enlazada sin prestaciones verificadas y ${approximated} con geometría aproximada. Consulta las fichas de cada producto y la documentación del sistema antes de justificar prestaciones.`,
      { productos: products.length, fuentesSinPrestaciones: linked, geometríasAproximadas: approximated, revisiónReglas: REVIEWED_AT }));
  }

  return output;
}

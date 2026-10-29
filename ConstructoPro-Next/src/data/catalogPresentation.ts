import { PRODUCT_CATALOG } from './catalog';
import type { DetailType, ProductDefinition } from '../domain/types';

export type PremiumFamily =
  | 'Fábrica'
  | 'Aislamientos'
  | 'Protección'
  | 'Revestimientos'
  | 'Subestructura'
  | 'Huecos'
  | 'Cubierta'
  | 'Pavimentos'
  | 'Interiores'
  | 'Remates';

export interface PremiumCardDefinition {
  productName: string;
  family: PremiumFamily;
  subtype: string;
  artwork: string;
  accent: string;
  shortDescription: string;
  /** Existing 30 cards are complete artwork; new cards use artwork as a hero render and render exact copy in React. */
  visual?: 'complete' | 'generated-render';
}

export interface PremiumCatalogItem extends PremiumCardDefinition {
  product: ProductDefinition;
}

const CARD_DEFINITIONS: PremiumCardDefinition[] = [
  {
    productName: 'Ladrillo perforado métrico · 24×11,5×5 cm',
    family: 'Fábrica', subtype: 'Aparejos', artwork: '/catalog/card-01-hispalyt-ladrillo-perforado.webp', accent: '#c65327',
    shortDescription: 'Pieza cerámica perforada para fábrica revestida, con junta y aparejo regenerables.',
  },
  {
    productName: 'Ladrillo hueco gran formato · 50×50×7 cm',
    family: 'Fábrica', subtype: 'Aparejos', artwork: '/catalog/card-02-hispalyt-gran-formato.webp', accent: '#c65b2c',
    shortDescription: 'Panel cerámico hueco de gran formato para paños interiores y trasdosados.',
  },
  {
    productName: 'Bloque Termoarcilla · 24 cm',
    family: 'Fábrica', subtype: 'Bloques cerámicos', artwork: '/catalog/card-03-termoarcilla-24.webp', accent: '#d76a27',
    shortDescription: 'Bloque aligerado machihembrado con celdillas modeladas y junta de tendel.',
  },
  {
    productName: 'Ventirock Duo · 80 mm',
    family: 'Aislamientos', subtype: 'Lana mineral', artwork: '/catalog/card-04-rockwool-ventirock.webp', accent: '#b58c26',
    shortDescription: 'Panel semirrígido de lana de roca de doble densidad para cámara ventilada.',
  },
  {
    productName: 'Arena · 80 mm',
    family: 'Aislamientos', subtype: 'Lana de vidrio', artwork: '/catalog/card-05-isover-arena.webp', accent: '#e2af00',
    shortDescription: 'Panel de lana de vidrio para aislamiento térmico y acústico entre perfilería.',
  },
  {
    productName: 'DANOPREN · TR 80 mm',
    family: 'Aislamientos', subtype: 'XPS', artwork: '/catalog/card-06-danosa-danopren.webp', accent: '#1394a5',
    shortDescription: 'Aislamiento rígido XPS con borde comercial inmutable y recortes automáticos.',
  },
  {
    productName: 'ESTERDAN · 40 P ELAST',
    family: 'Protección', subtype: 'Láminas bituminosas', artwork: '/catalog/card-07-danosa-esterdan.webp', accent: '#49505b',
    shortDescription: 'Lámina bituminosa en rollo con solape real y espesor representado en 3D.',
  },
  {
    productName: 'Tyvek · Housewrap',
    family: 'Protección', subtype: 'Membranas transpirables', artwork: '/catalog/card-08-dupont-tyvek.webp', accent: '#3d8fb7',
    shortDescription: 'Membrana exterior continua, flexible, recortable y vinculada a huecos.',
  },
  {
    productName: 'webertherm base · Capa 5 mm',
    family: 'Protección', subtype: 'Morteros base', artwork: '/catalog/card-09-weber-base.webp', accent: '#7c7f82',
    shortDescription: 'Capa mineral continua de espesor controlado para regularización y armado.',
  },
  {
    productName: 'Rockpanel Colours A2 · 8 mm · 2500×1200',
    family: 'Revestimientos', subtype: 'Paneles minerales', artwork: '/catalog/card-10-rockpanel-a2.webp', accent: '#b6a98a',
    shortDescription: 'Panel mineral A2 modulado por piezas, juntas y recortes sin deformación.',
  },
  {
    productName: 'Panel cerámico FAVETON · Bersal 300',
    family: 'Revestimientos', subtype: 'Paneles cerámicos', artwork: '/catalog/card-11-faveton-bersal.webp', accent: '#b8522d',
    shortDescription: 'Panel extruido de fachada ventilada con cámaras y relieve geométrico real.',
  },
  {
    productName: 'Ménsula Hilti MFT · MFT-S2S 80',
    family: 'Subestructura', subtype: 'Ménsulas', artwork: '/catalog/card-12-hilti-bracket.webp', accent: '#8e9aa5',
    shortDescription: 'Ménsula independiente con placa, ranuras, rigidizadores y fijación.',
  },
  {
    productName: 'Perfil Hilti MFT · T 60×40 · 3 m',
    family: 'Subestructura', subtype: 'Perfiles', artwork: '/catalog/card-13-hilti-profile.webp', accent: '#7e8c98',
    shortDescription: 'Perfil T de aluminio de stock comercial, editable mediante longitud de corte.',
  },
  {
    productName: 'Ventana CORTIZO · COR 70 Industrial · 1200×1200',
    family: 'Huecos', subtype: 'Ventanas', artwork: '/catalog/card-14-cortizo-window.webp', accent: '#2d343a',
    shortDescription: 'Carpintería de dos hojas que crea un hueco paramétrico en todas las capas.',
  },
  {
    productName: 'TB-10 Class · Roja',
    family: 'Cubierta', subtype: 'Tejas cerámicas', artwork: '/catalog/card-15-tejas-borja-tb10.webp', accent: '#bd4f27',
    shortDescription: 'Teja cerámica de relieve real, colocada por paso, solape y recorte de borde.',
  },
  {
    productName: 'Bloque de hormigón celular · 20 cm',
    family: 'Fábrica', subtype: 'Bloques celulares', artwork: '/catalog/card-16-xella-ytong.webp', accent: '#5b9698',
    shortDescription: 'Bloque mineral de poro fino con machihembrado, junta delgada de 3 mm y cortes reales.',
  },
  {
    productName: 'Panel CLT · 100 mm',
    family: 'Fábrica', subtype: 'Madera estructural', artwork: '/catalog/card-17-egoin-clt.webp', accent: '#bd6a2d',
    shortDescription: 'Panel contralaminado con capas ortogonales visibles y espesor estructural inmutable.',
  },
  {
    productName: 'Ultracoustic · 70 mm',
    family: 'Aislamientos', subtype: 'Lana mineral', artwork: '/catalog/card-18-knauf-ultracoustic.webp', accent: '#9c713c',
    shortDescription: 'Panel acústico semirrígido de fibra mineral, recortado sin deformar su espesor.',
  },
  {
    productName: 'ChovAPLAST · Pol PY 40',
    family: 'Protección', subtype: 'Láminas bituminosas', artwork: '/catalog/card-19-chova-chovaplast.webp', accent: '#41464c',
    shortDescription: 'Membrana bituminosa de 4 mm colocada por bandas con solape volumétrico de 100 mm.',
  },
  {
    productName: 'weberpral · Classic 15 mm',
    family: 'Protección', subtype: 'Acabados continuos', artwork: '/catalog/card-20-weber-weberpral.webp', accent: '#c2814d',
    shortDescription: 'Revestimiento monocapa mineral continuo para paños editables con espesor de 15 mm.',
  },
  {
    productName: 'EQUITONE · tectiva 8 mm',
    family: 'Revestimientos', subtype: 'Fibrocemento', artwork: '/catalog/card-21-equitone-tectiva.webp', accent: '#687461',
    shortDescription: 'Panel de fibrocemento texturado con canto de 8 mm, juntas rellenas y fijaciones visibles.',
  },
  {
    productName: 'EJOT CROSSFIX · CF 120',
    family: 'Subestructura', subtype: 'Ménsulas', artwork: '/catalog/card-22-ejot-crossfix.webp', accent: '#1797ab',
    shortDescription: 'Ménsula de aluminio con ranuras, rigidizador, separador térmico, arandelas y pernos.',
  },
  {
    productName: 'Fijación EJOT · DH 140',
    family: 'Subestructura', subtype: 'Fijaciones', artwork: '/catalog/card-23-ejot-dh140.webp', accent: '#c75b1f',
    shortDescription: 'Fijación de aislamiento con disco perforado, nervios, vástago y pasador independientes.',
  },
  {
    productName: 'Ventana STRUGAL · S82RP · 1500×1400',
    family: 'Huecos', subtype: 'Ventanas', artwork: '/catalog/card-24-strugal-s82rp.webp', accent: '#27343b',
    shortDescription: 'Ventana de aluminio de dos hojas con doble vidrio y hueco paramétrico multicapa.',
  },
  {
    productName: 'CLIMALIT PLUS · 4/16/4',
    family: 'Huecos', subtype: 'Vidrios aislantes', artwork: '/catalog/card-25-saint-gobain-climalit.webp', accent: '#63aab7',
    shortDescription: 'Unidad de vidrio aislante formada por dos lunas, cámara, separador y doble sellado.',
  },
  {
    productName: 'Planum · Blackstone',
    family: 'Cubierta', subtype: 'Tejas planas', artwork: '/catalog/card-26-escandella-planum.webp', accent: '#555555',
    shortDescription: 'Teja plana cerámica con encajes y tetones modelados, paso documentado y solape de 71 mm.',
  },
  {
    productName: 'DANOLOSA · Gris 75 mm',
    family: 'Cubierta', subtype: 'Losas aislantes', artwork: '/catalog/card-27-danosa-danolosa.webp', accent: '#368fbd',
    shortDescription: 'Losa compuesta de hormigón poroso y XPS, representada como dos capas físicas unidas.',
  },
  {
    productName: 'Pavimento Porcelanosa · Bottega Caliza Ant. 59,6×59,6 · 20 mm',
    family: 'Pavimentos', subtype: 'Porcelánicos', artwork: '/catalog/card-28-porcelanosa-bottega.webp', accent: '#b77b4b',
    shortDescription: 'Baldosa porcelánica exterior rectificada con canto real, textura mineral y junta de 3 mm.',
  },
  {
    productName: 'Placa Placo · BA 13',
    family: 'Interiores', subtype: 'Placas de yeso', artwork: '/catalog/card-29-placo-ba13.webp', accent: '#6d94b8',
    shortDescription: 'Placa de yeso laminado con caras de papel, núcleo mineral y borde afinado visible.',
  },
  {
    productName: 'Remate RHEINZINK · Vierteaguas 250',
    family: 'Remates', subtype: 'Vierteaguas', artwork: '/catalog/card-30-rheinzink-vierteaguas.webp', accent: '#78909a',
    shortDescription: 'Perfil de zinc plegado con trasera, pendiente, goterón y longitud de corte comercial.',
  },
  {
    productName: 'Hormigón estructural · C30/37 · 250 mm',
    family: 'Fábrica', subtype: 'Soportes de hormigón', artwork: '/catalog/card-31-holcim-hormigon-c30.webp', accent: '#7b858c', visual: 'complete',
    shortDescription: 'Soporte monolítico de hormigón para forjados, zócalos y encuentros de fachada.',
  },
  {
    productName: 'Bloque de hormigón celular · 25 cm',
    family: 'Fábrica', subtype: 'Bloques celulares', artwork: '/catalog/card-32-xella-ytong-25.webp', accent: '#b9b7aa', visual: 'complete',
    shortDescription: 'Bloque mineral aligerado de junta delgada con poro fino y aparejo regenerable.',
  },
  {
    productName: 'Ventirock Duo · 120 mm',
    family: 'Aislamientos', subtype: 'Lana mineral', artwork: '/catalog/card-33-rockwool-ventirock-120.webp', accent: '#c3a556', visual: 'complete',
    shortDescription: 'Panel de lana de roca de doble densidad para aislamiento térmico y acústico de fachada ventilada.',
  },
  {
    productName: 'Arena · 100 mm',
    family: 'Aislamientos', subtype: 'Lana de vidrio', artwork: '/catalog/card-34-isover-arena-100.webp', accent: '#e1b82f', visual: 'complete',
    shortDescription: 'Panel semirrígido de lana mineral para cámara, partición y trasdosado.',
  },
  {
    productName: 'DANOPOL · HS 1,5',
    family: 'Protección', subtype: 'Membranas sintéticas', artwork: '/catalog/card-35-danosa-danopol-hs15.webp', accent: '#69747b', visual: 'complete',
    shortDescription: 'Lámina de PVC-P reforzada con malla de poliéster para impermeabilización de cubierta.',
  },
  {
    productName: 'Sopralene · Elite FP 4',
    family: 'Protección', subtype: 'Láminas bituminosas', artwork: '/catalog/card-36-soprema-sopralene-elite.webp', accent: '#454b52', visual: 'complete',
    shortDescription: 'Membrana bituminosa en rollo con espesor comercial y solape controlado.',
  },
  {
    productName: 'Sarnafil · TG 66-15',
    family: 'Protección', subtype: 'Membranas sintéticas', artwork: '/catalog/card-37-sika-sarnafil-tg66.webp', accent: '#7f8f94', visual: 'complete',
    shortDescription: 'Membrana flexible de PVC para cubiertas, representada como banda continua con solape real.',
  },
  {
    productName: 'Tyvek · UV Facade',
    family: 'Protección', subtype: 'Membranas transpirables', artwork: '/catalog/card-38-dupont-tyvek-uv-facade.webp', accent: '#4b555b', visual: 'complete',
    shortDescription: 'Membrana exterior transpirable para fachadas abiertas y protección frente a radiación UV.',
  },
  {
    productName: 'Keraflex · Maxi S1 · 5 mm',
    family: 'Protección', subtype: 'Adhesivos cementosos', artwork: '/catalog/card-39-mapei-keraflex-maxi.webp', accent: '#9c9991', visual: 'complete',
    shortDescription: 'Adhesivo cementoso deformable para colocación de piezas cerámicas y pavimentos.',
  },
  {
    productName: 'Sikaflex · Construction+',
    family: 'Protección', subtype: 'Sellantes', artwork: '/catalog/card-40-sika-sikaflex-construction.webp', accent: '#41464b', visual: 'complete',
    shortDescription: 'Sellante elástico para juntas de construcción, con cordón lineal de sección controlada.',
  },
  {
    productName: 'Panel cerámico TEMPIO · FK-L 2/16',
    family: 'Revestimientos', subtype: 'Paneles cerámicos', artwork: '/catalog/card-41-tempio-fk-l.webp', accent: '#b7653f', visual: 'complete',
    shortDescription: 'Panel cerámico extruido para fachada ventilada, modulado por pieza y junta abierta.',
  },
  {
    productName: 'ULMA Stoneo · Pure 14 mm',
    family: 'Revestimientos', subtype: 'Paneles minerales', artwork: '/catalog/card-42-ulma-stoneo-pure.webp', accent: '#b6b0a5', visual: 'complete',
    shortDescription: 'Panel mineral de gran formato para fachada ventilada con despiece y recortes reales.',
  },
  {
    productName: 'fischer BWM · ATK 140',
    family: 'Subestructura', subtype: 'Ménsulas', artwork: '/catalog/card-43-fischer-bwm-atk140.webp', accent: '#aab2b8', visual: 'complete',
    shortDescription: 'Ménsula metálica independiente con ranuras, separador y fijaciones visibles.',
  },
  {
    productName: 'SFS Nvelope · NV1 T · 3 m',
    family: 'Subestructura', subtype: 'Perfiles', artwork: '/catalog/card-44-sfs-nvelope-nv1t.webp', accent: '#9faab2', visual: 'complete',
    shortDescription: 'Perfil extrusionado de aluminio para subestructura, editable mediante longitud de corte.',
  },
  {
    productName: 'Ventana KÖMMERLING · PremiDoor 76 · 2400×2200',
    family: 'Huecos', subtype: 'Ventanas correderas', artwork: '/catalog/card-45-kommerling-premidoor.webp', accent: '#e7e5dc', visual: 'complete',
    shortDescription: 'Carpintería corredera de gran formato que genera hueco paramétrico en todas las capas afectadas.',
  },
  {
    productName: 'Ventana TECHNAL · TIGAL · 1800×1400',
    family: 'Huecos', subtype: 'Ventanas aluminio', artwork: '/catalog/card-46-technal-tigal.webp', accent: '#394248', visual: 'complete',
    shortDescription: 'Carpintería de aluminio con rotura de puente térmico y vidrio, preparada para encuentro multicapa.',
  },
  {
    productName: 'Cajón de persiana · Energy 220',
    family: 'Huecos', subtype: 'Persianas y cajones', artwork: '/catalog/card-47-persax-energy220.webp', accent: '#d2d5d3', visual: 'complete',
    shortDescription: 'Cajón de persiana con envolvente aislada, representado como componente independiente de hueco.',
  },
  {
    productName: 'TECHNICA-10 · Graphite',
    family: 'Cubierta', subtype: 'Tejas cerámicas', artwork: '/catalog/card-48-tejasborja-technica10.webp', accent: '#585b5c', visual: 'complete',
    shortDescription: 'Teja cerámica plana con relieve, encajes laterales y solape regenerable sin estirar la pieza.',
  },
  {
    productName: 'Pizarra CUPA · CUPA 18 · 40×25',
    family: 'Cubierta', subtype: 'Pizarra natural', artwork: '/catalog/card-49-cupa-pizarra-cupa18.webp', accent: '#3f464b', visual: 'complete',
    shortDescription: 'Pieza de pizarra natural con textura de laja, perforaciones y despiece por unidades.',
  },
  {
    productName: 'Baldosa técnica Rosa Gres · Serena 60×60',
    family: 'Pavimentos', subtype: 'Pavimento técnico', artwork: '/catalog/card-50-rosa-gres-serena.webp', accent: '#a89e8e', visual: 'complete',
    shortDescription: 'Baldosa porcelánica técnica de 20 mm con junta de 4 mm y canto rectificado.',
  },
];

function resolveProduct(definition: PremiumCardDefinition): ProductDefinition {
  const product = PRODUCT_CATALOG.find((candidate) => candidate.name === definition.productName);
  if (!product) throw new Error(`No se ha encontrado el producto premium ${definition.productName}.`);
  return product;
}

export const PREMIUM_CATALOG: PremiumCatalogItem[] = CARD_DEFINITIONS.map((definition) => ({
  ...definition,
  product: resolveProduct(definition),
}));

export const PREMIUM_BY_PRODUCT_ID = new Map(PREMIUM_CATALOG.map((item) => [item.product.id, item]));

export const PREMIUM_FAMILIES: PremiumFamily[] = [
  'Fábrica',
  'Aislamientos',
  'Protección',
  'Revestimientos',
  'Subestructura',
  'Huecos',
  'Cubierta',
  'Pavimentos',
  'Interiores',
  'Remates',
];

export function premiumItemsFor(detailType: DetailType): PremiumCatalogItem[] {
  return PREMIUM_CATALOG.filter((item) => item.product.scopes.includes(detailType));
}

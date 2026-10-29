import type { DetailType } from '../domain/types';

export const ETSIE_LEARNING_SOURCE = 'https://riunet.upv.es/entities/publication/a9752005-afae-48dd-95bf-188b870a14d2';

interface LearningGuide {
  course: 'Construcción II' | 'Construcción III';
  topic: string;
  sequence: string[];
  review: string[];
}

/** Original teaching prompts organised around the public subject blocks published by UPV. */
export const DETAIL_GUIDES: Record<DetailType, LearningGuide> = {
  'cubierta-inclinada': {
    course: 'Construcción II', topic: 'Cubiertas inclinadas',
    sequence: ['Resolver soporte, pendiente y borde de alero.', 'Colocar aislamiento y protección bajo teja con continuidad en encuentros.', 'Disponer contrarrastreles, rastreles y tejas desde alero a cumbrera.'],
    review: ['Paso útil, solapes y fijaciones según sistema.', 'Ventilación, alero, cumbrera y limahoyas.', 'Vertido al canalón y salida del agua.'],
  },
  'cubierta-plana': {
    course: 'Construcción II', topic: 'Cubiertas planas',
    sequence: ['Definir soporte y formación de pendientes hacia desagües.', 'Resolver impermeabilización, aislamiento y separadoras según cubierta convencional o invertida.', 'Ejecutar protección y encuentros con petos, pasos y sumideros.'],
    review: ['Orden de capas y compatibilidad.', 'Continuidad de la lámina y puntos singulares.', 'Pendientes y rebosaderos cuando correspondan.'],
  },
  terraza: {
    course: 'Construcción II', topic: 'Cubiertas transitables y terrazas',
    sequence: ['Definir cotas de acceso, soporte y drenaje.', 'Resolver impermeabilización y aislamiento.', 'Ejecutar protección transitable, juntas y remates.'],
    review: ['Cota del pavimento frente a umbrales.', 'Pendiente de la impermeabilización bajo pavimento.', 'Desagües accesibles para mantenimiento.'],
  },
  'fachada-ventilada': {
    course: 'Construcción III', topic: 'Fachadas ventiladas',
    sequence: ['Replantear soporte, anclajes y huecos.', 'Colocar aislamiento continuo, ménsulas y perfilería.', 'Resolver cámara, paneles y encuentros de contorno.'],
    review: ['Camino de cargas de panel a soporte.', 'Entradas y salidas de aire y drenaje.', 'Bordes de forjado, compartimentación y puentes térmicos.'],
  },
  'fachada-sate': {
    course: 'Construcción III', topic: 'Sistemas de aislamiento exterior',
    sequence: ['Preparar soporte y arranque.', 'Colocar aislamiento, adhesivo y fijaciones del sistema.', 'Ejecutar capa base armada, refuerzos y acabado.'],
    review: ['Usar componentes del sistema documentado.', 'Refuerzos de esquinas y contornos de hueco.', 'Arranque, zócalo, coronación y juntas.'],
  },
  'hueco-fachada': {
    course: 'Construcción III', topic: 'Huecos y carpinterías',
    sequence: ['Resolver apoyo, dintel y continuidad del cerramiento.', 'Fijar carpintería y resolver junta de instalación.', 'Ejecutar jambas, vierteaguas, goterón y sellados.'],
    review: ['Compatibilidad de movimientos.', 'Estanqueidad al agua y al aire.', 'Continuidad del aislamiento en contorno.'],
  },
  particion: {
    course: 'Construcción III', topic: 'Particiones y trasdosados',
    sequence: ['Replantear encuentros y pasos.', 'Ejecutar fábrica o perfilería con bandas y anclajes.', 'Colocar aislamiento, placas y tratamiento de juntas.'],
    review: ['Encuentros con forjados y fachadas.', 'Transmisiones acústicas por uniones.', 'Prestaciones del conjunto ensayado.'],
  },
  pavimento: {
    course: 'Construcción III', topic: 'Revestimientos y pavimentos',
    sequence: ['Comprobar soporte, planeidad y humedad.', 'Resolver capas de regularización, adhesión o apoyo.', 'Colocar acabado, juntas y encuentros perimetrales.'],
    review: ['Compatibilidad de soportes y adhesivos.', 'Juntas estructurales, de movimiento y perímetro.', 'Condiciones de uso, agua y resbaladicidad.'],
  },
};

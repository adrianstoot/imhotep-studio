import type { GeometryKind, SceneEntity } from './types';

/** Local millimetre solids. Both the renderer and every detail cut consume these parts. */
export interface WindowAssemblyPart {
  id: string; label: string; role: string; kind: GeometryKind; color: string;
  axis: 'x' | 'y' | 'z'; profile: [number, number][]; fromMm: number; toMm: number;
  nominalThicknessMm: number;
}
export type WindowPoint3 = [number, number, number];

export function windowPartVertices(part: WindowAssemblyPart): WindowPoint3[] {
  return [part.fromMm, part.toMm].flatMap((along) => part.profile.map(([a, b]): WindowPoint3 =>
    part.axis === 'x' ? [along, a, b] : part.axis === 'y' ? [a, along, b] : [a, b, along]));
}
export function windowPartEdges(part: WindowAssemblyPart): [number, number][] {
  const n = part.profile.length;
  return part.profile.flatMap((_, index): [number, number][] => [[index, (index + 1) % n], [index + n, (index + 1) % n + n], [index, index + n]]);
}

/**
 * Dimensioned teaching assembly, not a manufacturer's extrusion/CAD or anchorage calculation.
 * Exterior is +Z. No support is assigned to the soft insulation or to facade carrier rails.
 */
export function resolveWindowAssembly(entity: SceneEntity): WindowAssemblyPart[] {
  const installation = entity.opening?.installation;
  if (!entity.opening || !installation) return [];
  const { widthMm: width, heightMm: height } = entity.opening;
  const w = width / 2, h = height / 2;
  const joint = installation.jointMm, pf = installation.preframeFaceMm;
  const depth = installation.preframeDepthMm, halfPreframe = depth / 2;
  const halfDepth = 40; // Commercial window depth is 80 mm; changing its premarco does not stretch the product.
  const roughW = w + joint + pf, roughH = h + joint + pf;
  const facade = installation.facadeFaceOffsetMm, insFace = installation.insulationFaceOffsetMm;
  const parts: WindowAssemblyPart[] = [];
  let sequence = 0;
  const add = (role: string, label: string, kind: GeometryKind, color: string, axis: WindowAssemblyPart['axis'], profile: [number, number][], fromMm: number, toMm: number, nominalThicknessMm: number) => {
    parts.push({ id: `${entity.id}-${role}-${sequence++}`, label, role, kind, color, axis, profile, fromMm, toMm, nominalThicknessMm });
  };
  const rect = (a: number, b: number, c: number, d: number): [number, number][] => [[a, c], [b, c], [b, d], [a, d]];
  const box = (role: string, label: string, kind: GeometryKind, color: string, x0: number, x1: number, y0: number, y1: number, z0: number, z1: number, nominal = Math.min(x1 - x0, y1 - y0, z1 - z0)) =>
    add(role, label, kind, color, 'z', rect(x0, x1, y0, y1), z0, z1, nominal);
  const tube = (role: string, label: string, color: string, axis: 'x' | 'y', a: number, b: number, z0: number, z1: number, from: number, to: number, wall: number) => {
    add(role, label, 'profile', color, axis, rect(a, b, z0, z0 + wall), from, to, wall);
    add(role, label, 'profile', color, axis, rect(a, b, z1 - wall, z1), from, to, wall);
    add(role, label, 'profile', color, axis, rect(a, a + wall, z0 + wall, z1 - wall), from, to, wall);
    add(role, label, 'profile', color, axis, rect(b - wall, b, z0 + wall, z1 - wall), from, to, wall);
  };
  const aluminium = '#34434a', edge = '#4a5960', steel = '#9ca9ad', rubber = '#293036';
  const foldedTape = (role: string, label: string, axis: 'x' | 'y', path: [number, number][], from: number, to: number, thickness: number, color = '#685e56') => {
    path.slice(0, -1).forEach((a, index) => {
      const b = path[index + 1], length = Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (length < .001) return;
      const na = -(b[1] - a[1]) / length * thickness, nb = (b[0] - a[0]) / length * thickness;
      add(role, label, 'membrane', color, axis, [a, b, [b[0] + na, b[1] + nb], [a[0] + na, a[1] + nb]], from, to, thickness);
    });
  };

  // The lintel bears 200 mm into the leaf at each side of the rough opening.
  const bearing = installation.lintelBearingMm, lintelH = installation.lintelHeightMm;
  const supportZ = installation.supportCenterOffsetMm, supportDepth = installation.supportDepthMm;
  const anchorZ = Math.max(-halfPreframe + 5, Math.min(halfPreframe - 5, supportZ));
  box('lintel', 'Dintel portante · hipótesis dimensional, verificar cálculo', 'solid', '#a7aaa6', -roughW - bearing, roughW + bearing, roughH, roughH + lintelH, supportZ - supportDepth / 2, supportZ + supportDepth / 2, lintelH);

  // Four hollow tubes, 30 x 80 x 2 mm, jointed at their ends rather than crossing one another.
  [-1, 1].forEach((sign) => {
    const a = sign < 0 ? -roughW : w + joint, b = sign < 0 ? -w - joint : roughW;
    tube('preframe', `Premarco galvanizado · tubo ${pf}×${depth}×2 mm`, steel, 'y', a, b, -halfPreframe, halfPreframe, -h - joint, h + joint, 2);
    const ya = sign < 0 ? -roughH : h + joint, yb = sign < 0 ? -h - joint : roughH;
    tube('preframe', `Premarco galvanizado · tubo ${pf}×${depth}×2 mm`, steel, 'x', ya, yb, -halfPreframe, halfPreframe, -roughW, roughW, 2);
  });

  // Three levels of joint treatment: inside airtight, insulating core, outside rain seal.
  const jointRoles: [string, string, string, number, number][] = [
    ['joint-insulation', 'Junta de montaje · relleno aislante, no portante', '#d7c596', -halfDepth + 4, halfDepth - 4],
    ['inner-seal', 'Sellado interior hermético · cinta continua', '#7d6b61', -halfDepth - 1, -halfDepth + 1],
    ['outer-seal', 'Sellado exterior estanco a lluvia · junta elástica', '#4d5b5c', halfDepth - 2, halfDepth + 1],
  ];
  jointRoles.forEach(([role, label, color, z0, z1]) => {
    box(role, label, role === 'joint-insulation' ? 'insulation' : 'membrane', color, -w - joint, -w, -h, h, z0, z1);
    box(role, label, role === 'joint-insulation' ? 'insulation' : 'membrane', color, w, w + joint, -h, h, z0, z1);
    box(role, label, role === 'joint-insulation' ? 'insulation' : 'membrane', color, -w - joint, w + joint, h, h + joint, z0, z1);
    // Bottom filling is interrupted for structural setting blocks below.
    if (role !== 'joint-insulation') box(role, label, 'membrane', color, -w - joint, w + joint, -h - joint, -h, z0, z1);
  });
  const supportRear = supportZ - supportDepth / 2;
  [-1, 1].forEach((sign) => {
    foldedTape('inner-seal', 'Cinta interior hermética · continuidad marco, premarco y fábrica', 'y', [[sign * (w - 10), -halfDepth - 1], [sign * (w + joint), -halfDepth - 1], [sign * (w + joint), -halfPreframe - 1], [sign * roughW, -halfPreframe - 1], [sign * roughW, supportRear - 1], [sign * (roughW + 30), supportRear - 1]], -roughH, roughH, .8);
    foldedTape('inner-seal', 'Cinta interior hermética · continuidad marco, premarco y fábrica', 'x', [[sign * (h - 10), -halfDepth - 1], [sign * (h + joint), -halfDepth - 1], [sign * (h + joint), -halfPreframe - 1], [sign * roughH, -halfPreframe - 1], [sign * roughH, supportRear - 1], [sign * (roughH + 30), supportRear - 1]], -roughW, roughW, .8);
  });
  const blockCentres = [-w + 100, 0, w - 100], blockWidth = 60;
  let last = -w - joint;
  blockCentres.forEach((x) => {
    if (x - blockWidth / 2 > last) box('joint-insulation', 'Junta de montaje · relleno aislante, no portante', 'insulation', '#d7c596', last, x - blockWidth / 2, -h - joint, -h, -halfDepth + 4, halfDepth - 4);
    box('setting-block', 'Calzo portante de instalación · apoyo en premarco', 'solid', '#555849', x - blockWidth / 2, x + blockWidth / 2, -h - joint, -h, -Math.min(halfDepth - 10, halfPreframe), Math.min(halfDepth - 10, halfPreframe), joint);
    last = x + blockWidth / 2;
  });
  if (last < w + joint) box('joint-insulation', 'Junta de montaje · relleno aislante, no portante', 'insulation', '#d7c596', last, w + joint, -h - joint, -h, -halfDepth + 4, halfDepth - 4);

  const cylinder = (role: string, label: string, axis: 'x' | 'y' | 'z', a: number, b: number, radius: number, from: number, to: number) => {
    const profile = Array.from({ length: 12 }, (_, i): [number, number] => [a + Math.cos(i * Math.PI / 6) * radius, b + Math.sin(i * Math.PI / 6) * radius]);
    add(role, label, 'fastener', steel, axis, profile, from, to, radius * 2);
  };
  const fixingLevels = (half: number) => {
    const length = half * 2 - 300, divisions = Math.max(1, Math.ceil(length / 600));
    return Array.from({ length: divisions + 1 }, (_, index) => -half + 150 + length * index / divisions);
  };
  // Separate frame-to-preframe screws and preframe-to-leaf anchors. 100 mm embed is schematic.
  [-1, 1].forEach((sign) => {
    fixingLevels(h).forEach((y) => {
      cylinder('frame-fixing', 'Tornillo marco–premarco · fijación mecánica', 'x', y, 0, 3, sign < 0 ? -w - joint - 8 : w - 18, sign < 0 ? -w + 18 : w + joint + 8);
      cylinder('masonry-anchor', 'Anclaje premarco–fábrica · longitud a verificar', 'x', y, anchorZ, 4, sign < 0 ? -roughW - 100 : w + joint, sign < 0 ? -w - joint : roughW + 100);
    });
    fixingLevels(w).forEach((x) => {
      cylinder('frame-fixing', 'Tornillo marco–premarco · fijación mecánica', 'y', x, 0, 3, sign < 0 ? -h - joint - 8 : h - 18, sign < 0 ? -h + 18 : h + joint + 8);
      cylinder('masonry-anchor', 'Anclaje premarco–fábrica · longitud a verificar', 'y', x, anchorZ, 4, sign < 0 ? -roughH - 100 : h + joint, sign < 0 ? -h - joint : roughH + 100);
    });
  });

  const frameFace = 70, thermal = 20;
  const profileRail = (role: string, label: string, axis: 'x' | 'y', face0: number, face1: number, from: number, to: number, z0: number, z1: number) => {
    tube(role, label, aluminium, axis, face0, face1, z0, -thermal / 2, from, to, 2.5);
    tube(role, label, aluminium, axis, face0, face1, thermal / 2, z1, from, to, 2.5);
    add('thermal-break', 'Rotura térmica · poliamida, esquema', 'profile', '#55564d', axis, rect(face0 + 5, face0 + 9, -thermal / 2, thermal / 2), from, to, 4);
    add('thermal-break', 'Rotura térmica · poliamida, esquema', 'profile', '#55564d', axis, rect(face1 - 9, face1 - 5, -thermal / 2, thermal / 2), from, to, 4);
  };
  [-1, 1].forEach((sign) => {
    profileRail('frame', 'Marco fijo de aluminio RPT · sección esquemática', 'x', sign < 0 ? -h : h - frameFace, sign < 0 ? -h + frameFace : h, -w, w, -halfDepth, halfDepth);
    profileRail('frame', 'Marco fijo de aluminio RPT · sección esquemática', 'y', sign < 0 ? -w : w - frameFace, sign < 0 ? -w + frameFace : w, -h + frameFace, h - frameFace, -halfDepth, halfDepth);
  });
  const clearW = width - frameFace * 2, clearH = height - frameFace * 2;
  const sashGap = 8, sashWidth = (clearW - sashGap) / 2 - 4, sashHalfHeight = clearH / 2 - 5, sashFace = 43;
  [-1, 1].forEach((side) => {
    const cx = side * (sashGap / 2 + sashWidth / 2), sx0 = cx - sashWidth / 2, sx1 = cx + sashWidth / 2;
    [-1, 1].forEach((sign) => {
      profileRail('sash', 'Hoja practicable de aluminio RPT · esquema', 'x', sign < 0 ? -sashHalfHeight : sashHalfHeight - sashFace, sign < 0 ? -sashHalfHeight + sashFace : sashHalfHeight, sx0, sx1, -30, 35);
      profileRail('sash', 'Hoja practicable de aluminio RPT · esquema', 'y', sign < 0 ? sx0 : sx1 - sashFace, sign < 0 ? sx0 + sashFace : sx1, -sashHalfHeight + sashFace, sashHalfHeight - sashFace, -30, 35);
    });
    const gx0 = sx0 + sashFace + 2, gx1 = sx1 - sashFace - 2, gy0 = -sashHalfHeight + sashFace + 2, gy1 = sashHalfHeight - sashFace - 2;
    box('glass', 'Doble acristalamiento · luna 4 / cámara 16 / luna 4', 'glass', '#b9d8df', gx0, gx1, gy0, gy1, -12, -8, 4);
    box('glass', 'Doble acristalamiento · luna 4 / cámara 16 / luna 4', 'glass', '#b9d8df', gx0, gx1, gy0, gy1, 8, 12, 4);
    [-1, 1].forEach((sign) => {
      const gasketZ = sign < 0 ? -15 : 12;
      box('glazing-gasket', 'Junta EPDM del acristalamiento', 'profile', rubber, gx0, gx1, gy0 - 3, gy0 + 3, gasketZ, gasketZ + 3, 3);
      box('glazing-gasket', 'Junta EPDM del acristalamiento', 'profile', rubber, gx0, gx1, gy1 - 3, gy1 + 3, gasketZ, gasketZ + 3, 3);
      box('glazing-gasket', 'Junta EPDM del acristalamiento', 'profile', rubber, gx0 - 3, gx0 + 3, gy0 + 3, gy1 - 3, gasketZ, gasketZ + 3, 3);
      box('glazing-gasket', 'Junta EPDM del acristalamiento', 'profile', rubber, gx1 - 3, gx1 + 3, gy0 + 3, gy1 - 3, gasketZ, gasketZ + 3, 3);
    });
    const beadZ = -23;
    box('glazing-bead', 'Junquillo desmontable interior', 'profile', edge, gx0 - 7, gx1 + 7, gy0 - 10, gy0 - 2, beadZ, beadZ + 7, 7);
    box('glazing-bead', 'Junquillo desmontable interior', 'profile', edge, gx0 - 7, gx1 + 7, gy1 + 2, gy1 + 10, beadZ, beadZ + 7, 7);
    box('glazing-bead', 'Junquillo desmontable interior', 'profile', edge, gx0 - 10, gx0 - 2, gy0 - 2, gy1 + 2, beadZ, beadZ + 7, 7);
    box('glazing-bead', 'Junquillo desmontable interior', 'profile', edge, gx1 + 2, gx1 + 10, gy0 - 2, gy1 + 2, beadZ, beadZ + 7, 7);
    // Warm edge spacer and secondary perimeter seal occupy the IGU edge, never its clear centre.
    [['spacer', 'Separador perimetral de la cámara', '#7a898b', 6], ['igu-seal', 'Sellado secundario perimetral del vidrio', '#343c3b', 2]].forEach(([role, label, color, band]) => {
      const b = Number(band), inset = role === 'spacer' ? 3 : 0;
      box(String(role), String(label), 'profile', String(color), gx0 + inset, gx1 - inset, gy0 + inset, gy0 + inset + b, -8, 8, b);
      box(String(role), String(label), 'profile', String(color), gx0 + inset, gx1 - inset, gy1 - inset - b, gy1 - inset, -8, 8, b);
      box(String(role), String(label), 'profile', String(color), gx0 + inset, gx0 + inset + b, gy0 + inset + b, gy1 - inset - b, -8, 8, b);
      box(String(role), String(label), 'profile', String(color), gx1 - inset - b, gx1 - inset, gy0 + inset + b, gy1 - inset - b, -8, 8, b);
    });
    [gx0 + 65, gx1 - 65].forEach((x) => box('glazing-block', 'Calzo de acristalamiento · transmisión a hoja', 'solid', '#517480', x - 20, x + 20, gy0 - 4, gy0, -12, 12, 4));
    const hingeX = side < 0 ? sx0 + 8 : sx1 - 8;
    [-sashHalfHeight + 140, sashHalfHeight - 140].forEach((y) => cylinder('hinge', 'Bisagra de hoja · cara interior', 'y', hingeX, -36, 7, y - 30, y + 30));
    if (side > 0) {
      const handleX = sx0 + sashFace / 2;
      box('handle', 'Manilla y escudo · cara interior', 'profile', '#a4afb1', handleX - 10, handleX + 10, -50, 50, -45, -32, 13);
      box('handle', 'Manilla y escudo · cara interior', 'profile', '#a4afb1', handleX - 6, handleX + 65, 27, 41, -58, -45, 13);
    }
  });
  // Perimeter opening seal between the moving leaves and fixed frame.
  box('opening-gasket', 'Junta de encuentro entre hojas · EPDM', 'profile', rubber, -3, 3, -sashHalfHeight, sashHalfHeight, -18, 20, 6);

  // Insulation return bridges the installation joint and the facade insulation at the reveal.
  const ri = installation.revealInsulationMm;
  const revealInner = roughW - ri, headInner = roughH - ri;
  [-1, 1].forEach((sign) => {
    const x0 = sign < 0 ? -roughW : revealInner, x1 = sign < 0 ? -revealInner : roughW;
    box('reveal-insulation', `Retorno aislante en jamba · ${ri} mm`, 'insulation', '#d0b66b', x0, x1, -roughH, roughH, halfDepth + 2, insFace, ri);
    const lx = sign < 0 ? -revealInner : revealInner;
    box('jamb-liner', sign < 0 ? 'Telar lateral izquierdo · chapa plegada 1,5 mm' : 'Telar lateral derecho · chapa plegada 1,5 mm', 'coping', '#a8b2b3', sign < 0 ? lx : lx - 1.5, sign < 0 ? lx + 1.5 : lx, -roughH, headInner, halfDepth + 2, facade, 1.5);
    box('jamb-liner', 'Solape posterior de telar sobre junta exterior', 'coping', '#a8b2b3', sign < 0 ? -revealInner : w, sign < 0 ? -w : revealInner, -h, h, halfDepth + 1, halfDepth + 2.5, 1.5);
    box('jamb-flange', 'Ala exterior de jamba · fijada al contorno', 'coping', '#a8b2b3', sign < 0 ? -roughW - 25 : revealInner, sign < 0 ? -revealInner : roughW + 25, -roughH, roughH, facade, facade + 1.5, 1.5);
    // Screws remain on the jamb flange, outside the opening and the glazing.
    fixingLevels(h).forEach((y) => cylinder('reveal-fixing', 'Fijación de chapa de telar · tornillo', 'z', sign * (roughW + 12), y, 2.5, facade - 14, facade + 3));
  });
  box('reveal-insulation', `Retorno aislante de dintel · ${ri} mm`, 'insulation', '#d0b66b', -revealInner, revealInner, headInner, roughH, halfDepth + 2, insFace, ri);
  box('head-liner', 'Telar superior · chapa plegada 1,5 mm', 'coping', '#a8b2b3', -revealInner, revealInner, headInner - 1.5, headInner, halfDepth + 2, facade + 30, 1.5);
  box('head-liner', 'Solape posterior del telar superior', 'coping', '#a8b2b3', -w, w, h, headInner, halfDepth + 1, halfDepth + 2.5, 1.5);
  box('head-drip', 'Goterón de dintel · separado 30 mm del paramento', 'coping', '#8b999e', -roughW - 25, roughW + 25, headInner - 18, headInner, facade + 28.5, facade + 30, 1.5);
  const trayBackZ = insFace + .4, trayFrontZ = facade + 30, trayBackY = roughH + 50;
  const trayY = (z: number) => trayBackY - (z - trayBackZ) * Math.tan(10 * Math.PI / 180);
  box('head-flange', 'Frente superior de remate · bajo bandeja de drenaje', 'coping', '#a8b2b3', -roughW - 25, roughW + 25, headInner, trayY(facade) - 1.5, facade, facade + 1.5, 1.5);
  foldedTape('head-waterproofing', 'Impermeabilización de cabezal · remontada 100 mm en membrana de fachada', 'x', [[trayBackY + 100, trayBackZ + .8], [trayBackY - 2.5, trayBackZ + .8], [trayY(trayFrontZ) - 2.5, trayFrontZ]], -roughW - 25, roughW + 25, .8, '#3e5054');
  foldedTape('head-cavity-tray', 'Bandeja de drenaje de cámara · pendiente 10°, remonte 100 mm y goterón', 'x', [[trayBackY + 100, trayBackZ + 2.3], [trayBackY, trayBackZ + 2.3], [trayY(trayFrontZ), trayFrontZ], [trayY(trayFrontZ) - 15, trayFrontZ]], -roughW - 25, roughW + 25, 1.5, '#aebbc0');
  [-1, 1].forEach((sign) => {
    add('head-cavity-end-dam', 'Testero de bandeja de cabezal · retorno 25 mm', 'coping', '#aebbc0', 'x', [[trayBackY, trayBackZ + 2.3], [trayY(trayFrontZ), trayFrontZ], [trayY(trayFrontZ) + 25, trayFrontZ], [trayBackY + 25, trayBackZ + 2.3]], sign < 0 ? -roughW - 25 : roughW + 23.5, sign < 0 ? -roughW - 23.5 : roughW + 25, 1.5);
  });

  // Real open slots, rather than a dark texture on a closed plate. Air above the tray
  // reaches this strip; the sample cladding resolver opens the matching 65 mm head zone.
  const grilleBottom = trayY(facade) - 1.5, grilleTop = roughH + 65, grilleHalfW = roughW + 25;
  box('head-ventilation', 'Rejilla de ventilación y protección antiinsectos · pasos abiertos', 'profile', '#7f9298', -grilleHalfW, grilleHalfW, grilleBottom, grilleBottom + 2, facade, facade + 1.5, 1.5);
  box('head-ventilation', 'Rejilla de ventilación y protección antiinsectos · pasos abiertos', 'profile', '#7f9298', -grilleHalfW, grilleHalfW, grilleTop - 2, grilleTop, facade, facade + 1.5, 1.5);
  const grilleSteps = Math.ceil(grilleHalfW * 2 / 10), grilleStep = grilleHalfW * 2 / grilleSteps;
  for (let index = 0; index <= grilleSteps; index++) {
    const x = -grilleHalfW + index * grilleStep;
    box('head-ventilation', 'Rejilla de ventilación y protección antiinsectos · pasos abiertos', 'profile', '#7f9298', Math.max(-grilleHalfW, x - 1), Math.min(grilleHalfW, x + 1), grilleBottom + 2, grilleTop - 2, facade, facade + 1.5, 1.5);
  }

  const sillStartZ = halfDepth + 2.5, sillEndZ = facade + installation.sillProjectionMm;
  const slope = Math.tan(installation.sillSlopeDeg * Math.PI / 180), sillBackY = -h - 10;
  const sillY = (z: number) => sillBackY - (z - sillStartZ) * slope;
  const sillHalfW = roughW + 20;
  // Sloped pressure-resistant support, resting at the rough sill, outside the frame's setting blocks.
  add('sill-support', 'Soporte aislante rígido del vierteaguas · cuña de pendiente', 'insulation', '#b7ba91', 'x', [[-roughH, sillStartZ], [-roughH, facade], [sillY(facade) - 3, facade], [sillBackY - 3, sillStartZ]], -revealInner, revealInner, 25);
  // Continuous waterproof tray, upstand behind the sill and turned up into both jambs.
  add('sill-waterproofing', 'Bandeja impermeable bajo vierteaguas · retorno posterior', 'membrane', '#3e5054', 'x', [[sillBackY + 32, sillStartZ - 1.6], [sillBackY - 2.5, sillStartZ - 1.6], [sillY(sillEndZ) - 2.5, sillEndZ], [sillY(sillEndZ) - 1.7, sillEndZ], [sillBackY - 1.7, sillStartZ - .8], [sillBackY + 32, sillStartZ - .8]], -sillHalfW, sillHalfW, .8);
  add('sill', `Vierteaguas · pendiente exterior ${installation.sillSlopeDeg}° y faldón con goterón`, 'coping', '#aebbc0', 'x', [[sillBackY + 30, sillStartZ], [sillBackY, sillStartZ], [sillY(sillEndZ), sillEndZ], [sillY(sillEndZ) - 25, sillEndZ], [sillY(sillEndZ) - 25, sillEndZ - 5], [sillY(sillEndZ) - 23.5, sillEndZ - 5], [sillY(sillEndZ) - 23.5, sillEndZ - 1.5], [sillY(sillEndZ) - 1.5, sillEndZ - 1.5], [sillBackY - 1.5, sillStartZ + 1.5], [sillBackY + 30, sillStartZ + 1.5]], -sillHalfW, sillHalfW, 1.5);
  [-1, 1].forEach((sign) => {
    const from = sign < 0 ? -sillHalfW : sillHalfW - 1.5;
    add('sill-end-dam', 'Testero de vierteaguas · entrega lateral 20 mm y altura 25 mm', 'coping', '#aebbc0', 'x', [[sillBackY, sillStartZ], [sillY(sillEndZ), sillEndZ], [sillY(sillEndZ) + 25, sillEndZ], [sillBackY + 25, sillStartZ]], from, from + 1.5, 1.5);
    const wpFrom = sign < 0 ? -sillHalfW + 1.5 : sillHalfW - 2.3;
    add('sill-waterproofing', 'Retorno lateral de bandeja impermeable · 25 mm', 'membrane', '#3e5054', 'x', [[sillBackY - 2.5, sillStartZ], [sillY(sillEndZ) - 2.5, sillEndZ], [sillY(sillEndZ) + 25, sillEndZ], [sillBackY + 25, sillStartZ]], wpFrom, wpFrom + .8, .8);
  });
  return parts;
}

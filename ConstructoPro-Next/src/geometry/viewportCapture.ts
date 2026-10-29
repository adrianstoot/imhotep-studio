import type { GeometryKind, ProductCategory, ProjectDocument } from '../domain/types';
import { resolveSection } from './sectionResolver';

export function captureViewportPng(): string | null {
  const canvas = document.querySelector<HTMLCanvasElement>('.viewport-canvas canvas');
  return canvas?.toDataURL('image/png', 0.92) ?? null;
}

function technicalPattern(
  context: CanvasRenderingContext2D,
  category: ProductCategory,
  kind: GeometryKind,
): CanvasPattern | string {
  const tile = document.createElement('canvas');
  tile.width = 56;
  tile.height = 56;
  const paint = tile.getContext('2d');
  if (!paint) return '#e5e7ea';

  const diagonal = (background: string, stroke: string, width = 3) => {
    paint.fillStyle = background;
    paint.fillRect(0, 0, 56, 56);
    paint.strokeStyle = stroke;
    paint.lineWidth = width;
    paint.beginPath();
    paint.moveTo(-12, 56);
    paint.lineTo(56, -12);
    paint.moveTo(12, 68);
    paint.lineTo(68, 12);
    paint.stroke();
  };

  if (kind === 'masonry') {
    paint.fillStyle = '#d9784f';
    paint.fillRect(0, 0, 56, 56);
    paint.strokeStyle = '#f1d9ca';
    paint.lineWidth = 5;
    paint.beginPath();
    paint.moveTo(0, 28);
    paint.lineTo(56, 28);
    paint.moveTo(28, 0);
    paint.lineTo(28, 28);
    paint.moveTo(14, 28);
    paint.lineTo(14, 56);
    paint.moveTo(42, 28);
    paint.lineTo(42, 56);
    paint.stroke();
  } else if (kind === 'insulation') {
    paint.fillStyle = '#e4d3a2';
    paint.fillRect(0, 0, 56, 56);
    paint.strokeStyle = '#8c7543';
    paint.lineWidth = 3;
    paint.beginPath();
    paint.moveTo(-8, 18);
    paint.bezierCurveTo(8, -2, 20, 38, 36, 16);
    paint.bezierCurveTo(45, 5, 54, 10, 64, 20);
    paint.moveTo(-8, 48);
    paint.bezierCurveTo(8, 28, 20, 68, 36, 46);
    paint.bezierCurveTo(45, 35, 54, 40, 64, 50);
    paint.stroke();
  } else if (kind === 'membrane') diagonal('#cbd9e8', '#5f84aa', 4);
  else if (kind === 'profile' || kind === 'bracket' || kind === 'fastener' || category.includes('Subestructuras')) diagonal('#dfe3e7', '#7b8793', 3);
  else if (kind === 'window' || kind === 'glass') diagonal('#dceff4', '#62a8ba', 3);
  else if (kind === 'cladding' || category.includes('Revestimientos')) {
    paint.fillStyle = '#ebe7db';
    paint.fillRect(0, 0, 56, 56);
    paint.strokeStyle = '#96938a';
    paint.lineWidth = 2;
    paint.strokeRect(1, 1, 54, 54);
    paint.beginPath();
    paint.moveTo(6, 12);
    paint.lineTo(50, 12);
    paint.moveTo(6, 44);
    paint.lineTo(50, 44);
    paint.stroke();
  } else if (kind === 'solid') {
    paint.fillStyle = '#c8cbcc';
    paint.fillRect(0, 0, 56, 56);
    paint.fillStyle = '#868d8f';
    [[10, 14, 3], [39, 10, 2], [44, 42, 4], [18, 45, 2]].forEach(([x, y, radius]) => {
      paint.beginPath();
      paint.arc(x, y, radius, 0, Math.PI * 2);
      paint.fill();
    });
  } else if (kind === 'finish') diagonal('#d7d0c4', '#aaa195', 2);
  else diagonal('#e7e8e6', '#a3a6a4', 2);
  return context.createPattern(tile, 'repeat') ?? '#e5e7ea';
}

/**
 * Generates a deterministic, textured technical illustration from the same
 * resolved section primitives used by the live 2D viewport.
 */
export function captureSectionPng(project: ProjectDocument): string | null {
  const canvas = document.createElement('canvas');
  canvas.width = 1600;
  canvas.height = 1000;
  const context = canvas.getContext('2d');
  if (!context) return null;

  context.fillStyle = '#fbfbfa';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.fillStyle = '#20304a';
  context.font = '700 28px Arial, sans-serif';
  context.fillText('SECCIÓN TÉCNICA SINCRONIZADA', 64, 58);
  context.fillStyle = '#768195';
  context.font = '16px Arial, sans-serif';
  context.fillText('Geometría, espesores y huecos derivados del documento 3D · cotas en mm', 64, 86);

  const section = resolveSection(project);
  const primitives = section.primitives;
  if (!primitives.length) return canvas.toDataURL('image/png');

  const minHorizontal = section.minZ;
  const maxHorizontal = section.maxZ;
  const minVertical = section.minY;
  const maxVertical = section.maxY;
  const drawing = { left: 72, top: 118, width: 1030, height: 744 };
  const horizontalRange = Math.max(1, maxHorizontal - minHorizontal);
  const verticalRange = Math.max(1, maxVertical - minVertical);
  const scale = Math.min(drawing.width / horizontalRange, drawing.height / verticalRange);
  const offsetX = drawing.left + (drawing.width - horizontalRange * scale) / 2;
  const offsetY = drawing.top + (drawing.height - verticalRange * scale) / 2;
  const mapHorizontal = (value: number) => offsetX + (value - minHorizontal) * scale;
  const mapVertical = (value: number) => offsetY + (maxVertical - value) * scale;

  context.strokeStyle = '#e4e7eb';
  context.lineWidth = 1;
  for (let x = drawing.left; x <= drawing.left + drawing.width; x += 55) {
    context.beginPath(); context.moveTo(x, drawing.top); context.lineTo(x, drawing.top + drawing.height); context.stroke();
  }
  for (let y = drawing.top; y <= drawing.top + drawing.height; y += 55) {
    context.beginPath(); context.moveTo(drawing.left, y); context.lineTo(drawing.left + drawing.width, y); context.stroke();
  }

  const labels: Array<{ label: string; x: number; y: number }> = [];
  const seen = new Set<string>();
  primitives.forEach((primitive) => {
    const points = primitive.polygon.map((point) => ({ x: mapHorizontal(point.u), y: mapVertical(point.v) }));
    if (!points.length) return;
    context.beginPath();
    context.moveTo(points[0].x, points[0].y);
    points.slice(1).forEach((point) => context.lineTo(point.x, point.y));
    context.closePath();
    context.fillStyle = technicalPattern(context, primitive.category, primitive.kind);
    context.fill();
    context.strokeStyle = '#202733';
    context.lineWidth = primitive.lineWeight === 'cut' ? 3 : 1.25;
    context.setLineDash(primitive.representation === 'commercial-envelope' ? [8, 5] : []);
    context.stroke();
    context.setLineDash([]);
    const legendKey = `${primitive.entity.id}|${primitive.label}`;
    if (primitive.lineWeight === 'cut' && !seen.has(legendKey) && labels.length < 12) {
      seen.add(legendKey);
      labels.push({ label: primitive.label, x: points.reduce((sum, point) => sum + point.x / points.length, 0), y: points.reduce((sum, point) => sum + point.y / points.length, 0) });
    }
  });

  labels.forEach((item, index) => {
    const number = index + 1;
    context.fillStyle = '#ffffff';
    context.strokeStyle = '#1d4f98';
    context.lineWidth = 3;
    context.beginPath(); context.arc(item.x, item.y, 14, 0, Math.PI * 2); context.fill(); context.stroke();
    context.fillStyle = '#1d4f98';
    context.font = '700 14px Arial, sans-serif';
    context.textAlign = 'center';
    context.fillText(String(number), item.x, item.y + 5);
    const legendY = 142 + index * 55;
    context.fillStyle = index % 2 ? '#f5f7fa' : '#edf2fa';
    context.fillRect(1140, legendY - 25, 410, 44);
    context.fillStyle = '#1d4f98';
    context.beginPath(); context.arc(1166, legendY - 3, 14, 0, Math.PI * 2); context.fill();
    context.fillStyle = '#ffffff';
    context.fillText(String(number), 1166, legendY + 2);
    context.textAlign = 'left';
    context.fillStyle = '#303a4b';
    context.font = '16px Arial, sans-serif';
    context.fillText(item.label.slice(0, 42), 1192, legendY + 2);
  });

  context.strokeStyle = '#22324b';
  context.lineWidth = 2;
  const dimensionY = 918;
  context.beginPath(); context.moveTo(mapHorizontal(minHorizontal), dimensionY); context.lineTo(mapHorizontal(maxHorizontal), dimensionY); context.stroke();
  context.beginPath(); context.moveTo(mapHorizontal(minHorizontal), dimensionY - 12); context.lineTo(mapHorizontal(minHorizontal), dimensionY + 12); context.moveTo(mapHorizontal(maxHorizontal), dimensionY - 12); context.lineTo(mapHorizontal(maxHorizontal), dimensionY + 12); context.stroke();
  context.fillStyle = '#22324b';
  context.textAlign = 'center';
  context.font = '700 18px Arial, sans-serif';
  context.fillText(`${Math.round(maxHorizontal - minHorizontal)} mm`, (mapHorizontal(minHorizontal) + mapHorizontal(maxHorizontal)) / 2, dimensionY - 12);
  context.textAlign = 'left';
  context.fillStyle = '#6c7687';
  context.font = '14px Arial, sans-serif';
  context.fillText(`Corte X = ${project.section.offsetMm} mm · sólidos orientados · línea discontinua = envolvente comercial sin perfil interior`, 64, 970);
  return canvas.toDataURL('image/png', 0.94);
}

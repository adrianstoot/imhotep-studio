import { jsPDF } from 'jspdf';
import { PRODUCT_BY_ID } from '../data/catalog';
import type { ProjectDocument, RuleResult } from '../domain/types';

const PAGE_W = 297;
const PAGE_H = 210;

function pdfSafe(value: string): string {
  return value
    .replace(/[·•]/g, '-')
    .replace(/×/g, 'x')
    .replace(/²/g, '^2')
    .replace(/³/g, '^3')
    .replace(/ψ/g, 'psi')
    .replace(/λ/g, 'lambda')
    .replace(/[–—‑]/g, '-');
}

function header(doc: jsPDF, project: ProjectDocument, section: string, page: number) {
  doc.setFillColor(255, 255, 255);
  doc.rect(0, 0, PAGE_W, 18, 'F');
  doc.setDrawColor(34, 91, 184);
  doc.setLineWidth(0.45);
  doc.line(12, 17.5, 285, 17.5);
  doc.setTextColor(23, 73, 151);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.text('CONSTRUCTOPRO NEXT', 12, 11.5);
  doc.setTextColor(67, 78, 95);
  doc.setFontSize(8);
  doc.text(section.toUpperCase(), 88, 11.5);
  doc.setTextColor(128, 137, 149);
  doc.text(pdfSafe(`${project.title} - ${page}`), 285, 11.5, { align: 'right' });
}

function footer(doc: jsPDF) {
  doc.setDrawColor(34, 91, 184);
  doc.line(12, 198, 285, 198);
  doc.setTextColor(117, 127, 134);
  doc.setFontSize(7.5);
  doc.text('Herramienta educativa auditable. No constituye una justificación profesional firmada.', 12, 203);
  doc.text(`Generado ${new Date().toLocaleString('es-ES')}`, 285, 203, { align: 'right' });
}

function sectionTitle(doc: jsPDF, title: string, subtitle: string, y: number) {
  doc.setTextColor(22, 33, 41);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(pdfSafe(title), 12, y);
  doc.setTextColor(103, 117, 126);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text(pdfSafe(subtitle), 12, y + 5.5);
}

export async function exportTechnicalPdf(
  project: ProjectDocument,
  rules: RuleResult[],
  viewportPng: string | null,
  sectionPng: string | null,
): Promise<void> {
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
  doc.setProperties({ title: `${project.title} · ConstructoPro Next`, subject: 'Memoria educativa de detalle constructivo', author: 'ConstructoPro Next', creator: 'ConstructoPro Next' });
  let page = 1;

  header(doc, project, 'Vista general', page);
  sectionTitle(doc, project.title, `${project.context.municipality} · ${project.context.province} · ${project.context.altitudeM ?? '—'} m · zona ${project.context.climateZone || 'pendiente'} · ${project.context.use} · orientación ${project.context.orientation}`, 30);
  if (viewportPng) {
    doc.setFillColor(250, 251, 253);
    doc.setDrawColor(220, 225, 232);
    doc.roundedRect(12, 42, 190, 143, 2, 2, 'FD');
    doc.addImage(viewportPng, 'PNG', 14, 44, 186, 139, undefined, 'FAST');
  }
  doc.setFillColor(248, 250, 253);
  doc.setDrawColor(220, 226, 235);
  doc.roundedRect(210, 42, 75, 143, 2, 2, 'FD');
  doc.setTextColor(24, 35, 42);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.text('RESUMEN DEL MODELO', 218, 54);
  const visible = project.entities.filter((entity) => entity.visible);
  const products = visible.map((entity) => PRODUCT_BY_ID.get(entity.productId)).filter(Boolean);
  const documented = products.filter((product) => product?.source.quality === 'documented').length;
  const summary = [
    ['Objetos colocados', String(project.entities.length)],
    ['Objetos visibles', String(visible.length)],
    ['Productos documentados', String(documented)],
    ['Huecos paramétricos', String(visible.filter((entity) => entity.opening).length)],
    ['Errores CTE', String(rules.filter((rule) => rule.severity === 'error').length)],
    ['Avisos CTE', String(rules.filter((rule) => rule.severity === 'warning').length)],
  ];
  summary.forEach(([label, value], index) => {
    const y = 66 + index * 16;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(102, 117, 126);
    doc.setFontSize(8);
    doc.text(label, 218, y);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(20, 31, 38);
    doc.setFontSize(13);
    doc.text(value, 278, y, { align: 'right' });
    doc.setDrawColor(218, 226, 230);
    doc.line(218, y + 4, 278, y + 4);
  });
  footer(doc);

  doc.addPage();
  page += 1;
  header(doc, project, 'Sección técnica 2D', page);
  sectionTitle(doc, 'Sección sincronizada con el modelo', 'Ilustración técnica texturizada derivada de las mismas transformaciones, espesores y relaciones de hueco.', 30);
  doc.setFillColor(250, 251, 253);
  doc.setDrawColor(220, 225, 232);
  doc.roundedRect(12, 41, 273, 148, 2, 2, 'FD');
  if (sectionPng) doc.addImage(sectionPng, 'PNG', 30, 42, 237, 148, undefined, 'FAST');
  else {
    doc.setTextColor(130, 140, 152);
    doc.setFontSize(10);
    doc.text('No hay geometría intersectada para generar la sección.', 148.5, 112, { align: 'center' });
  }
  footer(doc);

  doc.addPage();
  page += 1;
  header(doc, project, 'Composición y productos', page);
  sectionTitle(doc, 'Composición del detalle', 'Productos independientes agrupados por referencia, variante y longitud de corte. Dimensiones en milímetros.', 30);
  const compositionMap = new Map<string, {
    name: string;
    productName: string;
    count: number;
    manufacturerProduct: string;
    commercialSize: string;
    documented: boolean;
  }>();
  project.entities.forEach((entity) => {
    const product = PRODUCT_BY_ID.get(entity.productId);
    const variant = product?.variants.find((entry) => entry.id === entity.variantId);
    if (!product || !variant) return;
    const key = `${entity.productId}|${entity.variantId}|${entity.cutLengthMm ?? ''}`;
    const existing = compositionMap.get(key);
    if (existing) {
      existing.count += 1;
      return;
    }
    compositionMap.set(key, {
      name: entity.name,
      productName: product.name,
      count: 1,
      manufacturerProduct: `${product.manufacturer} · ${product.name}`,
      commercialSize: entity.cutLengthMm
        ? `${variant.widthMm} × corte ${entity.cutLengthMm} / ${variant.heightMm} × ${variant.depthMm}`
        : `${variant.widthMm} × ${variant.heightMm} × ${variant.depthMm}`,
      documented: product.source.quality === 'documented',
    });
  });
  const compositionRows = [...compositionMap.values()];
  const rowsPerPage = 20;
  let y = 47;
  const drawColumns = () => {
    doc.setFillColor(235, 241, 251);
    doc.rect(12, y - 7, 273, 9, 'F');
    doc.setTextColor(39, 75, 132);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('OBJETO', 15, y - 1);
    doc.text('FABRICANTE / PRODUCTO', 91, y - 1);
    doc.text('MEDIDA COMERCIAL', 188, y - 1);
    doc.text('ESTADO', 265, y - 1);
    y += 7;
  };
  drawColumns();
  compositionRows.forEach((row, index) => {
    if (index > 0 && index % rowsPerPage === 0) {
      footer(doc);
      doc.addPage();
      page += 1;
      header(doc, project, 'Composición y productos', page);
      y = 31;
      drawColumns();
    }
    doc.setFillColor(index % 2 ? 247 : 240, index % 2 ? 249 : 244, index % 2 ? 250 : 246);
    doc.rect(12, y - 4, 273, 6.8, 'F');
    doc.setTextColor(40, 51, 59);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.8);
    const objectLabel = row.count > 1 ? `${row.productName} - ${row.count} uds.` : row.name;
    doc.text(pdfSafe(objectLabel).slice(0, 42), 15, y);
    doc.text(pdfSafe(row.manufacturerProduct).slice(0, 68), 91, y);
    doc.text(pdfSafe(row.commercialSize).slice(0, 34), 188, y);
    doc.setTextColor(row.documented ? 28 : 164, row.documented ? 126 : 104, row.documented ? 105 : 31);
    doc.text(row.documented ? 'VERIFICADO' : 'PENDIENTE', 265, y);
    y += 7;
  });
  footer(doc);

  doc.addPage();
  page += 1;
  header(doc, project, 'Inspector normativo', page);
  sectionTitle(doc, 'Resultados didácticos CTE', 'Cada resultado conserva entradas, explicación, versión y enlace de la fuente.', 30);
  y = 46;
  rules.forEach((rule, index) => {
    const safeMessage = pdfSafe(rule.message);
    const message = doc.splitTextToSize(safeMessage, 245) as string[];
    const height = Math.max(16, 10 + message.length * 3.6);
    if (y + height > 194) {
      footer(doc);
      doc.addPage();
      page += 1;
      header(doc, project, 'Inspector normativo', page);
      y = 30;
    }
    const color = rule.severity === 'pass' ? [28, 157, 126] : rule.severity === 'error' ? [208, 68, 64] : rule.severity === 'warning' ? [204, 137, 48] : [50, 143, 176];
    doc.setFillColor(244, 247, 248);
    doc.roundedRect(12, y - 5, 273, height, 1.5, 1.5, 'F');
    doc.setFillColor(color[0], color[1], color[2]);
    doc.rect(12, y - 5, 2.5, height, 'F');
    doc.setTextColor(color[0], color[1], color[2]);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(rule.severity.toUpperCase(), 19, y);
    doc.setTextColor(30, 42, 50);
    doc.setFontSize(9);
    doc.text(pdfSafe(rule.title), 43, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.2);
    doc.text(message, 19, y + 6);
    doc.setTextColor(73, 133, 155);
    doc.textWithLink(pdfSafe(rule.sourceLabel).slice(0, 105), 19, y + height - 3, { url: rule.sourceUrl });
    y += height + 3;
    void index;
  });
  footer(doc);

  doc.addPage();
  page += 1;
  header(doc, project, 'Trazabilidad y evidencia', page);
  sectionTitle(doc, 'Fuentes y zonas especulativas', 'La ausencia de un dato se conserva como ausencia y excluye ese campo de los cálculos.', 30);
  const uniqueProducts = [...new Map(products.filter(Boolean).map((product) => [product!.id, product!])).values()];
  y = 46;
  uniqueProducts.forEach((product, index) => {
    if (index > 0 && index % 17 === 0) {
      footer(doc);
      doc.addPage();
      page += 1;
      header(doc, project, 'Trazabilidad y evidencia', page);
      sectionTitle(doc, 'Fuentes y zonas especulativas', `Continuación · ${uniqueProducts.length} productos únicos en el modelo.`, 30);
      y = 46;
    }
    doc.setFillColor(index % 2 ? 248 : 241, index % 2 ? 249 : 245, index % 2 ? 250 : 247);
    doc.rect(12, y - 4, 273, 7.5, 'F');
    doc.setTextColor(35, 47, 54);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7);
    doc.text(pdfSafe(`${product.manufacturer} - ${product.name}`).slice(0, 75), 15, y);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(104, 117, 126);
    doc.text(pdfSafe(product.evidence.speculation.join(' - ')).slice(0, 100), 117, y);
    doc.setTextColor(62, 137, 162);
    doc.textWithLink('FUENTE', 268, y, { url: product.source.url });
    y += 8;
  });
  if (y > 180) {
    footer(doc);
    doc.addPage();
    page += 1;
    header(doc, project, 'Trazabilidad y evidencia', page);
    y = 34;
  }
  doc.setTextColor(50, 59, 66);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(9);
  doc.text('Alcance de la representación constructiva', 12, y);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.2);
  doc.text('Capas: volumen nominal. Perfiles y encuentros sin plano de sistema: envolvente aproximada. Ver fuentes y notas de cada producto.', 12, y + 5);
  footer(doc);

  doc.save(`${project.title.replace(/[^a-z0-9áéíóúñ]+/gi, '-').replace(/(^-|-$)/g, '') || 'memoria'}.pdf`);
}

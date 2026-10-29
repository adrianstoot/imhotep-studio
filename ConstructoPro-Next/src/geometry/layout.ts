import type { CoverageSpec, ProductVariant } from '../domain/types';

export interface OpeningRect {
  id: string;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface LayoutPiece {
  key: string;
  sourceKey: string;
  row: number;
  column: number;
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
  sourceWidthMm: number;
  sourceHeightMm: number;
  cut: boolean;
}

export interface LayoutJoint {
  key: string;
  kind: 'bed' | 'head';
  xMm: number;
  yMm: number;
  widthMm: number;
  heightMm: number;
}

export interface CoverageLayout {
  pieces: LayoutPiece[];
  joints: LayoutJoint[];
  fullUnits: number;
  cutUnits: number;
  hiddenUnits: number;
  nominalUnits: number;
  coveredAreaM2: number;
  mortarAreaM2: number;
  requestedAreaM2: number;
}

interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

const EPSILON = 0.01;

function intersects(a: Rect, b: Rect): boolean {
  return a.x0 < b.x1 - EPSILON && a.x1 > b.x0 + EPSILON && a.y0 < b.y1 - EPSILON && a.y1 > b.y0 + EPSILON;
}

function subtractRect(source: Rect, opening: Rect): Rect[] {
  if (!intersects(source, opening)) return [source];
  const ix0 = Math.max(source.x0, opening.x0);
  const ix1 = Math.min(source.x1, opening.x1);
  const iy0 = Math.max(source.y0, opening.y0);
  const iy1 = Math.min(source.y1, opening.y1);
  const fragments: Rect[] = [];
  if (source.x0 < ix0 - EPSILON) fragments.push({ x0: source.x0, y0: source.y0, x1: ix0, y1: source.y1 });
  if (ix1 < source.x1 - EPSILON) fragments.push({ x0: ix1, y0: source.y0, x1: source.x1, y1: source.y1 });
  if (source.y0 < iy0 - EPSILON) fragments.push({ x0: ix0, y0: source.y0, x1: ix1, y1: iy0 });
  if (iy1 < source.y1 - EPSILON) fragments.push({ x0: ix0, y0: iy1, x1: ix1, y1: source.y1 });
  return fragments.filter((fragment) => fragment.x1 - fragment.x0 > EPSILON && fragment.y1 - fragment.y0 > EPSILON);
}

export function clipRectAgainstOpenings(source: Rect, openings: Rect[]): Rect[] {
  return openings.reduce<Rect[]>((fragments, opening) => fragments.flatMap((fragment) => subtractRect(fragment, opening)), [source]);
}

function clippedRect(source: Rect, bounds: Rect): Rect | null {
  const clipped = {
    x0: Math.max(source.x0, bounds.x0),
    y0: Math.max(source.y0, bounds.y0),
    x1: Math.min(source.x1, bounds.x1),
    y1: Math.min(source.y1, bounds.y1),
  };
  return clipped.x1 - clipped.x0 > EPSILON && clipped.y1 - clipped.y0 > EPSILON ? clipped : null;
}

function layoutJoint(key: string, kind: LayoutJoint['kind'], rect: Rect): LayoutJoint {
  return {
    key,
    kind,
    xMm: (rect.x0 + rect.x1) / 2,
    yMm: (rect.y0 + rect.y1) / 2,
    widthMm: rect.x1 - rect.x0,
    heightMm: rect.y1 - rect.y0,
  };
}

export function computeCoverageLayout(
  coverage: CoverageSpec,
  variant: ProductVariant,
  openings: OpeningRect[] = [],
): CoverageLayout {
  const width = Math.max(1, coverage.widthMm);
  const height = Math.max(1, coverage.heightMm);
  const joint = Math.max(0, coverage.jointMm);
  const headJoint = Math.max(0, coverage.headJointMm ?? joint);
  const bedJoint = Math.max(0, coverage.bedJointMm ?? joint);
  const overlap = Math.max(0, Math.min(variant.heightMm - 1, coverage.overlapMm));
  const sideOverlap = Math.max(0, Math.min(variant.widthMm - 1, coverage.sideOverlapMm ?? 0));
  const stepX = Math.max(1, variant.widthMm - sideOverlap + headJoint);
  const stepY = Math.max(1, variant.heightMm - overlap + bedJoint);
  const minX = -width / 2;
  const maxX = width / 2;
  const minY = -height / 2;
  const maxY = height / 2;
  const bounds: Rect = { x0: minX, x1: maxX, y0: minY, y1: maxY };
  const openingRects: Rect[] = openings.map((opening) => ({
    x0: opening.xMm - opening.widthMm / 2,
    x1: opening.xMm + opening.widthMm / 2,
    y0: opening.yMm - opening.heightMm / 2,
    y1: opening.yMm + opening.heightMm / 2,
  }));
  const exceptions = new Map(coverage.pieceExceptions.map((entry) => [entry.key, entry]));
  const pieces: LayoutPiece[] = [];
  const joints: LayoutJoint[] = [];
  let fullUnits = 0;
  let cutUnits = 0;
  let hiddenUnits = 0;
  let nominalUnits = 0;

  for (let row = 0, nominalY = minY; nominalY < maxY - EPSILON; row += 1, nominalY += stepY) {
    const rowOffset = coverage.stagger && row % 2 === 1 ? -stepX / 2 : 0;
    for (let column = 0, nominalX = minX + rowOffset; nominalX < maxX - EPSILON; column += 1, nominalX += stepX) {
      if (nominalX + variant.widthMm <= minX + EPSILON) continue;
      const sourceKey = `r${row}-c${column}`;
      const exception = exceptions.get(sourceKey);
      nominalUnits += 1;
      if (exception?.hidden) {
        hiddenUnits += 1;
        continue;
      }

      const offset = exception?.offset ?? [0, 0, 0];
      const source = clippedRect({
        x0: nominalX + offset[0],
        x1: nominalX + variant.widthMm + offset[0],
        y0: nominalY + offset[1],
        y1: nominalY + variant.heightMm + offset[1],
      }, bounds);
      if (!source) continue;
      const fragments = clipRectAgainstOpenings(source, openingRects);
      if (!fragments.length) continue;
      const sourceIsCommercial = Math.abs(source.x1 - source.x0 - variant.widthMm) < EPSILON
        && Math.abs(source.y1 - source.y0 - variant.heightMm) < EPSILON;
      const remainsWhole = sourceIsCommercial && fragments.length === 1
        && Math.abs(fragments[0].x1 - fragments[0].x0 - variant.widthMm) < EPSILON
        && Math.abs(fragments[0].y1 - fragments[0].y0 - variant.heightMm) < EPSILON;
      if (remainsWhole) fullUnits += 1;
      else cutUnits += 1;
      fragments.forEach((fragment, fragmentIndex) => {
        pieces.push({
          key: fragments.length === 1 ? sourceKey : `${sourceKey}-f${fragmentIndex}`,
          sourceKey,
          row,
          column,
          xMm: (fragment.x0 + fragment.x1) / 2,
          yMm: (fragment.y0 + fragment.y1) / 2,
          widthMm: fragment.x1 - fragment.x0,
          heightMm: fragment.y1 - fragment.y0,
          sourceWidthMm: variant.widthMm,
          sourceHeightMm: variant.heightMm,
          cut: !remainsWhole,
        });
      });

      if (headJoint > EPSILON) {
        const jointRect = clippedRect({
          x0: nominalX + variant.widthMm,
          x1: nominalX + variant.widthMm + headJoint,
          y0: nominalY,
          y1: nominalY + variant.heightMm,
        }, bounds);
        if (jointRect) clipRectAgainstOpenings(jointRect, openingRects).forEach((fragment, fragmentIndex) => {
          joints.push(layoutJoint(`${sourceKey}-head-${fragmentIndex}`, 'head', fragment));
        });
      }
    }

    if (bedJoint > EPSILON) {
      const jointRect = clippedRect({
        x0: minX,
        x1: maxX,
        y0: nominalY + variant.heightMm,
        y1: nominalY + variant.heightMm + bedJoint,
      }, bounds);
      if (jointRect) clipRectAgainstOpenings(jointRect, openingRects).forEach((fragment, fragmentIndex) => {
        joints.push(layoutJoint(`r${row}-bed-${fragmentIndex}`, 'bed', fragment));
      });
    }
  }

  const coveredAreaMm2 = pieces.reduce((sum, piece) => sum + piece.widthMm * piece.heightMm, 0);
  const mortarAreaMm2 = joints.reduce((sum, item) => sum + item.widthMm * item.heightMm, 0);
  return {
    pieces,
    joints,
    fullUnits,
    cutUnits,
    hiddenUnits,
    nominalUnits,
    coveredAreaM2: coveredAreaMm2 / 1_000_000,
    mortarAreaM2: mortarAreaMm2 / 1_000_000,
    requestedAreaM2: width * height / 1_000_000,
  };
}

export function coverageUnitDimensionsRemainImmutable(layout: CoverageLayout, variant: ProductVariant): boolean {
  return layout.pieces
    .filter((piece) => !piece.cut)
    .every((piece) => piece.widthMm === variant.widthMm && piece.heightMm === variant.heightMm);
}

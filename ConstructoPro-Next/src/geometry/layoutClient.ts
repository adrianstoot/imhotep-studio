import { computeCoverageLayout } from './layout';
import type { CoverageLayout, OpeningRect } from './layout';
import type { CoverageSpec, ProductVariant } from '../domain/types';

let worker: Worker | null = null;
let sequence = 0;
const pending = new Map<string, (layout: CoverageLayout) => void>();

function getWorker(): Worker | null {
  if (typeof Worker === 'undefined') return null;
  if (worker) return worker;
  worker = new Worker(new URL('./layout.worker.ts', import.meta.url), { type: 'module' });
  worker.onmessage = (event: MessageEvent<{ requestId: string; layout: CoverageLayout }>) => {
    const resolver = pending.get(event.data.requestId);
    if (!resolver) return;
    pending.delete(event.data.requestId);
    resolver(event.data.layout);
  };
  return worker;
}

export function requestCoverageLayout(
  coverage: CoverageSpec,
  variant: ProductVariant,
  openings: OpeningRect[],
): Promise<CoverageLayout> {
  const layoutWorker = getWorker();
  if (!layoutWorker) return Promise.resolve(computeCoverageLayout(coverage, variant, openings));
  const requestId = `layout-${++sequence}`;
  return new Promise((resolve) => {
    pending.set(requestId, resolve);
    layoutWorker.postMessage({ requestId, coverage, variant, openings });
  });
}

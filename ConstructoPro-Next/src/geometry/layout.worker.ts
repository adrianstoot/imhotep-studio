import { computeCoverageLayout } from './layout';
import type { CoverageSpec, ProductVariant } from '../domain/types';
import type { OpeningRect } from './layout';

export interface LayoutWorkerRequest {
  requestId: string;
  coverage: CoverageSpec;
  variant: ProductVariant;
  openings: OpeningRect[];
}

self.onmessage = (event: MessageEvent<LayoutWorkerRequest>) => {
  const { requestId, coverage, variant, openings } = event.data;
  self.postMessage({ requestId, layout: computeCoverageLayout(coverage, variant, openings) });
};

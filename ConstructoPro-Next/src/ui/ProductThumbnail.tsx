import { useEffect, useRef, useState } from 'react';
import type { ProductDefinition } from '../domain/types';
import { requestProductThumbnail } from '../geometry/thumbnailRenderer';

export function ProductThumbnail({ product, large = false }: { product: ProductDefinition; large?: boolean }) {
  const hostRef = useRef<HTMLDivElement>(null);
  const clearedMedia = product.media.find((asset) => asset.licenseStatus === 'cleared' && asset.url);
  const [source, setSource] = useState(clearedMedia?.url ?? '');
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (clearedMedia?.url || source || failed) return;
    const host = hostRef.current;
    if (!host) return;
    let cancelled = false;
    const render = () => requestProductThumbnail(product)
      .then((url) => { if (!cancelled) setSource(url); })
      .catch(() => { if (!cancelled) setFailed(true); });
    if (large || !('IntersectionObserver' in window)) {
      void render();
      return () => { cancelled = true; };
    }
    const observer = new IntersectionObserver((entries) => {
      if (!entries.some((entry) => entry.isIntersecting)) return;
      observer.disconnect();
      void render();
    }, { rootMargin: '180px' });
    observer.observe(host);
    return () => { cancelled = true; observer.disconnect(); };
  }, [clearedMedia?.url, failed, large, product, source]);

  const mediaLabel = clearedMedia ? 'IMAGEN OFICIAL' : 'RENDER PROPIO';
  return (
    <div ref={hostRef} className={`product-thumb ${large ? 'is-large' : ''}`} style={{ '--product-color': product.color } as React.CSSProperties}>
      {source
        ? <img src={source} alt={clearedMedia?.alt ?? `Render 3D propio de ${product.name}, ${product.manufacturer}`} />
        : <div className="product-thumb__loading"><span /><i /></div>}
      <small>{mediaLabel}</small>
    </div>
  );
}

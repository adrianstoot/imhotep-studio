import { useEffect, useMemo, useState } from 'react';
import {
  BookOpen,
  Boxes,
  ChevronRight,
  Plus,
  Search,
  ShieldAlert,
  Sparkles,
  X,
} from 'lucide-react';
import { PRODUCT_BY_ID, PRODUCT_CATALOG } from '../data/catalog';
import {
  PREMIUM_BY_PRODUCT_ID,
  PREMIUM_CATALOG,
  PREMIUM_FAMILIES,
  type PremiumCatalogItem,
  type PremiumFamily,
} from '../data/catalogPresentation';
import { useEditor } from '../state/EditorStore';
import { ProductThumbnail } from './ProductThumbnail';
import type { ProductCategory } from '../domain/types';

const CATEGORY_FAMILIES: Record<ProductCategory, PremiumFamily> = {
  'Soportes y fábrica': 'Fábrica', Aislamientos: 'Aislamientos', Impermeabilización: 'Protección',
  'Morteros y sellantes': 'Protección', 'Revestimientos de fachada': 'Revestimientos',
  'Subestructuras y fijaciones': 'Subestructura', 'Carpinterías y huecos': 'Huecos',
  'Cubierta inclinada': 'Cubierta', 'Cubierta plana y terraza': 'Cubierta', Pavimentos: 'Pavimentos',
  'Particiones y trasdosados': 'Interiores', 'Remates y evacuación': 'Remates',
};

/** Every catalogue reference remains reachable, including technical variants without an illustrated card. */
const TECHNICAL_CATALOG: PremiumCatalogItem[] = PRODUCT_CATALOG.map((product) => PREMIUM_BY_PRODUCT_ID.get(product.id) ?? ({
  product, productName: product.name, family: CATEGORY_FAMILIES[product.category], subtype: product.category,
  artwork: '', accent: product.accent, shortDescription: `${product.category}. Referencia paramétrica con dimensiones comerciales y fuente enlazada.`,
}));
const TECHNICAL_BY_ID = new Map(TECHNICAL_CATALOG.map((item) => [item.product.id, item]));

function PropertyRow({ label, value }: { label: string; value?: string | number }) {
  return <div className="detail-property"><span>{label}</span><strong>{value ?? 'Sin dato declarado'}</strong></div>;
}

function cardDimensions(item: PremiumCatalogItem) {
  const variant = item.product.variants[0];
  return `${variant.widthMm.toLocaleString('es-ES')} × ${variant.heightMm.toLocaleString('es-ES')} × ${variant.depthMm.toLocaleString('es-ES')} mm`;
}

function cardProperties(item: PremiumCatalogItem) {
  const { product } = item;
  return [
    ['λ', product.properties.lambdaWmK ? `${product.properties.lambdaWmK} W/mK` : '—'],
    ['ρ', product.properties.densityKgM3 ? `${product.properties.densityKgM3} kg/m³` : '—'],
    ['FUEGO', product.properties.fireClass ?? '—'],
    ['JUNTA', product.jointMm ? `${product.jointMm} mm` : product.overlapMm ? `SOLAPE ${product.overlapMm}` : '—'],
  ];
}

function PremiumCardVisual({ item }: { item: PremiumCatalogItem }) {
  const { product } = item;
  const sourceLabel = product.source.quality === 'documented' ? 'FUENTE DOCUMENTADA' : 'FUENTE ENLAZADA';
  return <div className="premium-render-card">
    <div className="premium-render-card__top"><small>{item.family.toUpperCase()} · {item.subtype.toUpperCase()}</small><span>CONSTRUCTOPRO</span></div>
    <div className="premium-render-card__hero">{item.artwork ? <img src={item.artwork} alt={`Visualización de ${product.name}, ${product.manufacturer}`} draggable={false} /> : <ProductThumbnail product={product} />}</div>
    <div className="premium-render-card__copy"><small>{product.manufacturer}</small><strong>{product.name}</strong><em>{cardDimensions(item)}</em></div>
    <div className="premium-render-card__properties">{cardProperties(item).map(([label, value]) => <span key={label}><i>{label}</i><b>{value}</b></span>)}</div>
    <div className="premium-render-card__footer"><span>{sourceLabel}</span><span>{product.placementKind === 'coverage' ? 'PAÑO EDITABLE' : product.placementKind === 'linear' ? 'CORTE DE STOCK' : 'UNIDAD 3D'}</span></div>
  </div>;
}

function ProductDetails({ item, onClose }: { item: PremiumCatalogItem; onClose: () => void }) {
  const { actions, project } = useEditor();
  const { product } = item;
  const variant = product.variants[0];
  const media = product.media[0];
  const reference = variant.commercialCode ? `SKU ${variant.commercialCode}` : `REFERENCIA INTERNA ${product.sku}`;
  const sourceState = product.source.quality === 'documented'
    ? 'Fuente documentada · prestaciones declaradas'
    : 'Fuente oficial enlazada · auditoría de campos pendiente';
  const compatible = product.scopes.includes(project.detailType);

  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <article className="product-modal product-modal--premium" role="dialog" aria-modal="true" aria-label={`Ficha de ${product.name}`}>
      <header><div><small>{item.family.toUpperCase()} · {item.subtype.toUpperCase()} · {reference}</small><h2>{product.name}</h2><p>{product.manufacturer}</p></div><button className="icon-button" onClick={onClose} aria-label="Cerrar"><X size={18} /></button></header>
      <div className="product-modal__premium-layout">
        <div className="product-modal__card-preview">{!item.artwork ? <ProductThumbnail product={product} large /> : item.visual === 'generated-render' ? <div className="product-modal__render-card"><PremiumCardVisual item={item} /></div> : <img src={item.artwork} alt={`Carta técnica de ${product.name}, ${product.manufacturer}`} />}<p className="product-modal__visual-note">Ilustración de catálogo. Consulta los datos y la fuente de esta ficha para definir el producto.</p></div>
        <div className="product-modal__technical">
          <div className="verification-card">{product.source.quality === 'documented' ? <BookOpen size={21} /> : <ShieldAlert size={21} />}<div><strong>{product.source.quality === 'documented' ? 'Fuente documentada' : 'Fuente enlazada · revisión pendiente'}</strong><span>Revisión {product.source.reviewedAt}</span><small>{media?.licenseStatus === 'cleared' ? 'Imagen oficial autorizada' : 'Visualización propia de biblioteca'}</small></div></div>
          <p className="product-modal__description">{item.shortDescription}</p>
          <div className="product-modal__grid">
            <section><h3>Geometría comercial inmutable</h3><PropertyRow label="Ancho" value={`${variant.widthMm.toLocaleString('es-ES')} mm`} /><PropertyRow label="Alto / longitud" value={`${variant.heightMm.toLocaleString('es-ES')} mm`} /><PropertyRow label="Espesor" value={`${variant.depthMm.toLocaleString('es-ES')} mm`} /><PropertyRow label="Colocación" value={product.placementKind === 'coverage' ? 'Paño regenerable' : product.placementKind === 'linear' ? 'Corte de stock' : 'Unidad'} /><PropertyRow label="Junta / solape" value={product.sideOverlapMm ? `${product.overlapMm ?? 0} mm longitudinal · ${product.sideOverlapMm} mm transversal` : product.overlapMm ? `${product.overlapMm} mm de solape` : product.placementKind === 'coverage' ? `${product.jointMm ?? 0} mm` : undefined} /></section>
            <section><h3>Propiedades declaradas</h3><PropertyRow label="Conductividad λ" value={product.properties.lambdaWmK ? `${product.properties.lambdaWmK} W/mK` : undefined} /><PropertyRow label="Densidad" value={product.properties.densityKgM3 ? `${product.properties.densityKgM3} kg/m³` : undefined} /><PropertyRow label="Factor μ" value={product.properties.vaporMu} /><PropertyRow label="Reacción al fuego" value={product.properties.fireClass} /><PropertyRow label="Rw" value={product.properties.acousticRwDb ? `${product.properties.acousticRwDb} dB` : undefined} /></section>
          </div>
          <section className="evidence-block"><h3>Evidencia del modelo</h3><div><span>Restaurado</span><p>{product.evidence.restored.join(' · ')}</p></div><div><span>Especulación</span><p>{product.evidence.speculation.join(' · ')}</p></div></section>
          <section className="source-card"><BookOpen size={17} /><div><strong>{product.source.documentTitle}</strong><span>{sourceState} · revisión {product.source.reviewedAt}</span></div><a href={product.source.url} target="_blank" rel="noreferrer">Abrir fuente <ChevronRight size={14} /></a></section>
        </div>
      </div>
      <footer><button className="button button--ghost" onClick={onClose}>Cerrar</button><button className="button button--primary" disabled={!compatible} title={compatible ? 'Colocar sobre el plano de trabajo' : 'Cambia el tipo de detalle para colocar esta referencia'} onClick={() => { actions.queueProduct(product.id); onClose(); }}><Plus size={16} /> {compatible ? 'Colocar en el modelo' : 'Material para otro detalle'}</button></footer>
    </article>
  </div>;
}

function PremiumCard({ item, compatible }: { item: PremiumCatalogItem; compatible: boolean }) {
  const { ui, actions } = useEditor();
  const pending = ui.pendingProductId === item.product.id;
  const renderedCard = !item.artwork || item.visual === 'generated-render';
  return <article className={`premium-product-card ${pending ? 'is-pending' : ''} ${compatible ? '' : 'is-other-detail'} ${renderedCard ? 'is-render-card' : ''}`} style={{ '--card-accent': item.accent } as React.CSSProperties}>
    {renderedCard ? <PremiumCardVisual item={item} /> : <img src={item.artwork} alt={`Carta técnica de ${item.product.name}, fabricado por ${item.product.manufacturer}`} loading="lazy" draggable={false} />}
    <button className="premium-product-card__details" aria-label={`Abrir ficha completa de ${item.product.name}`} title="Abrir ficha técnica" onClick={() => actions.setUi({ catalogDetailId: item.product.id })} />
    <button className="premium-product-card__source" aria-label={`Abrir documentación de ${item.product.name}`} title="Ver documentación y propiedades" onClick={() => actions.setUi({ catalogDetailId: item.product.id })}>{renderedCard && <span>Ficha</span>}</button>
    <button className="premium-product-card__add" disabled={!compatible} aria-label={compatible ? `Añadir ${item.product.name} al editor 3D` : `${item.product.name} pertenece a otro tipo de detalle`} title={compatible ? 'Añadir al editor 3D' : 'Disponible al cambiar el tipo de detalle'} onClick={() => actions.queueProduct(item.product.id)}><span>{pending ? 'Haz clic en el 3D' : compatible ? 'Añadir al 3D' : 'Otro detalle'}</span></button>
    {!compatible && <div className="premium-product-card__scope">OTRO DETALLE</div>}
    {pending && <div className="premium-product-card__pending"><Sparkles size={14} /> LISTO PARA COLOCAR</div>}
  </article>;
}

export function CatalogPanel() {
  const { project, ui, actions } = useEditor();
  const [activeFamily, setActiveFamily] = useState<PremiumFamily | 'Todos'>('Todos');
  const [activeSubtype, setActiveSubtype] = useState('Todos');
  const [catalogLibrary, setCatalogLibrary] = useState<'visual' | 'technical'>('visual');
  const [compatibleOnly, setCompatibleOnly] = useState(true);
  const library = catalogLibrary === 'visual' ? PREMIUM_CATALOG : TECHNICAL_CATALOG;
  const sourceItems = useMemo(() => compatibleOnly ? library.filter((item) => item.product.scopes.includes(project.detailType)) : library, [compatibleOnly, library, project.detailType]);

  useEffect(() => {
    setActiveFamily('Todos');
    setActiveSubtype('Todos');
  }, [project.detailType]);

  const families = useMemo(() => PREMIUM_FAMILIES.filter((family) => sourceItems.some((item) => item.family === family)), [sourceItems]);
  const subtypes = useMemo(() => {
    const source = activeFamily === 'Todos' ? sourceItems : sourceItems.filter((item) => item.family === activeFamily);
    return [...new Set(source.map((item) => item.subtype))];
  }, [activeFamily, sourceItems]);
  const items = useMemo(() => {
    const tokens = ui.search.trim().toLocaleLowerCase('es').split(/\s+/).filter(Boolean);
    return sourceItems.filter((item) => {
      if (activeFamily !== 'Todos' && item.family !== activeFamily) return false;
      if (activeSubtype !== 'Todos' && item.subtype !== activeSubtype) return false;
      const haystack = `${item.product.name} ${item.product.manufacturer} ${item.family} ${item.subtype} ${item.shortDescription}`.toLocaleLowerCase('es');
      return tokens.every((token) => haystack.includes(token));
    });
  }, [activeFamily, activeSubtype, sourceItems, ui.search]);

  const detailProduct = ui.catalogDetailId ? PRODUCT_BY_ID.get(ui.catalogDetailId) : undefined;
  const detailItem = detailProduct ? TECHNICAL_BY_ID.get(detailProduct.id) : undefined;
  const chooseFamily = (family: PremiumFamily | 'Todos') => {
    setActiveFamily(family);
    setActiveSubtype('Todos');
  };

  return <><aside className="panel panel--catalog panel--premium-catalog">
    <header className="library-header library-header--premium"><div><small>BIBLIOTECA CONSTRUCTIVA</small><strong>Materiales</strong></div><span><b>{library.length}</b> referencias</span></header>
    <label className="catalog-search"><Search size={16} /><input value={ui.search} onChange={(event) => actions.setUi({ search: event.target.value })} placeholder="Producto, empresa o prestación…" />{ui.search && <button type="button" title="Limpiar búsqueda" onClick={() => actions.setUi({ search: '' })}><X size={15} /></button>}</label>
    <div className="catalog-scope-switch" aria-label="Biblioteca de materiales"><button className={catalogLibrary === 'visual' ? 'is-active' : ''} onClick={() => { setCatalogLibrary('visual'); chooseFamily('Todos'); }}><Boxes size={14} /><span>Selección visual</span><b>{PREMIUM_CATALOG.length}</b></button><button className={catalogLibrary === 'technical' ? 'is-active' : ''} onClick={() => { setCatalogLibrary('technical'); chooseFamily('Todos'); }}><BookOpen size={14} /><span>Referencias</span><b>{TECHNICAL_CATALOG.length}</b></button></div>
    <div className="catalog-filter-grid"><label><span>Familia</span><select aria-label="Familia de material" value={activeFamily} onChange={(event) => chooseFamily(event.target.value as PremiumFamily | 'Todos')}><option value="Todos">Todas las familias</option>{families.map((family) => <option key={family} value={family}>{family}</option>)}</select></label><label><span>Tipo</span><select aria-label="Tipo de material" value={activeSubtype} onChange={(event) => setActiveSubtype(event.target.value)}><option value="Todos">Todos los tipos</option>{subtypes.map((subtype) => <option key={subtype}>{subtype}</option>)}</select></label></div>
    <label className="catalog-compatible"><input type="checkbox" checked={compatibleOnly} onChange={(event) => { setCompatibleOnly(event.target.checked); chooseFamily('Todos'); }} /><span>Compatibles con este detalle</span><b>{sourceItems.length}</b></label>
    <div className="catalog-results-head catalog-results-head--premium"><span>{activeSubtype !== 'Todos' ? activeSubtype : activeFamily !== 'Todos' ? activeFamily : 'Materiales disponibles'}</span><b>{items.length}</b></div>
    <div className="premium-product-list">{items.map((item) => <PremiumCard key={item.product.id} item={item} compatible={item.product.scopes.includes(project.detailType)} />)}{!items.length && <div className="empty-state"><Search size={24} /><strong>Sin referencias</strong><p>Cambia los filtros o limpia la búsqueda.</p></div>}</div>
  </aside>{detailItem && <ProductDetails item={detailItem} onClose={() => actions.setUi({ catalogDetailId: null })} />}</>;
}

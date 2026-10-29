import { useEffect, useRef, useState } from 'react';
import { Camera, FileImage, RefreshCw, X } from 'lucide-react';
import { captureViewportPng } from '../geometry/viewportCapture';

const STAGES = [
  '01 · Contorno, escala y cámara',
  '02 · Componentes y jerarquías',
  '03 · Perfiles, juntas y repetición',
  '04 · PBR e iluminación',
  '05 · Tornillos, cantos y conectores',
  '06 · Revisión final',
];

export function QaReferenceBoard() {
  const [reference, setReference] = useState<string | null>(null);
  const [referenceName, setReferenceName] = useState('Sin referencia cargada');
  const [render, setRender] = useState<string | null>(null);
  const [stage, setStage] = useState(STAGES[0]);
  const fileRef = useRef<HTMLInputElement>(null);

  const refresh = () => setRender(captureViewportPng());
  useEffect(() => {
    const timer = window.setTimeout(refresh, 900);
    return () => window.clearTimeout(timer);
  }, []);

  const loadReference = (file?: File) => {
    if (!file || !file.type.startsWith('image/')) return;
    const reader = new FileReader();
    reader.onload = () => {
      setReference(String(reader.result));
      setReferenceName(file.name);
    };
    reader.readAsDataURL(file);
  };

  return (
    <section className="qa-board" aria-label="Comparación interna de referencia y render">
      <header>
        <div><small>RUTA INTERNA · IMG2THREEJS QA</small><strong>Referencia / reconstrucción procedural</strong><p>Las imágenes se leen localmente y nunca se incorporan al proyecto ni al catálogo.</p></div>
        <select value={stage} onChange={(event) => setStage(event.target.value)}>{STAGES.map((item) => <option key={item}>{item}</option>)}</select>
        <button className="button button--ghost" onClick={refresh}><RefreshCw size={15} /> Actualizar render</button>
        <button className="icon-button" onClick={() => { window.location.href = window.location.pathname; }} title="Cerrar QA"><X size={18} /></button>
      </header>
      <div className="qa-comparison">
        <article>
          <div className="qa-label"><span>REFERENCIA LOCAL</span><b>{referenceName}</b></div>
          {reference ? <img src={reference} alt="Referencia local de comparación" /> : <button className="qa-upload" onClick={() => fileRef.current?.click()}><FileImage size={34} /><strong>Cargar imagen de referencia</strong><span>JPG o PNG · solo memoria de esta sesión</span></button>}
          <input ref={fileRef} hidden type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => loadReference(event.target.files?.[0])} />
        </article>
        <article>
          <div className="qa-label"><span>RENDER WEBGL</span><b>{stage}</b></div>
          {render ? <img src={render} alt="Captura del render procedural actual" /> : <div className="qa-upload"><Camera size={34} /><strong>Esperando al viewport</strong><span>Actualiza cuando termine la geometría</span></div>}
        </article>
      </div>
      <footer><span>Control obligatorio:</span><b>contorno</b><b>proporción</b><b>ángulo</b><b>piezas clave</b><b>materiales</b><b>iluminación</b><i>Las áreas ocultas permanecen marcadas como especulación.</i></footer>
    </section>
  );
}

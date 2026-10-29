# Detalles Técnicos · 0.5

Editor CAD educativo, 3D y 2D, para construir detalles de envolvente y acabados producto por producto. Es una aplicación nueva e independiente: no importa código, estado ni dependencias del prototipo anterior.

La versión 0.4 añade un estudio blanco con paneles plegables, biblioteca completa de 208 referencias, ocho composiciones de ejemplo, planos proporcionales y revisión constructiva trazable. Los ocho componentes genéricos docentes conservan sus prestaciones desconocidas y no se atribuyen a un fabricante.

## Ejecutar

```powershell
npm ci
npm run dev
```

La aplicación abre en `http://localhost:4173`. No requiere cuenta ni backend. El proyecto se autoguarda en IndexedDB del navegador.

Requiere Node.js 22.12 o posterior compatible con Vitest 5. Para revisar una composición nueva sin modificar el documento guardado, usa `?demo=fachada-ventilada` o cualquiera de los ocho identificadores de sistema. El botón **Cargar ejemplo** se puede deshacer. La vista temporal permite exportar el documento para conservarlo.

## Dibujo y alcance

- El corte 2D se obtiene de la intersección del plano con volúmenes comerciales orientados, con huecos recortados.
- Las capas son volúmenes proporcionales. Perfiles, anclajes, carpinterías y remates sin sección técnica documentada se identifican como envolventes comerciales discontinuas.
- La pantalla ajusta el plano a su panel. El SVG exportado incorpora tramas, estilos y dimensiones físicas para impresión al 100 % a la escala seleccionada.
- Las comprobaciones CTE muestran criterio, entradas, fuente y limitación. Una clase de fuego declarada, una cámara geométrica o la presencia de productos no equivalen a justificar el sistema o el edificio.
- El itinerario de Construcción II/III se organiza con los bloques públicos publicados por UPV. La correspondencia con ejercicios y temario de un curso concreto requiere sus guías y material docente.

## Validar

```powershell
npm run typecheck
npm test
npm run build
npm audit
```

La pasada de navegador reproducible usa Playwright CLI, en una sesión aislada abierta sobre el servidor que se desea comprobar:

```powershell
npx --yes --package @playwright/cli playwright-cli --session constructoqa open http://127.0.0.1:4173/?demo=fachada-ventilada
npx --yes --package @playwright/cli playwright-cli --session constructoqa run-code --filename scripts/qa-release.cjs
```

Recorre dos veces los ocho sistemas y comprueba edición, historial, catálogo, fichas y exportaciones. Captura pantallas en `output/playwright/`.

## Formato y privacidad

- `Proyecto` descarga un archivo `.constructopro` JSON versionado.
- `Importar` restaura ese archivo mediante migraciones de esquema.
- `Memoria PDF` genera un documento A4 apaisado con vista 3D, composición, CTE y trazabilidad.
- Los archivos de referencia aportados para reconstruir la muestra no se empaquetan ni se redistribuyen.
- `?qa=reference` abre la mesa interna de comparación y permite cargar referencias locales solo durante la sesión.
- `?qa=performance` abre una escena temporal 12 × 12 m con dos hojas de fábrica, aislamiento y revestimiento; no sustituye el proyecto guardado.

## Límites de esta entrega

El catálogo contiene 200 referencias/candidatos reales de mercado español con enlaces oficiales y distribución validada. Las filas con ficha exacta comprobada se marcan `documented`; las restantes se marcan `source-linked`, mantienen propiedades técnicas vacías y quedan excluidas de cálculos hasta validar ficha/DoP individualmente. Esto evita convertir un dato plausible en un dato declarado.

La normativa es didáctica y trazable, no una justificación profesional firmada. Los puentes térmicos que requieren simulación no reciben un valor psi inventado.

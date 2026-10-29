# Registro histórico de validación

Este registro corresponde a una pasada anterior. El estado actual se documenta en [QA-0.5.md](QA-0.5.md); la versión anterior está en [QA-0.4.md](QA-0.4.md).

Fecha de la pasada final: 12 de agosto de 2026.

## Automatización

- `npm run build`: correcto; TypeScript sin errores y producción Vite generada.
- División de carga: aplicación inicial 286 kB, motor Three.js 589 kB y exportador PDF 396 kB antes de gzip.
- `npm test`: 3 archivos y 11 pruebas correctas.
- Catálogo: 200 referencias exactas y distribución cerrada por categorías.
- Propiedades: toda fila `source-linked` conserva vacío el objeto de prestaciones.
- Paños: 1×1 a 3×4 m sin modificar el tamaño de la unidad; recortes y huecos comprobados con pruebas basadas en propiedades.
- Cubierta: ampliación conservando paso y solape de la teja.
- Proyecto: serialización, migración e importación sin pérdida.
- `npm audit --omit=dev`: 0 vulnerabilidades.

## Navegador real

Playwright recorrió la aplicación a 1600×1000 y comprobó:

- biblioteca, ficha de producto, previsualización fantasma y colocación;
- selección con gizmo, duplicado, eliminación, undo/redo y excepción de una pieza;
- ventana colocada y movida, con regeneración de cinco capas enlazadas;
- sección SVG sincronizada y modo ampliado;
- inspector CTE, exportación/importación `.constructopro` y memoria PDF;
- mesa QA con referencia local y render WebGL lado a lado;
- consola final: 0 errores y 0 avisos.

## Escena representativa 12×12 m

- 24.076 piezas.
- 7 llamadas de dibujo.
- Aproximadamente 358.000 triángulos.
- Layout procedural de CPU: 47 ms en la pasada final de pruebas.

El navegador headless pausa `requestAnimationFrame`, por lo que esta pasada no certifica por sí sola 45 FPS en una GPU integrada física. La aceptación de FPS debe repetirse en el portátil universitario objetivo; la ruta `?qa=performance` queda preparada para ello.

## Artefactos

- `output/playwright/editor-final.png`: editor final limpio.
- `output/playwright/reference-side-by-side-final.png`: comparación final.
- `output/playwright/performance-12x12.png`: escena de carga representativa.
- `output/pdf/ConstructoPro-Next-Memoria-Muestra.pdf`: memoria producida por la propia aplicación.
- `output/pdf/memory-final-1.png` a `memory-final-4.png`: render visual de las cuatro páginas del PDF.

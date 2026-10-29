# QA 0.5.0 · ventana y planos de montaje

28/10/2026. Revisión motivada por las capturas del usuario. La versión anterior retiraba algunas fijaciones, pero no las ménsulas genéricas: su comportamiento estaba declarado erróneamente como barra divisible. La ventana estaba adelantada respecto a la fábrica sin montaje portante definido. Los cuatro remates independientes no resolvían el encuentro y el 2D sólo mostraba envolventes.

## Corrección

- Las ménsulas y fijaciones unitarias invasoras se retiran por su volumen, incluido el caso de centro exterior y extremo dentro del hueco.
- Marco retranqueado al soporte, premarco tubular hueco, tres calzos, dos familias de fijación mecánica y dintel con volumen reservado en la fábrica.
- Relleno de junta, estanqueidad interior/exterior, cintas, retornos aislantes y telares. Vierteaguas con pendiente de 10°, testeros y bandeja impermeable; drenaje superior y rejilla con pasos abiertos, con abertura real en el revestimiento.
- Una definición de sólidos alimenta render y cortes: alféizar, apoyo, dintel, fijación, jamba y alzado. La leyenda incluye todos los componentes del plano, sin límite de ocho. Los perfiles plegados conservan su sección cóncava.
- Parámetros editables con deshacer; se rechazan combinaciones que invierten la cuña de apoyo. La importación conserva el montaje y valida sus cotas.
- Se mantiene el editor blanco, las tarjetas completas y la ventana 2D pequeña, ampliable, cerrable y reabrible. Las hojas grandes disponen de desplazamiento para conservar la lectura.

## Evidencia

`npm test`: **63 pruebas, 11 archivos, todas correctas**. Incluyen geometría efectiva de ménsulas y perfiles, 18 rayos por las luces del vidrio, contactos de apoyo, apoyos de dintel sin ladrillo superpuesto, pendiente/goterón/entregas, orientación de caras y transformación de vértices, cortes del montaje e importación. `npm run build`: correcto.

`scripts/qa-release.cjs`: ocho ejemplos en dos pasadas; duplicar/deshacer/rehacer/eliminar, biblioteca y colocación, fichas, normativa, costes, exportación/importación del documento, SVG, PDF, popup y vistas de 1600/1176/390 px. Sin errores JavaScript ni respuestas HTTP fallidas. El controlador de render de la sesión automatizada registra un aviso de precisión X4122 de shader; no se interpreta como una medición de rendimiento del equipo del usuario.

`scripts/qa-window-installation.cjs`: rechaza pendiente de 30°, retranqueo de 300 mm y junta insuficiente en el montaje predeterminado; permite 11°, actualiza el 2D y deshace hasta 10°. Se recorren seis vistas en dos pasadas, se exporta SVG y se comprueba cierre/reapertura pequeños. La primera revisión detectó el alzado ilegible al ajustar una hoja de 41 componentes; se añadió desplazamiento y ancho mínimo al plano ampliado.

Capturas en `output/playwright/window-*-2d.png`, `window-complete-3d.png` y `window-detail-*.png`. Fuentes, cotas y alcance en [WINDOW-INSTALLATION-0.5.md](WINDOW-INSTALLATION-0.5.md).

## Límites de esta entrega

La sección de carpintería es genérica y está identificada como tal en la interfaz: no es un CAD de fabricante. No se han calculado dintel ni anclajes; no se certifican prestaciones del sistema ni coincidencia íntegra con un curso de ETSIE. Se consultaron vistas públicas de trabajos/apuntes de Construcción III y el CTE; las páginas completas restringidas no se consultaron.

Los huecos en las capas de fachada conservan la convención ortogonal del resolver. Las pruebas de transformación comprueban los sólidos del montaje, no una operación booleana general para ventanas giradas fuera del plano del cerramiento. Los documentos antiguos sin instalación explícita conservan su representación anterior; el ejemplo 0.5 carga el montaje nuevo. El presupuesto sigue siendo una estimación por productos de escena, sin descomposición de tarifas de cada pieza interna del montaje.

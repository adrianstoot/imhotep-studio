# QA de la instalación de ventana · 0.5.0

Compilación local en http://127.0.0.1:4173/, sesión Playwright independiente `windowrelease`.

- `scripts/qa-release.cjs`: ocho sistemas, dos pasadas; duplicar, deshacer, rehacer, eliminar, búsqueda, ficha, colocación, normativa, presupuesto, exportación/importación nativa, SVG y PDF. Capturas a 1600×1000, 1176×900 y 390×844. Sin errores JavaScript ni respuestas HTTP fallidas.
- `scripts/qa-window-installation.cjs`: rechaza pendiente de 30°, retranqueo de 300 mm y holgura de 10 mm conservando los valores anteriores; aplica 11° y actualiza el 2D; Deshacer restaura 10°.
- Límites dinámicos iniciales observados: pendiente máxima 12,1°; cara exterior máxima 252,3 mm.
- Fijación, alféizar, apoyo, dintel, jamba y alzado: dos pasadas con geometría. Exportación SVG, cierre y reapertura pequeña correctos.
- Errores JavaScript: 0. Respuestas HTTP fallidas: 0.
- Consola: advertencia de precisión numérica del compilador de shaders THREE, X4122; sin fallo de ejecución.

Revisión sobre la compilación final:

- Deshacer borra la selección; fue necesario volver a seleccionar la ventana para leer sus propiedades.
- La reducción excesiva de las leyendas quedó corregida. Las seis vistas ampliadas conservan letras de aproximadamente **12,65 px** a 1600×1000. Ningún texto queda fuera del SVG, comprobando sus transformaciones.
- Las hojas largas permiten desplazamiento vertical. Alzado: hoja de 1514 px en un área de 796 px, recorrido completo de 718 px. Se verificó el acceso al último texto del pie de todas las hojas.
- El script final repitió las seis vistas dos veces y los cambios inválidos/válidos, deshacer, exportación SVG y cierre/reapertura pequeña: todo correcto, sin errores JavaScript ni solicitudes HTTP fallidas.
- Inspección visual final de alzado superior e inferior: textos legibles y parte inferior accesible mediante desplazamiento.
- Las capturas `window-detail-*.png` conservan las seis vistas ampliadas finales inspeccionadas; los archivos `*-bottom.png` muestran el final de las hojas largas. `window-invalid-slope.png` conserva la edición rechazada.

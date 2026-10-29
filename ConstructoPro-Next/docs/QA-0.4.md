# ConstructoPro 0.4 · revisión del 28 de octubre de 2026

## Resultado y distribución

La interfaz conserva la distribución solicitada: catálogo lateral con cartas completas en dos columnas, editor 3D central e inspector a la derecha. El tema es blanco. El plano 2D abre como ventana flotante pequeña; permite ampliar pulsando su vista previa, reducir, cerrar y reabrir pequeño desde «Sección 2D» o el control inferior.

## Cambios constructivos

- Ocho composiciones por sistema; cubierta inclinada con pendiente del 35 % y plana con pendiente del 2 % en los ejemplos.
- Apilado de fachada en contacto, cámara geométrica, anclajes, rastreles, pedestales y canalón representados con su orientación.
- Tejas con dimensión comercial y colocación que respeta el solape entre hiladas.
- Cortes 2D poligonales de los prismas orientados y huecos. Las secciones de fabricación desconocidas se muestran como envolventes comerciales discontinuas.
- Exportación SVG con estilos incorporados y dimensiones físicas según la escala. El PDF utiliza el corte calculado.
- Biblioteca de 200 referencias base y ocho componentes docentes explícitamente genéricos, sin prestaciones inventadas.
- Comprobaciones de pendiente, solapes, composición, evacuación y procedencia. La resistencia térmica sólo agrega capas del mismo recorrido normal; una declaración de fuego no recibe un resultado de cumplimiento de SI 2.
- Importaciones con validación de coordenadas, referencias e identificadores.

## Verificación reproducible

- `npm test`: 10 archivos y 52 pruebas correctas, incluidas intersecciones de cortes, raycast del solape de tejas, Euler XYZ, contactos de capas, clima, presupuesto, importación y aislamiento dentro de su envolvente nominal.
- `npm run build`: correcto con TypeScript y Vite 6.4.5.
- `npm audit`: 0 vulnerabilidades después de las actualizaciones compatibles y de actualizar Vitest a 5.0.5, compatible con el Node 22 instalado.
- Pasada de navegador de producción correcta: ocho sistemas recorridos dos veces; duplicar, deshacer, rehacer, seleccionar, eliminar, buscar, abrir ficha, colocar, inspector CTE y presupuesto. Exportación/importación de proyecto conservando el número de objetos; SVG y PDF descargados correctamente.
- La ventana 2D se comprobó pequeña al abrir, ampliada mediante clic, reducida, cerrada y reabierta pequeña. Capturas a 1600×1000, 1176×900 y 390×844.
- Sin errores JavaScript ni respuestas HTTP fallidas en la pasada automatizada. El controlador gráfico emite avisos de precisión numérica de shaders; el render y la interacción funcionan. La medición de FPS en esta sesión automatizada no certifica rendimiento del equipo físico.
- Ejecución: `scripts/qa-release.cjs` mediante Playwright CLI. Evidencia en `output/playwright/`; `upgrade-report.pdf`, `upgrade-section.svg` y `upgrade-roundtrip.constructopro` son exportaciones reales de la app.

## Base docente y normativa

El itinerario se organiza con los bloques públicos de [Construcción II y III publicados por UPV](https://riunet.upv.es/entities/publication/a9752005-afae-48dd-95bf-188b870a14d2): cubiertas; fachadas, particiones y revestimientos. No se ha cotejado el material privado ni los ejercicios de un curso específico.

Las reglas enlazan sus apartados en [DB-HS](https://www.codigotecnico.org/pdf/Documentos/HS/DBHS.pdf), [DB-HE](https://www.codigotecnico.org/DocumentosCTE/AhorroEnergia.html), [DB-SI](https://www.codigotecnico.org/DocumentosCTE/SeguridadEnCasoDeIncendio.html) y [DB-HR](https://www.codigotecnico.org/DocumentosCTE/ProteccionRuido.html). Los ejemplos no son un sistema de fabricante ensayado ni justifican por sí solos las prestaciones del edificio. Quedan fuera el cálculo estructural de fijaciones, el dimensionado hidráulico y el cálculo completo de puentes térmicos, acústica e higrotermia.

La vista `?demo=fachada-ventilada` es temporal y conserva el documento guardado del usuario. «Cargar ejemplo» es una operación que se puede deshacer.

## Corrección visual 0.4.1

La captura aportada por el usuario reveló una regresión visual que la suite funcional no detectaba: la cuadrícula quedaba por delante de las capas expuestas y el relieve geométrico de la lana atravesaba la membrana de 0,4 mm, creando manchas amarillas. Se retiró ese desplazamiento de la envolvente, se hicieron opacas las membranas y se desplazó la cuadrícula detrás de todos los volúmenes del modelo.

Se incorporaron superficies de lana mineral y hormigón recuperadas del propio repositorio; se moderaron las normales y la iluminación. El vidrio utiliza transparencia de vista técnica sin el pase de refracción que producía un aspecto lechoso, y no recibe sombras opacas de los herrajes.

`scripts/qa-materials.cjs` compara fachada y cubierta y registra capturas en `output/playwright/material-*.png`. La captura de fachada pasó de 375 llamadas / 851 mil triángulos con el pase refractivo a 189 llamadas / 426 mil triángulos sin ese pase; no son mediciones de FPS del equipo físico. Sin errores JavaScript ni solicitudes fallidas en la comprobación.

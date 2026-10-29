# Montaje de ventana 0.5 · alcance y revisión

Revisión documental: **28/10/2026**. Este ejemplo es un ensamblaje didáctico dimensionado. Las comprobaciones geométricas no sustituyen el proyecto, el cálculo ni la documentación del sistema realmente instalado.

## Cambio implementado

`src/domain/windowAssembly.ts` genera piezas canónicas en milímetros mediante `resolveWindowAssembly`: premarco hueco, calzos portantes, fijaciones, marco y hojas, rotura térmica esquemática, acristalamiento, juntas, sellados, retornos aislantes, telares, dintel y vierteaguas. Incluye bandeja de drenaje en cabezal y rejilla con pasos abiertos.

`windowAssemblyMesh.ts` extruye esas piezas para 3D; `sectionResolver.ts` obtiene sus cortes y vistas 2D. Así, las representaciones comparten posiciones y espesores. `openingDimensions.ts` reserva el hueco bruto, el volumen que sustituye el dintel y la salida de la cámara sobre el cabezal. La revisión debe confirmar que cada pieza aparece en el plano que realmente la corta.

## Cotas del ejemplo actual

Exterior: **+Z**. Ventana comercial nominal: **1200 × 1400 × 80 mm**. Coordenadas globales del ejemplo de `projectFactory.ts`:

| Elemento | Dimensión / posición |
| --- | --- |
| Marco | Centro `(900, 1650, 20)`; X 300–1500, Y 950–2350, Z −20–60 mm |
| Hoja principal | Espesor 115 mm; Z −57,5–57,5 mm |
| Junta de montaje | 20 mm por lado; relleno aislante sin función portante |
| Premarco | Tubo genérico 30 × 80 × 2 mm; profundidad Z −20–60 mm |
| Hueco bruto | 1300 × 1500 mm; X 250–1550, Y 900–2400 mm |
| Camino de apoyo | Fábrica hasta Y 900 → tubo inferior Y 900–930 → calzos Y 930–950 → marco desde Y 950 |
| Calzos de instalación | Tres de 60 × 20 × 60 mm; centros X 400, 900 y 1400 mm, Z 20 mm |
| Dintel | 1700 × 150 × 115 mm; X 50–1750, Y 2400–2550; apoyo geométrico de 200 mm a cada lado |
| Retorno aislante / telar | 25 mm / chapa de 1,5 mm; fijaciones fuera de la luz del vidrio |
| Acabado exterior | Cara en Z 233,9 mm |
| Vierteaguas | Pendiente exterior 10°; vuelo 40 mm hasta Z 273,9; ancho 1340 mm y entrega lateral de 20 mm respecto al hueco bruto |

Son los parámetros del ejemplo, no mínimos universales. Se distinguen tornillos marco–premarco y anclajes premarco–fábrica; las ménsulas de fachada no soportan la carpintería.

## Fuentes realmente consultadas

- **CTE DB HS, texto consolidado de 14/06/2022**, consultado el 28/10/2026. [HS1 §2.3.3.5, página impresa 25](https://www.codigotecnico.org/pdf/Documentos/HS/DBHS.pdf#page=25): recogida y evacuación del agua donde el dintel interrumpe la cámara, con condiciones de remonte. [§2.3.3.6, página impresa 26](https://www.codigotecnico.org/pdf/Documentos/HS/DBHS.pdf#page=26): sellado del encuentro, vierteaguas y goterón en carpintería retranqueada; pendiente mínima de 10°, separación del goterón de al menos 20 mm y entrega lateral de al menos 20 mm. No acredita por sí solo el conjunto de prestaciones del montaje.
- **[TRABAJO-FINAL-FACHADA-VENTILADA.pdf](https://wuolah.com/apuntes/construccion-iii/construccion-iii-trabajo-final-fachada-ventilada-pdf-7811286)**, publicado el 25/04/2023, trabajo del curso 2019–20; categoría Construcción III, Arquitectura Técnica UPV. Vista pública **1/1 página**, inspeccionada visualmente y leída mediante su texto accesible el 28/10/2026. La leyenda distingue carpintería, premarco, vidrio, alféizar, subestructura, fijaciones, ventilación e impermeabilización; presenta alzado y cuatro secciones a 1:5. Es un trabajo de estudiantes sobre un caso de Paterna, no una guía oficial ni una aprobación de esta solución.
- **[Esquema-Carpinterias.pdf](https://wuolah.com/apuntes/construccion-iii/esquema-carpinterias-pdf-13764391)**, 16/06/2026, @Pamarfra. Vista pública **1/1 página**: se inspeccionaron los fragmentos visibles de puertas abatibles/correderas y componentes de montaje. Su utilidad es terminológica; no documenta este encuentro de ventana ventilada.
- **[Detalles-y-Replanteo-1r-Parcial.pdf](https://wuolah.com/apuntes/construccion-iii/detalles-replanteo-1-r-parcial-pdf-13870444)**, 30/06/2026, @tecnic_1. El visor anuncia **6/12 páginas** públicas; se inspeccionaron la primera y el comienzo de la siguiente. Se reconocen sección de fachada ventilada, hueco, forjado y componentes de carpintería. La resolución y la escritura impiden adoptar sus cotas con fiabilidad.
- **[1r-Parcial-detalles-pizarra-y-apuntes.pdf](https://wuolah.com/apuntes/construccion-iii/1-r-parcial-detalles-pizarra-apuntes-pdf-13866045)**, 30/06/2026, @tecnic_1. El visor anuncia **5/9 páginas** públicas; se vio la primera, un collage de fotografías. Sus anotaciones finas no se leyeron de forma fiable y no fundamentan dimensiones del ejemplo.

Las consultas de Wuolah anteriores se realizaron el 28/10/2026 por navegación normal, sin iniciar sesión ni superar restricciones. No se han revisado íntegramente los apuntes ni verificado una correspondencia completa con los temarios de Construcción II/III de ETSIE.

## Calidad y límites

La sección de aluminio de 80 mm, cámaras, juntas y rotura térmica son aproximaciones geométricas: **no proceden de un CAD ni de una sección técnica validada de CORTIZO**. La identificación comercial del catálogo no convierte el dibujo en documentación del fabricante. El doble vidrio 4/16/4 es una hipótesis de representación.

El canto del dintel y sus apoyos, el tubo del premarco y la disposición/longitud de anclajes son hipótesis de ejemplo. No se han calculado resistencia, flecha, viento, arrancamiento ni capacidad de la fábrica. Tampoco se han justificado prestaciones térmicas, acústicas, de fuego o de estanqueidad del conjunto, ni compatibilidad/durabilidad de todos los materiales. Las pruebas de contacto comprueban posición, no capacidad resistente.

## QA realizado y límites

Resultados de la versión compilada. Registro completo en [QA-0.5.md](QA-0.5.md).

| Comprobación | Resultado / evidencia |
| --- | --- |
| Ménsulas y tacos: geometría retirada si invaden el hueco, también con centro exterior y extremo dentro | Prueba de mallas reales, correcta |
| Luz de ambos vidrios libre; revisión frontal y oblicua | Rayos y captura `window-complete-3d.png`; sin ménsulas en el vidrio |
| Contactos fábrica → premarco → tres calzos → marco; fijaciones ancladas a soporte real | Pruebas de contacto correctas; capacidad resistente sin calcular |
| Dintel con dos apoyos de 200 mm, sin fábrica superpuesta en su volumen | Pruebas correctas |
| Pendiente real del vierteaguas, goterón y entregas | Pruebas de vértices correctas; bandeja visible en corte y laterales modelados |
| Drenaje de cabezal y salida por rejilla | Corte `window-head-2d.png`, rejilla con pasos y recorte real del panel; sin simulación de agua |
| Sección general, jamba, fijación, apoyo, dintel y alféizar | Sólidos compartidos, pruebas y seis vistas recorridas dos veces |
| Texto y caracteres | Mojibake corregido; alzado inicialmente ilegible, corregido con hoja desplazable |
| Parámetros, transformación, guardado y SVG | 11° regenera y se deshace; transformación de sólidos e importación correctas. Huecos de capas limitados a fachada ortogonal |
| Pruebas de montaje y compilación | 63 pruebas globales correctas; build correcto |
| Interfaz blanca, tarjetas y popup | Comprobación en navegador correcta, incluidos cerrar y reabrir pequeño |

Capturas de procedencia pública: `output/playwright/source-etsie-facade-public-preview.png`, `source-etsie-facade-replanteo-upper.png` y `source-etsie-facade-replanteo-lower.png`. Conservan el contexto del visor y sus límites de lectura.

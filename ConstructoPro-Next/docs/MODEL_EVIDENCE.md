# Model Evidence — fachada ventilada de muestra

## Lectura de las referencias

- Sujeto: encuentro de fachada ventilada con forjado y hueco de ventana, representado como cutaway constructivo.
- Cámara: perspectiva de tres cuartos, eje vertical conservado y equivalente visual aproximado a 35–45 mm.
- Escala reconstruida: paño principal de 4800 × 3200 mm.
- Referencias de composición: imágenes 3 y 4 facilitadas por el usuario. Las imágenes 1 y 2 se usaron para comprobar lenguaje de sección, jerarquía y encuentros. No se copian al producto.

## Inventario de detalle

| Componente | Resolución procedural | Estado |
|---|---|---|
| Forjado superior e inferior | Volumen de hormigón con PBR mineral y canto visible | Forma exterior reconstruida; armado especulativo y no modelado |
| Hoja cerámica | Unidades independientes instanciadas, aparejo, juntas, recortes y perforaciones geométricas | Formato comercial documentado; patrón procedural |
| Regularización | Capa continua extruida y recortada por huecos | Espesor de muestra; receta superficial procedural |
| Aislamiento | Paneles independientes instanciados, juntas, stagger y relieve normal/fibras | Ventirock Duo 1350 × 600 y espesor documentados |
| Membrana | Lámina independiente, transparente, con solape configurable | Posición razonada; microtextura procedural |
| Ménsulas | Piezas L independientes, placas, taladros/tornillos visibles | Profundidad de anclaje y aleación exacta especulativas |
| Perfiles | Canales tridimensionales independientes con longitud comercial/corte | Sección aproximada sin plano de taller específico |
| Fijaciones de aislamiento | Disco y vástago tridimensionales | Longitud comercial; penetración especulativa |
| Cámara ventilada | Vacío geométrico medible entre aislamiento y revestimiento | Valor derivado del modelo, no prescripción normativa |
| Revestimiento | Paneles comerciales no estirados, juntas y cuatro fijaciones modeladas | Rockpanel documentado; clips traseros no visibles especulativos |
| Ventana | Marco, dos hojas, junquillos, vidrio, juntas y manilla como componentes | Dimensión exterior comercial; sección interna aproximada |
| Hueco | Relación anfitrión-hueco y regeneración de todas las capas enlazadas | Paramétrico y sincronizado |
| Jambas, dintel y vierteaguas | Objetos plegados independientes con longitud de corte | Geometría posterior y goterón aproximados |

## Jerarquía y movilidad

- Cada producto colocado es una `SceneEntity` separada.
- Ventana, marco, vidrios y herrajes tienen jerarquía interna; el objeto raíz conserva el pivot de colocación.
- Paños repetitivos mantienen unidades inmutables. Las excepciones de pieza se guardan por clave de fila/columna.
- El hueco conserva referencias explícitas a las capas anfitrionas; moverlo regenera recortes sin añadir automáticamente encuentros.

## Materiales

- Albedo, normal, rugosidad, metalness, transparencia y transmisión se configuran separadamente.
- Las microtexturas se generan en navegador y se escalan por familia física.
- Ladrillos y tejas no se sustituyen por planos en distancia de trabajo. Un LOD lejano conserva volúmenes individuales simplificados para navegación.

## Restaurado con mayor confianza

- Contorno y escala 4,8 × 3,2 m.
- Jerarquía soporte–regularización–aislamiento–membrana–subestructura–cámara–panel.
- Modulación y recorte del revestimiento.
- Ventana y hueco sincronizado.
- Ménsulas, perfiles, discos de fijación, juntas, cortes y remates como objetos separados.

## Especulación razonable

- Armado interior del forjado.
- Profundidad real de cada anclaje.
- Clips ocultos y cara posterior de paneles sin plano de fabricante.
- Secciones internas exactas de perfiles y carpintería cuando la fuente pública no aporta DWG/sección completa.
- Microtextura y variación cromática procedural.
- Goterones, sellos y pliegues no legibles en las referencias.

## Iteraciones visuales

Las capturas de control están en `output/playwright/`: composición inicial, corrección de remates, cutaway, sección 2D, colocación fantasma, edición de pieza y regeneración de ventana. Cada corrección se realizó después de inspeccionar el render en navegador a 1600 × 1000.

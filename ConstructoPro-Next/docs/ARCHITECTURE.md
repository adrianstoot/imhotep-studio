# Arquitectura

```text
ProductDefinition ──> SceneEntity ──> layout.worker ──> InstancedMesh / LOD
        │                    │                              │
        ├── source/evidence  ├── CoverageSpec              ├── viewport 3D
        └── immutable size   └── OpeningSpec               └── sección SVG
                                  │
                                  ├── historial transaccional
                                  ├── IndexedDB
                                  ├── reglas CTE
                                  └── .constructopro / PDF
```

## Decisiones clave

- Todas las dimensiones se almacenan en milímetros; Three.js convierte a metros solo en el borde de render.
- React gobierna documentos e interfaz. El runtime Three.js es imperativo y no recrea el renderer en cada cambio.
- Los layouts repetitivos se calculan fuera del hilo principal mediante Web Worker.
- La superficie cambia de extensión; la unidad comercial nunca cambia de escala salvo recortes geométricos de borde/hueco.
- Cada edición de proyecto es un comando atómico con `past/future`; no se mezclan estados parciales.
- Los datos técnicos sin calidad `documented` quedan fuera de los cálculos.

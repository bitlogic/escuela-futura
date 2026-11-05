# pages/ · la página para leer

La charla **Institución Agéntica** (Innova Educa 21, Córdoba, 5/11/2026) como página estática, para quien la vio o le llega el link: más texto que las láminas, sin la demo en vivo (con capturas de lo que se vio) y con una invitación a conversar que no es una landing de ventas.

- `index.html`, `estilo.css`, `app.js`: la página. Mismo sistema visual que el deck (`presentacion/SISTEMA.md`): navy, lila, teal para la institución y los agentes, magenta para la persona que decide; Outfit y JetBrains Mono.
- **La escuela de fondo** es la escena de la charla (`presentacion/escena/`), en un canvas fijo. Cada bloque con `data-paso-escena='{"id":…,"escena":{…}}'` la mueve cuando llega al centro de la pantalla; `escena` es lo mismo que el `data-escena` de una lámina (el `id` sirve para `SOFIA_K`). Extras de la página: `paso` (los focos de `agente`), `camxAncha` (en pantallas apaisadas, para correr la escuela al costado libre de la tarjeta) y `movil` (lo que cambia en vertical). Con `?sin-escena=1` se ve sin escena; `?plano=1` apaga el HD-2D.
- **`vendor/`** es una copia generada: `node scripts/armar-pages.mjs` (o `npm run pages`) copia la escena, los módulos de `stage/` que usa, los personajes y las fuentes y fotos del deck, y reescribe las rutas `/stage/assets/…` relativas al módulo. Si cambia la escena de la charla, hay que volver a correrlo: `pages/pages.test.mjs` (en `npm test`) falla si la copia quedó vieja.
- `img/`: capturas de la demo (`evaluaciones/2026-11-04-0312-claude-sonnet-5-5/`), la imagen para compartir y el ícono.

Para verla en local, cualquier servidor estático desde la raíz del repo: `python3 -m http.server 8123` y abrir `http://localhost:8123/pages/`.

Se publica en GitHub Pages con `.github/workflows/pages.yml` en cada push a `main` que toque `pages/` o la escena (en el repo: Settings → Pages → Source: GitHub Actions). El repo es privado: Pages en un repo privado necesita un plan de GitHub que lo permita, y el sitio publicado es público igual.

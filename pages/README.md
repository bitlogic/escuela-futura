# pages/ · la página para leer

La charla **Institución Agéntica** (Innova Educa 21, Córdoba, 5/11/2026) como nota editorial, publicada en https://escuelafutura.ai. Es para quien vio la charla o le llega el link: más texto que las láminas, sin la demo en vivo (con capturas de lo que se vio) y con una invitación a conversar que no es una landing de ventas.

- **Estática y sin JavaScript:** `index.html` y `estilo.css`. Sin animaciones (5/11: la primera versión, con la escena de la charla moviéndose detrás de cada bloque, se reemplazó por esta, más editorial y más corta: unas 10 pantallas en escritorio). Un test (`pages.test.mjs`, en `npm test`) lo cuida: que no haya `<script>` ni `@keyframes`, que exista todo lo que pide la página y que cada imagen tenga texto alternativo.
- **Estructura:** apertura (volanta, título, bajada, firma y foto), la tesis en una banda, el índice y cinco capítulos con el título a la izquierda y el texto a la derecha (I Una sola carrera, II Pocas decidieron cómo, III De preguntar a delegar, IV Escuela Futura, V Delegar con criterio), una coda con el cierre y "Conversemos".
- **Sistema visual:** la paleta del deck (`presentacion/SISTEMA.md`) en su versión clara, con la oscura si el sistema la pide; Outfit y JetBrains Mono (`assets/`, copias de `presentacion/assets/`).
- **`img/`:** cuatro fotos fijas de la escena de perfil (`escena-*.jpg`, sacadas de la escena de la charla), tres capturas de la demo (`demo-*.jpg`, de `evaluaciones/2026-11-04-0312-claude-sonnet-5-5/`), la imagen para compartir y el ícono.

Para verla en local: `python3 -m http.server 8123` desde la raíz del repo y abrir `http://localhost:8123/pages/`.

Se publica con `.github/workflows/pages.yml` en cada push a `main` que toque `pages/` (Pages con origen "GitHub Actions" y dominio `escuelafutura.ai`).

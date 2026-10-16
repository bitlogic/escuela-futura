---
name: Escuela Futura (stage)
description: La escuela desde arriba, de noche: pixel-art oscuro con pocas luces cálidas, legible desde la última fila.
colors:
  fuera: "#0b0b12"
  panel: "#10101b"
  linea: "#2c2f48"
  campo-escena: "#14141f"
  tinta: "#1a1a2e"
  papel: "#f4efe2"
  naranja-persona: "#ff7a3d"
  azul-decision: "#3e6be8"
  verde-vivo: "#5fae6a"
  gris-estado: "#8f93b0"
  gris-apagado: "#6b6f8a"
  campo-input: "#1b1b2b"
  pared: "#3b3f55"
  madera: "#c79a63"
  acento-coordinacion: "#5b7fe0"
  acento-tutor: "#d6a82b"
  acento-advisor: "#2b9a8a"
  acento-admisiones: "#a8861f"
  acento-bienestar: "#a8527f"
  acento-academia: "#3f9a52"
typography:
  etiqueta:
    fontFamily: "Silkscreen, Press Start 2P, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "21px"
    fontWeight: 700
    letterSpacing: "0.08em"
  titulo-canal:
    fontFamily: "Silkscreen, Press Start 2P, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "32px"
    fontWeight: 700
    letterSpacing: "0.04em"
  cuerpo:
    fontFamily: "Plain, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 600
    lineHeight: 1.36
  globo:
    fontFamily: "Plain, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "25px"
    fontWeight: 700
    lineHeight: 1.3
  decision:
    fontFamily: "Plain, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, Arial, sans-serif"
    fontSize: "36px"
    fontWeight: 700
    lineHeight: 1.25
rounded:
  none: "0px"
  pixel: "4px"
spacing:
  xs: "4px"
  sm: "12px"
  md: "18px"
  lg: "28px"
components:
  globo:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    typography: "{typography.globo}"
    rounded: "{rounded.pixel}"
    padding: "12px 16px"
  globo-decision:
    backgroundColor: "{colors.azul-decision}"
    textColor: "{colors.papel}"
    typography: "{typography.decision}"
    rounded: "{rounded.pixel}"
    padding: "18px 24px"
  tag-agente:
    backgroundColor: "{colors.tinta}"
    textColor: "{colors.papel}"
    typography: "{typography.etiqueta}"
    padding: "4px 10px"
  tag-persona:
    backgroundColor: "{colors.naranja-persona}"
    textColor: "{colors.tinta}"
    typography: "{typography.etiqueta}"
    padding: "4px 10px"
  cartel-espera:
    backgroundColor: "{colors.papel}"
    textColor: "{colors.tinta}"
    padding: "8px 16px"
  campo-texto:
    backgroundColor: "{colors.campo-input}"
    textColor: "{colors.papel}"
    typography: "{typography.cuerpo}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  campo-texto-foco:
    backgroundColor: "{colors.campo-input}"
    textColor: "{colors.papel}"
---

# Design System: Escuela Futura (stage)

## 1. Overview

**Creative North Star: "El aula iluminada"**

Un salón visto desde arriba, de noche. Casi todo es oscuro y quieto; las pocas luces cálidas marcan dónde hay trabajo y quién decide. La vista sostiene entre 5 y 30 minutos de charla frente a un auditorio, así que prefiere la calma al espectáculo: el movimiento siempre es actividad real de un agente, nunca decoración.

La persona es el centro. Los agentes caminan, proponen y hablan en globos claros; cuando una persona decide, la escuela se atenúa y esa persona queda en foco, con una burbuja azul grande. Todo se lee desde la última fila: texto de 21 px como mínimo, contraste alto, sin parpadeos que cansen.

Este sistema rechaza, por nombre: que el pixel-art lo vuelva infantil o gamer, el texto chico, y el look de dashboard SaaS (paneles, métricas, tarjetas genéricas). El pixel aparece en esquinas, bordes y mapa; el texto de lectura va en sans.

**Key Characteristics:**
- Oscuro por escena (proyector en auditorio), con papel crema como única superficie clara.
- Pixel-art como textura y estructura (esquinas recortadas de 4 px), no como disfraz.
- Dos tipografías con roles estrictos: mono pixel para etiquetas, sans para todo lo que se lee.
- Color como identidad de rol: naranja para la persona, un acento propio por agente.
- Movimiento escalonado (`steps()`), apagable con reduced-motion.

## 2. Colors

Una noche azul-violeta con papel crema y un naranja cálido reservado a la persona.

### Primary
- **Naranja Persona** (#ff7a3d): lo humano. Etiqueta de la persona, `#` del canal, cursor de foco del campo de texto, indicador de "trabajando". Nunca se usa para un agente.
- **Azul Decisión** (#3e6be8): el pico de la escena. Solo el globo de decisión humana y el marcador del cartel de espera.

### Secondary
- **Verde Vivo** (#5fae6a): conexión en vivo (indicador del encabezado) y botón activo de la barra.

### Tertiary (acentos de agente, usados en mesa, avatar y nombre del chat)
- **Coordinación** (#5b7fe0), **Tutor** (#d6a82b), **Advisor** (#2b9a8a), **Admisiones** (#a8861f), **Bienestar** (#a8527f), **Academia** (#3f9a52). Cada acento identifica un rol y siempre va acompañado de nombre o iniciales.

### Neutral
- **Noche Exterior** (#0b0b12): fondo del escenario completo.
- **Panel Nocturno** (#10101b): chat. **Campo de Escena** (#14141f): fondo detrás del plano de la escuela.
- **Línea de Panel** (#2c2f48): bordes de 4 px y botones apagados.
- **Tinta** (#1a1a2e): texto sobre papel y marco de globos.
- **Papel Crema** (#f4efe2): globos, texto principal, velo de foco.
- **Gris Estado** (#8f93b0) y **Gris Apagado** (#6b6f8a): estados secundarios y marcas de tiempo.
- **Pared** (#3b3f55) y **Madera** (#c79a63): materia del plano pixel-art.

### Named Rules
**The Una Persona, Un Naranja Rule.** El naranja es de la persona que decide. Si aparece sobre un agente, el relato se rompe.
**The No Solo Color Rule.** Ningún agente ni estado se distingue solo por tono: siempre hay nombre, iniciales o forma.
**The Papel No Es Blanco Rule.** Prohibido `#fff` y `#000` en superficies; la luz clara es papel crema, la sombra es noche azulada.

## 3. Typography

**Display/Label Font:** Silkscreen (con Press Start 2P y monoespaciada del sistema como fallback)
**Body Font:** Plain (fuente del brand kit, local, no se sube al repo) con sans del sistema como fallback

**Character:** el mono pixel pone la marca de la escuela; la sans pone la claridad. Nunca al revés: un párrafo en pixel-font es ilegible a distancia.

### Hierarchy
- **Título de canal** (700, 32px, tracking 0.04em): `#coordinacion` en el encabezado del chat.
- **Etiqueta** (700, 21px, tracking 0.08em, mayúsculas): nombres de agente en el chat y tags sobre los personajes.
- **Cuerpo** (600, 25px, 1.36): mensajes del canal y texto del campo de entrada; máximo 9 líneas visibles.
- **Globo** (700, 25px, 1.3): lo que dicen los agentes sobre el plano; máximo 4 líneas, el texto completo vive en el chat.
- **Decisión** (700, 36px, 1.25): el globo de la persona al decidir; máximo 5 líneas.
- **Estado** (700, 16 a 17px, tracking 0.1em, mayúsculas): solo metadatos secundarios (hora, estado de conexión). Es el mínimo; nada de lectura va por debajo.

### Named Rules
**The Sans Para Leer Rule.** Todo texto de más de tres palabras va en sans. El mono pixel es para nombres, rótulos y estados.
**The Última Fila Rule.** Si un texto no se lee en un proyector desde el fondo del auditorio, se agranda o se saca.

## 4. Elevation

Plano. No hay sombras en ningún lado. La profundidad se logra con tres recursos: bordes sólidos de 4 px (`#2c2f48`) entre zonas, marco de tinta de 4 px alrededor de los globos, y el velo de foco, un `radial-gradient` de papel al 82% que atenúa la escuela entera menos a la persona que decide.

### Named Rules
**The Plano Salvo Decisión Rule.** Las superficies son planas siempre. El único "levantamiento" es el velo de foco, y solo ocurre durante una decisión humana.
**The Esquina De Pixel Rule.** Globos y paneles flotantes usan el recorte escalonado de 4 px (`clip-path`), nunca `border-radius` ni `box-shadow`.

## 5. Components

### Globo de agente
- **Shape:** esquinas recortadas de 4 px, marco de tinta de 4 px, colita de pixel hacia el personaje.
- **Color:** papel crema (#f4efe2) con texto tinta (#1a1a2e), 25px bold sans.
- **Behavior:** aparece con `steps(3)` en 180 ms; ancho máximo 380 px.

### Globo de decisión
- **Shape:** igual que el globo de agente, pero hasta 620 px de ancho.
- **Color:** azul decisión (#3e6be8) con texto papel, 36px. Es el elemento más grande y saturado de toda la escena, a propósito.

### Tag de personaje
- **Style:** rótulo en mono mayúsculas 15px escalados, sobre tinta con texto papel. El tag de la persona se invierte: fondo naranja, texto tinta.
- **State:** durante el foco de decisión los tags de agentes bajan a 40% de opacidad.

### Cartel de espera
- **Style:** papel crema con texto tinta (26px bold) y un cuadrado azul que respira (2.2 s); aparece junto a la persona mientras la propuesta espera.

### Mensaje del chat
- **Layout:** avatar cuadrado de 56 px con iniciales sobre el color del agente, nombre en etiqueta con el mismo color, cuerpo en papel crema.
- **Behavior:** entra con `steps(6)` en 400 ms desde 18 px abajo. Las menciones (`.a`) van en durazno claro (#ffb48a).

### Campo de texto
- **Style:** fondo #1b1b2b, borde de 3 px `#2c2f48`, sin radio, 26px sans.
- **Focus:** el borde pasa a naranja. Deshabilitado: 50% de opacidad.

### Barra de controles
- **Style:** tinta con botones de #2c2f48; el activo toma verde vivo con texto tinta. Aparece solo al mover el mouse, nunca durante la charla.

### Plano de la escuela (signature)
Canvas pixel-art con cuatro salas (Dirección y Coord., Secretaría y Admis., Aula Biología 1, Bienestar y Biblioteca), cada una con un piso de tono propio y una mesa del color del agente. Es la pieza principal: todo lo demás la acompaña.

## 6. Do's and Don'ts

### Do:
- **Do** reservar el naranja (#ff7a3d) para la persona y el azul (#3e6be8) para el momento de decisión.
- **Do** mantener todo texto de lectura en sans a 21 px o más; las marcas de estado de 16 a 17 px son el piso.
- **Do** acompañar cada color de agente con nombre o iniciales.
- **Do** animar con `steps()` y respetar `prefers-reduced-motion` (hoy desactiva globos, mensajes, velo y el cuadrado que respira).
- **Do** hacer que el movimiento refleje actividad real de los agentes.
- **Do** tintar los neutros hacia el azul-violeta de la noche (#0b0b12, #10101b).

### Don't:
- **Don't** dejar que el pixel-art lo vuelva infantil o gamer y le reste seriedad a la tesis: nada de monedas, barras de vida ni sprites decorativos.
- **Don't** usar texto chico: tiene que leerse desde el fondo de un auditorio.
- **Don't** caer en el look de dashboard SaaS: sin paneles de métricas, tarjetas genéricas ni grillas de tarjetas idénticas.
- **Don't** usar sombras, `border-radius` ni glassmorphism; la elevación es plana.
- **Don't** usar `#000` ni `#fff`.
- **Don't** usar `border-left` o `border-right` mayor a 1 px como acento de color.
- **Don't** distinguir agentes o estados solo por color.
- **Don't** mostrar controles en pantalla durante la charla.

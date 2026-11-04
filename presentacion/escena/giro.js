// El giro: de la escuela de perfil a la escuela desde arriba (la app) y la vuelta. Ver CONTRATO.md §4 (giro.js).
//
// RELLENO (oleada 0): un fundido de 450 ms (lo que hace la app hoy). El agente "giro" de la oleada 1 pone el giro
// real (perspective + rotateX sobre el canvas de la escena, scaleY sobre la capa de la demo, 900 ms, una sola curva)
// y deja el fundido como respaldo para prefers-reduced-motion y ?plano=1, manteniendo esta firma:
//   crearGiro({ canvasEscena, capaDemo, duracion }) → { aCenital() → Promise, aPerfil() → Promise, enCurso }

export function crearGiro({ canvasEscena, capaDemo, duracion = 900, simple = false } = {}) {
  void canvasEscena; void duracion; void simple;
  const g = { enCurso: false };
  const espera = (ms) => new Promise((ok) => setTimeout(ok, ms));
  async function fundir(si) {
    g.enCurso = true;
    capaDemo.classList.toggle('visible', si);
    await espera(450);
    g.enCurso = false;
  }
  return { aCenital: () => fundir(true), aPerfil: () => fundir(false), get enCurso() { return g.enCurso; } };
}

// El sonido de la charla: seis señales sintetizadas con WebAudio, sin archivos. Ver CONTRATO.md §4 (sonido.js).
// Nada suena sin un gesto previo del operador (habilitar() desde la primera tecla) ni con silenciar(true).
//
// RELLENO (oleada 0): la interfaz, las duraciones y el silencio; las señales no suenan. El agente "sonido" de la
// oleada 1 las sintetiza manteniendo esta firma:
//   crearSonido() → { timbre(), luces(), motivo(sube), giro(), tic(), campana(), silenciar(si), activo, habilitar() }

/** Duración de cada señal en segundos (el test exige que, con lo que suena en la charla, sumen 45 s o menos). */
export const DURACIONES = { timbre: 1.2, luces: 2, motivo: 1, giro: .9, tic: .05, campana: 1.4 };
/** Cuántas veces suena cada una en una charla: el timbre una, las luces una, el motivo tres, el giro dos, el tic por cada cambio de plano (unos 14), la campana una. */
export const VECES = { timbre: 1, luces: 1, motivo: 3, giro: 2, tic: 14, campana: 1 };
export const TOTAL_SEGUNDOS = Object.entries(DURACIONES).reduce((t, [k, d]) => t + d * VECES[k], 0);

export function crearSonido() {
  const s = { activo: true, habilitado: false };
  const nada = () => {};
  return {
    timbre: nada, luces: nada, motivo: nada, giro: nada, tic: nada, campana: nada,
    silenciar(si) { s.activo = !si; return s.activo; },
    habilitar() { s.habilitado = true; },
    get activo() { return s.activo; },
    get habilitado() { return s.habilitado; },
  };
}

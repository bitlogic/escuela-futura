// Qué hace cada tecla de la presentación (fuera de la demo). Una función pura, para que el despacho se pueda testear:
// la misma tabla con escena y sin escena, salvo `m`, que solo existe con escena.
export const ACCIONES = {
  ArrowRight: 'siguiente', PageDown: 'siguiente', ' ': 'siguiente', Enter: 'siguiente',
  ArrowLeft: 'anterior', PageUp: 'anterior', Backspace: 'anterior',
  Home: 'inicio', End: 'fin', d: 'demo', n: 'presentador', f: 'pantalla', t: 'reloj', '?': 'ayuda', h: 'ayuda', m: 'silencio',
};
/** La acción de una tecla, o null. `conEscena`: hay escena (y por lo tanto sonido). */
export function accionDeTecla(k, { conEscena = false } = {}) {
  const a = ACCIONES[k] || null;
  if (a === 'silencio' && !conEscena) return null;
  return a;
}

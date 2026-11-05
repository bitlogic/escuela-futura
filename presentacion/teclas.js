// Qué hace cada tecla de la presentación (fuera de la demo). Una función pura, para que el despacho se pueda testear:
// la misma tabla con escena y sin escena, salvo `p`, que solo existe con escena.
export const ACCIONES = {
  ArrowRight: 'siguiente', PageDown: 'siguiente', ' ': 'siguiente', Enter: 'siguiente',
  ArrowLeft: 'anterior', PageUp: 'anterior', Backspace: 'anterior',
  Home: 'inicio', End: 'fin', d: 'demo', n: 'presentador', f: 'pantalla', t: 'reloj', '?': 'ayuda', h: 'ayuda', p: 'hd', m: 'musica',
};
/** La acción de una tecla, o null. `conEscena`: hay escena (y por lo tanto HD-2D que apagar). */
export function accionDeTecla(k, { conEscena = false } = {}) {
  const a = ACCIONES[k] || null;
  if (a === 'hd' && !conEscena) return null;   // p solo existe con escena
  return a;
}

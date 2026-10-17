// Resuelve las @menciones de un mensaje a ids de agentes o a la persona. Sin tildes ni mayúsculas.

export const sinTildes = (t) => String(t || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim();

/**
 * @param {object} o
 * @param {Array<{id: string, nombre: string}>} o.agentes
 * @param {{id: string, nombre: string, alias?: string[]}} o.persona  quien mira la pantalla (Dirección)
 */
export function crearResolutor({ agentes, persona }) {
  const porNombre = new Map();
  for (const a of agentes) { porNombre.set(sinTildes(a.nombre), a.id); porNombre.set(sinTildes(a.id), a.id); }
  for (const n of [persona.nombre, ...(persona.alias || [])]) porNombre.set(sinTildes(n), persona.id);
  const todos = agentes.map((a) => a.id);
  const nombres = [...agentes.map((a) => a.nombre), persona.nombre, 'todos'];

  /**
   * @param {string} texto         el mensaje
   * @param {object} o
   * @param {string} [o.de]         quien escribe (nunca se menciona a sí mismo)
   * @param {string[]} [o.explicitos]  destinatarios pedidos aparte (nombres o ids)
   * @param {string[]} [o.porDefecto]  si no hay ninguna mención válida
   * @returns {{a: string[], invalidas: string[]}}
   */
  return function resolver(texto, { de, explicitos = [], porDefecto = [] } = {}) {
    const a = new Set(), invalidas = [];
    const agregar = (crudo) => {
      const n = sinTildes(crudo);
      if (n === 'todos' || n === 'equipo') { todos.forEach((id) => a.add(id)); return; }
      const id = porNombre.get(n) || porNombre.get(n.split(' ')[0]);
      if (id) a.add(id); else invalidas.push(crudo);
    };
    for (const m of String(texto || '').matchAll(/@([\p{L}]+(?: [\p{Lu}][\p{L}]+)?)/gu)) agregar(m[1]);
    for (const e of explicitos) agregar(e);
    a.delete(de);
    if (!a.size) porDefecto.filter((x) => x !== de).forEach((x) => a.add(x));
    return { a: [...a], invalidas, nombres };
  };
}

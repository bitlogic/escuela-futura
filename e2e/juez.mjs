// El juez: un modelo Claude lee el transcript y mira las capturas de la vista, y puntúa con una rúbrica cuánto se
// entiende la tesis de la charla ("no se puede formar personas para trabajar con agentes desde una institución que
// no trabaja con agentes") viendo esta demo. Devuelve JSON. Sin I/O de archivos: recibe el cliente y los datos.

export const RUBRICA = [
  { clave: 'objetivo_no_pregunta', titulo: 'Queda claro que la persona dio un objetivo, no una pregunta, y que Coordinación lo tomó como tal' },
  { clave: 'reparto_visible', titulo: 'Se ve que el trabajo se reparte y que varios agentes trabajan a la vez' },
  { clave: 'avisos_entre_agentes', titulo: 'Se ve que un agente le avisa algo a otro sin que se lo pidan y que eso cambia el análisis' },
  { clave: 'propuesta_decidible', titulo: 'La propuesta se entiende en una pantalla: un caso, la evidencia con quién la vio, acciones concretas con quién las hace, y lo que no se sabe' },
  { clave: 'persona_decide', titulo: 'Queda claro que una persona decide, que se reserva el vínculo (la llamada) y que lo aprobado lo hacen personas' },
  { clave: 'agente_dice_no', titulo: 'Cuando se le pide algo con consecuencias, el agente dice que no y propone cómo y quién firma' },
  { clave: 'dice_lo_que_no_sabe', titulo: 'Cuando se le pregunta por qué, el agente da los datos y dice lo que no sabe sin inventar motivos' },
  { clave: 'hilo_claro', titulo: 'Se sigue un solo hilo (Martina) sin perderse; se entiende en cada momento qué se pidió, en qué están y si se cumplió' },
  { clave: 'legible_auditorio', titulo: 'En las capturas, el chat y el mapa se leen desde el fondo de un auditorio: texto grande, poco ruido, el momento de la decisión es el pico visual' },
  { clave: 'no_guionado', titulo: 'No parece guionado ni un teatro: los agentes hablan distinto entre sí, con datos, y lo que pasa se ve ocurrir' },
  { clave: 'tablero_personas', titulo: 'En el Tablero se entiende que lo aprobado quedó como tareas en manos de personas (con responsable), y que ningún agente cerró nada' },
  { clave: 'datos_verificados', titulo: 'Se ve que las cifras están comprobadas contra la fuente por código (los tilde y el chip "✓ N datos"); que no haya ninguna sin comprobar es lo deseable, no un defecto' },
  { clave: 'alcance_y_objecion', titulo: 'El equipo se amplía solo cuando los datos lo piden (una cuarta disciplina entra sin que la convoquen) y la propuesta trae su propia objeción ("Riesgo de equivocarnos")' },
  { clave: 'redisena_proceso', titulo: 'Cuando se le pide que esto no dependa de que lo pidan, el equipo propone cambiar el proceso de la institución (una rutina con responsables personas, para decidir), no solo resolver el caso' },
];

export function armarPrompt({ transcript, capturas }) {
  return `Sos el jurado de una demo en vivo que se va a dar frente a un auditorio de docentes y directivos de educación superior (Innova Educa 21, Córdoba). La demo muestra "Escuela Futura", una escuela ficticia donde seis agentes de IA trabajan junto a una persona que decide. La tesis de la charla es: "No se puede formar personas para trabajar con agentes desde una institución que no trabaja con agentes." Lo que la demo tiene que dejar claro: los agentes se reparten el trabajo, se avisan entre ellos, proponen y esperan; una persona decide y se reserva el vínculo; cuando se les pide hacer algo con consecuencias, dicen que no; y cuando se les pregunta por qué, dicen lo que saben y lo que no.

Te doy el transcript completo del canal (con los tiempos y las herramientas que usó cada agente) y ${capturas.length} captura(s) de la pantalla que vio el auditorio en los momentos clave, en orden: ${capturas.map((c) => c.nombre).join(', ')}.

Dos cosas que son por diseño y no cuentan como defecto: la demo sigue un solo hilo (una sola estudiante en riesgo, las otras 23 vienen bien) porque en seis minutos no entra más de un caso; y la decisión se toma en un panel grande sobre el mapa de la escuela, que después queda en el Tablero como tareas con responsable. Sí contá como defecto que las voces suenen a plantilla o que un texto parezca pegado de un prompt.

Tres cosas más que la demo quiere mostrar: (a) un verificador por código, no por modelo, cruza cada cifra y fecha de los agentes con los datos de sus herramientas; en el transcript cada mensaje trae "[datos: N con fuente; sin comprobar: …]" y en pantalla las cifras comprobadas llevan un tilde y las dudosas una marca; (b) el equipo crece cuando un dato lo pide (Advisor le pregunta a Admisiones qué dijo la estudiante al ingresar, y eso entra en la propuesta) y la propuesta incluye su propia objeción ("Riesgo de equivocarnos"); (c) al final la persona pide que esto no dependa de que lo pida, y Coordinación propone rediseñar el proceso (una rutina antes de cada parcial, con responsables personas) que también se decide en el panel y queda en el Tablero.

Puntuá cada criterio de 1 (no se ve) a 5 (clarísimo), con una justificación de una o dos frases que cite el transcript o la captura. Sé exigente: un 5 es "un director que nunca vio agentes lo entiende desde la última fila". Después, un veredicto.

Criterios:
${RUBRICA.map((r, i) => `${i + 1}. ${r.clave}: ${r.titulo}`).join('\n')}

Entregá el veredicto llamando a la herramienta "veredicto" (un puntaje y un por_que por criterio, el veredicto lista|casi|no, lo_mejor, lo_peor y hasta tres sugerencias concretas en orden de impacto).

TRANSCRIPT:
${transcript}`;
}

/**
 * @param {object} o
 * @param {object} o.cliente   Anthropic client (cliente.messages.create)
 * @param {string} o.modelo
 * @param {string} o.transcript
 * @param {Array<{nombre: string, png: Buffer}>} o.capturas
 */
export const HERRAMIENTA_VEREDICTO = {
  name: 'veredicto',
  description: 'Entregá el veredicto del jurado con esta herramienta (es la única forma válida de responder).',
  input_schema: {
    type: 'object', additionalProperties: false,
    properties: {
      criterios: { type: 'array', items: { type: 'object', additionalProperties: false, properties: { clave: { type: 'string', enum: RUBRICA.map((r) => r.clave) }, puntaje: { type: 'integer', minimum: 1, maximum: 5 }, por_que: { type: 'string' } }, required: ['clave', 'puntaje', 'por_que'] } },
      veredicto: { type: 'string', enum: ['lista', 'casi', 'no'] },
      lo_mejor: { type: 'string' }, lo_peor: { type: 'string' },
      sugerencias: { type: 'array', items: { type: 'string' }, maxItems: 3 },
    },
    required: ['criterios', 'veredicto', 'lo_mejor', 'lo_peor', 'sugerencias'],
  },
};

export async function juzgar({ cliente, modelo, transcript, capturas = [] }) {
  const content = [{ type: 'text', text: armarPrompt({ transcript, capturas }) }];
  for (const c of capturas) {
    content.push({ type: 'text', text: `Captura: ${c.nombre}` });
    content.push({ type: 'image', source: { type: 'base64', media_type: 'image/png', data: Buffer.from(c.png).toString('base64') } });
  }
  // El veredicto viene como tool_use (JSON válido por esquema); si el modelo contesta en texto, se interpreta igual.
  // Opus 5.5 piensa siempre y el pensamiento entra en max_tokens: con poco tope el tool_use llega vacío.
  const resp = await cliente.messages.create({ model: modelo, max_tokens: 12000, tools: [HERRAMIENTA_VEREDICTO], messages: [{ role: 'user', content }] });
  const uso = resp.content.find((b) => b.type === 'tool_use' && b.name === 'veredicto' && b.input && Object.keys(b.input).length);
  const texto = resp.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
  if (!uso && !/\{[\s\S]*\}/.test(texto)) throw new Error(`el juez no entregó veredicto (stop_reason: ${resp.stop_reason})`);
  const r = uso ? interpretar(JSON.stringify(uso.input)) : interpretar(texto);
  return { ...r, crudo: (uso ? JSON.stringify(uso.input, null, 2) : texto) + `\n\n// stop_reason: ${resp.stop_reason} · tokens: ${JSON.stringify(resp.usage)}` };
}

/** Saca el JSON de la respuesta (con o sin ```), lo valida y calcula el total 0-100. */
export function interpretar(texto) {
  const m = String(texto).match(/\{[\s\S]*\}/); if (!m) throw new Error('El juez no devolvió JSON: ' + String(texto).slice(0, 200));
  const j = JSON.parse(m[0]);
  const criterios = RUBRICA.map((r) => { const c = (j.criterios || []).find((x) => x.clave === r.clave) || {}; const p = Math.max(1, Math.min(5, Number(c.puntaje) || 1)); return { clave: r.clave, titulo: r.titulo, puntaje: p, por_que: String(c.por_que || '') }; });
  const total = Math.round(100 * criterios.reduce((a, c) => a + (c.puntaje - 1) / 4, 0) / criterios.length);
  return { total, criterios, veredicto: ['lista', 'casi', 'no'].includes(j.veredicto) ? j.veredicto : 'casi', lo_mejor: String(j.lo_mejor || ''), lo_peor: String(j.lo_peor || ''), sugerencias: Array.isArray(j.sugerencias) ? j.sugerencias.map(String).slice(0, 3) : [] };
}

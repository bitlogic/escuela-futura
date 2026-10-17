// Las herramientas de la escuela vistas desde el plano: a qué sala va un agente cuando usa cada una
// y qué dice el globo mientras tanto. Lo usan la vista (index.html) y el servidor (servidor/), así los
// eventos en vivo tienen exactamente la forma de las corridas grabadas (stage/corridas/*.eventos.json).

export const HERRAMIENTA_LUGAR = {
  buscar_estudiantes: 'coordinacion',
  ver_programa: 'biblioteca',
  ver_asistencia: 'aula-bio1',
  ver_actividad_campus: 'aula-bio1',
  ver_alertas_previas: 'bienestar',
  ver_uso_tutor: 'aula-bio1',
  ver_notas: 'aula-bio1',
  ver_situacion_administrativa: 'secretaria',
  ver_ingresantes: 'admisiones',
  ver_aspirantes: 'admisiones',
  ver_oferta_academica: 'academia',
  ver_demanda_formativa: 'academia',
  proponer_tarea: null,     // las del Tablero no mueven al personaje
  revisar_tarea: null,
};

export const HERRAMIENTA_TEXTO = {
  buscar_estudiantes: 'Busco la lista del curso',
  ver_programa: 'Reviso el programa de la materia',
  ver_asistencia: 'Reviso la asistencia',
  ver_actividad_campus: 'Reviso la actividad en el campus',
  ver_alertas_previas: 'Reviso alertas anteriores',
  ver_uso_tutor: 'Reviso las consultas al tutor',
  ver_notas: 'Reviso las notas',
  ver_situacion_administrativa: 'Reviso inscripciones y pagos',
  ver_ingresantes: 'Reviso cómo ingresó',
  ver_aspirantes: 'Reviso los aspirantes',
  ver_oferta_academica: 'Reviso la oferta académica',
  ver_demanda_formativa: 'Reviso qué se está pidiendo',
  proponer_tarea: 'Anoto una acción en el Tablero',
  revisar_tarea: 'Reviso una acción del Tablero',
};

/** Los cursos por id, para que el globo diga "Biología 1" aunque el agente haya pasado "bio1". */
const CURSOS = { bio1: 'Biología 1' };
/** De quién es la consulta, para el globo: "Martina", "e01 y e03", "24 estudiantes" o "Biología 1". */
export function argHerramienta(input) {
  if (!input) return '';
  const lista = Array.isArray(input.estudiantes) ? input.estudiantes : typeof input.estudiantes === 'string' ? input.estudiantes.split(',').map((s) => s.trim()).filter(Boolean) : null;
  if (lista && lista.length) return lista.length <= 2 ? lista.join(' y ') : `${lista.length} estudiantes`;
  if (input.estudiante) return String(input.estudiante);
  if (input.curso) return CURSOS[String(input.curso).toLowerCase().trim()] || String(input.curso);
  return '';
}
/** Texto del globo de una herramienta con sus argumentos. */
export const textoHerramienta = (nombre, input) => { if (nombre === 'proponer_tarea' || nombre === 'revisar_tarea') return HERRAMIENTA_TEXTO[nombre] + (input && input.accion ? ': ' + input.accion : ''); const a = argHerramienta(input); return (HERRAMIENTA_TEXTO[nombre] || nombre) + (a ? ' de ' + a : ''); };

/** Completa un evento `herramienta` que venga sin `lugar` o `texto` (p. ej. de una corrida vieja). */
export function completarHerramienta(ev) {
  const h = ev.herramienta || '';
  const arg = ev.arg ? ' de ' + ev.arg : '';
  const texto = (ev.texto || (HERRAMIENTA_TEXTO[h] || h) + arg).replace(/ de (\S+)$/, (m, id) => ' de ' + (CURSOS[id.toLowerCase()] || id));   // las corridas grabadas traen "de bio1"
  return { ...ev, lugar: ev.lugar !== undefined ? ev.lugar : HERRAMIENTA_LUGAR[h] || null, texto };
}

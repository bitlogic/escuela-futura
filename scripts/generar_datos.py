"""Genera data/escuela-futura.json: datos sintéticos de Escuela Futura.

Uso: python3 scripts/generar_datos.py
Todo es ficticio. El caso de la demo (Martina R.) está escrito a mano; el resto
del curso (23 estudiantes que vienen bien) se genera con una semilla fija para que el archivo sea reproducible.
"""
import json, random
from datetime import date, timedelta
from pathlib import Path

random.seed(2026)
HOY = date(2026, 10, 30)  # "hoy" dentro de la ficción: unos días antes del parcial
PARCIAL = date(2026, 11, 3)
SEMANAS = [date(2026, 8, 3) + timedelta(weeks=i) for i in range(13)]  # 3/8 al 26/10

TEMAS = [
    "Célula y organelas", "Membrana y transporte", "Metabolismo energético",
    "Genética mendeliana: cruzamientos", "Herencia ligada al sexo", "ADN y replicación",
]
TEMAS_PARCIAL = TEMAS[3:6]

def semanas_asistencia(patron):
    """patron: lista de 13 tuplas (presentes, clases)."""
    return [{"semana": s.isoformat(), "presentes": p, "clases": c} for s, (p, c) in zip(SEMANAS, patron)]

def normal_asistencia(base):
    out = []
    for _ in SEMANAS:
        out.append((2 if random.random() < base else 1, 2))
    return out

def resumen_asistencia(semanas):
    pres = sum(s["presentes"] for s in semanas)
    tot = sum(s["clases"] for s in semanas)
    ult = semanas[-5:]
    ult_p = sum(s["presentes"] for s in ult)
    ult_t = sum(s["clases"] for s in ult)
    return {"presentes": pres, "clases": tot, "porcentaje": round(100 * pres / tot),
            "ultimas_5_semanas": {"presentes": ult_p, "clases": ult_t}}

def estudiante(id_, nombre, **k):
    sem = semanas_asistencia(k.pop("semanas"))
    e = {"id": id_, "nombre": nombre, "curso": "bio1", "anio": 1,
         "asistencia": {"resumen": resumen_asistencia(sem), "semanas": sem}}
    e.update(k)
    return e

casos = []

# 1. Martina R.: venía siempre; desde el 18/8 deja de venir. Deuda desde agosto que bloquea el parcial.
sem_m = [(2, 2), (2, 2), (1, 2), (1, 2), (0, 2), (1, 2), (0, 2), (0, 2), (1, 2), (0, 2), (0, 2), (1, 2), (0, 2)]
casos.append(estudiante(
    "e01", "Martina R.", semanas=sem_m,
    asistencia_nota="Hasta el 17/8 asistió a todas las clases. Desde el 18/8 faltó a la mayoría.",
    campus={"ultimo_ingreso": "2026-10-14", "ingresos_ultimos_30_dias": 3, "entregas_pendientes": 2},
    alertas_previas=[],
    tutor={"consultas": [
        {"tema": TEMAS[3], "consultas": 14, "ejercicios_resueltos": 3, "ejercicios_totales": 10},
        {"tema": TEMAS[1], "consultas": 2, "ejercicios_resueltos": 4, "ejercicios_totales": 4}],
        "ultima_consulta": "2026-10-12"},
    notas=[{"evaluacion": "TP 1", "fecha": "2026-08-28", "nota": 7},
           {"evaluacion": "Parcial 1", "fecha": "2026-09-22", "nota": 5.5}],
    administrativo={"inscripcion_parcial_2": "bloqueada", "motivo_bloqueo": "cuota impaga",
                    "cuotas_impagas": [{"mes": "2026-08", "vencio": "2026-08-10"},
                                       {"mes": "2026-09", "vencio": "2026-09-10"},
                                       {"mes": "2026-10", "vencio": "2026-10-10"}],
                    "beca": "solicitó beca al ingresar; no fue otorgada",
                    "tramites_abiertos": []},
    ingreso={"curso_de_ingreso": True, "expectativa_declarada": "Quiero seguir Medicina el año que viene.", "pidio_ayuda_economica": True},
))

# Los otros 23 vienen bien: la demo sigue un solo hilo, el de Martina.
NOMBRES = ["Tomás G.", "Lucía P.", "Joaquín M.", "Sofía A.", "Benjamín C.", "Valentina D.", "Mateo E.", "Catalina F.", "Santiago H.", "Emilia I.",
           "Thiago J.", "Isabella K.", "Lautaro L.", "Renata N.", "Agustín O.", "Julieta Q.", "Felipe S.",
           "Camila T.", "Bautista U.", "Abril V.", "Facundo Y.", "Delfina Z.", "Nicolás W."]
resto = []
for i, nombre in enumerate(NOMBRES, start=2):
    p1 = random.choice([6, 6.5, 7, 7, 7.5, 8, 8, 8.5, 9])
    resto.append(estudiante(
        f"e{i:02d}", nombre, semanas=normal_asistencia(random.uniform(0.85, 1.0)),
        campus={"ultimo_ingreso": (HOY - timedelta(days=random.randint(0, 4))).isoformat(),
                "ingresos_ultimos_30_dias": random.randint(10, 26), "entregas_pendientes": random.choice([0, 0, 0, 1])},
        alertas_previas=[],
        tutor={"consultas": [{"tema": random.choice(TEMAS), "consultas": random.randint(1, 8),
                              "ejercicios_resueltos": 8, "ejercicios_totales": 10}],
               "ultima_consulta": (HOY - timedelta(days=random.randint(1, 15))).isoformat()},
        notas=[{"evaluacion": "TP 1", "fecha": "2026-08-28", "nota": random.choice([6, 7, 8, 9])},
               {"evaluacion": "Parcial 1", "fecha": "2026-09-22", "nota": p1}],
        administrativo={"inscripcion_parcial_2": "habilitada", "cuotas_impagas": [], "beca": None, "tramites_abiertos": []},
        ingreso={"curso_de_ingreso": random.random() < 0.7, "expectativa_declarada": None, "pidio_ayuda_economica": random.random() < 0.2},
    ))

data = {
    "aviso": "Datos sintéticos. Escuela Futura y todas las personas son ficticias.",
    "hoy": HOY.isoformat(),
    "escuela": "Escuela Futura",
    "cursos": [{"id": "bio1", "nombre": "Biología 1", "anio": 1, "comisiones": ["martes 9 h", "jueves 14 h"],
                "programa": TEMAS,
                "proxima_evaluacion": {"evaluacion": "Parcial 2", "fecha": PARCIAL.isoformat(), "temas": TEMAS_PARCIAL}}],
    "estudiantes": casos + resto,
    "oferta": [
        {"programa": "Tecnicatura en Biotecnología", "nivel": "pregrado", "duracion": "3 años", "modalidad": "presencial", "cupo": 60, "inscriptos_2026": 52},
        {"programa": "Profesorado de Biología", "nivel": "grado", "duracion": "4 años", "modalidad": "presencial", "cupo": 40, "inscriptos_2026": 31},
        {"programa": "Tecnicatura en Gestión Ambiental", "nivel": "pregrado", "duracion": "2,5 años", "modalidad": "híbrida", "cupo": 40, "inscriptos_2026": 19},
    ],
    "demanda": [
        {"tema": "Bioinformática", "senal": "11 consultas de aspirantes y 7 ingresantes la mencionaron como interés", "fuente": "Admisiones"},
        {"tema": "Ciencia de datos aplicada a la salud", "senal": "6 consultas de aspirantes; 2 empresas locales piden perfiles", "fuente": "Vinculación"},
        {"tema": "Educación ambiental para docentes", "senal": "4 docentes de escuelas vecinas pidieron formación", "fuente": "Secretaría"},
        {"tema": "Cursos cortos en horario nocturno", "senal": "9 ingresantes que trabajan piden cursar de noche", "fuente": "Bienestar"},
    ],
    "aspirantes": [
        {"nombre": "Ramiro B.", "carrera": "Biotecnología", "estado": "consultó por becas", "fecha": "2026-10-20"},
        {"nombre": "Paula G.", "carrera": "Profesorado de Biología", "estado": "inscripción iniciada, falta documentación", "fecha": "2026-10-24"},
        {"nombre": "Ezequiel R.", "carrera": "Biotecnología", "estado": "pidió visitar la escuela", "fecha": "2026-10-28"},
    ],
}

out = Path(__file__).resolve().parent.parent / "data" / "escuela-futura.json"
out.parent.mkdir(parents=True, exist_ok=True)
out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(f"{len(data['estudiantes'])} estudiantes → {out}")

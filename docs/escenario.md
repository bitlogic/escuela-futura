# Escenario de prueba: "Primer año en riesgo"

Objetivo de la prueba: correr el escenario de la charla de punta a punta en Buzz, sin modificar Buzz, y anotar qué funciona y qué no.

## Lo que hay en los datos

"Hoy" en la ficción es el 30/10/2026. El Parcial 2 de Biología 1 es el 3/11 y evalúa genética (cruzamientos, herencia ligada al sexo, ADN).

| Estudiante | Qué muestran los datos | Quién lo ve | Lo que debería surgir |
|---|---|---|---|
| **Martina R.** (e01) | Venía siempre; desde el 18/8 casi no viene. 14 consultas al tutor sobre cruzamientos, 3 de 10 ejercicios resueltos. Cuotas impagas desde agosto: **inscripción al parcial bloqueada**. Pidió beca al ingresar y no se la dieron. | Bienestar, Tutor, Advisor | Advisor conecta la deuda con la caída de asistencia y le avisa a Bienestar. Propuesta: plan de pagos + refuerzo + llamada de una persona. |
| **Tomás G.** (e02) | Viene siempre, entra al campus seguido, pero sacó 4 y 3 en genética. Casi no usa el tutor. | Tutor | Riesgo académico, no de abandono. Refuerzo en cruzamientos. |
| **Lucía P.** (e03) | Desde septiembre falta a la comisión del jueves 14 h; entrega todo de noche. Pidió cambio de comisión hace 3 semanas, sin respuesta. | Bienestar, Advisor | Resolver el trámite pendiente. |
| **Joaquín M.** (e04) | No viene desde el 28/9 ni entra al campus. Alerta previa en 2025, resuelta con una llamada. Beca 30%. | Bienestar | Riesgo alto sin explicación en los datos: llamada de una persona. |

Los otros 20 estudiantes están bien.

## Guion

1. En `#coordinacion`, como Greyla (o vos):

   > @Coordinación antes del parcial del 3/11, identificá qué estudiantes de primer año de Biología están en riesgo y proponé qué hacemos con cada uno.

2. Coordinación reparte el trabajo a Bienestar, Tutor y Advisor.
3. Los agentes responden; Advisor debería avisarle a Bienestar lo de Martina.
4. Coordinación publica la propuesta (máximo 4 casos).
5. Respondé como directora: aprobá dos, editá uno, rechazá uno ("a Joaquín lo llamo yo").

## Qué anotar

- [ ] ¿Coordinación delega con @menciones o intenta hacer todo sola?
- [ ] ¿Cada agente usa sus herramientas (se ve en su actividad)?
- [ ] ¿Advisor le avisa a Bienestar sin que se lo pidan?
- [ ] ¿Cuánto tarda de punta a punta? (objetivo: menos de 3 minutos)
- [ ] ¿La propuesta se entiende en una pantalla grande?
- [ ] ¿Qué eventos aparecen en `buzz-probe` (en la carpeta innova-educa-2026) mientras corre?

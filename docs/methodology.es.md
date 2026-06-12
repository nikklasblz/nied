# Metodología de nied

[English version](methodology.md)

Este documento es el contrato pedagógico de nied. Todo curso que genera el
framework — sin importar tema, idioma o nivel — debe cumplir las reglas aquí
descritas. Los comandos y agentes del plugin las hacen cumplir de forma
mecánica: una violación no es una cuestión de estilo, es un bloqueador de
auditoría que detiene el pipeline. Si quieres saber *por qué* un curso de nied
luce como luce, esta es la explicación.

## Las 7 reglas duras

### 1. Fuentes primarias 100% libres

Toda fuente en un curso de nied es de acceso libre: documentación oficial,
courseware abierto (MIT OCW y similares), papers de acceso abierto (ArXiv,
PubMed), sitios de reguladores y organismos de estándares, libros de texto
abiertos, clases universitarias en YouTube. Cero contenido de pago o pirateado.
La razón es la reproducibilidad y el acceso igualitario: un curso cuyas fuentes
no puedes pagar no es un curso, es una bibliografía de puertas cerradas. Si no
existe equivalente libre de una fuente canónica, la fuente se omite y la brecha
se reporta — nunca se tapa con un enlace de pago.

### 2. Contenido enseñable inline

Una unidad es una lección completa de la que alguien puede aprender
directamente: explicaciones, ejemplos resueltos, analogías, diagramas. Los
enlaces son material para "profundizar", nunca la sustancia. Esta es una
defensa contra la muerte de enlaces: los recursos externos mueren, se mudan o
cambian, y un curso que es apenas un índice de URLs muere con ellos. La unidad
ES la lección; los enlaces agregan profundidad. Una unidad que es una lista de
enlaces es un FAIL automático de auditoría.

### 3. Anti-fabricación de URLs

Toda URL en un curso fue descargada y verificada — tanto que resuelve como que
su contenido realmente cubre lo que el curso afirma — antes de incluirla. Si
una fuente no se puede verificar, se nombra y se describe sin URL. Los modelos
de lenguaje pueden inventar enlaces de apariencia plausible; un framework que
entrega referencias alucinadas no tiene nada que ofrecerle a quien aprende. La
confianza es el producto.

### 4. El markdown es la verdad

El contenido generado es markdown plano más JSON conforme a un esquema
versionado. Ningún contenido del curso vive en una base de datos. La app
lectora solo lee; nunca modifica los archivos del curso. El progreso del
estudiante (XP, rachas, estado de repaso espaciado) vive en un archivo SQLite
local explícitamente desechable: bórralo y el curso queda intacto. Los archivos
planos son diffeables, versionables, portables e inspeccionables con cualquier
editor de texto — propiedades que un corpus de aprendizaje nunca debería
sacrificar.

### 5. Gamificación no coercitiva

Los quizzes premian con XP las respuestas correctas; la actividad diaria
construye una racha que multiplica las ganancias de XP. Lo crucial: nada
castiga. Romper una racha reinicia el multiplicador, nunca el progreso ya
ganado. La gamificación en nied existe para que la constancia se sienta bien,
no para que la ausencia se sienta mal. Las mecánicas de aversión a la pérdida
producen ansiedad, no aprendizaje.

### 6. Una unidad a la vez

El contenido de un curso nunca se genera de un solo tiro. Cada unidad recibe su
ciclo completo — investigación, luego escritura, luego una auditoría
bloqueante — antes de que empiece la siguiente. La generación en lote optimiza
volumen y amortiza errores a lo largo de todo el curso; las compuertas de
calidad por unidad atrapan los problemas cuando todavía son baratos de
arreglar. La profundidad le gana al rendimiento.

### 7. Estructura canónica top-down

Los sílabos siguen la estructura canónica de la disciplina — cómo la
secuenciaría un departamento universitario — no los proyectos o hobbies
actuales del usuario. Un currículo organizado alrededor de lo que ya haces
tiende a reforzar lo que ya sabes. El anclaje personal (ejemplos tomados del
contexto propio del estudiante) es bienvenido como sabor opcional, agregado
solo donde encaja con naturalidad.

## Fundamento en ciencia del aprendizaje

La anatomía de unidad no es arbitraria; implementa tres hallazgos bien
replicados de la ciencia cognitiva. Siguiendo nuestra propia regla
anti-fabricación, citamos autor, año y concepto sin URLs.

- **Práctica de recuperación.** Recordar activamente la información fortalece
  la memoria mucho más que releerla — el efecto del testeo (Roediger &
  Karpicke, 2006). Por eso cada sección mayor termina en un checkpoint de
  recuperación y cada unidad incluye un quiz autocalificado: las preguntas son
  parte de la enseñanza, no solo de la medición.
- **Repetición espaciada.** Los repasos distribuidos en el tiempo producen un
  aprendizaje más durable que el estudio concentrado — el efecto de
  espaciamiento (Cepeda et al., 2006). Cada unidad incluye una guía de repaso
  espaciado (1 día / 1 semana / 1 mes), y la app lectora implementa un sistema
  Leitner clásico de 5 cajas: una tarjeta en la caja N vence a los 1, 2, 4, 8
  o 16 días; una respuesta correcta la promueve, un fallo la devuelve a la
  caja 1.
- **Retroalimentación inmediata que enseña.** Cada respuesta de quiz viene con
  una explicación de *por qué* la opción correcta es correcta. La
  retroalimentación entregada en el momento de la recuperación corrige las
  ideas erróneas antes de que se consoliden; un "incorrecto" a secas no enseña
  nada.

## Anatomía de una unidad

Toda unidad (objetivo: 600–900 líneas) tiene ocho partes, cada una con un
trabajo:

1. **Frontmatter** (`id`, `title`) — identidad legible por máquina, validada
   contra el sílabo.
2. **Intro y objetivos** — por qué importa esta unidad y qué será capaz de
   hacer el estudiante, para que el esfuerzo tenga un blanco visible.
3. **Mapa de ruta** — una tabla de las secciones de la unidad con horas
   estimadas y prerrequisitos internos, para que el estudiante pueda planificar
   la unidad.
4. **4–7 secciones enseñables** — la sustancia: explicaciones inline, al menos
   un ejemplo resuelto o caso cada una, LaTeX donde aplica matemática,
   diagramas Mermaid para procesos y relaciones, y 1–2 videos verificados
   embebidos por unidad.
5. **Checkpoints de recuperación** — 2–3 preguntas de recuerdo tras cada
   sección mayor, explotando el efecto del testeo mientras el material está
   fresco.
6. **Ejercicios y capstone** — 3–5 tareas aplicadas de dificultad creciente,
   más un mini-proyecto integrador que amarra los objetivos de la unidad.
7. **Guía de repaso espaciado** — qué revisitar en 1 día / 1 semana / 1 mes,
   haciendo el efecto de espaciamiento accionable en el papel, no solo en la
   app.
8. **Fuentes anotadas** ("Para profundizar") — la lista de fuentes libres
   verificadas, cada una con una nota de una línea sobre qué aporta.

## El contrato del quiz

Los quizzes son JSON estricto conforme al esquema v1 — sin claves extra en
ninguna parte; las claves desconocidas son errores de validación. La forma
canónica:

```json
{
  "unit_id": "u1",
  "title": "Quiz: <unit title>",
  "instructions": "<how to take it>",
  "xp_per_question": 10,
  "questions": [
    {
      "question": "<text>",
      "options": ["<a>", "<b>", "<c>"],
      "correct_index": 1,
      "explanation": "<why>",
      "section": "<## section name>"
    }
  ]
}
```

Reglas:

- `unit_id` debe ser igual al id de unidad del nombre de archivo
  (`quizzes/u1.json` → `"u1"`).
- `correct_index` es 0-based y debe ser menor que la cantidad de opciones.
- Las opciones deben ser únicas; `xp_per_question` es un entero positivo.
- 8–15 preguntas que cubren toda sección mayor (el campo `section` indica cuál).
- Las opciones incorrectas deben ser ideas erróneas plausibles, no chistes — un
  buen distractor diagnostica una confusión específica.
- `explanation` enseña POR QUÉ la respuesta es correcta, en 1–3 oraciones.

## La rúbrica de auditoría

Toda unidad pasa una auditoría bloqueante antes de contar como terminada.
Primero corren dos compuertas duras: **validación de esquema** (el
JSON/markdown debe validar contra el esquema v1) y **vitalidad de URLs** (toda
URL se vuelve a descargar; una URL muerta o con contenido que no coincide
reprueba la unidad). Luego se puntúan seis dimensiones pedagógicas de 1 a 5, y
cualquier dimensión con 2 o menos bloquea la unidad:

| Dimensión | Qué mide |
|---|---|
| depth | Tratamiento de nivel universitario que alcanza aplicar/analizar en la taxonomía de Bloom, no recuerdo de nivel blog |
| inline-teaching | La sustancia está en el texto; los enlaces son suplementarios |
| objective-coverage | Todo objetivo del sílabo se aborda en una sección |
| retrieval-practice | Hay checkpoints tras las secciones mayores |
| assessment | El quiz cubre todas las secciones mayores con explicaciones que enseñan |
| language-consistency | Todo el contenido está en el idioma declarado del curso |

El auditor también marca relleno — texto de relleno, párrafos repetidos,
secciones que reformulan sin enseñar — y debe citar nombres de sección y
evidencia con líneas en cada bloqueador, para que el ciclo de revisión tenga
algo concreto sobre lo cual actuar.

## Por qué un pipeline de agentes

La generación de unidades se reparte entre tres agentes especializados, y la
división es una separación de poderes, no un detalle de implementación:

- **course-researcher** tiene herramientas de red y un solo trabajo: encontrar
  y *verificar* fuentes primarias libres, descargando cada URL antes de
  reportarla.
- **course-writer** tiene solo herramientas de archivos — literalmente no tiene
  acceso a la red, así que *no puede* fabricar una URL de apariencia
  funcional aunque quisiera. Solo puede usar URLs de la lista verificada del
  investigador; cualquier otra fuente se nombra sin enlace.
- **course-auditor** es adversarial por instrucción: su trabajo es encontrar
  razones por las que la unidad NO está lista, no darle el visto bueno.

El ciclo escritura–auditoría tiene un tope de 3 revisiones. Si una unidad sigue
reprobando tras tres ciclos, el pipeline se detiene y presenta los bloqueadores
restantes a un humano en lugar de converger hacia la mediocridad. La
arquitectura asume que cualquier agente individual puede fallar, y hace que los
modos de falla sean estructuralmente imposibles o ruidosamente visibles en vez
de confiar en las buenas intenciones.

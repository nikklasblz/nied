# Primeros pasos con nied

[English version](getting-started.md)

Esta guía te lleva desde cero hasta un curso generado que puedes estudiar en
la app de lectura. Para conocer las reglas que todo curso debe cumplir — y por
qué — consulta la [metodología](methodology.es.md).

## Requisitos previos

- **Claude Code >= 2.0** — ejecuta el agente: los comandos del plugin, el
  pipeline de investigación/escritura/auditoría, todo lo generativo.
- **bun >= 1.2** — ejecuta el validador de esquema (`schema/`) y la app de
  lectura (`app/`).
- **git** — para clonar el repo y versionar tus cursos generados (el comando
  de unidades hace commit de cada unidad terminada cuando el curso vive en un
  repo git).

## Instalación

### Desde GitHub (una vez publicado)

Dentro de Claude Code:

```text
/plugin marketplace add nikklasblz/nied
/plugin install nied@nied
```

### Desde un clon local

```text
git clone https://github.com/nikklasblz/nied
```

Luego, dentro de Claude Code:

```text
/plugin marketplace add <ruta-local-al-clon>
/plugin install nied@nied
```

### Una sola sesión, sin instalar

Desde la raíz del repo:

```text
claude --plugin-dir ./plugin
```

Los comandos quedan disponibles solo durante esa sesión.

**Qué significan los nombres:** `nied@nied` es `<plugin>@<marketplace>`. El
marketplace se llama "nied" en `.claude-plugin/marketplace.json`; el plugin
que publica también se llama "nied". Los comandos llevan el espacio de nombres
`/nied:<comando>`.

## Crea tu primer curso

```text
/nied:course-create "Applied statistics for data analysis" --level intro --language es --dir ./courses/my-course
```

El comando te entrevista, una pregunta a la vez, sobre lo que no venga ya en
los argumentos:

- **Objetivo de aprendizaje** — qué deberías poder HACER al terminar.
- **Nivel de partida** — intro, intermediate o advanced.
- **Audiencia / nivel educativo** — para quién es el curso (escolar,
  universitario de pregrado, posgrado, profesional en ejercicio,
  autodidacta...), más allá de los tres niveles del esquema.
- **Material audiovisual y elementos educativos** — videos por unidad (por
  defecto 1–2 verificados), énfasis en diagramas, ejemplos resueltos,
  datasets/ejercicios prácticos, estilo del capstone.
- **Evaluaciones y sus tipos** — longitud del quiz por unidad (por defecto
  8–15 preguntas de opción múltiple autocalificadas — lo que la app de lectura
  califica) y su énfasis (recuerdo conceptual vs escenarios aplicados), más
  elementos abiertos opcionales (ejercicios con rúbrica, proyectos capstone)
  que se renderizan como secciones de la unidad.
- **Horas por semana** — define el ritmo de las unidades.
- **Idioma del contenido** — por defecto, el idioma en el que escribes.

Después investiga la estructura canónica universitaria del dominio y genera:

- `course.yaml` — el sílabo legible por máquina (schema v1).
- `SYLLABUS.md` — el sílabo legible por humanos: objetivos por unidad, fuentes
  verificadas, un mapa de dependencias en Mermaid, el ritmo semanal según tus
  horas, y una sección "Preferencias del curso" que registra tus respuestas de
  audiencia, multimedia y evaluaciones — la generación de unidades (escritor y
  auditor) la lee y la respeta.
- `units/` y `quizzes/` — directorios vacíos.

En este punto no se genera contenido de ninguna unidad. Es por diseño — regla
dura 6 de la [metodología](methodology.es.md): las unidades se generan de una
en una, cada una con su propia investigación, escritura y auditoría
bloqueante, nunca un curso completo de un solo golpe.

## Genera las unidades una por una

```text
/nied:course-unit u1 --dir ./courses/my-course
```

Cada unidad ejecuta un pipeline de tres etapas:

1. **Investigación** — un agente con acceso a red encuentra fuentes primarias
   gratuitas y descarga cada URL para verificarla antes de reportarla.
2. **Escritura** — un agente solo con herramientas de archivos (sin acceso a
   red, así que no puede fabricar URLs) escribe `units/u1.md` y
   `quizzes/u1.json` a partir de la lista verificada.
3. **Auditoría** — un agente adversarial revisa esquema, URLs vivas y seis
   dimensiones pedagógicas. Un FAIL devuelve los bloqueadores al escritor.

Qué esperar, con honestidad:

- **10–20 minutos por unidad** es lo normal.
- **Unos cuantos cientos de miles de tokens por unidad**, incluyendo
  investigación y auditoría. La profundidad es el objetivo; no es una
  operación barata.
- El auditor puede forzar **hasta 3 ciclos de revisión**. Si la unidad sigue
  fallando tras el tercero, el pipeline se detiene y te presenta los
  bloqueadores restantes.
- Si la investigación encuentra **vacíos** (ninguna fuente gratuita verificada
  para un objetivo central), se te presentan para que decidas — aceptar menos
  fuentes o ajustar el objetivo — nunca se disimulan.

Repite con u2, u3, ... siguiendo el orden de dependencias del sílabo.

## Audita un curso

```text
/nied:course-audit ./courses/my-course
```

Una puerta de calidad de solo lectura: valida el esquema, vuelve a comprobar
cada URL y audita cada unidad escrita en paralelo, y luego presenta una única
tabla consolidada (veredicto, errores de esquema, URLs muertas, dimensión más
baja de la rúbrica, bloqueadores por unidad). Nunca corrige nada — las
unidades que fallan se revisan con `/nied:course-unit <id>`.

Úsalo antes de compartir o publicar un curso. Las auditorías finales ejecutan
el validador sin el flag incremental `--allow-missing-units`, de modo que toda
unidad declarada en el sílabo debe existir realmente.

## Estudia con la app de lectura

Desde la raíz del repo:

```text
bun install
cd app && bun run dev
```

Abre http://localhost:3000.

| Variable de entorno | Por defecto | Qué hace |
|---|---|---|
| `NIED_COURSES_ROOT` | `../courses` | Directorio donde la app busca cursos |
| `NIED_UI_LANGUAGE` | `es` | Idioma de la interfaz: `es` o `en` |
| `NIED_DB_PATH` | — | Ruta del archivo SQLite de progreso |
| `NIED_INSTANCE_NAME` | — | Nombre de marca que muestra la app |
| `NIED_XP_PER_HOUR` | `25` | XP otorgado por hora de estudio estimada |

El progreso (XP, rachas, estado de repetición espaciada) vive en un archivo
SQLite local desechable; bórralo y tus cursos quedan intactos — el markdown es
la verdad, y la app nunca modifica los archivos del curso. Los quizzes otorgan
XP y siembran tarjetas de repetición espaciada (Leitner de 5 cajas) que vencen
en `/review`.

## Estructura del curso en disco

Schema v1, usando el curso demo como ejemplo:

```text
courses/estadistica-aplicada/
├── course.yaml        # sílabo legible por máquina: slug, title, language, level, units[]
├── SYLLABUS.md        # sílabo legible por humanos: objetivos, fuentes, mapa de dependencias, ritmo
├── units/
│   └── u1.md          # una unidad enseñable completa (frontmatter + 600–900 líneas)
└── quizzes/
    └── u1.json        # quiz autocalificado de u1 (JSON estricto, 8–15 preguntas)
```

Para validación programática, el JSON Schema vive en
[`schema/json/course.schema.json`](../schema/json/course.schema.json), y el
validador completo se ejecuta desde `schema/`:

```text
bun run validate <directorio-del-curso>
```

## Solución de problemas

- **El validador reporta unidades "not written yet".** Es lo esperado en medio
  de una construcción — las unidades se generan de una en una. Usa
  `bun run validate <dir> --allow-missing-units` para chequeos incrementales;
  los comandos del plugin ya pasan este flag automáticamente. Solo la
  auditoría final se ejecuta sin él.
- **`better-sqlite3` falla con un error NODE_MODULE_VERSION.** El módulo
  nativo se compiló contra un ABI distinto de Node/Bun. Ejecuta
  `npm rebuild better-sqlite3` dentro de `app/`, o reinstala las dependencias
  con el mismo runtime con el que arrancas la app.
- **La app de lectura muestra contenido viejo o errores de build extraños.**
  La caché de Turbopack puede quedar obsoleta. Ejecuta `bun run dev:clean` en
  `app/` para borrar `.next/` y reiniciar el servidor de desarrollo.

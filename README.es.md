# nied

> Un framework educativo de agentes open-source: genera cursos completos de nivel
> universitario sobre cualquier tema con Claude Code, y estúdialos en una app web
> local gamificada.

**Estado: la Fase 1 (esquema + plugin) y la Fase 2 (app lectora) están listas.
La Fase 3 (demo público + release) es la siguiente.**

[English version](README.md)

## Qué hace

- `/nied:course-create "tema"` — te entrevista, investiga el dominio de arriba hacia
  abajo y genera un sílabo completo (`course.yaml` + `SYLLABUS.md`).
- `/nied:course-unit u3` — investiga **fuentes primarias verificadas y 100% libres**
  y escribe una unidad completa y enseñable: explicaciones inline, LaTeX, diagramas
  Mermaid, videos embebidos, quizzes con corrección automática, práctica de
  recuperación y un proyecto final.
- `/nied:course-audit` — QA bloqueante: validación de esquema, verificación de URLs
  en vivo y una rúbrica pedagógica (profundidad universitaria, alineación con Bloom).

## Metodología (las reglas duras)

1. Fuentes 100% libres y primarias — cero contenido de pago.
2. Contenido enseñable inline — el sílabo es un índice; la unidad es el corazón.
3. Anti-fabricación: cada URL se descarga y verifica antes de incluirse.
4. Markdown es la verdad — las apps solo leen; el progreso vive en otro lado.
5. Gamificación no coercitiva.
6. Las unidades se generan de una en una, nunca un curso entero de un solo golpe.
7. Estructura canónica de dominio top-down; el anclaje a proyectos personales es
   opcional.

## Instalación (desarrollo)

Desde un clon local de este repositorio, dentro de Claude Code:

```text
/plugin marketplace add <ruta-local-al-clon>   # registra el marketplace "nied" (el nombre viene de .claude-plugin/marketplace.json)
/plugin install nied@nied                      # instala el plugin "nied" desde el marketplace "nied"
```

O carga el plugin directamente para una sola sesión:

```text
claude --plugin-dir ./plugin
```

Lee [CONTRIBUTING.md](CONTRIBUTING.md) para empezar.

## App lectora

Una app web local gamificada para estudiar los cursos generados: XP, rachas,
logros, quizzes con corrección automática y revisión por repetición espaciada
(método Leitner).

```text
bun install
cd app && bun run dev
```

Abre http://localhost:3000. Configuración mediante variables de entorno:
`NIED_COURSES_ROOT` (por defecto `../courses`), `NIED_UI_LANGUAGE` (`es` | `en`),
`NIED_DB_PATH`, `NIED_INSTANCE_NAME`, `NIED_XP_PER_HOUR` (por defecto `25`).

El progreso se guarda en un archivo SQLite local; la app nunca modifica el
contenido de los cursos. La base de datos de progreso es desechable —
el markdown es la verdad.

## Licencia

MIT

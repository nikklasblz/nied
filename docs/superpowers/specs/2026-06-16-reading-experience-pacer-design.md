# Diseño: Experiencia de lectura con pacer — nied app

- **Fecha:** 2026-06-16
- **Estado:** Aprobado (diseño)
- **Alcance:** Frontend de `D:\nied/app`. No toca `@nied/schema`, el plugin, ni el contenido de los cursos.
- **Fuera de alcance:** Schema v2, quests v0.5, estilos de "bandas en reposo" (YAGNI).

## 1. Problema

La vista de lectura del framework (`/courses/[id]/[unit]/[section]`) tiene dos problemas observados en la app real:

1. **Espacio desperdiciado.** La columna de prosa va alineada a la izquierda dentro de un contenedor `max-w-dashboard` ancho, dejando ~40% de hueco muerto a la derecha — sin contenido ni utilidad. (No es una "barra"; es whitespace.)
2. **Lectura sin guía.** El texto es estático. El usuario quiere un mecanismo que sostenga la atención —"un ciclo estimulante que le gane al scroll infinito"— guiando el ojo a un ritmo ajustable, y que sea **opcional**.

Además, `src/components/unit-toc.tsx` es **código muerto** (definido, nunca importado por ninguna página).

## 2. Objetivo

Un lector que:
- Aprovecha el espacio horizontal con una medida de lectura cómoda y centrada (estilo *Elements of AI*).
- Ofrece un **pacer** opcional que resalta el texto al paso de lectura, con granularidad, estilo, color y velocidad configurables.
- Persiste las preferencias del usuario y permite fijar defaults en Ajustes.

## 3. Decisiones de diseño

### 3.1 Layout del espacio de lectura
- La columna de lectura pasa de `max-w-dashboard` a la medida **`max-w-reading`** (token `--max-width-reading` ya existente), **centrada** con `mx-auto`. Objetivo: ~68–72 caracteres por línea.
- Aplica a `[section]/page.tsx` (lección) y al preámbulo de `[unit]/page.tsx`.
- **Borrar** `src/components/unit-toc.tsx` y su tipo `UnitTocLabels`; eliminar cualquier referencia en i18n si la hubiera.
- Decisión: **centrar, no ensanchar** — para lectura larga una medida controlada cansa menos que el ancho completo.

### 3.2 Componente `ReadingPacer` (client)
Envuelve el `<article>` renderizado y, **al montar**, segmenta la prosa en una estructura navegable.

**Qué se pacea y qué no.** Solo se segmenta texto de prosa: párrafos (`p`) y elementos de lista (`li`). Se **omiten** (se atraviesan sin resaltar, como una sola "parada"):
- bloques de código (`pre`, `code`)
- fórmulas KaTeX (`.katex`, `.katex-display`)
- tablas (`table`)
- diagramas mermaid (`.mermaid`, `svg`)
- imágenes y figuras (`img`, `figure`)
- encabezados (`h1`–`h4`) — se resaltan como unidad completa, no se pacean por letra.

**Granularidad** (el usuario alterna en vivo):
- **Letra** — barrido continuo con estela ("cometa").
- **Palabra** — la palabra actual resaltada en bloque.
- **Oración** — la oración actual resaltada. **Default.**

**Estilo de resaltado** (independiente de la granularidad):
- **Contenedor** — fondo suave sobre la unidad activa (usa `--pacer-accent`).
- **Línea que avanza** — subrayado que se dibuja bajo lo ya leído, con la cabeza más intensa en el punto actual (usa `--pacer-line`). Recupera la metáfora de "cuaderno subrayado".
- **Glow** — las letras del foco brillan (text-shadow), sin caja ni línea (usa `--pacer-accent`).

**Color:** variables CSS `--pacer-accent` y `--pacer-line` en el contenedor del lector, ajustables por el usuario; se mezclan con `color-mix()` para las tintas suaves. Presets rápidos (teal/azul/violeta/ámbar/magenta). Default `--pacer-accent` = `--accent-primary` del tema.

**Velocidad:** palabras por minuto (PPM), rango 140–500, default **260**. La duración por unidad se deriva de PPM (≈5.6 caracteres/palabra para español).

**Estado y controles:** Play/Pausa, On/Off, salto de unidad. Al estar **Off**, el texto queda plano, legible y sin atenuar (el pacer no es una jaula).

**Atajos de teclado** (activos cuando el pacer está On y el foco está en el lector):
- `Espacio` — Play/Pausa
- `←` / `→` — retroceder / avanzar una unidad
- `+` / `−` — subir / bajar velocidad

**Accesibilidad:** respeta `prefers-reduced-motion` (si el usuario lo tiene activo, el pacer arranca apagado por default y el autoavance no se inicia solo). El texto base nunca pierde legibilidad ni contraste; el atenuado del modo On no se aplica al copiar/seleccionar.

### 3.3 Controles y persistencia
- **Menú de lectura colapsable**: un botón discreto en la vista de lectura abre un panel **flotante anclado abajo** (no un rail lateral, para no reintroducir una barra que robe espacio). Contiene: On/Off, Play/Pausa, granularidad, estilo, color (+presets), velocidad.
- **Persistencia**: preferencias en `localStorage` bajo una clave `nied-reading` (objeto JSON), siguiendo el patrón ya usado por el sidebar/TOC. Un hook `useReadingPrefs()` lee/escribe y expone los valores.
- **Defaults desde Ajustes**: los valores guardados en Ajustes siembran el estado inicial cuando no hay preferencia previa en `localStorage`.

### 3.4 Página de Ajustes
- `/ajustes` hoy es un placeholder "v0.5". Se reemplaza por una página real con una sección **"Lectura"**: granularidad por defecto, estilo, color, PPM y pacer on/off por defecto.
- Se quitan las cadenas de placeholder (`settings.placeholder`, badge `common.availableV05`) de esta página.

## 4. Arquitectura

```
[section]/page.tsx (server)
  └─ <ReadingPacer>            (client; envuelve el article)
       ├─ tokeniza prosa al montar (lib/reading/tokenize.ts)
       ├─ motor de avance (requestAnimationFrame, PPM → duración)
       ├─ render por granularidad + estilo (clases sobre spans)
       └─ <ReadingControls>    (panel flotante colapsable)
            └─ useReadingPrefs() ↔ localStorage  ←seed─ defaults de Ajustes
```

- **`lib/reading/tokenize.ts`** — función pura, testeable: dado el `Element` raíz del artículo, recorre nodos de texto en bloques de prosa y produce una lista de "tokens" (carácter/palabra/oración) con índices, marcando qué nodos se omiten. No depende del DOM real más allá del árbol pasado (se testea con un árbol parseado).
- **`useReadingPrefs()`** — hook que encapsula lectura/escritura en `localStorage` y validación de forma.
- **`ReadingControls`** — presentacional; recibe valores y setters.
- **`ReadingPacer`** — orquesta motor + render + controles.

## 5. Flujo de datos

1. SSR entrega el HTML del artículo (sin cambios en el pipeline remark).
2. `ReadingPacer` monta, lee `useReadingPrefs()` (o defaults de Ajustes), tokeniza el artículo.
3. Si el pacer está On y no hay `prefers-reduced-motion`, queda listo para Play (no autoarranca sin interacción salvo preferencia explícita).
4. El motor avanza un contador de "caracteres leídos" por `rAF` según PPM; el render mapea ese contador a la unidad activa según la granularidad y aplica clases.
5. Cambios del usuario en el panel → estado local + `localStorage`.

## 6. Manejo de errores y casos borde
- **Artículo sin prosa pacable** (solo tablas/figuras): el pacer se deshabilita silenciosamente (botón en estado "no aplicable"); el layout centrado igual aplica.
- **Abreviaturas y decimales** en segmentación por oración: el tokenizador no corta en `Sr.`, `etc.`, ni en `3.14`. Lista mínima de abreviaturas + heurística de dígito-punto-dígito.
- **Contenido re-renderizado** (navegación entre secciones): el pacer re-tokeniza al cambiar la ruta/artículo.
- **localStorage no disponible / JSON corrupto**: cae a defaults sin romper.

## 7. Testing
- **Unit (bun)**: `tokenize.ts` — oraciones/palabras/letras correctas; no parte abreviaturas ni decimales; omite code/math/table/mermaid; cuenta de tokens estable.
- **Unit (bun)**: `useReadingPrefs` — round-trip localStorage, fallback ante JSON corrupto, merge con defaults.
- **i18n**: paridad ES/EN de las nuevas claves (test de paridad ya existente).
- **Smoke Playwright**: cargar una lección → abrir panel → Play → el foco avanza (cambia la unidad activa) → Off → el texto vuelve a plano sin atenuar.
- No regresar el `bun run smoke` (requiere Node por better-sqlite3) ni el job `app` de CI.

## 8. Entregables / cambios de archivos (estimado)
- `lib/reading/tokenize.ts` (nuevo) + test
- `lib/reading/use-reading-prefs.ts` (nuevo) + test
- `components/reading-pacer.tsx` (nuevo)
- `components/reading-controls.tsx` (nuevo)
- `app/courses/[id]/[unit]/[section]/page.tsx` (envolver article, medida centrada)
- `app/courses/[id]/[unit]/page.tsx` (medida centrada del preámbulo)
- `app/ajustes/page.tsx` (sección "Lectura" real)
- `app/globals.css` (variables `--pacer-*`, clases de resaltado, ajuste de medida si hace falta)
- `lib/i18n/es.json` + `en.json` (claves nuevas; retirar placeholders de ajustes)
- **Borrar** `components/unit-toc.tsx`
- Playwright smoke + tests unitarios

## 9. Riesgos
- **Segmentar HTML ya renderizado** es lo más delicado: math/tablas/código deben quedar intactos y seleccionables. Mitigación: tokenizador conservador que solo envuelve nodos de texto dentro de `p`/`li` y nunca dentro de los selectores omitidos; tests con fixtures que incluyan KaTeX y tablas.
- **Rendimiento** del modo "letra" en textos largos: re-render acotado a la ventana de cambio, no a todos los spans en cada frame.
- **Tema oscuro/claro**: los resaltados usan tokens/`color-mix`, no colores fijos, para verse bien en ambos temas.

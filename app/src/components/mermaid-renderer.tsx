"use client";

import { useEffect } from "react";

/**
 * Cliente que escanea el DOM en busca de bloques `<pre><code class="language-mermaid">`
 * (que vienen tal cual del pipeline markdown server-side) y los reemplaza por
 * el SVG renderizado por mermaid.js. Se monta en la página de unidad y corre
 * post-hidratación.
 */
export function MermaidRenderer() {
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        themeVariables: {
          background: "#0b0f1a",
          primaryColor: "#1a2332",
          primaryTextColor: "#F1F5F9",
          primaryBorderColor: "#14B8A6",
          lineColor: "#94A3B8",
          secondaryColor: "#1E2533",
          tertiaryColor: "#111827",
          fontFamily: "Inter, system-ui, sans-serif",
          fontSize: "14px",
          noteBkgColor: "#1E2533",
          noteTextColor: "#F1F5F9",
          noteBorderColor: "rgba(255,255,255,0.08)",
        },
        gantt: {
          titleTopMargin: 16,
          barHeight: 24,
          fontSize: 13,
        },
        securityLevel: "loose",
      });
      if (cancelled) return;
      const blocks = document.querySelectorAll<HTMLElement>(
        "pre > code.language-mermaid",
      );
      let i = 0;
      for (const code of Array.from(blocks)) {
        const pre = code.parentElement;
        if (!pre) continue;
        const source = code.textContent ?? "";
        const id = `mermaid-${Date.now()}-${i++}`;
        try {
          const { svg } = await mermaid.render(id, source);
          const wrapper = document.createElement("div");
          wrapper.className = "mermaid-rendered";
          wrapper.innerHTML = svg;
          pre.replaceWith(wrapper);
        } catch (err) {
          const note = document.createElement("div");
          note.className = "mermaid-error";
          note.textContent = `Error renderizando diagrama: ${(err as Error).message ?? String(err)}`;
          pre.parentElement?.insertBefore(note, pre.nextSibling);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
